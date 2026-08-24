// Media-type detection for uploaded files, by magic bytes.
//
// The browser's `file.type` is a hint, not evidence: it comes from the OS
// extension mapping, is empty for many files, and is attacker-controlled on a
// crafted request. Anthropic rejects a mismatched `media_type` with a 400, so
// getting this wrong is a hard failure rather than a soft one — sniff the bytes
// and use the declared type only as a tiebreak.

/** What kind of Anthropic content block the file needs. */
export type MediaKind = 'image' | 'pdf';

export interface DetectedMedia {
  kind: MediaKind;
  /** Exactly the media_type Anthropic expects for the block. */
  mediaType: string;
}

/** The only image types the Messages API accepts. */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

/** Decode just enough leading bytes to identify the format. */
function leadingBytes(base64: string, count = 16): Uint8Array {
  // 4 base64 chars -> 3 bytes. Round up, and strip whitespace/newlines first.
  const clean = base64.replace(/\s/g, '');
  const chars = Math.ceil(count / 3) * 4;
  const slice = clean.slice(0, chars);
  try {
    const bin = typeof atob === 'function' ? atob(slice) : Buffer.from(slice, 'base64').toString('binary');
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array(0);
  }
}

function startsWith(b: Uint8Array, sig: number[], offset = 0): boolean {
  if (b.length < offset + sig.length) return false;
  return sig.every((v, i) => b[offset + i] === v);
}

/**
 * Identify an uploaded file from its base64 payload.
 *
 * Returns null when the file is neither a PDF nor an Anthropic-supported image,
 * so the caller can fail with a useful message instead of forwarding something
 * the API will reject.
 */
export function sniffMediaType(base64: string, declaredType?: string): DetectedMedia | null {
  const b = leadingBytes(base64);

  // %PDF
  if (startsWith(b, [0x25, 0x50, 0x44, 0x46])) {
    return { kind: 'pdf', mediaType: 'application/pdf' };
  }
  // \x89 P N G \r \n \x1a \n
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: 'image', mediaType: 'image/png' };
  }
  // JPEG SOI + marker
  if (startsWith(b, [0xff, 0xd8, 0xff])) {
    return { kind: 'image', mediaType: 'image/jpeg' };
  }
  // GIF87a / GIF89a
  if (startsWith(b, [0x47, 0x49, 0x46, 0x38])) {
    return { kind: 'image', mediaType: 'image/gif' };
  }
  // RIFF....WEBP
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { kind: 'image', mediaType: 'image/webp' };
  }

  // Nothing matched. Fall back to the browser's declared type, but only if it is
  // one the API actually accepts — never pass an unvalidated string through.
  const declared = (declaredType || '').toLowerCase().split(';')[0].trim();
  if (declared === 'application/pdf') return { kind: 'pdf', mediaType: 'application/pdf' };
  if ((IMAGE_TYPES as readonly string[]).includes(declared)) {
    return { kind: 'image', mediaType: declared };
  }
  // image/jpg is a common misspelling that browsers and OSes still emit.
  if (declared === 'image/jpg') return { kind: 'image', mediaType: 'image/jpeg' };

  return null;
}

/**
 * Build the Anthropic content block for a detected file.
 *
 * PDFs use a `document` block; images use an `image` block. Sending a PDF in an
 * image block is rejected with:
 *   media_type: Input should be 'image/jpeg', 'image/png', 'image/gif' or 'image/webp'
 */
export function mediaContentBlock(media: DetectedMedia, data: string): Record<string, any> {
  if (media.kind === 'pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  return { type: 'image', source: { type: 'base64', media_type: media.mediaType, data } };
}
