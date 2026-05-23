from fastapi import HTTPException
from supabase import Client, create_client

from app.core.config import get_settings


def get_supabase_admin_client() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message": "Supabase configuration missing",
                "code": "SUPABASE_CONFIG_MISSING",
                "details": {},
            },
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
