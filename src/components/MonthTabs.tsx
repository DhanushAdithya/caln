import { monthNames } from "../ui/i18n";

/** Section 3 — Jan…Dec as radio-acting buttons. Scrollable mobile, bleeding desktop. */
export function MonthTabs(props: {
  month: number;
  onSet: (m: number) => void;
}) {
  const names = monthNames();
  return (
    <div class="scroll-x">
      <div class="tabs" role="group" aria-label="Month">
        {names.map((n, m) => (
          <button
            key={m}
            type="button"
            class="tab"
            aria-pressed={m === props.month}
            onClick={() => props.onSet(m)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
