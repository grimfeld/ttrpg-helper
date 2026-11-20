//! The image picker for Import. It runs in Rust, so the picked files are never added to the
//! webview's fs or asset-protocol scope: the webview can only read them one at a time, by
//! index, through `read_picked_image`, and only until the next pick.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::ipc::Response;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::{DialogExt, FilePath};

/// What the picker offers. Core checks the file name and content again.
const IMAGE_EXTENSIONS: [&str; 4] = ["png", "jpg", "jpeg", "webp"];

/// Files above this size are refused before they are read.
pub const MAX_IMAGE_BYTES: u64 = 50 * 1024 * 1024;

/// The files of the latest pick.
#[derive(Default)]
pub struct PickedImages(Mutex<Vec<PathBuf>>);

impl PickedImages {
    /// Replaces the picked files and returns their names, in order.
    fn remember(&self, paths: Vec<PathBuf>) -> Result<Vec<String>, String> {
        let names = paths.iter().map(|path| file_name(path)).collect();
        *self
            .0
            .lock()
            .map_err(|_| "the picked files are unavailable")? = paths;
        Ok(names)
    }

    /// The bytes of one picked file, refused above `MAX_IMAGE_BYTES`.
    fn read(&self, index: usize) -> Result<Vec<u8>, String> {
        read_limited(&self.path(index)?, MAX_IMAGE_BYTES)
    }

    fn path(&self, index: usize) -> Result<PathBuf, String> {
        let paths = self
            .0
            .lock()
            .map_err(|_| "the picked files are unavailable")?;
        paths
            .get(index)
            .cloned()
            .ok_or_else(|| format!("no picked file {index}"))
    }
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned())
}

/// Reads a file, refusing one larger than `max_bytes` before reading it.
fn read_limited(path: &Path, max_bytes: u64) -> Result<Vec<u8>, String> {
    let size = std::fs::metadata(path)
        .map_err(|error| error.to_string())?
        .len();
    if size > max_bytes {
        return Err(format!("is larger than {} MB", max_bytes / 1024 / 1024));
    }
    std::fs::read(path).map_err(|error| error.to_string())
}

/// The local paths of the picked files; anything that isn't a local file is left out.
fn local_paths(files: Option<Vec<FilePath>>) -> Vec<PathBuf> {
    files
        .unwrap_or_default()
        .into_iter()
        .filter_map(|file| file.into_path().ok())
        .collect()
}

/// Opens the picker for several PNG, JPG or WebP files; returns their names, empty on cancel.
#[tauri::command]
pub async fn pick_images(
    app: AppHandle,
    picked: State<'_, PickedImages>,
) -> Result<Vec<String>, String> {
    let dialog = app.dialog().file().add_filter("Images", &IMAGE_EXTENSIONS);
    picked.remember(local_paths(dialog.blocking_pick_files()))
}

/// The bytes of one file of the latest pick.
#[tauri::command]
pub fn read_picked_image(
    index: usize,
    picked: State<'_, PickedImages>,
) -> Result<Response, String> {
    picked.read(index).map(Response::new)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file(name: &str, bytes: &[u8]) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("ttrpg-helper-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join(name);
        std::fs::write(&path, bytes).unwrap();
        path
    }

    #[test]
    fn remembers_a_pick_and_names_its_files() {
        let picked = PickedImages::default();
        let names = picked
            .remember(vec![
                PathBuf::from("/maps/Red Map.png"),
                PathBuf::from("hero.jpeg"),
            ])
            .unwrap();
        assert_eq!(names, ["Red Map.png", "hero.jpeg"]);
        assert_eq!(picked.path(1).unwrap(), PathBuf::from("hero.jpeg"));
    }

    #[test]
    fn a_new_pick_replaces_the_last_one() {
        let picked = PickedImages::default();
        picked
            .remember(vec![PathBuf::from("a.png"), PathBuf::from("b.png")])
            .unwrap();
        picked.remember(vec![PathBuf::from("c.png")]).unwrap();
        assert_eq!(picked.path(0).unwrap(), PathBuf::from("c.png"));
        assert_eq!(picked.path(1).unwrap_err(), "no picked file 1");
    }

    #[test]
    fn reads_a_picked_file_by_its_index() {
        let picked = PickedImages::default();
        let path = temp_file("picked.png", &[9]);
        picked.remember(vec![path]).unwrap();
        assert_eq!(picked.read(0).unwrap(), vec![9]);
        assert!(picked.read(1).is_err());
    }

    #[test]
    fn keeps_only_local_paths_and_nothing_on_cancel() {
        let files = vec![
            FilePath::Path(PathBuf::from("/maps/a.png")),
            FilePath::Url("https://example.com/b.png".parse().unwrap()),
        ];
        assert_eq!(local_paths(Some(files)), vec![PathBuf::from("/maps/a.png")]);
        assert!(local_paths(None).is_empty());
    }

    #[test]
    fn names_a_path_without_a_file_name_by_the_path() {
        assert_eq!(file_name(Path::new("/")), "/");
    }

    #[test]
    fn reads_a_file_within_the_limit() {
        let path = temp_file("small.png", &[1, 2, 3]);
        assert_eq!(read_limited(&path, 3).unwrap(), vec![1, 2, 3]);
    }

    #[test]
    fn refuses_a_file_over_the_limit_without_reading_it() {
        let path = temp_file("big.png", &[0; 2 * 1024 * 1024 + 1]);
        assert_eq!(
            read_limited(&path, 2 * 1024 * 1024).unwrap_err(),
            "is larger than 2 MB"
        );
    }

    #[test]
    fn reports_a_missing_file() {
        assert!(read_limited(Path::new("/no/such/file.png"), MAX_IMAGE_BYTES).is_err());
    }
}
