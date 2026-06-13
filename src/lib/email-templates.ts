/**
 * Kintwadi email templates — the look & feel of everything we send.
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

import type { Digest, DigestStat, SourceMoment } from '@/components/digest/types';

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
                      <td style="padding-left:10px;font-family:${FONT};font-size:18px;font-weight:700;color:${BRAND.ink};">Kintwadi</td>
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
                Kintwadi — coordinated care for the people you love.
              </p>
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.faint};">
                &copy; ${year} Kintwadi. You're receiving this because someone used your email address with Kintwadi.
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
  const subject = 'Reset your Kintwadi password';
  const content =
    heading('Reset your password') +
    paragraph(
      'We received a request to reset the password for your Kintwadi account. Click the button below to choose a new one.',
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
    'Reset your Kintwadi password',
    '',
    'We received a request to reset the password for your Kintwadi account.',
    'Choose a new password here (the link expires in 1 hour):',
    resetUrl,
    '',
    "If you didn't request this, you can safely ignore this email — your password won't change.",
    '',
    '— Kintwadi',
  ].join('\n');

  return { subject, html: baseLayout({ title: subject, preheader: 'Reset your Kintwadi password — this link expires in 1 hour.', contentHtml: content }), text };
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
  const subject = `${inviterName} invited you to help care for ${recipientName} on Kintwadi`;

  const content =
    heading(`You're invited to ${recipientName}'s Care Circle`) +
    paragraph(
      `<strong>${esc(inviterName)}</strong> invited you to join the care circle for <strong>${esc(recipientName)}</strong> on Kintwadi, where families and caregivers coordinate medications, appointments, daily updates, and more — together, in one calm place.`,
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
    `${inviterName} invited you to help care for ${recipientName} on Kintwadi.`,
    `Your role: ${roleLabel}.`,
    noteText,
    'Accept your invitation here:',
    inviteUrl,
    '',
    `This invitation expires in ${expiresInDays} days. If you weren't expecting it, you can safely ignore this email.`,
    '',
    '— Kintwadi',
  ].join('\n');

  return {
    subject,
    html: baseLayout({
      title: subject,
      preheader: `${inviterName} invited you to help care for ${recipientName} on Kintwadi.`,
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
    '— Kintwadi',
  ].join('\n');
  return {
    subject,
    html: baseLayout({
      title: subject,
      preheader: `You're now part of ${circleName} on Kintwadi.`,
      contentHtml: content,
    }),
    text,
  };
}

/** "Welcome to Kintwadi" — sent to the owner after they finish onboarding (optional, ready to wire). */
/**
 * Generic per-member notification email — the "Email" channel of Settings → Notifications. Used by
 * the dispatcher for routine activity (a dose given, a vital logged, a task assigned, the digest).
 * Plain and calm: a title, one line of context, and a single CTA to the relevant screen.
 */
export function notificationEmail(params: {
  title: string;
  body: string;
  url: string;
  ctaLabel?: string;
}): EmailContent {
  const { title, body, url, ctaLabel = 'Open Kintwadi' } = params;
  const content = heading(title) + paragraph(esc(body)) + button(url, ctaLabel) + fallbackLink(url);
  const text = [title, '', body, '', ctaLabel + ':', url, '', '— Kintwadi'].join('\n');
  return {
    subject: title,
    html: baseLayout({ title, preheader: body.slice(0, 110), contentHtml: content }),
    text,
  };
}

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
    '— Kintwadi',
  ].join('\n');
  return {
    subject,
    html: baseLayout({ title: subject, preheader: `${recipientName}'s Care Circle is set up and ready to go.`, contentHtml: content }),
    text,
  };
}

/**
 * "Urgent: an incident was reported" — emailed to notified members the moment a HIGH-severity
 * incident (a fall, an ER visit) is logged, alongside the SNS escalation fan-out. Leads with what
 * happened and a single CTA to respond; reminds the reader to call emergency services if in danger.
 */
