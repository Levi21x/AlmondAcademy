from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import get_settings
from app.middleware.auth_middleware import require_auth
from app.schemas.auth import ApiSuccess, StudentProfileCreate, StudentProfileOut, StudentProfileUpdate, VerifyTokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _success(data: dict) -> dict:
    return {"success": True, "data": data}


@router.post("/verify-token", response_model=ApiSuccess)
def verify_token(user=Depends(require_auth)) -> dict:
    payload = VerifyTokenResponse(valid=True, user_id=user["user_id"], email=user["email"]).model_dump()
    return _success(payload)


@router.get("/profile", response_model=ApiSuccess)
def get_profile(
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
) -> dict:
    try:
        profile = service.get_profile(user["user_id"])
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": True,
                    "message": "Profile not found",
                    "code": "PROFILE_NOT_FOUND",
                    "details": {},
                },
            )

        parsed_profile = StudentProfileOut.model_validate(profile).model_dump(mode="json")
        return _success(parsed_profile)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": True,
                "message": "Failed to fetch profile",
                "code": "PROFILE_FETCH_FAILED",
                "details": {"reason": str(exc)},
            },
        ) from exc


@router.post("/profile", response_model=ApiSuccess)
def create_profile(
    payload: StudentProfileCreate,
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
) -> dict:
    try:
        profile = service.create_profile(user_id=user["user_id"], email=user["email"], payload=payload)
        parsed_profile = StudentProfileOut.model_validate(profile).model_dump(mode="json")
        return _success(parsed_profile)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": True,
                "message": "Failed to create profile",
                "code": "PROFILE_CREATE_ERROR",
                "details": {"reason": str(exc)},
            },
        ) from exc


@router.patch("/profile", response_model=ApiSuccess)
def update_profile(
    payload: StudentProfileUpdate,
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
) -> dict:
    profile = service.update_profile(user_id=user["user_id"], payload=payload)
    parsed_profile = StudentProfileOut.model_validate(profile).model_dump(mode="json")
    return _success(parsed_profile)


@router.get("/usage/today", response_model=ApiSuccess)
def get_usage_today(user=Depends(require_auth), service: AuthService = Depends(AuthService)) -> dict:
    usage = service.ensure_daily_usage(user["user_id"])
    return _success(usage)


@router.patch("/usage/today", response_model=ApiSuccess)
def increment_usage_today(user=Depends(require_auth), service: AuthService = Depends(AuthService)) -> dict:
    usage = service.increment_usage_question(user["user_id"])
    return _success(usage)
