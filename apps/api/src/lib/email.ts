import { buildMessage, smtpSend } from './smtp';
import { HttpError, type Bindings, type Mailer } from './types';

const SAFE_ADDRESS = /^[^\s<>"'\r\n,;]+@[^\s<>"'\r\n,;]+\.[^\s<>"'\r\n,;]+$/;

/**
 * Gmail SMTP (App Password) when configured. In development without SMTP
 * settings the message is logged so sign-in can be tested for free; anywhere
 * else missing settings are an error and codes are never logged.
 */
export function createMailer(env: Bindings, now: () => Date): Mailer {
  return {
    async send(m) {
      if (!SAFE_ADDRESS.test(m.to)) throw new HttpError(422, 'VALIDATION', 'Enter a valid email address.');
      if (!env.SMTP_USER || !env.SMTP_PASSWORD) {
        if (env.ENVIRONMENT === 'development') {
          console.log(`[mail:dev] to=${m.to} subject="${m.subject}"\n${m.text}`);
          return;
        }
        console.error('[mail] SMTP_USER / SMTP_PASSWORD not configured');
        throw new HttpError(503, 'EMAIL_UNAVAILABLE', "We can't send email right now. Please try again later.");
      }
      const from = env.MAIL_FROM || env.SMTP_USER;
      const message = buildMessage({ from, fromName: env.APP_NAME, ...m }, now());
      try {
        const cfg = { host: env.SMTP_HOST || 'smtp.gmail.com', port: Number(env.SMTP_PORT || 465), user: env.SMTP_USER, password: env.SMTP_PASSWORD };
        await smtpSend(cfg, from, m.to, message);
      } catch (err) {
        // SMTP replies can echo addresses; log the status line only.
        console.error(`[mail] send failed: ${(err as Error).message.slice(0, 120)}`);
        throw new HttpError(502, 'EMAIL_FAILED', "We couldn't send the email. Please try again in a minute.");
      }
    },
  };
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${'•'.repeat(Math.min(6, Math.max(3, local.length - visible.length)))}@${domain}`;
}

const PURPOSE_COPY = {
  login: { subject: 'is your MedRec sign-in code', lead: 'Use this code to finish signing in to MedRec.' },
  verify_email: { subject: 'is your MedRec confirmation code', lead: 'Use this code to confirm your email and open your health vault.' },
  reset_password: { subject: 'is your MedRec password reset code', lead: 'Use this code to set a new password for MedRec.' },
} as const;

export function otpEmail(purpose: keyof typeof PURPOSE_COPY, code: string, minutes: number) {
  const copy = PURPOSE_COPY[purpose];
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  const warning = "If this wasn't you, don't share this code with anyone. Someone may know your password, so change it in MedRec.";
  const text = `${copy.lead}\n\n${spaced}\n\nIt works once and expires in ${minutes} minutes. Only the code in the newest email works. MedRec will never ask you for this code by phone or chat.\n\n${warning}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14211d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:440px;background:#ffffff;border-radius:16px;border:1px solid #e3e8e6">
<tr><td style="padding:28px 28px 8px;font-size:15px;font-weight:600;letter-spacing:-0.01em">MedRec</td></tr>
<tr><td style="padding:8px 28px 0;font-size:15px;line-height:22px;color:#3d4b47">${copy.lead}</td></tr>
<tr><td style="padding:20px 28px"><div style="font-family:SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;letter-spacing:6px;font-weight:600;background:#f1f5f3;border-radius:12px;padding:16px 0;text-align:center">${spaced}</div></td></tr>
<tr><td style="padding:0 28px 8px;font-size:13px;line-height:20px;color:#5b6a66">Expires in ${minutes} minutes. MedRec will never ask you for this code by phone or chat.</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:13px;line-height:20px;color:#5b6a66">${warning}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: `${code} ${copy.subject}`, text, html };
}
