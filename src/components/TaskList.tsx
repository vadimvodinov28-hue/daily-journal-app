import { useState } from "react";
import Icon from "@/components/ui/icon";
import { CATEGORIES, PRIORITIES, type Task, type TaskPriority } from "@/lib/tasks";

interface Props {
  tasks: Task[];
  todayKey?: string;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  emptyText?: string;
  previewCount?: number;
}

export default function TaskList({
  tasks,
  todayKey,
  onToggle,
  onRemove,
  emptyText = "Задач нет — отличный день!",
  previewCount = 1,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const sorted = [...tasks].sort((a, b) => {
    const order: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  const visible = expanded ? sorted : sorted.slice(0, previewCount);
  const hiddenCount = sorted.length - previewCount;
  const doneHidden = sorted.slice(previewCount).filter((t) => t.done).length;

  if (tasks.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground text-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {visible.map((task, i) => {
        const cat = CATEGORIES.find((c) => c.value === task.category)!;
        const prio = PRIORITIES.find((p) => p.value === task.priority)!;
        return (
          <div
            key={task.id}
            className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-xl hover:border-foreground/20 transition-all group animate-slide-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${prio.dot}`} />

            <button
              onClick={() => onToggle(task.id)}
              className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                task.done
                  ? "bg-foreground border-foreground"
                  : "border-border group-hover:border-foreground/50"
              }`}
            >
              {task.done && <Icon name="Check" size={9} className="text-background" />}
            </button>

            <div
              className="flex-1 min-w-0 cursor-pointer flex items-center gap-2"
              onClick={() => onToggle(task.id)}
            >
              <p className={`text-sm font-medium truncate transition-all ${
                task.done ? "line-through text-muted-foreground" : "text-foreground"
              }`}>
                {task.text}
              </p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-sm leading-none">{cat.emoji}</span>
                {task.time && (
                  <span className="text-[10px] text-muted-foreground font-medium">{task.time}</span>
                )}
                {todayKey && task.date !== todayKey && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                    {task.date.split("-").reverse().slice(0,2).join(".")}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onRemove(task.id)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
            >
              <Icon name="X" size={11} />
            </button>
          </div>
        );
      })}

      {/* Expand / collapse button */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={14} />
          <span className="text-xs font-medium">
            {expanded
              ? "Свернуть"
              : `Ещё ${hiddenCount} задач${hiddenCount === 1 ? "а" : hiddenCount < 5 ? "и" : ""}${doneHidden > 0 ? ` · ${doneHidden} выполнено` : ""}`}
          </span>
          {!expanded && (
            <div className="flex gap-1 ml-auto">
              {sorted.slice(previewCount, previewCount + 4).map((t) => {
                const p = PRIORITIES.find((p) => p.value === t.priority)!;
                return (
                  <span
                    key={t.id}
                    className={`w-1.5 h-1.5 rounded-full ${t.done ? "bg-muted-foreground/30" : p.dot}`}
                  />
                );
              })}
              {hiddenCount > 4 && (
                <span className="text-[10px] text-muted-foreground">+{hiddenCount - 4}</span>
              )}
            </div>
          )}
        </button>
      )}

      {/* Collapse button when expanded and has more than preview */}
      {expanded && hiddenCount > 0 && (
        <div /> // handled above
      )}
    </div>
  );
}
