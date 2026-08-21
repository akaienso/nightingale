// Shared helper for calling the user's own Anthropic account (Claude Sonnet 5)
// via the native Messages API (https://api.anthropic.com/v1/messages).
//
// The rest of the app was originally written against an OpenAI-style
// chat/completions API. This module adapts to Anthropic's format:
//  - the system prompt is a top-level `system` param (NOT a message)
//  - streamed text arrives in `content_block_delta` events (delta.text)
//  - non-streaming responses expose text at response.content[].text

export const ANTHROPIC_MODEL = 'claude-sonnet-5';
// Cheaper/faster model used for the two-panel translator. It still receives the
// full settings-derived system prompt, so translation behaviour is guided by the
// user's chosen direction/dialect/gender/formality/output-format settings.
export const HAIKU_MODEL = 'claude-haiku-4-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export interface AnthropicMsg {
  role: 'user' | 'assistant';
  content: any;
}

// A system prompt can be a plain string, or an array of Anthropic content
// blocks. The array form lets us mark a static block with `cache_control` so
// Anthropic prompt-caches it and does not reprocess it on every request.
export type AnthropicSystem = string | Array<Record<string, any>>;

export interface AnthropicCallOptions {
  system?: AnthropicSystem;
  messages: AnthropicMsg[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Split an OpenAI-style message list (which may contain a `system` role) into
 * an Anthropic-friendly `{ system, messages }` pair. Also drops any leading
 * assistant turns, since Anthropic requires the first message to be `user`.
 */
export function toAnthropicMessages(
  messages: Array<{ role: string; content: any }>
): { system: string; messages: AnthropicMsg[] } {
  let system = '';
  const out: AnthropicMsg[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      const c = typeof m.content === 'string' ? m.content : '';
      system += system ? `\n\n${c}` : c;
    } else if (m.role === 'user' || m.role === 'assistant') {
      out.push({ role: m.role, content: m.content });
    }
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return { system, messages: out };
}

function buildBody(opts: AnthropicCallOptions, stream: boolean) {
  const body: Record<string, any> = {
    model: opts.model || ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 2000,
    messages: opts.messages,
    stream,
  };
  if (opts.system) body.system = opts.system;
  // NOTE: Claude Sonnet 5 deprecated the `temperature` parameter and returns a
  // 400 error if it is supplied, so we intentionally do not send it.
  return body;
}

/**
 * Low-level fetch against the Anthropic Messages API. Callers can inspect
 * `.ok` / `.status` and read the body themselves.
 */
export async function anthropicFetch(
  opts: AnthropicCallOptions,
  stream: boolean
): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  return fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(buildBody(opts, stream)),
  });
}

/**
 * Non-streaming call. Returns the concatenated text of all text content blocks.
 * Throws on non-2xx responses.
 */
export async function anthropicComplete(opts: AnthropicCallOptions): Promise<string> {
  const res = await anthropicFetch(opts, false);
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error: ${res.status} - ${errText}`);
  }
  const data = await res.json();
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((b: any) => b?.type === 'text')
    .map((b: any) => b?.text ?? '')
    .join('');
}

/**
 * Parse an Anthropic SSE stream reader and yield only the text deltas.
 * Ignores non-text events (message_start, thinking deltas, ping, etc.).
 */
export async function* parseTextDeltas(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (
          parsed?.type === 'content_block_delta' &&
          parsed?.delta?.type === 'text_delta' &&
          typeof parsed.delta.text === 'string' &&
          parsed.delta.text
        ) {
          yield parsed.delta.text;
        }
      } catch {
        // skip malformed lines
      }
    }
  }
}

/**
 * Robustly extract a JSON object from model output that is expected to be raw
 * JSON but may be wrapped in markdown fences or surrounded by stray text.
 */
export function extractJson<T = any>(text: string): T | null {
  if (!text) return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s) as T;
  } catch {
    // fall through
  }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    try {
      return JSON.parse(s.slice(first, last + 1)) as T;
    } catch {
      // fall through
    }
  }
  return null;
}
