"""
Отправка FCM пуш-уведомлений через Firebase Admin SDK.
Принимает токен устройства, заголовок и текст уведомления.
"""
import json
import os
import time
import base64
import hashlib
import hmac
import urllib.request
import urllib.error


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_access_token(service_account: dict) -> str:
    """Получить OAuth2 токен для Firebase через JWT."""
    import struct

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

    header = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    now = int(time.time())
    claim = b64url(json.dumps({
        "iss": service_account["client_email"],
        "scope": "https://www.googleapis.com/auth/firebase.messaging",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
    }).encode())

    # Импортируем cryptography для подписи
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding

    private_key = serialization.load_pem_private_key(
        service_account["private_key"].encode(), password=None
    )
    signature = private_key.sign(
        f"{header}.{claim}".encode(),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    jwt = f"{header}.{claim}.{b64url(signature)}"

    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": jwt,
    }).encode()

    import urllib.parse
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["access_token"]


def handler(event: dict, context) -> dict:
    """Отправить пуш-уведомление на устройство через Firebase FCM."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
        token = body.get("token")
        title = body.get("title", "⏰ Время задачи!")
        message_body = body.get("body", "")

        if not token:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "token required"}),
            }

        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT", "")
        service_account = json.loads(sa_json)
        project_id = service_account["project_id"]

        access_token = get_access_token(service_account)

        fcm_url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
        payload = json.dumps({
            "message": {
                "token": token,
                "notification": {"title": title, "body": message_body},
                "android": {
                    "notification": {
                        "sound": "default",
                        "channel_id": "task_reminders",
                    }
                },
            }
        }).encode()

        req = urllib.request.Request(
            fcm_url,
            data=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"ok": True, "result": result}),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(e)}),
        }
