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

    # Build the email
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset Your YellowBird Password"
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = email

    html_body = _build_reset_email_html(reset_link, user_name)
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
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
