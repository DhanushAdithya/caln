import { useState, useMemo } from "preact/hooks";

interface NoteEntry {
  key: string;
  year: number;
  month: number;
  day: number;
  text: string;
  formattedDate: string;
}

function parseDateKey(key: string): { y: number; m: number; d: number } | null {
  const parts = key.split(/[-/]/);
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return { y, m, d };
    }
  }
  const timestamp = Date.parse(key);
  if (!isNaN(timestamp)) {
    const dt = new Date(timestamp);
    return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() };
  }
  return null;
}

export function NotesSheet(props: {
  open: boolean;
  notes: Record<string, string>;
  onClose: () => void;
  onSelectDate: (y: number, m: number, d: number) => void;
  onDeleteNote: (key: string) => void;
}) {
  if (!props.open) return null;

  const [query, setQuery] = useState("");

  const entries: NoteEntry[] = useMemo(() => {
    const list: NoteEntry[] = [];
    const df = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    for (const [key, rawText] of Object.entries(props.notes || {})) {
      const text =
        typeof rawText === "string"
          ? rawText.trim()
          : String(rawText || "").trim();
      if (!text) continue;

      const parsed = parseDateKey(key);
      if (!parsed) continue;

      const dateObj = new Date(parsed.y, parsed.m, parsed.d);
      list.push({
        key,
        year: parsed.y,
        month: parsed.m,
        day: parsed.d,
        text,
        formattedDate: df.format(dateObj),
      });
    }

    list.sort((a, b) => b.key.localeCompare(a.key));
    return list;
  }, [props.notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.text.toLowerCase().includes(q) ||
        e.formattedDate.toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <>
      <div class="ovl" onClick={props.onClose} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Notes">
        <div class="sh-head">
          <b>Notes ({entries.length})</b>
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
          {entries.length > 2 && (
            <div style={{ paddingBlock: "8px 2px" }}>
              <input
                type="text"
                class="sh-input"
                style={{ width: "100%" }}
                placeholder="Search notes..."
                value={query}
                onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
              />
            </div>
          )}

          <div class="notes-list">
            {filtered.length === 0 ? (
              <div class="sh-empty">
                {entries.length === 0 ? "No notes yet" : "No matching notes"}
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.key}
                  role="button"
                  tabIndex={0}
                  class="notes-item"
                  onClick={() =>
                    props.onSelectDate(item.year, item.month, item.day)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      props.onSelectDate(item.year, item.month, item.day);
                    }
                  }}
                >
                  <div class="notes-item-head">
                    <span class="notes-item-date">{item.formattedDate}</span>
                    <button
                      type="button"
                      class="sh-icon-act sh-del"
                      title="Delete note"
                      aria-label={`Delete note for ${item.formattedDate}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onDeleteNote(item.key);
                      }}
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
                        aria-hidden="true"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                  <div class="notes-item-snip">{item.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
