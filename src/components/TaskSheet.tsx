import { useState, useMemo } from "preact/hooks";
import { PALETTE, onColor } from "../state/palette";
import type { TaskItem, TaskGroup } from "../state/store";

export function TaskSheet(props: {
  open: boolean;
  tasks: TaskItem[];
  taskGroups: TaskGroup[];
  onClose: () => void;
  onAddTask: (text: string, groupId?: number) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (id: string, text: string, groupId?: number) => void;
  onDeleteTask: (id: string) => void;
  onCreateTaskGroup: (name: string, color: number) => number;
  onUpdateTaskGroup: (
    id: number,
    patch: { name?: string; color?: number },
  ) => void;
  onDeleteTaskGroup: (id: number) => void;
}) {
  if (!props.open) return null;

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [managingGroups, setManagingGroups] = useState(false);
  const [newText, setNewText] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editGroupId, setEditGroupId] = useState<number>(1);

  // Group creation state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(0);
  const [editingColorGroupId, setEditingColorGroupId] = useState<number | null>(
    null,
  );

  const groupMap = useMemo(() => {
    const map = new Map<number, TaskGroup>();
    for (const g of props.taskGroups) {
      map.set(g.id, g);
    }
    return map;
  }, [props.taskGroups]);

  // Fallback to null (All) or first group if selectedGroupId is deleted
  const currentGroupId =
    selectedGroupId !== null && !groupMap.has(selectedGroupId)
      ? null
      : selectedGroupId;

  const filteredTasks = useMemo(() => {
    if (currentGroupId === null) return props.tasks;
    return props.tasks.filter((t) => t.groupId === currentGroupId);
  }, [props.tasks, currentGroupId]);

  const { activeTasks, completedTasks } = useMemo(() => {
    const active: TaskItem[] = [];
    const completed: TaskItem[] = [];
    for (const t of filteredTasks) {
      if (t.done) {
        completed.push(t);
      } else {
        active.push(t);
      }
    }
    return { activeTasks: active, completedTasks: completed };
  }, [filteredTasks]);

  const handleAdd = (e?: Event) => {
    if (e) e.preventDefault();
    const val = newText.trim();
    if (!val) return;
    const targetGid =
      currentGroupId !== null ? currentGroupId : props.taskGroups[0]?.id || 1;
    props.onAddTask(val, targetGid);
    setNewText("");
  };

  const handleCreateGroup = (e?: Event) => {
    e?.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    const newId = props.onCreateTaskGroup(trimmed, newGroupColor);
    setNewGroupName("");
    setNewGroupColor((newGroupColor + 1) % PALETTE.length);
    setSelectedGroupId(newId);
  };

  const startEdit = (task: TaskItem) => {
    setEditingId(task.id);
    setEditText(task.text);
    setEditGroupId(task.groupId ?? props.taskGroups[0]?.id ?? 1);
  };

  const saveEdit = (id: string) => {
    const val = editText.trim();
    if (val) {
      props.onUpdateTask(id, val, editGroupId);
    }
    setEditingId(null);
  };

  const activeGroup =
    currentGroupId !== null ? groupMap.get(currentGroupId) : null;

  const renderTaskRow = (task: TaskItem) => {
    const isEditing = editingId === task.id;
    const g = groupMap.get(task.groupId) ?? props.taskGroups[0];
    const groupColor = g ? PALETTE[g.color] : PALETTE[0];
    const checkIconColor = onColor(groupColor);

    return (
      <div key={task.id} class="task-row">
        <button
          type="button"
          class={`task-chk${task.done ? " checked" : ""}`}
          style={
            task.done
              ? {
                  background: groupColor,
                  borderColor: groupColor,
                  color: checkIconColor,
                }
              : {
                  borderColor: groupColor,
                }
          }
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
          <div class="task-edit-wrap">
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
            {props.taskGroups.length > 1 && (
              <select
                class="task-group-select"
                value={editGroupId}
                onChange={(e) =>
                  setEditGroupId(
                    parseInt((e.target as HTMLSelectElement).value, 10),
                  )
                }
              >
                {props.taskGroups.map((tg) => (
                  <option key={tg.id} value={tg.id}>
                    {tg.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <span
            class={`task-text${task.done ? " task-done" : ""}`}
            style={
              task.done
                ? {
                    textDecorationColor: groupColor,
                  }
                : undefined
            }
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
          <b>{managingGroups ? "Manage Task Groups" : `Tasks (${activeTasks.length})`}</b>
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
          {managingGroups ? (
            <div class="task-manage-view">
              <div class="task-manage-bar">
                <button
                  type="button"
                  class="sh-install-btn task-back-btn"
                  onClick={() => setManagingGroups(false)}
                >
                  ← Back to tasks
                </button>
              </div>

              <form class="sh-new-form" onSubmit={handleCreateGroup}>
                <div class="sh-new-row">
                  <span
                    class="dot-preview"
                    style={{ background: PALETTE[newGroupColor] }}
                  />
                  <input
                    type="text"
                    class="sh-input"
                    placeholder="New group name..."
                    maxLength={24}
                    value={newGroupName}
                    onInput={(e) =>
                      setNewGroupName((e.target as HTMLInputElement).value)
                    }
                  />
                  <button
                    type="submit"
                    class="sh-btn-add"
                    disabled={!newGroupName.trim()}
                  >
                    Add
                  </button>
                </div>
                <div class="palette-swatches">
                  {PALETTE.map((hex, idx) => (
                    <button
                      key={hex}
                      type="button"
                      class={`swatch-btn${idx === newGroupColor ? " sel" : ""}`}
                      style={{ background: hex }}
                      aria-label={`Color ${idx + 1}`}
                      onClick={() => setNewGroupColor(idx)}
                    />
                  ))}
                </div>
              </form>

              <div class="sh-groups-list">
                {props.taskGroups.map((g) => {
                  const isColorPicking = editingColorGroupId === g.id;
                  const isOnly = props.taskGroups.length <= 1;
                  return (
                    <div key={g.id} class="sh-group-card">
                      <div class="sh-group-row">
                        <button
                          type="button"
                          class="sh-color-pill"
                          style={{ background: PALETTE[g.color] }}
                          title="Change color"
                          onClick={() =>
                            setEditingColorGroupId(
                              isColorPicking ? null : g.id,
                            )
                          }
                        />
                        <input
                          type="text"
                          class="sh-input-name"
                          maxLength={24}
                          value={g.name}
                          onInput={(e) =>
                            props.onUpdateTaskGroup(g.id, {
                              name: (e.target as HTMLInputElement).value,
                            })
                          }
                        />
                        <div class="sh-item-actions">
                          <button
                            type="button"
                            class="sh-icon-act sh-del"
                            title={
                              isOnly
                                ? "At least one group must remain"
                                : "Delete group"
                            }
                            disabled={isOnly}
                            onClick={() => props.onDeleteTaskGroup(g.id)}
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
                            >
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {isColorPicking && (
                        <div class="palette-swatches compact">
                          {PALETTE.map((hex, colorIdx) => (
                            <button
                              key={hex}
                              type="button"
                              class={`swatch-btn${colorIdx === g.color ? " sel" : ""}`}
                              style={{ background: hex }}
                              onClick={() => {
                                props.onUpdateTaskGroup(g.id, {
                                  color: colorIdx,
                                });
                                setEditingColorGroupId(null);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Group filter tabs */}
              <div class="task-tabs-bar">
                <div class="task-tabs-scroll">
                  <button
                    type="button"
                    class={`task-tab${currentGroupId === null ? " on" : ""}`}
                    onClick={() => setSelectedGroupId(null)}
                  >
                    All{" "}
                    <span class="task-tab-count">
                      {props.tasks.filter((t) => !t.done).length}
                    </span>
                  </button>
                  {props.taskGroups.map((g) => {
                    const count = props.tasks.filter(
                      (t) => t.groupId === g.id && !t.done,
                    ).length;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        class={`task-tab${currentGroupId === g.id ? " on" : ""}`}
                        onClick={() => setSelectedGroupId(g.id)}
                      >
                        <span
                          class="task-tab-dot"
                          style={{ background: PALETTE[g.color] }}
                        />
                        <span>{g.name}</span>
                        <span class="task-tab-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  class="task-tab-manage-btn"
                  title="Manage groups"
                  onClick={() => setManagingGroups(true)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>Groups</span>
                </button>
              </div>

              {/* Task add input */}
              <form class="task-add-form" onSubmit={handleAdd}>
                <div class="task-add-input-wrap">
                  {activeGroup && (
                    <span
                      class="task-add-group-dot"
                      style={{ background: PALETTE[activeGroup.color] }}
                      title={`Adding to ${activeGroup.name}`}
                    />
                  )}
                  <input
                    type="text"
                    class="sh-input task-add-input"
                    placeholder={
                      activeGroup
                        ? `Add a task to ${activeGroup.name}...`
                        : "Add a task..."
                    }
                    value={newText}
                    onInput={(e) =>
                      setNewText((e.target as HTMLInputElement).value)
                    }
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
                </div>
              </form>

              <div class="task-list">
                {activeTasks.length === 0 && completedTasks.length === 0 && (
                  <div class="sh-empty">
                    {currentGroupId === null
                      ? "No tasks yet"
                      : `No tasks in ${activeGroup?.name || "this group"}`}
                  </div>
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
                        transform: showCompleted
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
