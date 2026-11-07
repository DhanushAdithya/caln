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
      </div>
    </div>
  );
}

