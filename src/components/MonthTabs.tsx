import { useEffect, useRef } from "preact/hooks";
import { monthNames } from "../ui/i18n";

export function MonthTabs(props: {
  month: number;
  onSet: (m: number) => void;
}) {
  const names = monthNames();
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = tabsRef.current?.querySelector<HTMLButtonElement>(
      '.tab[aria-pressed="true"]',
    );
    active?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: "smooth",
    });
  }, [props.month]);

  const onKeyDown = (e: KeyboardEvent, m: number) => {
    let next: number | null = null;
    if (e.key === "ArrowLeft") next = m > 0 ? m - 1 : null;
    else if (e.key === "ArrowRight") next = m < 11 ? m + 1 : null;
    if (next !== null) {
      e.preventDefault();
      props.onSet(next);
      const btns = tabsRef.current?.querySelectorAll<HTMLButtonElement>(".tab");
      btns?.[next]?.focus();
    }
  };

  return (
    <div class="scroll-x">
      <div ref={tabsRef} class="tabs" role="group" aria-label="Month">
        {names.map((n, m) => (
          <button
            key={m}
            type="button"
            class="tab"
            aria-pressed={m === props.month}
            onClick={() => props.onSet(m)}
            onKeyDown={(e) => onKeyDown(e, m)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
