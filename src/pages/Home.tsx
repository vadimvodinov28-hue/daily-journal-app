import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { loadFromStorage, saveToStorage } from "@/lib/storage";

const DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_RU = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

type Task = { id: number; text: string; done: boolean; time: string };

const today = new Date();
const todayKey = `tasks_${today.getFullYear()}_${today.getMonth()}_${today.getDate()}`;

const DEFAULT_TASKS: Task[] = [
  { id: 1, text: "Утренняя пробежка", done: false, time: "07:00" },
  { id: 2, text: "Встреча с командой", done: false, time: "10:00" },
  { id: 3, text: "Написать отчёт", done: false, time: "14:00" },
  { id: 4, text: "Позвонить родителям", done: false, time: "19:00" },
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(() =>
    loadFromStorage<Task[]>(todayKey, DEFAULT_TASKS)
  );
  const [newTask, setNewTask] = useState("");
  const [newTime, setNewTime] = useState("");
  const [showTimeInput, setShowTimeInput] = useState(false);

  useEffect(() => {
    saveToStorage(todayKey, tasks);
  }, [tasks]);

  const dayName = DAYS_RU[today.getDay()];
  const dateStr = `${today.getDate()} ${MONTHS_RU[today.getMonth()]} ${today.getFullYear()}`;

  const toggle = (id: number) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: Date.now(), text: newTask.trim(), done: false, time: newTime },
    ]);
    setNewTask("");
    setNewTime("");
    setShowTimeInput(false);
  };

  const removeTask = (id: number) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const done = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="px-6 py-8 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase mb-1">
          {dayName}
        </p>
        <h1 className="font-display text-4xl text-foreground leading-tight">
          {dateStr}
        </h1>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Выполнено задач</span>
          <span className="text-sm font-semibold text-foreground">{done}/{tasks.length}</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-2 mb-8">
        {tasks.map((task, i) => (
          <div
            key={task.id}
            className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-foreground/30 transition-all group animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <button
              onClick={() => toggle(task.id)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                task.done
                  ? "bg-foreground border-foreground"
                  : "border-border group-hover:border-foreground/50"
              }`}
            >
              {task.done && <Icon name="Check" size={11} className="text-background" />}
            </button>
            <div className="flex-1 cursor-pointer" onClick={() => toggle(task.id)}>
              <p
                className={`text-sm font-medium transition-all ${
                  task.done ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {task.text}
              </p>
            </div>
            {task.time && (
              <span className="text-xs text-muted-foreground font-medium">{task.time}</span>
            )}
            <button
              onClick={() => removeTask(task.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Icon name="X" size={13} />
            </button>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Задач нет — отличный день!
          </div>
        )}
      </div>

      {/* Add Task */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Добавить задачу..."
            className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
          />
          <button
            onClick={() => setShowTimeInput(!showTimeInput)}
            className={`w-12 h-12 border rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              showTimeInput ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:border-foreground/40"
            }`}
          >
            <Icon name="Clock" size={16} />
          </button>
          <button
            onClick={addTask}
            className="w-12 h-12 bg-foreground text-background rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <Icon name="Plus" size={18} />
          </button>
        </div>
        {showTimeInput && (
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-foreground/40 transition-colors animate-fade-in"
          />
        )}
      </div>

      {/* Quote */}
      <div className="mt-8 pt-6 border-t border-border">
        <p className="font-display text-lg italic text-muted-foreground leading-relaxed">
          «Лучший способ предсказать будущее — создать его»
        </p>
      </div>
    </div>
  );
}
