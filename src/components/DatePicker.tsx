import { useState } from "react";
import Icon from "@/components/ui/icon";

const MONTHS_RU = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];
const DAYS_SHORT = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

interface Props {
  value: string;
  onChange: (date: string) => void;
}

export default function DatePicker({ value, onChange }: Props) {
  const parsed = value ? new Date(value + "T00:00:00") : new Date();
  const [view, setView] = useState(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  const [open, setOpen] = useState(false);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = new Date().toISOString().split("T")[0];

  const toKey = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const displayLabel = () => {
    if (!value) return "Выбрать дату";
    if (value === todayStr) return "Сегодня";
    const [y, m, d] = value.split("-");
    return `${Number(d)} ${MONTHS_RU[Number(m) - 1].slice(0, 3).toLowerCase()} ${y}`;
  };

  const select = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 bg-background border rounded-xl px-3 py-2 text-sm transition-colors ${
          open ? "border-foreground/40 text-foreground" : "border-border text-foreground"
        }`}
      >
        <Icon name="Calendar" size={14} className="text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-left">{displayLabel()}</span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={13} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-2xl p-3 shadow-lg animate-scale-in">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Icon name="ChevronLeft" size={13} />
            </button>
            <span className="text-xs font-semibold text-foreground">
              {MONTHS_RU[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Icon name="ChevronRight" size={13} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const key = toKey(day);
              const isSelected = key === value;
              const isToday = key === todayStr;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => select(key)}
                  className={`relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all
                    ${isSelected ? "bg-foreground text-background" : ""}
                    ${isToday && !isSelected ? "border border-foreground/50 text-foreground" : ""}
                    ${!isSelected && !isToday ? "text-foreground hover:bg-secondary" : ""}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          {value !== todayStr && (
            <button
              type="button"
              onClick={() => select(todayStr)}
              className="mt-2 w-full py-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg transition-colors"
            >
              Сегодня
            </button>
          )}
        </div>
      )}
    </div>
  );
}
