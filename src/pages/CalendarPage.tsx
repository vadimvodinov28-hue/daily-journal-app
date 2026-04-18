import { useState } from "react";
import Icon from "@/components/ui/icon";

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];
const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const EVENTS: Record<string, string[]> = {
  "2026-04-18": ["Встреча с командой 10:00", "Отчёт 14:00"],
  "2026-04-21": ["День рождения Анны"],
  "2026-04-25": ["Конференция весь день"],
};

export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(
    today.toISOString().split("T")[0]
  );

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const toKey = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const todayKey = today.toISOString().split("T")[0];

  const selectedEvents = selected ? EVENTS[selected] || [] : [];

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
          const hasEvents = !!EVENTS[key];

          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`relative aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all
                ${isSelected ? "bg-foreground text-background" : ""}
                ${isToday && !isSelected ? "border border-foreground text-foreground" : ""}
                ${!isSelected && !isToday ? "text-foreground hover:bg-secondary" : ""}
              `}
            >
              {day}
              {hasEvents && (
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

      {/* Selected day events */}
      {selected && (
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">
              {selected === todayKey ? "Сегодня" : selected.split("-").reverse().join(".")}
            </p>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Icon name="Plus" size={13} />
              Добавить
            </button>
          </div>

          {selectedEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  <p className="text-sm text-foreground">{ev}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Событий нет</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
