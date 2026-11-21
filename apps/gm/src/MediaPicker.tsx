// Picks one of the Campaign's Media to place in the Selected Scene.
import type { Media } from "@ttrpg-helper/core";

interface Props {
  readonly media: readonly Media[];
  readonly onPick: (mediaId: string) => void;
}

export function MediaPicker({ media, onPick }: Props) {
  if (media.length === 0) {
    return (
      <p className="empty">No images yet: import some in the Media panel.</p>
    );
  }
  return (
    <ul className="media-picker" aria-label="Choose an image">
      {media.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            title={item.originalName}
            onClick={() => {
              onPick(item.id);
            }}
          >
            {item.originalName}
          </button>
        </li>
      ))}
    </ul>
  );
}
