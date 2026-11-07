import { Dropdown } from "./Menu";
import { PALETTE } from "../state/palette";
import type { Group } from "../state/hash";

export function GroupSelect(props: {
  groups: Group[];
  sel: number;
  onSelect: (i: number) => void;
}) {
  const cur = props.groups[props.sel] ?? props.groups[0];
  return (
    <Dropdown
      label={
        <>
          <span class="dot" style={{ background: PALETTE[cur.color] }} />
          <span class="dd-cur">{cur.name}</span>
        </>
      }
    >
      {props.groups.map((g, i) => (
        <button
          key={g.name}
          type="button"
          class={`dd-item${i === props.sel ? " on" : ""}`}
          onClick={() => props.onSelect(i)}
        >
          <span class="dot" style={{ background: PALETTE[g.color] }} />
          <span class="dd-name">{g.name}</span>
          {i === props.sel && <span class="dd-check">✓</span>}
        </button>
      ))}
      <button
        type="button"
        class="dd-item dd-new"
        disabled
        title="coming in the logic step"
      >
        + New group
      </button>
    </Dropdown>
  );
}
