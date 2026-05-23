from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def _error_payload(message: str, code: str, details: Any | None = None) -> dict:
    return {
        "error": True,
        "message": message,
        "code": code,
        "details": details or {},
    }


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and exc.detail.get("error") is True:
            payload = exc.detail
        else:
            payload = _error_payload(str(exc.detail), "HTTP_EXCEPTION")
        return JSONResponse(status_code=exc.status_code, content=payload)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_error_payload(
                message="Validation error",
                code="VALIDATION_ERROR",
                details={"errors": exc.errors()},
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=_error_payload(
                message="An unexpected error occurred",
                code="INTERNAL_SERVER_ERROR",
                details={"exception": str(exc)},
            ),
        )
