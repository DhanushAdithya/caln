import { useState } from "preact/hooks";
import { PALETTE } from "../state/palette";
import type { Group } from "../state/hash";

export function EditSheet(props: {
  open: boolean;
  groups: Group[];
  activeId: number | null;
  onClose: () => void;
  onCreate: (name: string, color: number) => void;
  onUpdate: (id: number, patch: { name?: string; color?: number }) => void;
  onDelete: (id: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  if (!props.open) return null;

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(0);
  const [editingColorGroupId, setEditingColorGroupId] = useState<number | null>(
    null,
  );

  const handleCreate = (e?: Event) => {
    e?.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    props.onCreate(trimmed, newColor);
    setNewName("");
    setNewColor((newColor + 1) % PALETTE.length);
  };

  return (
    <>
      <div class="ovl" onClick={props.onClose} />
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Manage Groups"
      >
        <div class="sh-head">
          <b>Manage Groups</b>
          <button
            type="button"
            class="icon-btn"
            aria-label="Close"
            onClick={props.onClose}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div class="sh-body">
          <form class="sh-new-form" onSubmit={handleCreate}>
            <div class="sh-new-row">
              <span
                class="dot-preview"
                style={{ background: PALETTE[newColor] }}
              />
              <input
                type="text"
                class="sh-input"
                placeholder="New group name..."
                maxLength={24}
                value={newName}
                onInput={(e) =>
                  setNewName((e.target as HTMLInputElement).value)
                }
              />
              <button
                type="submit"
                class="sh-btn-add"
                disabled={!newName.trim()}
              >
                Add
              </button>
            </div>
            <div class="palette-swatches">
              {PALETTE.map((hex, idx) => (
                <button
                  key={hex}
                  type="button"
                  class={`swatch-btn${idx === newColor ? " sel" : ""}`}
                  style={{ background: hex }}
                  aria-label={`Color ${idx + 1}`}
                  onClick={() => setNewColor(idx)}
                />
              ))}
            </div>
          </form>

          <div class="sh-groups-list">
            {props.groups.length === 0 ? (
              <div class="sh-empty">No groups yet. Add one above!</div>
            ) : (
              props.groups.map((g, idx) => {
                const isColorPicking = editingColorGroupId === g.id;
                return (
                  <div key={g.id} class="sh-group-card">
                    <div class="sh-group-row">
                      <button
                        type="button"
                        class="sh-color-pill"
                        style={{ background: PALETTE[g.color] }}
                        title="Change color"
                        onClick={() =>
                          setEditingColorGroupId(isColorPicking ? null : g.id)
                        }
                      />
                      <input
                        type="text"
                        class="sh-input-name"
                        maxLength={24}
                        value={g.name}
                        onInput={(e) =>
                          props.onUpdate(g.id, {
                            name: (e.target as HTMLInputElement).value,
                          })
                        }
                      />
                      <div class="sh-item-actions">
                        <button
                          type="button"
                          class="sh-icon-act"
                          disabled={idx === 0}
                          title="Move up"
                          onClick={() => props.onReorder(idx, idx - 1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          class="sh-icon-act"
                          disabled={idx === props.groups.length - 1}
                          title="Move down"
                          onClick={() => props.onReorder(idx, idx + 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          class="sh-icon-act sh-del"
                          title="Delete group"
                          onClick={() => props.onDelete(g.id)}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {isColorPicking && (
                      <div class="palette-swatches compact">
                        {PALETTE.map((hex, colorIdx) => (
                          <button
                            key={hex}
                            type="button"
                            class={`swatch-btn${colorIdx === g.color ? " sel" : ""}`}
                            style={{ background: hex }}
                            onClick={() => {
                              props.onUpdate(g.id, { color: colorIdx });
                              setEditingColorGroupId(null);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
