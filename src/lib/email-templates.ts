/**
 * CareCircle email templates — the look & feel of everything we send.
 *
 * Why a dedicated module: `email.ts` owns *delivery* (SES / SMTP / Resend / console); this owns
 * *content*. Each builder returns `{ subject, html, text }` — a polished, branded HTML version
 * plus a plain-text fallback (every good email needs both for deliverability + accessibility).
 *
 * Design constraints (these are why it's all tables + inline styles, not the app's Tailwind):
 *  - Email clients strip <style>, <link>, flexbox, and most modern CSS — so we use table layout,
 *    inline styles, web-safe fonts, and a bulletproof button.
 *  - All caller-supplied text (names, notes) is HTML-escaped to prevent injection in the inbox.
 *  - A hidden preheader controls the inbox preview line.
 *
 * To add a new email: write a `somethingEmail(args): EmailContent` that calls `baseLayout(...)`.
 */

export type EmailContent = { subject: string; html: string; text: string };

// ---- Brand palette (mirrors the app's teal primary; safe literal hex for email clients) ----
const BRAND = {
  primary: '#0f766e', // teal-700 — buttons, links, logo
  primaryDark: '#115e59',
  ink: '#1f2937', // body text
  muted: '#6b7280', // secondary text
  faint: '#9ca3af', // footer text
  line: '#e5e7eb', // borders
  card: '#ffffff',
  page: '#f3f4f6', // email background
  accentBg: '#f0fdfa', // teal-50 — note / highlight panels
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji'";

/** Escape user-provided text before interpolating into HTML — never trust names/notes. */
function esc(value: string | null | undefined): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/** A bulletproof, centered call-to-action button. */
function button(href: string, label: string): string {
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 4px;">
    <tr>
      <td align="center" bgcolor="${BRAND.primary}" style="border-radius:10px;">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">
          ${esc(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

/** A small rounded role/label pill. */
function pill(label: string): string {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${BRAND.accentBg};color:${BRAND.primaryDark};font-size:12px;font-weight:600;letter-spacing:0.2px;">${esc(label)}</span>`;
}

/** A quoted personal-note panel. */
function noteBlock(note: string, author: string): string {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="padding:16px 18px;background:${BRAND.accentBg};border-radius:12px;border:1px solid ${BRAND.line};">
        <p style="margin:0;font-family:${FONT};font-size:15px;font-style:italic;line-height:1.6;color:${BRAND.ink};">&ldquo;${esc(note)}&rdquo;</p>
        <p style="margin:8px 0 0;font-family:${FONT};font-size:13px;color:${BRAND.muted};">— ${esc(author)}</p>
      </td>
    </tr>
  </table>`;
}

/**
 * The shared shell: branded header, white content card, footer. `contentHtml` is trusted
 * (built by the template fns below); all user data passed into it is escaped at the call site.
 */
function baseLayout(opts: { title: string; preheader: string; contentHtml: string }): string {
  const { title, preheader, contentHtml } = opts;
  const year = '2026'; // stamped statically — runtime Date is intentionally avoided server-side here.
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.page};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
          <!-- Header / wordmark -->
          <tr>
            <td style="padding:8px 8px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td width="36" height="36" align="center" valign="middle" bgcolor="${BRAND.primary}" style="border-radius:999px;color:#ffffff;font-size:18px;line-height:36px;font-family:${FONT};">&#9829;</td>
                      <td style="padding-left:10px;font-family:${FONT};font-size:18px;font-weight:700;color:${BRAND.ink};">CareCircle</td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content card -->
          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:16px;padding:36px 36px 32px;">
              ${contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:22px 28px;">
              <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.faint};">
                CareCircle — coordinated care for the people you love.
              </p>
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.faint};">
                &copy; ${year} CareCircle. You're receiving this because someone used your email address with CareCircle.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${BRAND.ink};">${html}</p>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:700;color:${BRAND.ink};">${esc(text)}</h1>`;
}

function fallbackLink(url: string): string {
  return `<p style="margin:18px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.muted};">
    If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${url}" target="_blank" style="color:${BRAND.primary};word-break:break-all;">${esc(url)}</a>
  </p>`;
}

// Friendly labels for the schema's role enum (shared with email.ts).
export const ROLE_LABELS: Record<string, string> = {
  owner: 'Coordinator',
  family_admin: 'Family admin',
  family: 'Family member',
  caregiver: 'Caregiver',
  read_only: 'Read-only',
  care_recipient: 'Care recipient',
  clinician: 'Clinician',
};

// ============================================================================
// Templates
// ============================================================================

/** "Reset your password" — one-time link, 1-hour expiry. */
export function passwordResetEmail(params: { resetUrl: string }): EmailContent {
  const { resetUrl } = params;
  const subject = 'Reset your CareCircle password';
  const content =
    heading('Reset your password') +
    paragraph(
      'We received a request to reset the password for your CareCircle account. Click the button below to choose a new one.',
    ) +
    button(resetUrl, 'Reset password') +
    paragraph(
      `<span style="color:${BRAND.muted};font-size:13px;">This link expires in 1 hour for your security.</span>`,
    ) +
    paragraph(
      `<span style="color:${BRAND.muted};font-size:13px;">If you didn't request this, you can safely ignore this email — your password won't change.</span>`,
    ) +
    fallbackLink(resetUrl);

  const text = [
    'Reset your CareCircle password',
    '',
    'We received a request to reset the password for your CareCircle account.',
    'Choose a new password here (the link expires in 1 hour):',
    resetUrl,
    '',
    "If you didn't request this, you can safely ignore this email — your password won't change.",
    '',
    '— CareCircle',
  ].join('\n');

  return { subject, html: baseLayout({ title: subject, preheader: 'Reset your CareCircle password — this link expires in 1 hour.', contentHtml: content }), text };
}

/** "You're invited to a care circle" — the onboarding invitation. */
export function invitationEmail(params: {
  inviteUrl: string;
  inviterName: string;
  recipientName: string;
  role: string;
  personalNote?: string;
  expiresInDays?: number;
}): EmailContent {
  const { inviteUrl, inviterName, recipientName, role, personalNote, expiresInDays = 7 } = params;
  const roleLabel = ROLE_LABELS[role] ?? role;
  const subject = `${inviterName} invited you to help care for ${recipientName} on CareCircle`;

  const content =
    heading(`You're invited to ${recipientName}'s Care Circle`) +
    paragraph(
      `<strong>${esc(inviterName)}</strong> invited you to join the care circle for <strong>${esc(recipientName)}</strong> on CareCircle, where families and caregivers coordinate medications, appointments, daily updates, and more — together, in one calm place.`,
    ) +
    paragraph(`Your role: ${pill(roleLabel)}`) +
    (personalNote ? noteBlock(personalNote, inviterName) : '') +
    button(inviteUrl, 'Accept invitation') +
    paragraph(
      `<span style="color:${BRAND.muted};font-size:13px;">This invitation expires in ${expiresInDays} days. If you weren't expecting it, you can safely ignore this email.</span>`,
    ) +
    fallbackLink(inviteUrl);

  const noteText = personalNote ? `\n"${personalNote}"\n— ${inviterName}\n` : '';
  const text = [
    `${inviterName} invited you to help care for ${recipientName} on CareCircle.`,
    `Your role: ${roleLabel}.`,
    noteText,
    'Accept your invitation here:',
    inviteUrl,
    '',
    `This invitation expires in ${expiresInDays} days. If you weren't expecting it, you can safely ignore this email.`,
    '',
    '— CareCircle',
  ].join('\n');

  return {
    subject,
    html: baseLayout({
      title: subject,
      preheader: `${inviterName} invited you to help care for ${recipientName} on CareCircle.`,
      contentHtml: content,
    }),
    text,
  };
}

/** "You've joined the circle" — sent to a new member the first time they accept an invitation. */
export function joinedCircleEmail(params: {
  recipientName: string;
  circleName: string;
  role: string;
  dashboardUrl: string;
}): EmailContent {
  const { recipientName, circleName, role, dashboardUrl } = params;
  const roleLabel = ROLE_LABELS[role] ?? role;
  const subject = `You've joined ${recipientName}'s Care Circle`;
  const content =
    heading(`Welcome to ${esc(recipientName)}'s Care Circle`) +
    paragraph(`You're now part of <strong>${esc(circleName)}</strong>.`) +
    paragraph(`Your role: ${pill(roleLabel)}`) +
    paragraph(
      "From your dashboard you can follow the daily timeline, see medications and appointments, read the AI digest, and pitch in where you're needed.",
    ) +
    button(dashboardUrl, 'Go to your dashboard') +
    paragraph(
      `<span style="color:${BRAND.muted};font-size:13px;">Glad to have you helping care for ${esc(recipientName)}.</span>`,
    ) +
    fallbackLink(dashboardUrl);
  const text = [
    `You've joined ${recipientName}'s Care Circle (${circleName}) as a ${roleLabel}.`,
    '',
    'From your dashboard you can follow the timeline, see medications and appointments, read the AI digest, and help out:',
    dashboardUrl,
    '',
    '— CareCircle',
  ].join('\n');
  return {
    subject,
    html: baseLayout({
      title: subject,
      preheader: `You're now part of ${circleName} on CareCircle.`,
      contentHtml: content,
    }),
    text,
  };
}

/** "Welcome to CareCircle" — sent to the owner after they finish onboarding (optional, ready to wire). */
export function welcomeEmail(params: { recipientName: string; dashboardUrl: string }): EmailContent {
  const { recipientName, dashboardUrl } = params;
  const subject = `${recipientName}'s Care Circle is ready`;
  const content =
    heading(`${esc(recipientName)}'s Care Circle is ready 🎉`) +
    paragraph(
      "You've taken the first step toward calmer, better-coordinated care. From your dashboard you can log medications, track appointments, record vitals, post daily updates, and invite the rest of your circle.",
    ) +
    button(dashboardUrl, 'Open your dashboard') +
    paragraph(
      `<span style="color:${BRAND.muted};font-size:13px;">Need a hand getting started? Just reply to this email.</span>`,
    ) +
    fallbackLink(dashboardUrl);
  const text = [
    `${recipientName}'s Care Circle is ready!`,
    '',
    "You've taken the first step toward calmer, better-coordinated care. Log medications, track appointments, record vitals, post updates, and invite your circle from the dashboard:",
    dashboardUrl,
    '',
    '— CareCircle',
  ].join('\n');
  return {
    subject,
    html: baseLayout({ title: subject, preheader: `${recipientName}'s Care Circle is set up and ready to go.`, contentHtml: content }),
    text,
  };
}
