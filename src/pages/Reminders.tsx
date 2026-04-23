import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { syncRemindersToServer } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/auth";

const STORAGE_KEY = "reminders_data";

type Reminder = {
  id: number;
  title: string;
  time: string;
  repeat: string;
  active: boolean;
  emoji: string;
};

const DEFAULT_REMINDERS: Reminder[] = [
  { id: 1, title: "Выпить воды", time: "09:00", repeat: "Каждый день", active: true, emoji: "💧" },
  { id: 2, title: "Проверить почту", time: "10:30", repeat: "По будням", active: true, emoji: "📬" },
  { id: 3, title: "Обед", time: "13:00", repeat: "Каждый день", active: false, emoji: "🥗" },
  { id: 4, title: "Вечерняя прогулка", time: "19:30", repeat: "Каждый день", active: true, emoji: "🌙" },
];

const REPEAT_OPTIONS = ["Каждый день", "По будням", "По выходным", "Один раз", "По неделям"];

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>(() =>
    loadFromStorage<Reminder[]>(STORAGE_KEY, DEFAULT_REMINDERS)
  );
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", time: "09:00", repeat: "Каждый день" });

  useEffect(() => {
    saveToStorage(STORAGE_KEY, reminders);
    const user = getCurrentUser();
    if (user) {
      syncRemindersToServer(user.id, reminders.map(r => ({
        id: r.id,
        title: r.title,
        time: r.time,
        repeat: r.repeat,
        enabled: r.active,
      })));
    }
  }, [reminders]);

  const toggle = (id: number) =>
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));

  const remove = (id: number) =>
    setReminders((prev) => prev.filter((r) => r.id !== id));

  const save = () => {
    if (!form.title.trim()) return;
    setReminders((prev) => [
      ...prev,
      { id: Date.now(), title: form.title.trim(), time: form.time, repeat: form.repeat, active: true, emoji: "🔔" },
    ]);
    setForm({ title: "", time: "09:00", repeat: "Каждый день" });
    setAdding(false);
  };

  const activeCount = reminders.filter((r) => r.active).length;

  return (
    <div className="px-6 py-8 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl text-foreground">Напоминания</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCount} активных из {reminders.length}
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <Icon name="Plus" size={15} />
          Новое
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-6 p-5 bg-card border border-border rounded-2xl animate-scale-in space-y-4">
          <p className="text-sm font-semibold text-foreground">Новое напоминание</p>
          <input
            autoFocus
            type="text"
            placeholder="Название..."
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
          />
          <div className="flex gap-3">
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground/40 transition-colors"
            />
            <select
              value={form.repeat}
              onChange={(e) => setForm({ ...form, repeat: e.target.value })}
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground/40 transition-colors"
            >
              {REPEAT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              className="flex-1 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Сохранить
            </button>
            <button
              onClick={() => setAdding(false)}
              className="flex-1 py-2.5 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Reminders list */}
      <div className="space-y-3">
        {reminders.map((r, i) => (
          <div
            key={r.id}
            className={`flex items-center gap-4 p-4 bg-card border rounded-xl transition-all animate-slide-up group ${
              r.active ? "border-border" : "border-border opacity-50"
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="text-2xl flex-shrink-0">{r.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {r.time} · {r.repeat}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggle(r.id)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  r.active ? "bg-foreground" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-background rounded-full transition-all ${
                    r.active ? "left-6" : "left-1"
                  }`}
                />
              </button>
              <button
                onClick={() => remove(r.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          </div>
        ))}

        {reminders.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Напоминаний нет
          </div>
        )}
      </div>
    </div>
  );
}