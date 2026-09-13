import os
import random
import httpx
from datetime import datetime, timezone
import secrets
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.email import send_password_reset_email
from app.models.user import User
from app.models.driver import Driver
from app.models.parent import Parent
from app.models.password_reset import PasswordResetToken
from app.models.enums import UserRole
from app.schemas import (
    LoginRequest, PhoneLoginRequest, SendOTPRequest, VerifyOTPRequest, TokenResponse, UserCreate, UserResponse, UserUpdate,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory OTP storage: phone_10_digits -> {"otp": "482910", "expires_at": timestamp}
OTP_STORE: dict[str, dict] = {}


@router.post("/send-otp")
async def send_otp(data: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate a random 6-digit OTP code for a registered phone number and send SMS.
    """
    raw_digits = "".join(filter(str.isdigit, data.phone))
    if len(raw_digits) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid 10-digit mobile number.",
        )

    last10 = raw_digits[-10:]

    stmt = select(User).where(User.phone.isnot(None), User.phone != "")
    result = await db.execute(stmt)
    all_users = result.scalars().all()

    matched_user = None
    for u in all_users:
        u_digits = "".join(filter(str.isdigit, u.phone or ""))
        if u_digits and u_digits.endswith(last10):
            matched_user = u
            break

    if not matched_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No account found for registered mobile number ({data.phone}). Please contact your school administrator to register your phone number.",
        )

    if not matched_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact your administrator.",
        )

    # Generate 6-digit OTP
    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc).timestamp() + 300  # 5 minutes validity

    OTP_STORE[last10] = {
        "otp": otp_code,
        "expires_at": expires_at
    }

    # Attempt to send real SMS via Fast2SMS / Twilio if API key is provided
    fast2sms_key = os.getenv("FAST2SMS_API_KEY")
    sms_sent = False

    if fast2sms_key:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://www.fast2sms.com/dev/bulkV2",
                    params={
                        "authorization": fast2sms_key,
                        "variables_values": otp_code,
                        "route": "otp",
                        "numbers": last10
                    },
                    timeout=10.0
                )
                if res.status_code == 200:
                    sms_sent = True
        except Exception:
            pass

    print(f"==================================================")
    print(f"📱 REAL OTP GENERATED FOR +91-{last10}: {otp_code}")
    print(f"==================================================")

    return {
        "message": f"OTP verification code sent to +91-{last10}",
        "phone": last10,
        "sms_sent": sms_sent
    }


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(data: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify the 6-digit OTP code and authenticate user.
    """
    raw_digits = "".join(filter(str.isdigit, data.phone))
    last10 = raw_digits[-10:]

    otp_info = OTP_STORE.get(last10)
    current_time = datetime.now(timezone.utc).timestamp()

    if not otp_info or otp_info.get("expires_at", 0) < current_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP code has expired or was not requested. Please click 'Get OTP Verification Code' again.",
        )

    if otp_info.get("otp") != data.otp_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit OTP code. Please check the code and try again.",
        )

    # Clear used OTP
    OTP_STORE.pop(last10, None)

    # Fetch user & perform login
    stmt = select(User).where(User.phone.isnot(None), User.phone != "")
    result = await db.execute(stmt)
    all_users = result.scalars().all()

    matched_user = None
    for u in all_users:
        u_digits = "".join(filter(str.isdigit, u.phone or ""))
        if u_digits and u_digits.endswith(last10):
            matched_user = u
            break

    if not matched_user:
        raise HTTPException(status_code=404, detail="User account not found.")

    matched_user.last_login = datetime.now(timezone.utc)

    token_data = {"sub": matched_user.id, "role": matched_user.role.value}
    if matched_user.role == UserRole.DRIVER:
        session_id = uuid.uuid4().hex
        matched_user.session_token = session_id
        token_data["sid"] = session_id

    await db.commit()

    token = create_access_token(data=token_data)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(matched_user),
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new user (admin-only operation)."""
    # Only admins can create users
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN):
        raise HTTPException(status_code=403, detail="Only admins can create users")

    # School admins can only create users for their own school
    if current_user.role == UserRole.SCHOOL_ADMIN and data.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot create users for another school")

    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
        school_id=data.school_id,
        is_active=data.is_active,
    )
    db.add(user)
    await db.flush()

    # Auto-create role-specific profile
    if data.role == UserRole.DRIVER:
        db.add(Driver(user_id=user.id))
    elif data.role == UserRole.PARENT:
        db.add(Parent(user_id=user.id))

    await db.flush()
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile."""
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


# ─── Password Reset ──────────────────────────────────────────


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Request a password reset email.
    Always returns success to prevent email enumeration.
    """
    settings = get_settings()

    # Look up user
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        # Invalidate any existing unused tokens for this user
        existing_tokens = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used == False,
            )
        )
        for old_token in existing_tokens.scalars().all():
            old_token.used = True

        # Generate a new secure token
        token = secrets.token_urlsafe(48)
        from datetime import timedelta
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES
        )

        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
        )
        db.add(reset_token)
        await db.flush()

        # Send the email (or log to console in dev mode)
        await send_password_reset_email(
            email=user.email,
            user_name=user.full_name,
            reset_token=token,
        )

    # Always return success (prevents email enumeration)
    return {"message": "If an account exists with that email, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Reset password using a valid reset token.
    """
    # Find the token
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == data.token)
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link. Please request a new one.",
        )

    # Check if already used
    if reset_token.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has already been used. Please request a new one.",
        )

    # Check if expired
    if datetime.now(timezone.utc) > reset_token.expires_at:
        reset_token.used = True
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has expired. Please request a new one.",
        )

    # Find the user
    user_result = await db.execute(
        select(User).where(User.id == reset_token.user_id)
    )
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found.",
        )

    # Update password
    user.password_hash = hash_password(data.new_password)

    # Mark token as used
    reset_token.used = True

    await db.flush()

    return {"message": "Your password has been reset successfully. You can now sign in with your new password."}

