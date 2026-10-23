// Production Email Provider Integration with SMTP and Clearly Labelled Demo Fallback
import nodemailer from 'nodemailer';

/**
 * Checks if real SMTP credentials are configured in environment variables.
 */
export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/**
 * Creates Nodemailer transporter when environment variables are set.
 */
function createTransporter() {
  if (!isSmtpConfigured()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends a password reset OTP to the registered email.
 * - If SMTP credentials exist: delivers real email.
 * - If unconfigured: returns clearly labelled DEMO mode payload. Never represents mock email as real delivery.
 */
export async function sendPasswordResetEmail(recipientEmail, otpCode, validityMinutes = 10) {
  const fromAddress = process.env.EMAIL_FROM || '"Magizh Shopping Security" <no-reply@magizhshopping.in>';

  if (isSmtpConfigured()) {
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: fromAddress,
        to: recipientEmail,
        subject: 'Your Magizh Shopping Password Reset Code',
        text: `Your password reset code is ${otpCode}. This code is valid for ${validityMinutes} minutes. If you did not request this, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #FDFBF7; border: 1px solid #E7DEC8; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #166534, #14532D); color: #FFFFFF; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.5px;">MAGIZH SHOPPING</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #DCFCE7;">B5 Coin Rewards & Natural Living</p>
            </div>
            <div style="padding: 28px; color: #38220F;">
              <h2 style="margin-top: 0; font-size: 18px; color: #166534;">Password Reset Verification</h2>
              <p style="font-size: 14px; line-height: 1.5; color: #451A03;">
                We received a request to reset your password for your Magizh Shopping account. Use the one-time verification code below:
              </p>
              <div style="margin: 24px 0; text-align: center;">
                <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 12px 28px; background: #FFF7ED; color: #C2410C; border: 2px dashed #EA580C; border-radius: 12px; font-family: monospace;">
                  ${otpCode}
                </span>
              </div>
              <p style="font-size: 12px; color: #78350F; line-height: 1.4;">
                This code is strictly confidential and expires in <strong>${validityMinutes} minutes</strong>. Maximum 5 verification attempts permitted.
              </p>
              <p style="font-size: 12px; color: #9A3412; margin-top: 16px;">
                If you did not initiate this request, your account remains secure. No action is required.
              </p>
            </div>
            <div style="background: #FAF5EE; padding: 14px; text-align: center; font-size: 11px; color: #78350F; border-top: 1px solid #E7DEC8;">
              &copy; 2026 Magizh Shopping &bull; Pure South Indian Heritage &bull; 1 B5 Coin = ₹1
            </div>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      return {
        delivered: true,
        messageId: info.messageId,
        demoMode: false,
        message: 'Password reset code sent to your registered email address.',
      };
    } catch (err) {
      console.error('[EmailService] SMTP delivery failed:', err.message);
      // Fallback with clear indicator of failure
      return {
        delivered: false,
        demoMode: true,
        demoOtp: otpCode,
        error: `SMTP delivery failed (${err.message}). Falling back to Demo Mode.`,
        message: 'DEMO MODE: Live email service unavailable. Use the provided demo verification code.',
      };
    }
  }

  // Clearly labelled development demo mode
  return {
    delivered: false,
    demoMode: true,
    demoOtp: otpCode,
    message: 'DEMO MODE: Live SMTP credentials not configured in environment. Demo OTP provided for testing.',
  };
}