export function incidentEscalationEmail(params: {
  recipientName: string;
  reporterName: string;
  typeLabel: string;
  severityLabel: string;
  occurredAtLabel: string;
  description: string;
  incidentUrl: string;
}): EmailContent {
  const { recipientName, reporterName, typeLabel, severityLabel, occurredAtLabel, description, incidentUrl } = params;
  const subject = `Urgent: ${typeLabel} reported for ${recipientName}`;

  const content =
    `<div style="font-size:36px;line-height:1;margin:0 0 8px;">🚨</div>` +
    heading(`${typeLabel} — needs attention`) +
    paragraph(
      `<strong>${esc(reporterName)}</strong> reported ${esc(typeLabel.toLowerCase())} for <strong>${esc(recipientName)}</strong>.`,
    ) +
    paragraph(`Severity: ${pill(severityLabel)} &nbsp;&middot;&nbsp; <span style="color:${BRAND.muted};font-size:14px;">${esc(occurredAtLabel)}</span>`) +
    noteBlock(description, reporterName) +
    button(incidentUrl, 'View incident & respond') +
    paragraph(
      `<span style="color:${BRAND.muted};font-size:13px;">If ${esc(recipientName)} is in immediate danger, call your local emergency number first.</span>`,
    ) +
    fallbackLink(incidentUrl);

  const text = [
    `URGENT: ${typeLabel} reported for ${recipientName}`,
    '',
    `${reporterName} reported ${typeLabel.toLowerCase()} for ${recipientName}.`,
    `Severity: ${severityLabel} · ${occurredAtLabel}`,
    '',
    `"${description}"`,
    '',
    'View the incident and respond:',
    incidentUrl,
    '',
    `If ${recipientName} is in immediate danger, call your local emergency number first.`,
    '',
    '— Kintwadi',
  ].join('\n');

  return {
    subject,
    html: baseLayout({ title: subject, preheader: `${reporterName} reported ${typeLabel.toLowerCase()} for ${recipientName}.`, contentHtml: content }),
    text,
  };
}

// ---- Daily Digest ----------------------------------------------------------

/** A small icon (web-safe glyph) for each kind of source moment. */
const SOURCE_GLYPH: Record<SourceMoment['type'], string> = {
  med: '💊',
  vital: '❤',
  note: '📝',
  appointment: '📅',
  activity: '🚶',
  meal: '🍽',
};

