/**
 * Versioned JSON documents (ADR-0005), carried over from regie-jdr's ADR-0001.
 *
 * - Every document is a JSON object with `schemaVersion` next to its own fields.
 * - A write goes to `<file>.tmp`, then is renamed over `<file>`; the previous good copy is
 *   kept as `<file>.bak`, written the same way.
 * - On read, an older document passes through its type's migrations, one version at a time.
 * - A corrupt document is restored from its `.bak` and reported; a document newer than this
 *   app understands is refused.
 */
import { type FileSystem, parentOf } from "./fileSystem";
import { isRecord } from "./guards";

export type DocumentFields = Record<string, unknown>;

/** How one kind of document is stored. */
export interface DocumentType<T> {
  /** Short name used in messages, such as "campaign". */
  readonly name: string;
  /** The version every write uses. Starts at 1. */
  readonly version: number;
  /** `migrations[n]` turns a version-n document's fields into version n + 1. */
  readonly migrations: Readonly<
    Partial<Record<number, (fields: DocumentFields) => DocumentFields>>
  >;
  /** The value, when the fields (without `schemaVersion`) are valid at `version`. */
  parse(fields: DocumentFields): T | undefined;
  /** The fields stored for a value (without `schemaVersion`). */
  serialize(value: T): DocumentFields;
}

export type Decoded<T> =
  | { readonly status: "ok"; readonly value: T }
  | { readonly status: "corrupt" }
  | { readonly status: "tooNew"; readonly version: number };

/** Why a document could not be read. */
export type DocumentProblem = "corrupt" | "tooNew";

export class DocumentError extends Error {
  constructor(
    readonly problem: DocumentProblem,
    readonly file: string,
    message: string
  ) {
    super(message);
    this.name = "DocumentError";
  }
}

/** Parses, migrates and checks a document's text. */
export function decodeDocument<T>(
  text: string,
  type: DocumentType<T>
): Decoded<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { status: "corrupt" };
  }
  if (!isRecord(raw)) return { status: "corrupt" };
  const { schemaVersion, ...rest } = raw;
  if (
    typeof schemaVersion !== "number" ||
    !Number.isInteger(schemaVersion) ||
    schemaVersion < 1
  ) {
    return { status: "corrupt" };
  }
  if (schemaVersion > type.version) {
    return { status: "tooNew", version: schemaVersion };
  }
  let fields: DocumentFields = rest;
  for (let version = schemaVersion; version < type.version; version++) {
    const migrate = type.migrations[version];
    if (migrate === undefined) return { status: "corrupt" };
    fields = migrate(fields);
  }
  const value = type.parse(fields);
  return value === undefined ? { status: "corrupt" } : { status: "ok", value };
}

/** The text a value is stored as, at its type's current version. */
export function encodeDocument<T>(type: DocumentType<T>, value: T): string {
  const document = { schemaVersion: type.version, ...type.serialize(value) };
  return `${JSON.stringify(document, null, 2)}\n`;
}

/** A corrupt document that was replaced by its backup. */
export interface Recovery {
  readonly file: string;
  readonly documentType: string;
}

export interface DocumentStore {
  /** The document at its current version; undefined when it was never written. */
  read<T>(file: string, type: DocumentType<T>): Promise<T | undefined>;
  write<T>(file: string, type: DocumentType<T>, value: T): Promise<void>;
}

export interface DocumentStoreOptions {
  readonly onRecovered?: (recovery: Recovery) => void;
}

export function createDocumentStore(
  fileSystem: FileSystem,
  options: DocumentStoreOptions = {}
): DocumentStore {
  // One operation at a time per file, so two writes never share a temporary file.
  const queues = new Map<string, Promise<unknown>>();
  function serialized<R>(
    file: string,
    operation: () => Promise<R>
  ): Promise<R> {
    const previous = queues.get(file) ?? Promise.resolve();
    const next = previous.then(operation, operation);
    queues.set(
      file,
      next.catch(() => undefined)
    );
    return next;
  }

  async function replaceAtomically(target: string, text: string) {
    const temporary = `${target}.tmp`;
    await fileSystem.writeText(temporary, text);
    await fileSystem.rename(temporary, target);
  }

  async function write<T>(file: string, type: DocumentType<T>, value: T) {
    const text = encodeDocument(type, value);
    await fileSystem.makeDirectory(parentOf(file));
    const current = await fileSystem.readText(file);
    if (
      current !== undefined &&
      decodeDocument(current, type).status === "ok"
    ) {
      await replaceAtomically(`${file}.bak`, current);
    }
    await replaceAtomically(file, text);
  }

  async function read<T>(
    file: string,
    type: DocumentType<T>
  ): Promise<T | undefined> {
    const text = await fileSystem.readText(file);
    if (text === undefined) return undefined;
    const decoded = decodeDocument(text, type);
    switch (decoded.status) {
      case "ok":
        return decoded.value;
      case "tooNew":
        throw new DocumentError(
          "tooNew",
          file,
          `${file} was saved by a newer version of TTRPG Helper. Update the app to open it.`
        );
      case "corrupt":
        break;
    }
    const backup = await fileSystem.readText(`${file}.bak`);
    const fromBackup =
      backup === undefined ? undefined : decodeDocument(backup, type);
    if (backup === undefined || fromBackup?.status !== "ok") {
      throw new DocumentError(
        "corrupt",
        file,
        `${file} is damaged and its backup can't be read.`
      );
    }
    await replaceAtomically(file, backup);
    options.onRecovered?.({ file, documentType: type.name });
    return fromBackup.value;
  }

  return {
    read: (file, type) => serialized(file, () => read(file, type)),
    write: (file, type, value) =>
      serialized(file, () => write(file, type, value)),
  };
}
