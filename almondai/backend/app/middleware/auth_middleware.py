from typing import Dict

from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from app.core.config import get_settings
from app.core.database import get_supabase_admin_client


def _unauthorized(message: str, code: str, details: dict | None = None) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": True,
            "message": message,
            "code": code,
            "details": details or {},
        },
    )


def verify_access_token(token: str) -> Dict[str, str]:
    """Validate a Supabase access token and return ``{user_id, email}``.

    Shared by the HTTP ``require_auth`` dependency and the voice WebSocket
    (which receives the token as a query param, since browsers cannot set
    Authorization headers on WebSocket handshakes).
    """
    token = (token or "").strip()
    if not token:
        raise _unauthorized("Missing authentication token", "INVALID_AUTH_HEADER")

    settings = get_settings()
    header = jwt.get_unverified_header(token)
    algorithm = header.get("alg")
    claims: dict

    if algorithm in {"HS256", "HS384", "HS512"}:
        try:
            claims = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=[algorithm],
                options={"verify_aud": False},
            )
        except JWTError as exc:
            raise _unauthorized("Invalid authentication token", "INVALID_TOKEN", {"reason": str(exc)}) from exc
    else:
        try:
            client = get_supabase_admin_client()
            auth_user = client.auth.get_user(token).user
        except Exception as exc:
            raise _unauthorized("Invalid authentication token", "INVALID_TOKEN", {"reason": str(exc)}) from exc

        if auth_user is None or not auth_user.id or not auth_user.email:
            raise _unauthorized("Token missing required claims", "INVALID_TOKEN_PAYLOAD")

        claims = {"sub": str(auth_user.id), "email": str(auth_user.email)}

    user_id = claims.get("sub")
    email = claims.get("email")
    if not user_id or not email:
        raise _unauthorized("Token missing required claims", "INVALID_TOKEN_PAYLOAD")

    user = {"user_id": str(user_id), "email": str(email)}

    if not user.get("user_id") or not user.get("email"):
        raise _unauthorized("Invalid authentication token", "INVALID_TOKEN")

    return user


def require_auth(request: Request) -> Dict[str, str]:
    try:
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise _unauthorized("Missing or invalid Authorization header", "INVALID_AUTH_HEADER")

        token = authorization.split(" ", 1)[1].strip()
        return verify_access_token(token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": True,
                "message": "Invalid authentication token",
                "code": "INVALID_TOKEN",
                "details": {"reason": str(exc)},
            },
        ) from exc
