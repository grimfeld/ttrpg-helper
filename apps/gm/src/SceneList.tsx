// The Scene list, in the Campaign view's left column.
import type { Scene } from "@ttrpg-helper/core";

interface Props {
  readonly scenes: readonly Scene[];
  readonly selectedId: string | undefined;
  readonly activeId: string | null;
  readonly onSelect: (sceneId: string) => void;
  readonly onNew: () => void;
}

export function SceneList({
  scenes,
  selectedId,
  activeId,
  onSelect,
  onNew,
}: Props) {
  return (
    <section className="scene-list" aria-label="Scenes">
      <header className="panel-header">
        <h2>Scenes</h2>
        <button type="button" onClick={onNew}>
          New Scene
        </button>
      </header>
      {scenes.length === 0 ? (
        <p className="empty">No Scenes yet</p>
      ) : (
        <ul>
          {scenes.map((scene) => (
            <li key={scene.id}>
              <button
                type="button"
                className="scene-row"
                aria-current={scene.id === selectedId ? "true" : undefined}
                title={scene.name}
                onClick={() => {
                  onSelect(scene.id);
                }}
              >
                <span className="scene-row-name">{scene.name}</span>
                {scene.id === activeId && (
                  <span className="on-air-mark" title="This Scene is on air">
                    Active
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
