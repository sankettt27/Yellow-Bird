"""
Email utility — sends password reset emails via SMTP.
Falls back to console logging when SMTP is not configured (development mode).
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _build_reset_email_html(reset_link: str, user_name: str) -> str:
    """Build a branded HTML email for password reset."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #f59e0b, #eab308, #ca8a04); padding: 32px 32px 24px; text-align:center;">
                                <div style="font-size:28px; font-weight:bold; color:#ffffff; letter-spacing:-0.5px;">🚌 YellowBird</div>
                                <div style="font-size:12px; color:rgba(255,255,255,0.8); margin-top:4px;">School Transport System</div>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px;">
                                <h2 style="margin:0 0 8px; font-size:20px; color:#18181b;">Reset Your Password</h2>
                                <p style="margin:0 0 20px; font-size:14px; color:#71717a; line-height:1.6;">
                                    Hi {user_name},<br><br>
                                    We received a request to reset your password. Click the button below to set a new one. This link expires in 15 minutes.
                                </p>
                                <a href="{reset_link}" style="display:inline-block; padding:12px 32px; background: linear-gradient(135deg, #eab308, #f59e0b); color:#ffffff; text-decoration:none; border-radius:12px; font-weight:600; font-size:14px;">
                                    Reset Password
                                </a>
                                <p style="margin:24px 0 0; font-size:12px; color:#a1a1aa; line-height:1.5;">
                                    If you didn't request this, you can safely ignore this email. Your password won't change.
                                </p>
                                <hr style="margin:24px 0; border:none; border-top:1px solid #e4e4e7;">
                                <p style="margin:0; font-size:11px; color:#d4d4d8; word-break:break-all;">
                                    {reset_link}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


async def send_password_reset_email(email: str, user_name: str, reset_token: str) -> bool:
    """
    Send a password reset email. Returns True if sent successfully.
    If SMTP is not configured, logs the reset link to console instead.
    """
    settings = get_settings()
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    # Development fallback — no SMTP configured
    if not settings.SMTP_HOST:
        logger.warning("=" * 60)
        logger.warning("SMTP not configured — printing reset link to console")
        logger.warning(f"  User:  {email}")
        logger.warning(f"  Link:  {reset_link}")
        logger.warning("=" * 60)
        # Also print to stdout so it's visible in the terminal
        print("\n" + "=" * 60)
        print("📧 PASSWORD RESET LINK (SMTP not configured)")
        print(f"   User:  {email}")
        print(f"   Link:  {reset_link}")
        print("=" * 60 + "\n")
        return True

    html_body = _build_reset_email_html(reset_link, user_name)

    # 1. Try Vercel HTTPS Relay (bypasses Render SMTP port blocking)
    if await _send_via_vercel_relay(email, "Reset Your YellowBird Password", html_body):
        return True

    # 2. Try Direct SMTP
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset Your YellowBird Password"
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=8) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, email, msg.as_string())
        logger.info(f"Password reset email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {email}: {e}")
        # Fallback to console on send failure
        print(f"\n⚠️  Email send failed. Reset link for {email}: {reset_link}\n")
        return False


