// The Scene editor, in the Campaign view's centre: name, Scene title, the 16:9 canvas and its
// Background placements.
import {
  addBackground,
  checkSceneName,
  checkSceneTitle,
  deleteScene,
  type Fit,
  type Media,
  removeBackground,
  renameScene,
  type Scene,
  SCENE_NAME_MAX_LENGTH,
  SCENE_TITLE_MAX_LENGTH,
  type TextCheck,
  setBackgroundFit,
  setBackgroundVisible,
  setSceneTitle,
  updateScene,
} from "@ttrpg-helper/core";
import { useState } from "react";
import { MediaPicker } from "./MediaPicker";
import type { Platform } from "./platform";
import { SceneImage } from "./SceneImage";
import type { ScenesEdit } from "./useScenes";

interface Props {
  readonly campaignId: string;
  readonly scene: Scene;
  readonly media: readonly Media[];
  readonly platform: Platform;
  readonly apply: (edit: ScenesEdit) => void;
}

export function SceneEditor({
  campaignId,
  scene,
  media,
  platform,
  apply,
}: Props) {
  const [picking, setPicking] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const edit = (change: (scene: Scene) => Scene) => {
    apply((scenes) => updateScene(scenes, scene.id, change));
  };
  const mediaById = (id: string) => media.find((item) => item.id === id);

  return (
    <section className="scene-editor" aria-label="Scene editor">
      <div className="scene-fields">
        <TextField
          key={`name-${scene.id}`}
          label="Scene name"
          value={scene.name}
          maxLength={SCENE_NAME_MAX_LENGTH}
          check={checkSceneName}
          onSave={(value) => {
            edit(renameScene(value));
          }}
        />
        <TextField
          key={`title-${scene.id}`}
          label="Scene title"
          value={scene.title}
          maxLength={SCENE_TITLE_MAX_LENGTH}
          check={checkSceneTitle}
          onSave={(value) => {
            edit(setSceneTitle(value));
          }}
        />
        {confirmingDelete ? (
          <div className="confirm" role="alertdialog" aria-label="Delete Scene">
            <span>Delete “{scene.name}”? This can't be undone.</span>
            <button
              type="button"
              className="danger"
              onClick={() => {
                apply((scenes) => deleteScene(scenes, scene.id));
              }}
            >
              Delete
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setConfirmingDelete(false);
              }}
            >
              Keep it
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirmingDelete(true);
            }}
          >
            Delete Scene
          </button>
        )}
      </div>

      <div className="canvas" aria-label="Canvas">
        {scene.backgrounds.map((background) => (
          <SceneImage
            key={background.id}
            campaignId={campaignId}
            media={mediaById(background.mediaId)}
            fit={background.fit}
            hidden={!background.visible}
            platform={platform}
          />
        ))}
      </div>

      <div className="placements-header">
        <h3>Backgrounds</h3>
        <button
          type="button"
          aria-expanded={picking}
          onClick={() => {
            setPicking(!picking);
          }}
        >
          Add Background
        </button>
      </div>
      {picking && (
        <MediaPicker
          media={media}
          onPick={(mediaId) => {
            setPicking(false);
            edit(addBackground(platform.newId(), mediaId));
          }}
        />
      )}
      {scene.backgrounds.length > 0 && (
        <ol className="placements" aria-label="Backgrounds, top last">
          {scene.backgrounds.map((background) => {
            const name =
              mediaById(background.mediaId)?.originalName ?? "Missing image";
            return (
              <li
                key={background.id}
                className={background.visible ? "" : "hidden"}
              >
                <span className="placement-name" title={name}>
                  {name}
                </span>
                <select
                  aria-label={`Fit of ${name}`}
                  value={background.fit}
                  onChange={(event) => {
                    edit(
                      setBackgroundFit(background.id, event.target.value as Fit)
                    );
                  }}
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                </select>
                <button
                  type="button"
                  aria-pressed={background.visible}
                  onClick={() => {
                    edit(
                      setBackgroundVisible(background.id, !background.visible)
                    );
                  }}
                >
                  {background.visible ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  onClick={() => {
                    edit(removeBackground(background.id));
                  }}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** A text field saved on Enter or when it loses focus; it says why a value can't be saved. */
function TextField({
  label,
  value,
  maxLength,
  check,
  onSave,
}: {
  readonly label: string;
  readonly value: string;
  readonly maxLength: number;
  readonly check: (input: string) => TextCheck;
  readonly onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const result = check(draft);
  const id = label.toLowerCase().replaceAll(" ", "-");
  const save = () => {
    if (result.ok && result.value !== value) onSave(result.value);
  };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={draft}
        // Typing a little past the limit lets the field say why the value is too long.
        maxLength={maxLength + 20}
        aria-invalid={!result.ok}
        aria-describedby={result.ok ? undefined : `${id}-problem`}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
        }}
      />
      {!result.ok && (
        <p id={`${id}-problem`} className="field-problem">
          {result.reason}
        </p>
      )}
    </div>
  );
}
