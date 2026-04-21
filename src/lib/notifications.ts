import { getAllTasks } from "@/lib/tasks";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";

const PUSH_URL = "https://functions.poehali.dev/54f28cce-8e3f-4cba-aca1-e7d83bb04799";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let audioContext: AudioContext | null = null;
let fcmToken: string | null = null;
const repeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

function isNativeApp(): boolean {
  return !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

function playNotificationSound() {
  try {
    interface WindowWithWebkit extends Window { webkitAudioContext?: typeof AudioContext; }
    const AudioCtx = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext;
    if (!AudioCtx) return;
    audioContext = new AudioCtx();
    const ctx = audioContext;

    const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const t = ctx.currentTime;
    playTone(523.25, t + 0.0, 0.3, 0.4);
    playTone(659.25, t + 0.35, 0.3, 0.4);
    playTone(783.99, t + 0.70, 0.5, 0.5);
    playTone(1046.5, t + 1.25, 0.6, 0.4);
  } catch (e) {
    console.warn("Audio playback failed:", e);
  }
}

async function setupPushNotifications() {
  if (!isNativeApp()) return;

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== "granted") return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", (token) => {
    fcmToken = token.value;
    localStorage.setItem("fcm_token", token.value);
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.warn("FCM registration error:", err);
  });

  const savedToken = localStorage.getItem("fcm_token");
  if (savedToken) fcmToken = savedToken;
}

async function sendServerPush(title: string, body: string) {
  if (!fcmToken) return;
  try {
    await fetch(PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: fcmToken, title, body }),
    });
  } catch (e) {
    console.warn("Server push failed:", e);
  }
}

async function requestPermission(): Promise<boolean> {
  if (isNativeApp()) {
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function getAlreadyNotified(): Set<string> {
  const raw = sessionStorage.getItem("notified_tasks");
  return raw ? new Set(JSON.parse(raw)) : new Set();
}

function markNotified(key: string) {
  const set = getAlreadyNotified();
  set.add(key);
  sessionStorage.setItem("notified_tasks", JSON.stringify([...set]));
}

let notifId = 1000;

async function checkAndNotify() {
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentHH = String(now.getHours()).padStart(2, "0");
  const currentMM = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${currentHH}:${currentMM}`;

  const tasks = getAllTasks();
  const notified = getAlreadyNotified();

  for (const task of tasks) {
    if (task.done) continue;
    if (task.date !== currentDate) continue;
    if (task.time !== currentTime) continue;

    const key = `${task.id}_${task.date}_${task.time}`;
    if (notified.has(key)) continue;

    markNotified(key);

    const fireNotification = async () => {
      playNotificationSound();
      if (isNativeApp()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId++,
              title: "⏰ Время задачи!",
              body: task.text,
              schedule: { at: new Date(Date.now() + 500) },
              sound: "default",
              smallIcon: "ic_launcher",
            },
          ],
        });
        await sendServerPush("⏰ Время задачи!", task.text);
      } else if (Notification.permission === "granted") {
        new Notification("⏰ Время задачи!", {
          body: task.text,
          icon: "/favicon.ico",
          tag: String(task.id),
        });
      }
    };

    await fireNotification();

    if (!repeatIntervals.has(key)) {
      const repeat = setInterval(async () => {
        if (document.visibilityState === "visible") {
          clearInterval(repeat);
          repeatIntervals.delete(key);
          return;
        }
        await fireNotification();
      }, 60_000);
      repeatIntervals.set(key, repeat);
    }
  }
}

export async function startNotificationScheduler() {
  await requestPermission();
  await setupPushNotifications();
  if (schedulerInterval) clearInterval(schedulerInterval);
  checkAndNotify();
  schedulerInterval = setInterval(checkAndNotify, 30_000);
}

export function stopNotificationScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}