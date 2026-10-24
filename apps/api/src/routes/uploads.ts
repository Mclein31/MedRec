import type { Context } from 'hono';
import { HttpError, type AppEnv } from '../lib/types';

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

const SIGNATURES: { type: string; image: boolean; test: (b: Uint8Array) => boolean }[] = [
  { type: 'image/jpeg', image: true, test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', image: true, test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: 'image/webp', image: true, test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP' },
  { type: 'image/heic', image: true, test: (b) => ascii(b, 4, 8) === 'ftyp' && /^(heic|heix|mif1|msf1|hevc)$/.test(ascii(b, 8, 12)) },
  { type: 'application/pdf', image: false, test: (b) => ascii(b, 0, 5) === '%PDF-' },
];

function ascii(b: Uint8Array, from: number, to: number) {
  return String.fromCharCode(...b.subarray(from, to));
}

/**
 * Reads a raw upload body. The stored content type comes from the file's own
 * magic bytes, not the client's header, so a renamed file can't masquerade.
 */
export async function readUpload(c: Context<AppEnv>, opts: { images: boolean; pdf: boolean; maxBytes?: number }) {
  const max = opts.maxBytes ?? MAX_FILE_BYTES;
  const declared = Number(c.req.header('content-length') ?? '0');
  if (declared > max) throw tooLarge(max);
  const data = new Uint8Array(await c.req.arrayBuffer());
  if (data.byteLength === 0) throw new HttpError(422, 'EMPTY_FILE', 'The file was empty. Choose it again.');
  if (data.byteLength > max) throw tooLarge(max);
  const match = SIGNATURES.find((s) => s.test(data));
  if (!match || (match.image ? !opts.images : !opts.pdf)) {
    const allowed = [opts.images && 'JPEG, PNG, WebP or HEIC photos', opts.pdf && 'PDF files'].filter(Boolean).join(' or ');
    throw new HttpError(415, 'UNSUPPORTED_FILE', `This file type isn't supported. Upload ${allowed}.`);
  }
  return { data, contentType: match.type, size: data.byteLength };
}

const tooLarge = (max: number) =>
  new HttpError(413, 'FILE_TOO_LARGE', `Files can be up to ${Math.round(max / 1024 / 1024)} MB. Try a smaller photo or a shorter PDF.`);