/** The "by the numbers" stat row, rendered as evenly-spaced cells. */
function statCards(stats: DigestStat[]): string {
  if (stats.length === 0) return '';
  const cells = stats
    .map(
      (s) => `
      <td align="center" valign="top" style="padding:14px 8px;background:${BRAND.accentBg};border-radius:12px;">
        <div style="font-family:${FONT};font-size:20px;font-weight:700;line-height:1.2;color:${BRAND.primaryDark};">${esc(s.emoji ? `${s.emoji} ${s.value}` : s.value)}</div>
        <div style="font-family:${FONT};font-size:12px;line-height:1.4;color:${BRAND.muted};margin-top:4px;">${esc(s.label)}</div>
      </td>`,
    )
    .join('<td style="width:10px;font-size:0;line-height:0;">&nbsp;</td>');
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 24px;">
    <tr>${cells}</tr>
  </table>`;
}

/** The "moments from the day" list, each with a time and label. */
function sourceList(sources: SourceMoment[]): string {
  if (sources.length === 0) return '';
  const rows = sources
    .map(
      (m) => `
      <tr>
        <td width="28" valign="top" style="padding:6px 8px 6px 0;font-family:${FONT};font-size:15px;line-height:1.5;">${SOURCE_GLYPH[m.type] ?? '•'}</td>
        <td valign="top" style="padding:6px 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${BRAND.ink};">${esc(m.label)}</td>
        <td align="right" valign="top" style="padding:6px 0 6px 8px;font-family:${FONT};font-size:13px;line-height:1.5;color:${BRAND.faint};white-space:nowrap;">${esc(m.time)}</td>
      </tr>`,
    )
    .join('');
  return `
  <p style="margin:24px 0 8px;font-family:${FONT};font-size:13px;font-weight:600;letter-spacing:0.3px;text-transform:uppercase;color:${BRAND.muted};">Moments from the day</p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid ${BRAND.line};">
    ${rows}
  </table>`;
}

/**
 * The nightly Daily Digest email — the warm, end-of-day update mailed to opted-in members.
 * Renders the AI headline + mood, the day's real "by the numbers" stats, Claude's narrative
 * paragraphs, and the source moments, with a CTA back to the in-app digest screen.
 */
export function dailyDigestEmail(params: {
  digest: Digest;
  recipientName: string;
  dayLabel: string;
  digestUrl: string;
}): EmailContent {
  const { digest, recipientName, dayLabel, digestUrl } = params;
  const subject = `${recipientName}'s day — ${digest.headline}`;

  const content =
    `<div style="font-size:40px;line-height:1;margin:0 0 12px;">${esc(digest.emoji)}</div>` +
    heading(digest.headline) +
    paragraph(
      `<span style="color:${BRAND.muted};font-size:14px;">${esc(recipientName)}&rsquo;s day &middot; ${esc(dayLabel)}</span>`,
    ) +
    statCards(digest.stats) +
    digest.paragraphs.map((p) => paragraph(esc(p))).join('') +
    sourceList(digest.sources) +
    `<div style="margin-top:24px;">${button(digestUrl, 'Open in Kintwadi')}</div>` +
    paragraph(
      `<span style="color:${BRAND.muted};font-size:13px;">You&rsquo;re receiving this nightly digest because you&rsquo;re part of ${esc(recipientName)}&rsquo;s circle. You can turn it off anytime in your circle settings.</span>`,
    );

  const text = [
    `${recipientName}'s day — ${dayLabel}`,
    digest.headline,
    '',
    ...(digest.stats.length ? [digest.stats.map((s) => `${s.label}: ${s.emoji ? `${s.emoji} ` : ''}${s.value}`).join('  ·  '), ''] : []),
    ...digest.paragraphs,
    ...(digest.sources.length
      ? ['', 'Moments from the day:', ...digest.sources.map((m) => `  ${m.time}  ${m.label}`)]
      : []),
    '',
    'Open the full digest in Kintwadi:',
    digestUrl,
    '',
    `You're receiving this nightly digest because you're part of ${recipientName}'s circle. You can turn it off anytime in your circle settings.`,
    '',
    '— Kintwadi',
  ].join('\n');

  return {
    subject,
    html: baseLayout({
      title: subject,
      preheader: `${recipientName}'s day: ${digest.headline}`,
      contentHtml: content,
    }),
    text,
  };
}

/**
 * Platform status alert for the ops recipients on /admin/system — sent by the transition
 * detector (src/lib/admin/status-alerts.ts) the moment a service goes DOWN, and again when it
 * recovers. Leads with what changed, shows everything still down, and links to the live console.
 */
