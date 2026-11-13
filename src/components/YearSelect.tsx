import { Dropdown } from "./Menu";

const SPAN = 5;

export function YearSelect(props: {
  year: number;
  onSet: (y: number) => void;
}) {
  const years: number[] = [];
  for (let y = props.year - SPAN; y <= props.year + SPAN; y++) years.push(y);
  return (
    <Dropdown
      align="right"
      label={<span class="dd-cur">{props.year}</span>}
      menuClass="yr-menu"
    >
      {years.map((y) => (
        <button
          key={y}
          type="button"
          class={`dd-item${y === props.year ? " on" : ""}`}
          onClick={() => props.onSet(y)}
        >
          {y}
          {y === props.year && <span class="dd-check">✓</span>}
        </button>
      ))}
    </Dropdown>
  );
}
