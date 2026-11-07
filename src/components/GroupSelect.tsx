import { Dropdown } from "./Menu";
import { PALETTE } from "../state/palette";
import type { Group } from "../state/hash";

export function GroupSelect(props: {
  groups: Group[];
  sel: number;
  onSelect: (i: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onNew: () => void;
}) {
  const cur = props.groups[props.sel] ?? props.groups[0];

  return (
    <Dropdown
      label={
        cur ? (
          <>
            <span class="dot" style={{ background: PALETTE[cur.color] }} />
            <span class="dd-cur">{cur.name}</span>
          </>
        ) : (
          <>
            <span class="dot" style={{ background: "var(--muted)" }} />
            <span class="dd-cur">Add group</span>
          </>
        )
      }
    >
      {props.groups.length === 0 ? (
        <div class="dd-empty">No groups yet</div>
      ) : (
        props.groups.map((g, i) => (
          <div key={g.id} class={`dd-row${i === props.sel ? " on" : ""}`}>
            <button
              type="button"
              class="dd-pick"
              onClick={() => props.onSelect(i)}
            >
              <span class="dot" style={{ background: PALETTE[g.color] }} />
              <span class="dd-name">{g.name}</span>
              {i === props.sel && <span class="dd-check">✓</span>}
            </button>
            <div class="dd-actions">
              <button
                type="button"
                class="dd-icon-btn"
                title={`Edit ${g.name}`}
                aria-label={`Edit ${g.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onEdit(g.id);
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
              <button
                type="button"
                class="dd-icon-btn dd-del-btn"
                title={`Delete ${g.name}`}
                aria-label={`Delete ${g.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onDelete(g.id);
                }}
              >
                <svg
                  width="13"
                  height="13"
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
        ))
      )}
      <button type="button" class="dd-item dd-new" onClick={props.onNew}>
        + New group
      </button>
    </Dropdown>
  );
}
