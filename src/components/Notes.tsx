import { useStore } from "../state/store";

export function Notes(props: {
  year: number;
  month: number;
  day: number;
  locked?: boolean;
}) {
  const ui = useStore();
  const dateKey = `${props.year}-${String(props.month + 1).padStart(2, "0")}-${String(props.day).padStart(2, "0")}`;
  const currentText = ui.notes[dateKey] ?? "";

  const handleChange = (val: string) => {
    if (props.locked) return;
    ui.setNote(dateKey, val);
  };

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(props.year, props.month, props.day));

  return (
    <section class="notes-sec" aria-label={`Notes for ${formattedDate}`}>
      <div class="notes-head">
        <span class="notes-title">Notes — {formattedDate}</span>
        {props.locked && (
          <span
            class="notes-locked-badge"
            title="Calendar and notes are locked"
          >
            Locked
          </span>
        )}
      </div>
      <textarea
        class="notes-input"
        value={currentText}
        placeholder={
          props.locked ? "Notes locked" : `Add note for ${formattedDate}...`
        }
        rows={3}
        disabled={props.locked}
        readOnly={props.locked}
        aria-disabled={props.locked}
        onInput={(e) => handleChange((e.target as HTMLTextAreaElement).value)}
      />
    </section>
  );
}
