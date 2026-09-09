"""
API dependencies — current user extraction, role checks, database session.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.enums import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the current user from JWT token."""
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identifier",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    # Single-device enforcement for drivers: check session token matches
    if user.role == UserRole.DRIVER:
        token_sid = payload.get("sid")
        if token_sid and user.session_token and token_sid != user.session_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="SESSION_EXPIRED",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return user


def require_role(*roles: UserRole):
    """Dependency factory that restricts access to specified roles."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(r.value for r in roles)}",
            )
        return current_user
    return role_checker


# Common role dependencies
require_super_admin = require_role(UserRole.SUPER_ADMIN)
require_school_admin = require_role(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
require_driver = require_role(UserRole.DRIVER)
require_parent = require_role(UserRole.PARENT)
require_admin_or_driver = require_role(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.DRIVER)
