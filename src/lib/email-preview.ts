/**
 * Preview the email templates without sending anything.
 * Writes rendered HTML to ./email-previews/*.html — open them in a browser to review the design.
 *
 *   npm run email:preview
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  passwordResetEmail,
  invitationEmail,
  welcomeEmail,
  joinedCircleEmail,
} from './email-templates';

const outDir = path.resolve(process.cwd(), 'email-previews');
fs.mkdirSync(outDir, { recursive: true });

const samples: Record<string, { subject: string; html: string }> = {
  'password-reset': passwordResetEmail({
    resetUrl: 'https://carecircle-one.vercel.app/reset-password?token=demo&uid=demo',
  }),
  invitation: invitationEmail({
    inviteUrl: 'https://carecircle-one.vercel.app/invite/demo-token',
    inviterName: 'Maria Santos',
    recipientName: 'Antonio',
    role: 'family',
    personalNote: "We'd love your help keeping an eye on Dad's care. It means the world to us.",
  }),
  welcome: welcomeEmail({
    recipientName: 'Antonio',
    dashboardUrl: 'https://carecircle-one.vercel.app/dashboard',
  }),
  'joined-circle': joinedCircleEmail({
    recipientName: 'Antonio',
    circleName: "Antonio's Care",
    role: 'family',
    dashboardUrl: 'https://carecircle-one.vercel.app/dashboard',
  }),
};

for (const [name, { subject, html }] of Object.entries(samples)) {
  const file = path.join(outDir, `${name}.html`);
  fs.writeFileSync(file, html, 'utf8');
  console.log(`✓ ${name.padEnd(16)} "${subject}"\n  → ${file}`);
}

console.log(`\nOpen the files above in your browser to review the design.`);
