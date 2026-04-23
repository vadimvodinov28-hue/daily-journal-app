import json
import os
import time
import urllib.request
import urllib.error

def get_access_token():
    """Получить OAuth2 токен для Firebase FCM API через сервисный аккаунт"""
    import base64
    import hmac
    import hashlib

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
    
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    
    private_key = serialization.load_pem_private_key(
        sa["private_key"].encode(),
        password=None
    )
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


def handler(event: dict, context) -> dict:
    """Отправить push-уведомление через Firebase FCM API"""
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
        token = body.get("token")
        title = body.get("title", "⏰ Напоминание")
        message_body = body.get("body", "")

        if not token:
            return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "token required"})}

        sa = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
        project_id = sa["project_id"]

        access_token = get_access_token()

        fcm_message = {
            "message": {
                "token": token,
                "notification": {
                    "title": title,
                    "body": message_body
                },
                "android": {
                    "priority": "high",
                    "notification": {
                        "sound": "default",
                        "channel_id": "reminders"
                    }
                }
            }
        }

        url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
        req_data = json.dumps(fcm_message).encode()
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            method="POST"
        )

        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())

        return {"statusCode": 200, "headers": cors_headers, "body": json.dumps({"success": True, "result": result})}

    except Exception as e:
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": str(e)})}