export function serviceStatusAlertEmail(params: {
  kind: 'down' | 'recovered';
  changed: { name: string; metric: string }[];
  stillDown: { name: string; metric: string }[];
  statusUrl: string;
  checkedAtLabel: string;
}): EmailContent {
  const { kind, changed, stillDown, statusUrl, checkedAtLabel } = params;
  const names = changed.map((s) => s.name).join(', ');
  const subject =
    kind === 'down'
      ? `🔴 Kintwadi alert: ${changed.length === 1 ? 'service down' : `${changed.length} services down`} — ${names}`
      : `✅ Kintwadi: ${changed.length === 1 ? 'service recovered' : 'services recovered'} — ${names}`;

  const serviceRow = (s: { name: string; metric: string }, color: string) =>
    `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid ${BRAND.line};font-family:${FONT};font-size:14px;color:${BRAND.ink};">
        <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${color};margin-right:8px;"></span>
        <strong>${esc(s.name)}</strong>
      </td>
      <td align="right" style="padding:10px 14px;border-bottom:1px solid ${BRAND.line};font-family:${FONT};font-size:13px;color:${BRAND.muted};">${esc(s.metric)}</td>
    </tr>`;
  const serviceTable = (rows: { name: string; metric: string }[], color: string) =>
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 20px;border:1px solid ${BRAND.line};border-radius:12px;border-collapse:separate;overflow:hidden;">
      ${rows.map((s) => serviceRow(s, color)).join('')}
    </table>`;

  const content =
    `<div style="font-size:36px;line-height:1;margin:0 0 8px;">${kind === 'down' ? '🚨' : '✅'}</div>` +
    heading(kind === 'down' ? 'Service outage detected' : 'Service recovered') +
    paragraph(
      kind === 'down'
        ? `The platform health monitor detected that the following ${changed.length === 1 ? 'service is' : 'services are'} <strong>down</strong> (checked ${esc(checkedAtLabel)}):`
        : `The following ${changed.length === 1 ? 'service is' : 'services are'} <strong>back to normal</strong> (checked ${esc(checkedAtLabel)}):`,
    ) +
    serviceTable(changed, kind === 'down' ? '#dc2626' : '#16a34a') +
    (kind === 'recovered' && stillDown.length > 0
      ? paragraph('Still down:') + serviceTable(stillDown, '#dc2626')
      : '') +
    paragraph(
      kind === 'down'
        ? 'Users are seeing an in-app notice that the affected features are temporarily unavailable and being fixed. Check the live console for current probes and latencies.'
        : 'No action needed — this is the all-clear for the services above.',
    ) +
    button(statusUrl, 'Open live system console') +
    fallbackLink(statusUrl);

  const text = [
    subject,
    '',
    ...changed.map((s) => `- ${s.name}: ${kind === 'down' ? 'DOWN' : 'recovered'} (${s.metric})`),
    ...(kind === 'recovered' && stillDown.length > 0
      ? ['', 'Still down:', ...stillDown.map((s) => `- ${s.name} (${s.metric})`)]
      : []),
    '',
    `Checked ${checkedAtLabel}. Live console: ${statusUrl}`,
    '',
    '— Kintwadi platform monitor',
  ].join('\n');

  return {
    subject,
    html: baseLayout({
      title: subject,
      preheader: kind === 'down' ? `Down: ${names}` : `Recovered: ${names}`,
      contentHtml: content,
    }),
    text,
  };
}

/**
 * "New contact message" — routes a marketing-site contact-form submission to the team inbox.
 * Reply-to behaviour is handled by the caller; the sender's address is shown prominently so the
 * team can respond directly.
 */
export function contactMessageEmail(params: {
  name: string;
  email: string;
  topicLabel: string;
  message: string;
}): EmailContent {
  const { name, email, topicLabel, message } = params;
  const subject = `Contact form: ${topicLabel} — ${name}`;

  const content =
    heading('New contact message') +
    paragraph(`Topic: ${pill(topicLabel)}`) +
    paragraph(
      `<strong>${esc(name)}</strong> &lt;<a href="mailto:${esc(email)}" style="color:${BRAND.primary};">${esc(email)}</a>&gt; wrote:`,
    ) +
    noteBlock(message, name) +
    paragraph(
      `<span style="color:${BRAND.muted};font-size:13px;">Sent from the Kintwadi contact page. Reply to the address above to respond.</span>`,
    );

  const text = [
    `New contact message (${topicLabel})`,
    '',
    `From: ${name} <${email}>`,
    '',
    message,
    '',
    '— Kintwadi contact form',
  ].join('\n');

  return {
    subject,
    html: baseLayout({ title: subject, preheader: `${name}: ${message.slice(0, 90)}`, contentHtml: content }),
    text,
  };
}
