import { connect } from 'cloudflare:sockets';

/**
 * Minimal SMTP client for sign-in codes, sent through a Gmail account with an
 * App Password over implicit TLS (smtp.gmail.com:465) — the same approach as
 * AdvanCare. Steps: EHLO → AUTH PLAIN → MAIL FROM → RCPT TO → DATA → QUIT.
 */
export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

const TIMEOUT_MS = 15_000;

export async function smtpSend(cfg: SmtpConfig, from: string, to: string, message: string): Promise<void> {
  const socket = connect({ hostname: cfg.host, port: cfg.port }, { secureTransport: 'on', allowHalfOpen: false });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  /** Reads one (possibly multi-line) reply and checks its status code. */
  const reply = async (expect: number): Promise<void> => {
    for (;;) {
      const lines = buffer.split('\r\n');
      const done = lines.findIndex((l) => /^\d{3} /.test(l));
      if (done >= 0) {
        const last = lines[done]!;
        buffer = lines.slice(done + 1).join('\r\n');
        const code = Number(last.slice(0, 3));
        if (code !== expect) throw new Error(`SMTP ${code}: ${last.slice(4, 120)}`);
        return;
      }
      const { value, done: closed } = await reader.read();
      if (closed) throw new Error('SMTP connection closed');
      buffer += decoder.decode(value, { stream: true });
    }
  };
  const send = (line: string) => writer.write(encoder.encode(`${line}\r\n`));

  const session = async () => {
    await reply(220);
    await send('EHLO medrec.app');
    await reply(250);
    await send(`AUTH PLAIN ${btoa(`\0${cfg.user}\0${cfg.password}`)}`);
    await reply(235);
    await send(`MAIL FROM:<${from}>`);
    await reply(250);
    await send(`RCPT TO:<${to}>`);
    await reply(250);
    await send('DATA');
    await reply(354);
    await writer.write(encoder.encode(`${dotStuff(message)}\r\n.\r\n`));
    await reply(250);
    await send('QUIT');
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      session(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('SMTP timeout')), TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    await socket.close().catch(() => undefined);
  }
}

/** Lines starting with "." get an extra "." (RFC 5321 §4.5.2). */
export function dotStuff(message: string): string {
  return message.replace(/(^|\r\n)\./g, '$1..');
}

function b64Utf8(text: string): string {
  let binary = '';
  for (const b of new TextEncoder().encode(text)) binary += String.fromCharCode(b);
  return btoa(binary);
}

const wrap76 = (s: string) => s.replace(/.{1,76}/g, '$&\r\n').trimEnd();
const encodeHeader = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${b64Utf8(v)}?=`);

/** RFC 5322 multipart/alternative message; bodies are base64 so UTF-8 is safe. */
export function buildMessage(m: { from: string; fromName: string; to: string; subject: string; text: string; html: string }, now: Date): string {
  for (const v of [m.from, m.to, m.subject, m.fromName]) {
    if (/[\r\n]/.test(v)) throw new Error('Header injection blocked');
  }
  const boundary = `mr-${crypto.randomUUID()}`;
  const headers = [
    `From: ${encodeHeader(m.fromName)} <${m.from}>`,
    `To: <${m.to}>`,
    `Subject: ${encodeHeader(m.subject)}`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@medrec.app>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const part = (type: string, body: string) =>
    [`--${boundary}`, `Content-Type: ${type}; charset=UTF-8`, 'Content-Transfer-Encoding: base64', '', wrap76(b64Utf8(body))].join('\r\n');
  return [...headers, '', part('text/plain', m.text), part('text/html', m.html), `--${boundary}--`].join('\r\n');
}
