const nodemailer = require('nodemailer');

let transporter = null;
let smtpConfigured = false;

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
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
    <div style="background: #0f172a; color: #f1f5f9; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="display: inline-block; background: #4f46e5; padding: 10px; border-radius: 12px; margin-bottom: 16px;">
        <span style="color: white; font-size: 20px; font-weight: 700;">AGH</span>
      </div>
      <h1 style="margin: 0 0 12px 0; font-size: 22px; color: #ffffff;">You've been invited to the AI Governance Hub</h1>
      <p style="color: #cbd5e1; line-height: 1.6; margin: 0 0 16px 0;">
        ${inviterName ? `<strong style="color:#fff">${inviterName}</strong> has invited you` : 'You have been invited'} to join the AI Governance Hub as a <strong style="color:#a5b4fc">${roleLabel}</strong>.
      </p>
      <p style="color: #cbd5e1; line-height: 1.6; margin: 0 0 24px 0;">
        Sign in using your Google account (the same email this invitation was sent to) to accept and get started.
      </p>
      <a href="${appUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Accept Invitation & Sign In
      </a>
      <p style="color: #64748b; font-size: 13px; margin: 24px 0 0 0;">
        Or copy this link: <span style="color:#94a3b8">${appUrl}</span>
      </p>
    </div>
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
      If you weren't expecting this, you can safely ignore the email.
    </p>
  </div>`;
}

async function sendInvitationEmail({ to, inviterName, role }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
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
