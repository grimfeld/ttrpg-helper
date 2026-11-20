/**
 * The file operations Core's storage needs (ADR-0005). Paths are relative to the app data
 * folder and use `/`. The GM app implements this with Tauri's fs plugin; tests use
 * `createMemoryFileSystem`.
 */
export interface FileSystem {
  /** A UTF-8 file's text; undefined when it does not exist. */
  readText(path: string): Promise<string | undefined>;
  /** Writes a UTF-8 file, creating or truncating it. */
  writeText(path: string, text: string): Promise<void>;
  /** Moves a file over another, replacing it. */
  rename(from: string, to: string): Promise<void>;
  /** Creates a folder and its parents; no error when it exists. */
  makeDirectory(path: string): Promise<void>;
  /** The names of the folders directly inside a folder; empty when it does not exist. */
  listDirectories(path: string): Promise<string[]>;
}

/** Joins path segments with `/`. */
export function joinPath(...segments: string[]): string {
  return segments.filter((segment) => segment !== "").join("/");
}

export function parentOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
}

/** A FileSystem held in memory, for tests and previews. */
export interface MemoryFileSystem extends FileSystem {
  /** Every file, by path: tests read and corrupt documents through it. */
  readonly files: Map<string, string>;
}

export function createMemoryFileSystem(
  initial: Record<string, string> = {}
): MemoryFileSystem {
  const files = new Map(Object.entries(initial));
  const directories = new Set<string>();
  const addDirectory = (path: string) => {
    for (let dir = path; dir !== ""; dir = parentOf(dir)) directories.add(dir);
  };
  for (const path of files.keys()) addDirectory(parentOf(path));

  return {
    files,
    readText: (path) => Promise.resolve(files.get(path)),
    writeText: (path, text) => {
      files.set(path, text);
      addDirectory(parentOf(path));
      return Promise.resolve();
    },
    rename: (from, to) => {
      const text = files.get(from);
      if (text === undefined) {
        return Promise.reject(new Error(`${from}: no such file`));
      }
      files.delete(from);
      files.set(to, text);
      addDirectory(parentOf(to));
      return Promise.resolve();
    },
    makeDirectory: (path) => {
      addDirectory(path);
      return Promise.resolve();
    },
    listDirectories: (path) => {
      const prefix = `${path}/`;
      const names = [...directories]
        .filter((dir) => dir.startsWith(prefix))
        .map((dir) => dir.slice(prefix.length))
        .filter((name) => !name.includes("/"));
      return Promise.resolve(names.sort());
    },
  };
}