def _build_otp_email_html(otp_code: str, user_name: str = "School Administrator") -> str:
    """Build a premium branded HTML email for OTP verification."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; padding: 40px 16px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px; background-color:#ffffff; border-radius:20px; overflow:hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #f1f5f9;">
                        <!-- Header Banner -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 36px 32px 28px; text-align:center;">
                                <div style="font-size:36px; line-height:1; margin-bottom:8px;">🚌</div>
                                <div style="font-size:26px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">YellowBird</div>
                                <div style="font-size:13px; color:rgba(255,255,255,0.9); margin-top:4px; font-weight:500;">School Transport & Fleet Management</div>
                            </td>
                        </tr>
                        <!-- Body Content -->
                        <tr>
                            <td style="padding: 36px 32px;">
                                <h2 style="margin:0 0 12px; font-size:22px; font-weight:700; color:#0f172a; text-align:center;">
                                    Email Verification Code
                                </h2>
                                <p style="margin:0 0 24px; font-size:15px; color:#64748b; line-height:1.6; text-align:center;">
                                    Welcome to YellowBird! Please use the 6-digit verification code below to complete your new school administrator setup.
                                </p>

                                <!-- OTP Box -->
                                <div style="margin: 28px 0; padding: 22px 16px; background-color: #fffbeb; border: 2px dashed #f59e0b; border-radius: 16px; text-align: center;">
                                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #b45309; letter-spacing: 1.5px; margin-bottom: 6px;">
                                        Your 6-Digit Code
                                    </div>
                                    <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #78350f; font-family: monospace, Consolas, sans-serif; padding-left: 10px;">
                                        {otp_code}
                                    </div>
                                </div>

                                <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
                                    <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                                        ⏱️ <strong>Valid for 10 minutes.</strong> Never share this OTP code with anyone. YellowBird staff will never ask for your code.
                                    </p>
                                </div>

                                <p style="margin:0; font-size:13px; color:#94a3b8; line-height:1.5; text-align:center;">
                                    If you didn't request this code, you can safely ignore this email.
                                </p>

                                <hr style="margin:28px 0; border:none; border-top:1px solid #f1f5f9;">

                                <div style="text-align:center; font-size:11px; color:#cbd5e1;">
                                    © 2026 YellowBird Transport Technologies. All rights reserved.
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


async def _send_via_vercel_relay(to: str, subject: str, html_body: str) -> bool:
    """Attempt sending through Vercel HTTPS serverless relay (bypasses Render free-tier SMTP port blocks)."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(
                "https://yellow-bird-eosin.vercel.app/api/send-email",
                json={
                    "to": to,
                    "subject": subject,
                    "html": html_body,
                    "secret": "yellowbird-auth-secret-2024",
                },
                headers={"X-YellowBird-Secret": "yellowbird-auth-secret-2024"},
            )
            if res.status_code == 200:
                print(f"[EMAIL RELAY] Sent successfully via Vercel HTTPS relay to {to}")
                return True
            else:
                print(f"[EMAIL RELAY] Vercel returned status {res.status_code}: {res.text[:150]}")
    except Exception as e:
        print(f"[EMAIL RELAY] Vercel relay error: {e}")
    return False


async def send_otp_email(email: str, otp_code: str, user_name: str = "School Administrator") -> bool:
    """
    Send a 6-digit OTP verification email for new school admin registration.
    Tries Vercel HTTPS relay first (for Render cloud), then falls back to direct SMTP SSL/STARTTLS.
    """
    settings = get_settings()
    html_body = _build_otp_email_html(otp_code, user_name)
    subject = f"{otp_code} is your YellowBird verification code"

    # 1. Try Vercel HTTPS Relay (bypasses Render SMTP port blocking)
    if await _send_via_vercel_relay(email, subject, html_body):
        return True

    # 2. Try Direct SMTP SSL (port 465)
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=6) as server:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"YellowBird Authentication <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = email
            msg.attach(MIMEText(html_body, "html", "utf-8"))
            server.sendmail(settings.SMTP_FROM_EMAIL, [email], msg.as_string())
        print(f"[OTP] Verification email sent to {email} via SMTP_SSL 465")
        return True
    except Exception as e465:
        print(f"[OTP 465] Error: {e465}")

    # 3. Try Direct SMTP STARTTLS (port 587)
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=6) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"YellowBird Authentication <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = email
            msg.attach(MIMEText(html_body, "html", "utf-8"))
            server.sendmail(settings.SMTP_FROM_EMAIL, [email], msg.as_string())
        print(f"[OTP] Verification email sent to {email} via SMTP 587")
        return True
    except Exception as e587:
        print(f"[OTP 587] Error: {e587}")

    print(f"[OTP FALLBACK] Verification code for {email}: {otp_code}")
    return False
