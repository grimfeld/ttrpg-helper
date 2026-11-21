// The Media panel, in the Campaign view's right column: the Campaign's images and Import.
import type { MediaState } from "./useMediaLibrary";

export function MediaPanel({ media, importing, importImages }: MediaState) {
  return (
    <section className="media-panel" aria-label="Media">
      <header className="panel-header">
        <h2>Media</h2>
        <button
          type="button"
          disabled={importing}
          aria-busy={importing}
          onClick={() => void importImages()}
        >
          {importing && <span className="spinner" aria-hidden="true" />}
          {importing ? "Importing…" : "Import"}
        </button>
      </header>
      {media.length === 0 ? (
        <p className="empty">No images yet</p>
      ) : (
        <ul className="media-list">
          {media.map((item) => (
            <li key={item.id} title={item.originalName}>
              {item.originalName}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
