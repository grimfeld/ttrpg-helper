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
  /** Writes a binary file, creating or truncating it. */
  writeBytes(path: string, bytes: Uint8Array): Promise<void>;
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
  /** Every text file, by path: tests read and corrupt documents through it. */
  readonly files: Map<string, string>;
  /** Every binary file, by path. */
  readonly binaries: Map<string, Uint8Array>;
}

export function createMemoryFileSystem(
  initial: Record<string, string> = {}
): MemoryFileSystem {
  const files = new Map(Object.entries(initial));
  const binaries = new Map<string, Uint8Array>();
  const directories = new Set<string>();
  const addDirectory = (path: string) => {
    for (let dir = path; dir !== ""; dir = parentOf(dir)) directories.add(dir);
  };
  for (const path of files.keys()) addDirectory(parentOf(path));
  // Like a real disk, a file can only be written into a folder that exists.
  const missingFolder = (path: string) => {
    const parent = parentOf(path);
    return parent !== "" && !directories.has(parent)
      ? Promise.reject(new Error(`${parent}: no such folder`))
      : undefined;
  };

  return {
    files,
    binaries,
    readText: (path) => Promise.resolve(files.get(path)),
    writeText: (path, text) => {
      const missing = missingFolder(path);
      if (missing) return missing;
      files.set(path, text);
      return Promise.resolve();
    },
    writeBytes: (path, bytes) => {
      const missing = missingFolder(path);
      if (missing) return missing;
      binaries.set(path, bytes);
      return Promise.resolve();
    },
    rename: (from, to) => {
      const text = files.get(from);
      if (text === undefined) {
        return Promise.reject(new Error(`${from}: no such file`));
      }
      const missing = missingFolder(to);
      if (missing) return missing;
      files.delete(from);
      files.set(to, text);
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
