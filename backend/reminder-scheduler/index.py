import json
import os
import time
import urllib.request
import urllib.parse
import psycopg2
from datetime import datetime

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_access_token():
    """Получить OAuth2 токен для Firebase FCM API"""
    import base64
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding

    sa = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
    now = int(time.time())

    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode()).rstrip(b"=").decode()
    payload = base64.urlsafe_b64encode(json.dumps({
        "iss": sa["client_email"],
        "scope": "https://www.googleapis.com/auth/firebase.messaging",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600
    }).encode()).rstrip(b"=").decode()

    signing_input = f"{header}.{payload}"
    private_key = serialization.load_pem_private_key(sa["private_key"].encode(), password=None)
    signature = private_key.sign(signing_input.encode(), padding.PKCS1v15(), hashes.SHA256())
    sig_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
    jwt_token = f"{signing_input}.{sig_b64}"

    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": jwt_token
    }).encode()

    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data, method="POST")
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
    return result["access_token"]

def send_fcm(token: str, title: str, body: str, project_id: str, access_token: str):
    """Отправить push через FCM"""
    message = {
        "message": {
            "token": token,
            "notification": {"title": title, "body": body},
            "android": {
                "priority": "high",
                "notification": {"sound": "default", "channel_id": "reminders"}
            }
        }
    }
    url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    req = urllib.request.Request(
        url,
        data=json.dumps(message).encode(),
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"FCM error: {e}")
        return False

def should_fire_today(repeat: str, weekday: int) -> bool:
    """Проверить нужно ли отправить уведомление сегодня (weekday: 0=пн, 6=вс)"""
    r = repeat.lower()
    if r in ("daily", "каждый день"):
        return True
    if r in ("weekdays", "по будням"):
        return weekday < 5
    if r in ("weekends", "по выходным"):
        return weekday >= 5
    if r in ("once", "однажды", "один раз"):
        return True
    if r in ("weekly", "каждую неделю"):
        return True
    return True

def handler(event: dict, context) -> dict:
    """Планировщик: проверяет напоминания и отправляет push всем пользователям"""
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    now = datetime.utcnow()
    # Московское время UTC+3
    from datetime import timedelta
    moscow_now = now + timedelta(hours=3)
    current_time = moscow_now.strftime("%H:%M")
    weekday = moscow_now.weekday()

    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT r.user_id, r.title, r.time, r.repeat, d.fcm_token
            FROM user_reminders r
            JOIN user_devices d ON r.user_id = d.user_id
            WHERE r.enabled = TRUE AND r.time = %s
        """, (current_time,))
        reminder_rows = cur.fetchall()

        today = moscow_now.strftime("%Y-%m-%d")
        cur.execute("""
            SELECT t.user_id, t.text, t.time, d.fcm_token
            FROM user_tasks t
            JOIN user_devices d ON t.user_id = d.user_id
            WHERE t.done = FALSE AND t.time = %s AND t.date = %s
        """, (current_time, today))
        task_rows = cur.fetchall()
    finally:
        cur.close()
        conn.close()

    rows = [(u, title, t, repeat, token) for u, title, t, repeat, token in reminder_rows] + \
           [(u, text, t, 'once', token) for u, text, t, token in task_rows]

    print(f"time={current_time} reminders={len(reminder_rows)} tasks={len(task_rows)}")

    if not rows:
        return {"statusCode": 200, "headers": cors_headers, "body": json.dumps({"sent": 0, "time": current_time})}

    sa = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
    project_id = sa["project_id"]

    try:
        access_token = get_access_token()
    except Exception as e:
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": f"Auth failed: {e}"})}

    sent = 0
    for user_id, title, rem_time, repeat, fcm_token in rows:
        if not should_fire_today(repeat, weekday):
            continue
        success = send_fcm(fcm_token, "⏰ Напоминание", title, project_id, access_token)
        if success:
            sent += 1

    return {"statusCode": 200, "headers": cors_headers, "body": json.dumps({"sent": sent, "time": current_time, "total": len(rows)})}