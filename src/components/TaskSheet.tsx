import { useState, useMemo } from "preact/hooks";
import type { TaskItem } from "../state/store";

export function TaskSheet(props: {
  open: boolean;
  tasks: TaskItem[];
  onClose: () => void;
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (id: string, text: string) => void;
  onDeleteTask: (id: string) => void;
}) {
  if (!props.open) return null;

  const [newText, setNewText] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const { activeTasks, completedTasks } = useMemo(() => {
    const active: TaskItem[] = [];
    const completed: TaskItem[] = [];
    for (const t of props.tasks) {
      if (t.done) {
        completed.push(t);
      } else {
        active.push(t);
      }
    }
    return { activeTasks: active, completedTasks: completed };
  }, [props.tasks]);

  const handleAdd = (e?: Event) => {
    if (e) e.preventDefault();
    const val = newText.trim();
    if (!val) return;
    props.onAddTask(val);
    setNewText("");
  };

  const startEdit = (task: TaskItem) => {
    setEditingId(task.id);
    setEditText(task.text);
  };

  const saveEdit = (id: string) => {
    const val = editText.trim();
    if (val) {
      props.onUpdateTask(id, val);
    }
    setEditingId(null);
  };

  const renderTaskRow = (task: TaskItem) => {
    const isEditing = editingId === task.id;
    return (
      <div key={task.id} class="task-row">
        <button
          type="button"
          class={`task-chk${task.done ? " checked" : ""}`}
          onClick={() => props.onToggleTask(task.id)}
          aria-label={task.done ? "Mark as incomplete" : "Mark as complete"}
        >
          {task.done && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {isEditing ? (
          <input
            type="text"
            class="sh-input task-edit-input"
            value={editText}
            autoFocus
            onInput={(e) => setEditText((e.target as HTMLInputElement).value)}
            onBlur={() => saveEdit(task.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEdit(task.id);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditingId(null);
              }
            }}
          />
        ) : (
          <span
            class={`task-text${task.done ? " task-done" : ""}`}
            title="Click to edit"
            onClick={() => startEdit(task)}
          >
            {task.text}
          </span>
        )}

        <button
          type="button"
          class="sh-icon-act sh-del"
          title="Delete task"
          aria-label={`Delete task ${task.text}`}
          onClick={() => props.onDeleteTask(task.id)}
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
    );
  };

  return (
    <>
      <div class="ovl" onClick={props.onClose} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Tasks">
        <div class="sh-head">
          <b>Tasks ({activeTasks.length})</b>
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
          <form class="task-add-form" onSubmit={handleAdd}>
            <input
              type="text"
              class="sh-input task-add-input"
              placeholder="Add a task..."
              value={newText}
              onInput={(e) => setNewText((e.target as HTMLInputElement).value)}
            />
            <button
              type="submit"
              class="task-add-btn"
              title="Add task"
              aria-label="Add task"
              disabled={!newText.trim()}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </form>

          <div class="task-list">
            {activeTasks.length === 0 && completedTasks.length === 0 && (
              <div class="sh-empty">No tasks yet</div>
            )}
            {activeTasks.map(renderTaskRow)}
          </div>

          {completedTasks.length > 0 && (
            <div class="task-completed-sec">
              <button
                type="button"
                class="task-completed-toggle"
                onClick={() => setShowCompleted(!showCompleted)}
                aria-expanded={showCompleted}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  style={{
                    transform: showCompleted ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                  }}
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span>Completed ({completedTasks.length})</span>
              </button>
              {showCompleted && (
                <div class="task-list task-list-completed">
                  {completedTasks.map(renderTaskRow)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
