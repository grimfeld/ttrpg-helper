import { describe, expect, it, vi } from "vitest";
import {
  createDocumentStore,
  createMemoryFileSystem,
  decodeDocument,
  DocumentError,
  type DocumentType,
  encodeDocument,
} from "../src/index";

interface Note {
  readonly text: string;
}

// Version 2 renamed `body` to `text`.
const noteDocument: DocumentType<Note> = {
  name: "note",
  version: 2,
  migrations: { 1: ({ body, ...rest }) => ({ ...rest, text: body }) },
  parse: ({ text }) => (typeof text === "string" ? { text } : undefined),
  serialize: ({ text }) => ({ text }),
};

describe("decodeDocument", () => {
  it("reads a document at the current version", () => {
    expect(
      decodeDocument('{"schemaVersion":2,"text":"hi"}', noteDocument)
    ).toEqual({ status: "ok", value: { text: "hi" } });
  });

  it("migrates an older document one version at a time", () => {
    expect(
      decodeDocument('{"schemaVersion":1,"body":"hi"}', noteDocument)
    ).toEqual({ status: "ok", value: { text: "hi" } });
  });

  it("refuses a document from a newer app", () => {
    expect(
      decodeDocument('{"schemaVersion":3,"text":"hi"}', noteDocument)
    ).toEqual({ status: "tooNew", version: 3 });
  });

  it.each([
    ["not JSON", "{"],
    ["not an object", "[1]"],
    ["no version", '{"text":"hi"}'],
    ["a version below 1", '{"schemaVersion":0,"text":"hi"}'],
    ["a fractional version", '{"schemaVersion":1.5,"text":"hi"}'],
    ["fields of the wrong type", '{"schemaVersion":2,"text":4}'],
  ])("calls %s corrupt", (_label, text) => {
    expect(decodeDocument(text, noteDocument)).toEqual({ status: "corrupt" });
  });

  it("calls a document corrupt when a migration is missing", () => {
    const gap: DocumentType<Note> = { ...noteDocument, version: 3 };
    expect(decodeDocument('{"schemaVersion":1,"body":"hi"}', gap)).toEqual({
      status: "corrupt",
    });
  });
});

describe("createDocumentStore", () => {
  it("writes the document with its version and reads it back", async () => {
    const fileSystem = createMemoryFileSystem();
    const store = createDocumentStore(fileSystem);
    await store.write("a/note.json", noteDocument, { text: "hi" });
    expect(fileSystem.files.get("a/note.json")).toBe(
      encodeDocument(noteDocument, { text: "hi" })
    );
    expect(await store.read("a/note.json", noteDocument)).toEqual({
      text: "hi",
    });
    expect(fileSystem.files.has("a/note.json.tmp")).toBe(false);
  });

  it("returns undefined for a document never written", async () => {
    const store = createDocumentStore(createMemoryFileSystem());
    expect(await store.read("missing.json", noteDocument)).toBeUndefined();
  });

  it("keeps the previous good copy as .bak", async () => {
    const fileSystem = createMemoryFileSystem();
    const store = createDocumentStore(fileSystem);
    await store.write("note.json", noteDocument, { text: "one" });
    await store.write("note.json", noteDocument, { text: "two" });
    expect(fileSystem.files.get("note.json.bak")).toBe(
      encodeDocument(noteDocument, { text: "one" })
    );
  });

  it("restores a corrupt document from its .bak and reports it", async () => {
    const fileSystem = createMemoryFileSystem({
      "note.json": "{ broken",
      "note.json.bak": encodeDocument(noteDocument, { text: "saved" }),
    });
    const onRecovered = vi.fn();
    const store = createDocumentStore(fileSystem, { onRecovered });
    expect(await store.read("note.json", noteDocument)).toEqual({
      text: "saved",
    });
    expect(onRecovered).toHaveBeenCalledWith({
      file: "note.json",
      documentType: "note",
    });
    expect(fileSystem.files.get("note.json")).toBe(
      fileSystem.files.get("note.json.bak")
    );
  });

  it("names the file when the document and its backup are unreadable", async () => {
    const store = createDocumentStore(
      createMemoryFileSystem({ "note.json": "{", "note.json.bak": "{" })
    );
    const read = store.read("note.json", noteDocument);
    await expect(read).rejects.toBeInstanceOf(DocumentError);
    await expect(read).rejects.toMatchObject({
      problem: "corrupt",
      file: "note.json",
      message: expect.stringContaining("note.json") as unknown,
    });
  });

  it("refuses a newer document and says to update the app", async () => {
    const store = createDocumentStore(
      createMemoryFileSystem({ "note.json": '{"schemaVersion":9,"text":"x"}' })
    );
    await expect(store.read("note.json", noteDocument)).rejects.toMatchObject({
      problem: "tooNew",
      message: expect.stringContaining("Update the app") as unknown,
    });
  });

  it("runs operations on one file one at a time", async () => {
    const fileSystem = createMemoryFileSystem();
    const store = createDocumentStore(fileSystem);
    await Promise.all([
      store.write("note.json", noteDocument, { text: "one" }),
      store.write("note.json", noteDocument, { text: "two" }),
    ]);
    expect(await store.read("note.json", noteDocument)).toEqual({
      text: "two",
    });
  });

  it("keeps working after a failed write", async () => {
    const fileSystem = createMemoryFileSystem();
    const failing = {
      ...fileSystem,
      writeText: () => Promise.reject(new Error("disk full")),
    };
    const store = createDocumentStore(failing);
    await expect(
      store.write("n.json", noteDocument, { text: "x" })
    ).rejects.toThrow("disk full");
    await expect(store.read("n.json", noteDocument)).resolves.toBeUndefined();
  });
});
