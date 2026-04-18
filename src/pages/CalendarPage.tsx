import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  getAllTasks, saveTasks,
  CATEGORIES, PRIORITIES,
  type Task, type TaskPriority, type TaskCategory,
} from "@/lib/tasks";

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type AddForm = {
  text: string;
  time: string;
  priority: TaskPriority;
  category: TaskCategory;
};

const EMPTY_FORM: AddForm = { text: "", time: "", priority: "medium", category: "personal" };

export default function CalendarPage() {
  const today = new Date();
  const todayKey = today.toISOString().split("T")[0];

  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(todayKey);
  const [allTasks, setAllTasks] = useState<Task[]>(() => getAllTasks());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);

  useEffect(() => {
    saveTasks(allTasks);
  }, [allTasks]);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const toKey = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const dayTasks = allTasks.filter((t) => t.date === selected);

  const hasTasksOnDate = (key: string) => allTasks.some((t) => t.date === key);

  const toggleTask = (id: number) =>
    setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const removeTask = (id: number) =>
    setAllTasks((prev) => prev.filter((t) => t.id !== id));

  const addTask = () => {
    if (!form.text.trim()) return;
    const newTask: Task = {
      id: Date.now(),
      text: form.text.trim(),
      done: false,
      time: form.time,
      date: selected,
      priority: form.priority,
      category: form.category,
    };
    setAllTasks((prev) => [...prev, newTask]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const getCatMeta = (v: TaskCategory) => CATEGORIES.find((c) => c.value === v)!;
  const getPrioMeta = (v: TaskPriority) => PRIORITIES.find((p) => p.value === v)!;

  const formatSelectedDate = () => {
    if (selected === todayKey) return "Сегодня";
    const [y, m, d] = selected.split("-");
    return `${Number(d)} ${MONTHS_RU[Number(m) - 1].toLowerCase().slice(0, 3)} ${y}`;
  };

  return (
    <div className="px-6 py-8 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl text-foreground">{MONTHS_RU[month]}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{year}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrent(new Date(year, month - 1, 1))}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <Icon name="ChevronLeft" size={16} />
          </button>
          <button
            onClick={() => setCurrent(new Date(year, month + 1, 1))}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <Icon name="ChevronRight" size={16} />
          </button>
        </div>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = toKey(day);
          const isToday = key === todayKey;
          const isSelected = key === selected;
          const hasTasks = hasTasksOnDate(key);

          return (
            <button
              key={key}
              onClick={() => { setSelected(key); setShowForm(false); }}
              className={`relative aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all
                ${isSelected ? "bg-foreground text-background" : ""}
                ${isToday && !isSelected ? "border border-foreground text-foreground" : ""}
                ${!isSelected && !isToday ? "text-foreground hover:bg-secondary" : ""}
              `}
            >
              {day}
              {hasTasks && (
                <span
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                    isSelected ? "bg-background" : "bg-accent"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day */}
      <div className="animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">{formatSelectedDate()}</p>
          <button
            onClick={() => { setShowForm(!showForm); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name={showForm ? "X" : "Plus"} size={13} />
            {showForm ? "Отмена" : "Добавить"}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="mb-4 bg-card border border-border rounded-2xl p-4 space-y-3 animate-scale-in">
            <input
              autoFocus
              type="text"
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Название задачи..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
            />

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium block mb-1">Время</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40 transition-colors"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium block mb-1.5">Тип</label>
              <div className="grid grid-cols-4 gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat.value })}
                    className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border text-[10px] font-medium transition-all ${
                      form.category === cat.value
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-sm">{cat.emoji}</span>
                    <span className={form.category === cat.value ? "text-background" : ""}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium block mb-1.5">Приоритет</label>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p.value })}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border text-[11px] font-medium transition-all ${
                      form.priority === p.value
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${form.priority === p.value ? "bg-background" : p.dot}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={addTask}
              className="w-full py-2.5 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Добавить задачу
            </button>
          </div>
        )}

        {/* Task list */}
        {dayTasks.length > 0 ? (
          <div className="space-y-2">
            {dayTasks
              .sort((a, b) => {
                const order: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
                return order[a.priority] - order[b.priority];
              })
              .map((task) => {
                const cat = getCatMeta(task.category);
                const prio = getPrioMeta(task.priority);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl group hover:border-foreground/20 transition-all"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${prio.dot}`} />
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        task.done ? "bg-foreground border-foreground" : "border-border"
                      }`}
                    >
                      {task.done && <Icon name="Check" size={10} className="text-background" />}
                    </button>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleTask(task.id)}>
                      <p className={`text-sm font-medium truncate ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.text}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${cat.color}`}>
                          {cat.emoji} {cat.label}
                        </span>
                        {task.time && (
                          <span className="text-[10px] text-muted-foreground">{task.time}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
                    >
                      <Icon name="X" size={13} />
                    </button>
                  </div>
                );
              })}
          </div>
        ) : !showForm ? (
          <div
            className="p-4 bg-muted rounded-xl text-center cursor-pointer hover:bg-secondary transition-colors"
            onClick={() => setShowForm(true)}
          >
            <p className="text-sm text-muted-foreground">Задач нет — нажми, чтобы добавить</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
