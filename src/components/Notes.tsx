import { useEffect, useRef, useState } from "preact/hooks";
import { idbGet, idbSet } from "../state/db";

export type NotesMap = Record<string, string>;

export function Notes(props: {
  year: number;
  month: number;
  day: number;
  locked?: boolean;
}) {
  const [notes, setNotes] = useState<NotesMap>({});
  const saveTimer = useRef<number | null>(null);
  const notesRef = useRef<NotesMap>({});

  useEffect(() => {
    idbGet<NotesMap>("notes").then((loaded) => {
      if (loaded) {
        setNotes(loaded);
        notesRef.current = loaded;
      }
    });
  }, []);

  const scheduleSave = (next: NotesMap) => {
    notesRef.current = next;
    if (saveTimer.current !== null) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      idbSet("notes", next);
      saveTimer.current = null;
    }, 500);
  };

  useEffect(() => {
    const flush = () => {
      if (saveTimer.current !== null) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        idbSet("notes", notesRef.current);
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, []);

  const dateKey = `${props.year}-${String(props.month + 1).padStart(2, "0")}-${String(props.day).padStart(2, "0")}`;
  const currentText = notes[dateKey] ?? "";

  const handleChange = (val: string) => {
    if (props.locked) return;
    const next = { ...notes, [dateKey]: val };
    setNotes(next);
    scheduleSave(next);
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
