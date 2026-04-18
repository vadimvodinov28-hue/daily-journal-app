import { loadFromStorage, saveToStorage } from "./storage";

export type TaskPriority = "low" | "medium" | "high";
export type TaskCategory = "personal" | "work" | "family" | "date";

export type Task = {
  id: number;
  text: string;
  done: boolean;
  time: string;
  date: string;
  priority: TaskPriority;
  category: TaskCategory;
};

export const CATEGORIES: { value: TaskCategory; label: string; emoji: string; color: string }[] = [
  { value: "personal", label: "Личное", emoji: "👤", color: "bg-muted text-muted-foreground" },
  { value: "work", label: "Работа", emoji: "💼", color: "bg-blue-100 text-blue-700" },
  { value: "family", label: "Семья", emoji: "🏠", color: "bg-green-100 text-green-700" },
  { value: "date", label: "Свидание", emoji: "❤️", color: "bg-rose-100 text-rose-700" },
];

export const PRIORITIES: { value: TaskPriority; label: string; color: string; dot: string }[] = [
  { value: "low", label: "Низкий", color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  { value: "medium", label: "Средний", color: "text-amber-600", dot: "bg-amber-400" },
  { value: "high", label: "Высокий", color: "text-red-600", dot: "bg-red-500" },
];

const STORAGE_KEY = "all_tasks_v2";

export function getAllTasks(): Task[] {
  return loadFromStorage<Task[]>(STORAGE_KEY, getDefaultTasks());
}

export function saveTasks(tasks: Task[]): void {
  saveToStorage(STORAGE_KEY, tasks);
}

export function getTasksForDate(date: string): Task[] {
  return getAllTasks().filter((t) => t.date === date);
}

function getDefaultTasks(): Task[] {
  const today = new Date().toISOString().split("T")[0];
  return [
    { id: 1, text: "Утренняя пробежка", done: false, time: "07:00", date: today, priority: "low", category: "personal" },
    { id: 2, text: "Встреча с командой", done: false, time: "10:00", date: today, priority: "high", category: "work" },
    { id: 3, text: "Написать отчёт", done: false, time: "14:00", date: today, priority: "medium", category: "work" },
    { id: 4, text: "Позвонить родителям", done: false, time: "19:00", date: today, priority: "low", category: "family" },
  ];
}
