import json
import os
import psycopg2

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """API для сохранения напоминаний и FCM токена пользователя"""
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
        "Content-Type": "application/json"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    method = event.get("httpMethod", "GET")
    headers = event.get("headers", {}) or {}
    user_id = headers.get("X-User-Id") or headers.get("x-user-id")

    if not user_id:
        return {"statusCode": 401, "headers": cors_headers, "body": json.dumps({"error": "X-User-Id required"})}

    body = json.loads(event.get("body") or "{}")

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "POST" and body.get("action") == "save_token":
            token = body.get("token")
            if not token:
                return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "token required"})}
            cur.execute("""
                INSERT INTO user_devices (user_id, fcm_token, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE SET fcm_token = EXCLUDED.fcm_token, updated_at = NOW()
            """, (user_id, token))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers, "body": json.dumps({"success": True})}

        elif method == "POST" and body.get("action") == "sync_reminders":
            reminders = body.get("reminders", [])
            cur.execute("DELETE FROM user_reminders WHERE user_id = %s", (user_id,))
            for r in reminders:
                cur.execute("""
                    INSERT INTO user_reminders (user_id, reminder_id, title, time, repeat, enabled)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, reminder_id) DO UPDATE SET
                        title = EXCLUDED.title, time = EXCLUDED.time,
                        repeat = EXCLUDED.repeat, enabled = EXCLUDED.enabled, updated_at = NOW()
                """, (user_id, str(r.get("id")), r.get("title", ""), r.get("time", ""), r.get("repeat", "daily"), r.get("enabled", True)))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers, "body": json.dumps({"success": True})}

        elif method == "POST" and body.get("action") == "sync_tasks":
            tasks = body.get("tasks", [])
            cur.execute("DELETE FROM user_tasks WHERE user_id = %s", (user_id,))
            for t in tasks:
                if not t.get("time") or not t.get("date"):
                    continue
                cur.execute("""
                    INSERT INTO user_tasks (user_id, task_id, text, done, time, date, priority, category)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, task_id) DO UPDATE SET
                        text = EXCLUDED.text, done = EXCLUDED.done, time = EXCLUDED.time,
                        date = EXCLUDED.date, priority = EXCLUDED.priority,
                        category = EXCLUDED.category, updated_at = NOW()
                """, (user_id, t.get("id"), t.get("text", ""), t.get("done", False),
                      t.get("time", ""), t.get("date", ""), t.get("priority", "low"), t.get("category", "personal")))
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers, "body": json.dumps({"success": True})}

        else:
            return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "unknown action"})}

    finally:
        cur.close()
        conn.close()