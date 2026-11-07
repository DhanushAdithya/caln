import type { ToastData } from "../state/store";

export function Toast(props: {
  toast: ToastData | null;
  onDismiss: () => void;
}) {
  if (!props.toast) return null;
  return (
    <div class="toast-wrap">
      <div class="toast" role="status" aria-live="polite">
        <span class="toast-msg">{props.toast.message}</span>
        {props.toast.action && (
          <button
            type="button"
            class="toast-act"
            onClick={() => {
              props.toast?.action?.onClick();
              props.onDismiss();
            }}
          >
            {props.toast.action.label}
          </button>
        )}
        <button
          type="button"
          class="toast-close"
          aria-label="Dismiss"
          onClick={props.onDismiss}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
