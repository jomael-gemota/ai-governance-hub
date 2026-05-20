const path = require('path');
const nodemailer = require('nodemailer');

let transporter = null;
let smtpConfigured = false;
const PROD_APP_URL = 'https://ai-governance-hub.outdoorequippedservice.com';
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'email-logo.png');
const LOGO_CID = 'agh-logo';

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
              <td valign="middle" style="width:44px; height:44px;">
                <img src="cid:${LOGO_CID}" alt="AI Governance Hub" width="44" height="44" style="display:block; border:0; border-radius:10px;" />
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
  await t.sendMail({
    from,
    to,
    subject,
    html,
    text,
    attachments: [
      {
        filename: 'logo.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
  return { sent: true };
}

// ─── Audit submitted — notify auditors ──────────────────────────────────────

function buildAuditSubmittedHtml({ projectName, submitterName, appUrl, projectUrl, isResubmission }) {
  const headline = isResubmission
    ? `${submitterName} re-submitted a project for audit`
    : `${submitterName} submitted a project for audit`;
  const eyebrow = isResubmission ? 'Re-submitted for Audit' : 'New Audit Request';

  return `
  <div style="margin:0; padding:32px 12px; background:#f1f5f9;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="620" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 620px; margin: 0 auto; border-collapse: separate;">
      <tr>
        <td style="background: #0f172a; color: #f8fafc; border-radius: 20px 20px 0 0; border: 1px solid #1e293b; border-bottom: 0; padding: 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px;">
            <tr>
              <td valign="middle" style="width:44px; height:44px;">
                <img src="cid:${LOGO_CID}" alt="AI Governance Hub" width="44" height="44" style="display:block; border:0; border-radius:10px;" />
              </td>
              <td valign="middle" style="padding-left:12px; font-size:18px; font-weight:700; color:#ffffff; letter-spacing:0.2px;">
                AI Governance Hub
              </td>
            </tr>
          </table>
          <p style="margin:0 0 6px; font-size:12px; font-weight:600; color:#818cf8; letter-spacing:1px; text-transform:uppercase;">${eyebrow}</p>
          <h1 style="margin: 0; font-size: 24px; line-height: 1.3; color: #ffffff; font-weight: 700;">${headline}</h1>
        </td>
      </tr>
      <tr>
        <td style="background: #ffffff; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 20px 20px; padding: 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
            <tr>
              <td style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                <p style="margin:0 0 4px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; color:#94a3b8;">Project</p>
                <p style="margin:0; font-size:17px; font-weight:700; color:#0f172a;">${projectName}</p>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 24px; color: #334155; font-size: 15px; line-height: 1.7;">
            This project is now waiting in the audit queue. Claim it to begin your review.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:#4f46e5; border-radius:10px;">
                <a href="${projectUrl}" style="display:inline-block; padding: 13px 26px; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                  View Project
                </a>
              </td>
            </tr>
          </table>
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

async function sendAuditSubmittedEmail({ to, projectName, projectId, submitterName, isResubmission = false }) {
  const appUrl = resolveAppUrl();
  const projectUrl = `${appUrl}/projects/${projectId}`;
  const subject = isResubmission
    ? `Re-submitted for audit: ${projectName}`
    : `New audit request: ${projectName}`;
  const html = buildAuditSubmittedHtml({ projectName, submitterName, appUrl, projectUrl, isResubmission });
  const text = `${submitterName} ${isResubmission ? 're-submitted' : 'submitted'} "${projectName}" for audit. Review it at: ${projectUrl}`;

  const t = getTransporter();
  if (!t) {
    console.log(`\n[mailer] SMTP not configured — audit-submitted email NOT sent to ${to}`);
    console.log(`[mailer] Project: ${projectName} | URL: ${projectUrl}\n`);
    return { sent: false, reason: 'SMTP not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const recipients = Array.isArray(to) ? to.join(',') : to;
  await t.sendMail({
    from,
    to: recipients,
    subject,
    html,
    text,
    attachments: [{ filename: 'logo.png', path: LOGO_PATH, cid: LOGO_CID, contentDisposition: 'inline' }],
  });
  return { sent: true };
}

// ─── Verdict submitted — notify creator ──────────────────────────────────────

const VERDICT_META = {
  approved:       { label: 'Approved',         color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', badge: '#d1fae5', badgeText: '#065f46' },
  denied:         { label: 'Denied',            color: '#ef4444', bg: '#fef2f2', border: '#fecaca', badge: '#fee2e2', badgeText: '#7f1d1d' },
  'needs-review': { label: 'Needs Review',      color: '#f97316', bg: '#fff7ed', border: '#fed7aa', badge: '#ffedd5', badgeText: '#7c2d12' },
};

function buildAuditVerdictHtml({ projectName, auditorName, verdict, findings, conditions, nextReviewDate, appUrl, projectUrl }) {
  const meta = VERDICT_META[verdict] || VERDICT_META['denied'];

  const conditionsBlock = conditions
    ? `<tr><td style="padding-top:16px;">
        <p style="margin:0 0 6px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; color:#94a3b8;">Conditions to Address</p>
        <p style="margin:0; font-size:14px; color:#7c2d12; line-height:1.6; white-space:pre-wrap;">${conditions}</p>
       </td></tr>`
    : '';

  const nextReviewBlock = nextReviewDate
    ? `<tr><td style="padding-top:16px;">
        <p style="margin:0 0 4px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; color:#94a3b8;">Next Scheduled Review</p>
        <p style="margin:0; font-size:14px; color:#0f172a;">${nextReviewDate}</p>
       </td></tr>`
    : '';

  return `
  <div style="margin:0; padding:32px 12px; background:#f1f5f9;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="620" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 620px; margin: 0 auto; border-collapse: separate;">
      <tr>
        <td style="background: #0f172a; color: #f8fafc; border-radius: 20px 20px 0 0; border: 1px solid #1e293b; border-bottom: 0; padding: 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px;">
            <tr>
              <td valign="middle" style="width:44px; height:44px;">
                <img src="cid:${LOGO_CID}" alt="AI Governance Hub" width="44" height="44" style="display:block; border:0; border-radius:10px;" />
              </td>
              <td valign="middle" style="padding-left:12px; font-size:18px; font-weight:700; color:#ffffff; letter-spacing:0.2px;">
                AI Governance Hub
              </td>
            </tr>
          </table>
          <p style="margin:0 0 6px; font-size:12px; font-weight:600; color:#818cf8; letter-spacing:1px; text-transform:uppercase;">Audit Result</p>
          <h1 style="margin: 0; font-size: 24px; line-height: 1.3; color: #ffffff; font-weight: 700;">Your project has been audited</h1>
        </td>
      </tr>
      <tr>
        <td style="background: #ffffff; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 20px 20px; padding: 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
            <tr>
              <td style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td>
                      <p style="margin:0 0 4px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; color:#94a3b8;">Project</p>
                      <p style="margin:0; font-size:17px; font-weight:700; color:#0f172a;">${projectName}</p>
                    </td>
                    <td align="right" valign="top">
                      <span style="display:inline-block; padding:5px 14px; background:${meta.badge}; color:${meta.badgeText}; border-radius:999px; font-size:13px; font-weight:700;">
                        ${meta.label}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:10px;">
                      <p style="margin:0; font-size:13px; color:#64748b;">Reviewed by <strong style="color:#0f172a;">${auditorName}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:16px;">
                      <p style="margin:0 0 6px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; color:#94a3b8;">Findings</p>
                      <p style="margin:0; font-size:14px; color:#334155; line-height:1.6; white-space:pre-wrap;">${findings}</p>
                    </td>
                  </tr>
                  ${conditionsBlock}
                  ${nextReviewBlock}
                </table>
              </td>
            </tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:#4f46e5; border-radius:10px;">
                <a href="${projectUrl}" style="display:inline-block; padding: 13px 26px; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                  View Full Audit Report
                </a>
              </td>
            </tr>
          </table>
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

async function sendAuditVerdictEmail({ to, projectName, projectId, auditorName, verdict, findings, conditions, nextReviewDate }) {
  const appUrl = resolveAppUrl();
  const projectUrl = `${appUrl}/projects/${projectId}`;
  const meta = VERDICT_META[verdict] || VERDICT_META['denied'];

  const formattedDate = nextReviewDate
    ? new Date(nextReviewDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const subject = `Audit result for "${projectName}": ${meta.label}`;
  const html = buildAuditVerdictHtml({
    projectName, auditorName, verdict, findings,
    conditions, nextReviewDate: formattedDate, appUrl, projectUrl,
  });
  const text = `Your project "${projectName}" has been audited by ${auditorName}.\nVerdict: ${meta.label}\n\nFindings:\n${findings}${conditions ? '\n\nConditions:\n' + conditions : ''}\n\nView it at: ${projectUrl}`;

  const t = getTransporter();
  if (!t) {
    console.log(`\n[mailer] SMTP not configured — audit-verdict email NOT sent to ${to}`);
    console.log(`[mailer] Project: ${projectName} | Verdict: ${verdict}\n`);
    return { sent: false, reason: 'SMTP not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await t.sendMail({
    from,
    to,
    subject,
    html,
    text,
    attachments: [{ filename: 'logo.png', path: LOGO_PATH, cid: LOGO_CID, contentDisposition: 'inline' }],
  });
  return { sent: true };
}

// ─── Trial run started — notify creator ──────────────────────────────────────

function buildTrialRunStartedHtml({ projectName, auditorName, trialDurationDays, trialEndsAt, findings, appUrl, projectUrl }) {
  const formattedEnd = new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `
  <div style="margin:0; padding:32px 12px; background:#f1f5f9;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="620" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 620px; margin: 0 auto; border-collapse: separate;">
      <tr>
        <td style="background: #0f172a; color: #f8fafc; border-radius: 20px 20px 0 0; border: 1px solid #1e293b; border-bottom: 0; padding: 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px;">
            <tr>
              <td valign="middle" style="width:44px; height:44px;">
                <img src="cid:${LOGO_CID}" alt="AI Governance Hub" width="44" height="44" style="display:block; border:0; border-radius:10px;" />
              </td>
              <td valign="middle" style="padding-left:12px; font-size:18px; font-weight:700; color:#ffffff; letter-spacing:0.2px;">
                AI Governance Hub
              </td>
            </tr>
          </table>
          <p style="margin:0 0 6px; font-size:12px; font-weight:600; color:#818cf8; letter-spacing:1px; text-transform:uppercase;">Trial Run Initiated</p>
          <h1 style="margin: 0; font-size: 24px; line-height: 1.3; color: #ffffff; font-weight: 700;">Your project has entered a ${trialDurationDays}-day trial run</h1>
        </td>
      </tr>
      <tr>
        <td style="background: #ffffff; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 20px 20px; padding: 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
            <tr>
              <td style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td>
                      <p style="margin:0 0 4px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; color:#94a3b8;">Project</p>
                      <p style="margin:0; font-size:17px; font-weight:700; color:#0f172a;">${projectName}</p>
                    </td>
                    <td align="right" valign="top">
                      <span style="display:inline-block; padding:5px 14px; background:#ede9fe; color:#5b21b6; border-radius:999px; font-size:13px; font-weight:700;">
                        ${trialDurationDays}-Day Trial
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:10px;">
                      <p style="margin:0; font-size:13px; color:#64748b;">Initiated by <strong style="color:#0f172a;">${auditorName}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:16px;">
                      <p style="margin:0 0 4px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; color:#94a3b8;">Trial Ends On</p>
                      <p style="margin:0; font-size:15px; font-weight:700; color:#4f46e5;">${formattedEnd}</p>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:16px;">
                      <p style="margin:0 0 6px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; color:#94a3b8;">Auditor Notes</p>
                      <p style="margin:0; font-size:14px; color:#334155; line-height:1.6; white-space:pre-wrap;">${findings}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 24px; color: #334155; font-size: 15px; line-height: 1.7;">
            The tool must be actively used with real tasks or data during this period. Once the trial ends, auditors will conduct a final review before official approval can be granted.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:#4f46e5; border-radius:10px;">
                <a href="${projectUrl}" style="display:inline-block; padding: 13px 26px; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                  View Project
                </a>
              </td>
            </tr>
          </table>
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

async function sendTrialRunStartedEmail({ to, projectName, projectId, auditorName, trialDurationDays, trialEndsAt, findings }) {
  const appUrl = resolveAppUrl();
  const projectUrl = `${appUrl}/projects/${projectId}`;
  const subject = `Trial run started: ${projectName} (${trialDurationDays} days)`;
  const html = buildTrialRunStartedHtml({ projectName, auditorName, trialDurationDays, trialEndsAt, findings, appUrl, projectUrl });
  const formattedEnd = new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const text = `Your project "${projectName}" has entered a ${trialDurationDays}-day trial run initiated by ${auditorName}.\nTrial ends: ${formattedEnd}\n\nNotes:\n${findings}\n\nView it at: ${projectUrl}`;

  const t = getTransporter();
  if (!t) {
    console.log(`\n[mailer] SMTP not configured — trial-run-started email NOT sent to ${to}`);
    console.log(`[mailer] Project: ${projectName} | Duration: ${trialDurationDays} days\n`);
    return { sent: false, reason: 'SMTP not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await t.sendMail({
    from, to, subject, html, text,
    attachments: [{ filename: 'logo.png', path: LOGO_PATH, cid: LOGO_CID, contentDisposition: 'inline' }],
  });
  return { sent: true };
}

// ─── Trial run completed — notify auditors ────────────────────────────────────

function buildTrialRunCompletedHtml({ projectName, appUrl, projectUrl }) {
  return `
  <div style="margin:0; padding:32px 12px; background:#f1f5f9;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="620" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 620px; margin: 0 auto; border-collapse: separate;">
      <tr>
        <td style="background: #0f172a; color: #f8fafc; border-radius: 20px 20px 0 0; border: 1px solid #1e293b; border-bottom: 0; padding: 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px;">
            <tr>
              <td valign="middle" style="width:44px; height:44px;">
                <img src="cid:${LOGO_CID}" alt="AI Governance Hub" width="44" height="44" style="display:block; border:0; border-radius:10px;" />
              </td>
              <td valign="middle" style="padding-left:12px; font-size:18px; font-weight:700; color:#ffffff; letter-spacing:0.2px;">
                AI Governance Hub
              </td>
            </tr>
          </table>
          <p style="margin:0 0 6px; font-size:12px; font-weight:600; color:#34d399; letter-spacing:1px; text-transform:uppercase;">Trial Run Complete</p>
          <h1 style="margin: 0; font-size: 24px; line-height: 1.3; color: #ffffff; font-weight: 700;">A project is ready for final review</h1>
        </td>
      </tr>
      <tr>
        <td style="background: #ffffff; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 20px 20px; padding: 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
            <tr>
              <td style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                <p style="margin:0 0 4px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; color:#94a3b8;">Project</p>
                <p style="margin:0; font-size:17px; font-weight:700; color:#0f172a;">${projectName}</p>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 24px; color: #334155; font-size: 15px; line-height: 1.7;">
            The trial run period has elapsed. This project is now awaiting your final verdict — review the trial observations and submit an <strong>Approved</strong> or <strong>Denied</strong> decision.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:#059669; border-radius:10px;">
                <a href="${projectUrl}" style="display:inline-block; padding: 13px 26px; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                  Submit Final Verdict
                </a>
              </td>
            </tr>
          </table>
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

async function sendTrialRunCompletedEmail({ to, projectName, projectId }) {
  const appUrl = resolveAppUrl();
  const projectUrl = `${appUrl}/projects/${projectId}`;
  const subject = `Trial run complete — final review needed: ${projectName}`;
  const html = buildTrialRunCompletedHtml({ projectName, appUrl, projectUrl });
  const text = `The trial run for "${projectName}" has elapsed. Please submit your final verdict at: ${projectUrl}`;

  const t = getTransporter();
  if (!t) {
    console.log(`\n[mailer] SMTP not configured — trial-completed email NOT sent to ${to}`);
    console.log(`[mailer] Project: ${projectName} | URL: ${projectUrl}\n`);
    return { sent: false, reason: 'SMTP not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const recipients = Array.isArray(to) ? to.join(',') : to;
  await t.sendMail({
    from, to: recipients, subject, html, text,
    attachments: [{ filename: 'logo.png', path: LOGO_PATH, cid: LOGO_CID, contentDisposition: 'inline' }],
  });
  return { sent: true };
}

module.exports = {
  sendInvitationEmail,
  sendAuditSubmittedEmail,
  sendAuditVerdictEmail,
  sendTrialRunStartedEmail,
  sendTrialRunCompletedEmail,
  isSmtpConfigured: () => smtpConfigured || Boolean(getTransporter()),
};
