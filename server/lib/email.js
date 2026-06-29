const { Resend } = require('resend');

const SITE_URL = 'https://www.iberzo.com';
const FROM = process.env.RESEND_FROM_EMAIL || 'Iberzo <onboarding@resend.dev>';

let resend = null;
function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function wrapper(title, bodyHtml) {
  return `
    <div style="font-family: Segoe UI, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #2d1a0e;">
      <h1 style="font-size: 20px; font-weight: 800; margin-bottom: 16px;">${title}</h1>
      ${bodyHtml}
      <p style="font-size: 12px; color: #9a7060; margin-top: 32px;">Iberzo — www.iberzo.com</p>
    </div>
  `;
}

function button(href, label) {
  return `<a href="${href}" style="display:inline-block;background:#c0392b;color:white;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin:16px 0;">${label}</a>`;
}

// Email sending failures should never block account creation or password
// reset flows — log and swallow so the caller can proceed regardless.
async function send(to, subject, html) {
  const client = getClient();
  if (!client) {
    console.warn(`RESEND_API_KEY not set — skipping email "${subject}" to ${to}`);
    return;
  }
  try {
    await client.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error(`Failed to send email "${subject}" to ${to}:`, err.message);
  }
}

async function sendVerificationEmail(email, username, token) {
  const link = `${SITE_URL}/verify-email?token=${token}`;
  const html = wrapper('Verify your email', `
    <p style="font-size: 15px; line-height: 1.6;">Hi ${username}, thanks for joining Iberzo! Please confirm this is your email address:</p>
    ${button(link, 'Verify Email Address')}
    <p style="font-size: 13px; color: #9a7060; line-height: 1.6;">This link expires in 24 hours. If you didn't create an Iberzo account, you can ignore this email.</p>
  `);
  await send(email, 'Verify your Iberzo email address', html);
}

async function sendPasswordResetEmail(email, username, token) {
  const link = `${SITE_URL}/reset-password?token=${token}`;
  const html = wrapper('Reset your password', `
    <p style="font-size: 15px; line-height: 1.6;">Hi ${username}, we received a request to reset your Iberzo password.</p>
    ${button(link, 'Reset Password')}
    <p style="font-size: 13px; color: #9a7060; line-height: 1.6;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
  `);
  await send(email, 'Reset your Iberzo password', html);
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
