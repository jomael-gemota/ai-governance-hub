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
  return `
  <div style="margin:0; padding:32px 12px; background:#f1f5f9;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="620" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 620px; margin: 0 auto; border-collapse: separate;">
      <tr>
        <td style="background: #0f172a; color: #f8fafc; border-radius: 20px 20px 0 0; border: 1px solid #1e293b; border-bottom: 0; padding: 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px;">
            <tr>
              <td valign="middle" style="background:#4f46e5; width:44px; height:44px; border-radius:10px; text-align:center; font-family: Arial, sans-serif; color:#ffffff; font-size:24px; font-weight:700; line-height:44px;">
                &#10003;
              </td>
              <td valign="middle" style="padding-left:12px; font-size:18px; font-weight:700; color:#ffffff; letter-spacing:0.2px;">
                AI Governance Hub
              </td>
            </tr>
          </table>
          <h1 style="margin: 0; font-size: 26px; line-height: 1.25; color: #ffffff; font-weight: 700;">You're Invited</h1>
          <p style="margin: 12px 0 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
            ${inviterName ? `<strong style="color:#ffffff">${inviterName}</strong> invited you` : 'You have been invited'} to join as
            <strong style="color:#c4b5fd;"> ${roleLabel}</strong>.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background: #ffffff; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 20px 20px; padding: 32px 28px;">
          <p style="margin: 0 0 24px; color: #334155; font-size: 15px; line-height: 1.7;">
            Sign in with your Google account using the same email address this invitation was sent to.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:#4f46e5; border-radius:10px;">
                <a href="${appUrl}" style="display:inline-block; padding: 13px 26px; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                  Accept Invitation
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 28px 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">
            If you were not expecting this invitation, you can safely ignore this email.
          </p>
        </td>
      </tr>
      <tr>
        <td style="text-align:center; padding: 16px 0 0; color:#94a3b8; font-size:11px;">
          AI Governance Hub &middot; Outdoor Equipped Service
        </td>
      </tr>
    </table>
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
