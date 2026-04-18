import json
import os
import psycopg2

SCHEMA = "t_p73212382_daily_journal_app"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    """API ежедневника: управление задачами (/tasks) и напоминаниями (/reminders)."""

    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    params = event.get("queryStringParameters") or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        # ---- TASKS ----
        if "/tasks" in path:
            if method == "GET":
                date = params.get("date", "")
                if date:
                    cur.execute(
                        f"SELECT id, text, done, time, date FROM {SCHEMA}.tasks WHERE date = %s ORDER BY created_at",
                        (date,),
                    )
                else:
                    cur.execute(
                        f"SELECT id, text, done, time, date FROM {SCHEMA}.tasks ORDER BY date DESC, created_at"
                    )
                rows = cur.fetchall()
                tasks = [
                    {"id": r[0], "text": r[1], "done": r[2], "time": r[3] or "", "date": str(r[4])}
                    for r in rows
                ]
                return {"statusCode": 200, "headers": headers, "body": json.dumps(tasks)}

            elif method == "POST":
                body = json.loads(event.get("body") or "{}")
                text = body.get("text", "").strip()
                time = body.get("time", "")
                date = body.get("date", "")
                if not text or not date:
                    return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "text and date required"})}
                cur.execute(
                    f"INSERT INTO {SCHEMA}.tasks (text, time, date) VALUES (%s, %s, %s) RETURNING id",
                    (text, time or None, date),
                )
                new_id = cur.fetchone()[0]
                conn.commit()
                return {"statusCode": 201, "headers": headers, "body": json.dumps({"id": new_id, "text": text, "done": False, "time": time, "date": date})}

            elif method == "PUT":
                body = json.loads(event.get("body") or "{}")
                task_id = body.get("id")
                done = body.get("done")
                text = body.get("text")
                if task_id is None:
                    return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "id required"})}
                if done is not None and text is not None:
                    cur.execute(f"UPDATE {SCHEMA}.tasks SET done=%s, text=%s WHERE id=%s", (done, text, task_id))
                elif done is not None:
                    cur.execute(f"UPDATE {SCHEMA}.tasks SET done=%s WHERE id=%s", (done, task_id))
                elif text is not None:
                    cur.execute(f"UPDATE {SCHEMA}.tasks SET text=%s WHERE id=%s", (text, task_id))
                conn.commit()
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

            elif method == "DELETE":
                task_id = params.get("id")
                if not task_id:
                    return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "id required"})}
                cur.execute(f"DELETE FROM {SCHEMA}.tasks WHERE id=%s", (int(task_id),))
                conn.commit()
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        # ---- REMINDERS ----
        elif "/reminders" in path:
            if method == "GET":
                cur.execute(
                    f"SELECT id, title, time, repeat, active, emoji FROM {SCHEMA}.reminders ORDER BY created_at"
                )
                rows = cur.fetchall()
                reminders = [
                    {"id": r[0], "title": r[1], "time": r[2], "repeat": r[3], "active": r[4], "emoji": r[5] or "🔔"}
                    for r in rows
                ]
                return {"statusCode": 200, "headers": headers, "body": json.dumps(reminders)}

            elif method == "POST":
                body = json.loads(event.get("body") or "{}")
                title = body.get("title", "").strip()
                time = body.get("time", "09:00")
                repeat = body.get("repeat", "Каждый день")
                emoji = body.get("emoji", "🔔")
                if not title:
                    return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "title required"})}
                cur.execute(
                    f"INSERT INTO {SCHEMA}.reminders (title, time, repeat, emoji) VALUES (%s, %s, %s, %s) RETURNING id",
                    (title, time, repeat, emoji),
                )
                new_id = cur.fetchone()[0]
                conn.commit()
                return {"statusCode": 201, "headers": headers, "body": json.dumps({"id": new_id, "title": title, "time": time, "repeat": repeat, "active": True, "emoji": emoji})}

            elif method == "PUT":
                body = json.loads(event.get("body") or "{}")
                rem_id = body.get("id")
                active = body.get("active")
                if rem_id is None or active is None:
                    return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "id and active required"})}
                cur.execute(f"UPDATE {SCHEMA}.reminders SET active=%s WHERE id=%s", (active, rem_id))
                conn.commit()
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

            elif method == "DELETE":
                rem_id = params.get("id")
                if not rem_id:
                    return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "id required"})}
                cur.execute(f"DELETE FROM {SCHEMA}.reminders WHERE id=%s", (int(rem_id),))
                conn.commit()
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Not found"})}

    finally:
        cur.close()
        conn.close()
