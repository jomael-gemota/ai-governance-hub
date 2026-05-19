const nodemailer = require('nodemailer');

let transporter = null;
let smtpConfigured = false;
const PROD_APP_URL = 'https://ai-governance-hub.outdoorequippedservice.com';

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    smtpConfigured = false;
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  smtpConfigured = true;
  return transporter;
}

function buildInvitationHtml({ inviterName, role, appUrl }) {
  const roleLabel = role === 'auditor' ? 'Auditor (full access)' : 'Creator (project owner)';
  const logoUrl = `${appUrl.replace(/\/$/, '')}/favicon.svg`;
  return `
  <div style="margin:0; padding:32px 12px; background:#f1f5f9;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 620px; margin: 0 auto;">
      <div style="background: linear-gradient(140deg, #0f172a 0%, #1e293b 100%); color: #f8fafc; border-radius: 20px 20px 0 0; border: 1px solid #1e293b; border-bottom: 0; padding: 28px 28px 24px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
          <img src="${logoUrl}" alt="AI Governance Hub" width="40" height="40" style="display:block; border:0; border-radius:10px; background:#4f46e5; padding:4px;" />
          <div style="font-size:18px; font-weight:700; letter-spacing:0.2px;">AI Governance Hub</div>
        </div>
        <h1 style="margin: 0; font-size: 24px; line-height: 1.3; color: #ffffff;">You're Invited</h1>
        <p style="margin: 10px 0 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
          ${inviterName ? `<strong style="color:#ffffff">${inviterName}</strong> invited you` : 'You have been invited'} to join as
          <strong style="color:#c4b5fd;"> ${roleLabel}</strong>.
        </p>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 20px 20px; padding: 28px;">
        <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.7;">
          Sign in with your Google account using the same email address this invitation was sent to.
        </p>
        <div style="margin: 24px 0;">
          <a href="${appUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 22px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">
            Accept Invitation
          </a>
        </div>
        <div style="margin-top: 20px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
          <p style="margin: 0 0 6px; color: #475569; font-size: 12px; font-weight: 700; letter-spacing: 0.2px; text-transform: uppercase;">
            Direct Link
          </p>
          <a href="${appUrl}" style="color:#4f46e5; font-size: 13px; text-decoration:none; word-break: break-all;">${appUrl}</a>
        </div>
        <p style="margin: 18px 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">
          If you were not expecting this invitation, you can safely ignore this email.
        </p>
      </div>
      <p style="text-align:center; margin: 14px 0 0; color:#94a3b8; font-size:11px;">
        AI Governance Hub - Outdoor Equipped Service
      </p>
    </div>
  </div>
  `;
}

function resolveAppUrl() {
  const rawUrl = (process.env.APP_URL || '').trim();
  if (!rawUrl) return PROD_APP_URL;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return PROD_APP_URL;
    }
    return rawUrl;
  } catch {
    return PROD_APP_URL;
  }
}

async function sendInvitationEmail({ to, inviterName, role }) {
  const appUrl = resolveAppUrl();
  const subject = 'You\'re invited to the AI Governance Hub';
  const html = buildInvitationHtml({ inviterName, role, appUrl });
  const text = `${inviterName ? inviterName + ' has invited' : 'You have been invited'} you to the AI Governance Hub as ${role}. Sign in with Google at: ${appUrl}`;

  const t = getTransporter();
  if (!t) {
    console.log('\n[mailer] SMTP not configured — invitation email NOT sent.');
    console.log(`[mailer] To: ${to}`);
    console.log(`[mailer] Subject: ${subject}`);
    console.log(`[mailer] App URL: ${appUrl}`);
    console.log('[mailer] Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable real email delivery.\n');
    return { sent: false, reason: 'SMTP not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await t.sendMail({ from, to, subject, html, text });
  return { sent: true };
}

module.exports = { sendInvitationEmail, isSmtpConfigured: () => smtpConfigured || Boolean(getTransporter()) };
