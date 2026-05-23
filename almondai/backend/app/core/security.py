from typing import Dict

from fastapi import Depends, Header, HTTPException, status

from app.core.database import get_supabase_admin_client


def _unauthorized(message: str, code: str = "UNAUTHORIZED") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": True,
            "message": message,
            "code": code,
            "details": {},
        },
    )


def validate_token_with_supabase(token: str) -> Dict[str, str]:
    try:
        client = get_supabase_admin_client()
        response = client.auth.get_user(token)
        user = response.user
    except Exception as exc:
        raise _unauthorized("Invalid authentication token", "INVALID_TOKEN") from exc

    if user is None or not user.id or not user.email:
        raise _unauthorized("Token missing required claims", "INVALID_TOKEN_PAYLOAD")

    return {
        "user_id": str(user.id),
        "email": str(user.email),
    }


def get_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise _unauthorized("Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise _unauthorized("Authorization header must be Bearer token", "INVALID_AUTH_HEADER")
    return token


def get_current_user(token: str = Depends(get_bearer_token)) -> Dict[str, str]:
    return validate_token_with_supabase(token)
