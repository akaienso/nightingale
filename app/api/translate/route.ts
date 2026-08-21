import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { anthropicFetch, parseTextDeltas, extractJson, HAIKU_MODEL } from '@/lib/anthropic';
import { enforceRateLimits, rateLimitedResponse, getClientIp, LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface TranslateBody {
  text?: string;
  direction?: string;
  dialect?: string;
  englishDialect?: string;
  speakerGender?: string;
  addresseeGender?: string;
  formality?: string;
  outputFormat?: string;
  messageFormat?: string;
  emojis?: boolean;
  mode?: string;
  uiLang?: string;
  chatHistory?: Array<{ role: string; content: string }>;
}

function buildSystemPrompt(body: TranslateBody): string {
  const direction = body?.direction ?? 'en-to-ua';
  const dialect = body?.dialect ?? 'western';
  const englishDialect = body?.englishDialect ?? 'american';
  const speakerGender = body?.speakerGender ?? 'male';
  const addresseeGender = body?.addresseeGender ?? 'female';
  const formality = body?.formality ?? 'informal';
  const outputFormat = body?.outputFormat ?? 'conversational';
  const messageFormat = body?.messageFormat ?? 'general';
  const emojis = body?.emojis === true;
  const mode = body?.mode ?? 'panel';
  const uiLang = body?.uiLang === 'uk' ? 'uk' : 'en';
  const noteLangLine = uiLang === 'uk'
    ? '- The "culturalNote" field MUST ALWAYS be written in UKRAINIAN, regardless of translation direction. Never write the cultural note in English.'
    : '- The "culturalNote" field MUST ALWAYS be written in ENGLISH, regardless of translation direction. Never write the cultural note in Ukrainian.';

  const englishVariantMap: Record<string, string> = {
    american: 'American English',
    british: 'British English',
    australian: 'Australian English',
    canadian: 'Canadian English',
    international: 'International English',
  };
  const englishVariant = englishVariantMap[englishDialect] ?? 'American English';
  const englishVariantGuidance = englishDialect === 'international'
    ? 'a neutral, globally understood standard English — avoid region-specific slang, spelling, or idioms that mark it as tied to one country'
    : `authentic ${englishVariant}: use its native spelling, vocabulary, idioms, and expressions`;

  const directionText = direction === 'ua-to-en'
    ? `Ukrainian to ${englishVariant}`
    : `${englishVariant} to Ukrainian`;

  const dialectMap: Record<string, string> = {
    western: 'Western Ukraine / Lviv dialect',
    central: 'Central Ukraine / Kyiv dialect',
    eastern: 'Eastern Ukraine dialect',
  };

  const formatMap: Record<string, string> = {
    conversational: 'natural conversational speech',
    subtitles: 'subtitle format (concise, readable)',
    voiceover: 'voiceover script format (flowing, natural cadence)',
    business: 'formal business correspondence',
  };

  // "Output Format" = the delivery medium the text is being written for. This
  // shapes punctuation, length, greetings/sign-offs, and register.
  const messageFormatMap: Record<string, string> = {
    spoken: 'a SPOKEN / VOICE conversation: write the way people actually talk aloud — natural spoken rhythm, contractions, easy to read out loud. Avoid written-only conventions like bullet lists or email formatting.',
    email: 'an EMAIL message: use an appropriate greeting and sign-off, complete sentences, clear paragraphs, and a register that matches the chosen formality.',
    chat: 'a TEXT / SMS or messaging-app message: short, casual, punchy. Keep it brief and split into natural message-sized chunks. Match how people really text in the target language, including common abbreviations where natural.',
    social: 'a SOCIAL MEDIA post: concise, engaging, and platform-friendly. Natural, catchy phrasing is welcome; keep it self-contained.',
    general: 'a GENERAL, cross-platform context where the medium is unknown: produce clean, adaptable phrasing that reads well anywhere without medium-specific conventions.',
  };

  const emojiGuidance = emojis
    ? `
- EMOJIS (user has turned this ON): Weave culturally appropriate emojis naturally into the output. This applies to EVERY output style and format — never refuse or omit them because the chosen style/format (e.g. business, subtitles, formal email) would not normally use emojis. The user's setting always wins. Place them where a native speaker would use them, and do not overdo it — they should enhance tone, not clutter the message. Never put emojis inside the "culturalNote" field. HOWEVER, if emojis could be misconstrued, look unprofessional, or feel inappropriate for the chosen style/format, add a brief, friendly heads-up in the "culturalNote" field (in Olia's warm voice) explaining that — while still including the emojis as requested.`
    : '';

  const isChat = mode === 'chat';

  const oliaPersona = isChat
    ? `You are Olia (Оля), the AI language guide behind Nightingale. You are a 27-year-old Ukrainian woman — raised in Odesa and educated in Lviv. Your teaching and professional voice carries a strong Western Ukrainian (Lviv) dialect, yet having grown up in Odesa you understand both worlds intimately and can explain regional nuances authentically. You hold deep expertise in Media, Mass Communications, Journalism, and Ukrainian Culture. Your tone is warm, intelligent, and contemporary — you are the seasoning that makes this tool feel human, never the whole meal.

You don't just translate — you bridge the gap between cultures. You know the 'why' behind the language: the cultural, historical, and regional nuances that give words their true meaning.

When responding in chat mode:
- Be conversational and warm, like a knowledgeable friend who happens to be a language expert
- When you encounter culturally rich terms, regional idioms (Lviv or Odesa), or concepts without direct equivalents, share a brief, warm explanation
- Draw on your bicultural background to enrich translations with authentic regional insight
- Keep explanations concise but insightful — a sentence or two of context, not a lecture
- Always provide the clean translation first, then any cultural context
`
    : `You are Nightingale, the AI translation engine — an expert linguist specializing in ${directionText} with deep Ukrainian cultural knowledge, drawing on the voice of someone raised in Odesa and educated in Lviv who understands both regional worlds. Never refer to yourself by any personal name; you are simply Nightingale.
`;

  return `${oliaPersona}
CRITICAL TRANSLATION RULES:
- Produce NATURAL, COLLOQUIAL speech — NOT literal, robotic, or textbook translation.
- Preserve the emotional tone, humor, sarcasm, and cultural nuance of the original.
- Use modern slang, internet language, and natural speech patterns appropriate for the target language.
- When a concept doesn't translate directly, provide a brief cultural explanation (max 2 sentences) in the "culturalNote" field.
${noteLangLine}

SETTINGS:
- Ukrainian dialect: ${dialectMap[dialect] ?? 'Western Ukraine / Lviv dialect'}
- English variety: ${englishVariant}. When producing English, write in ${englishVariantGuidance}.
- Speaker gender: ${speakerGender}
- Addressee gender: ${addresseeGender}
- Formality: ${formality === 'formal' ? 'Formal (Ви/Ваш)' : 'Informal (ти/твій)'}
- Output style: ${formatMap[outputFormat] ?? 'natural conversational speech'}
- Output format: shape the text for ${messageFormatMap[messageFormat] ?? messageFormatMap.general}${emojiGuidance}

RESPONSE FORMAT:
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.
{
  "translation": "the translated text here",
  "culturalNote": "optional cultural context note or null if not needed"
}

${isChat ? 'In chat mode, your "translation" field should feel like a natural message from you (Olia). You may weave brief cultural insight directly into the translation when it enriches understanding. Use the "culturalNote" field for deeper cultural, historical, or regional context that deserves its own callout.' : 'If the cultural note is not needed, set it to null. Only include a cultural note when there is a genuinely interesting cultural difference, untranslatable idiom, or context that would help the reader understand the nuance.'}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslateBody = await request.json().catch(() => ({}));
    const text = body?.text ?? '';

    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Cost-protection shield: cap usage before the paid LLM call ---
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    let limit;
    if (userId) {
      limit = await enforceRateLimits([
        { identifier: `user:${userId}`, kind: 'day', limit: LIMITS.userPerDay() },
      ]);
    } else {
      const ip = getClientIp(request);
      limit = await enforceRateLimits([
        { identifier: `guest:${ip}`, kind: 'hour', limit: LIMITS.guestPerHour() },
        { identifier: `guest:${ip}`, kind: 'day', limit: LIMITS.guestPerDay() },
      ]);
    }
    if (!limit.allowed) {
      return rateLimitedResponse(limit, { guest: !userId });
    }

    const systemPrompt = buildSystemPrompt(body);
    const mode = body?.mode ?? 'panel';

    let messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (mode === 'chat' && body?.chatHistory && Array.isArray(body.chatHistory)) {
      messages = [
        ...(body.chatHistory.filter(
          (m) => m.role === 'user' || m.role === 'assistant'
        ) as Array<{ role: 'user' | 'assistant'; content: string }>),
        { role: 'user', content: text },
      ];
    } else {
      messages = [
        { role: 'user', content: `Translate the following:\n\n${text}` },
      ];
    }

    // Anthropic requires the first message to be from the user
    while (messages.length && messages[0].role !== 'user') messages.shift();

    const response = await anthropicFetch({
      // Static, settings-derived block is marked for prompt caching so Anthropic
      // does not reprocess it on every translation request.
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
      model: HAIKU_MODEL,
      maxTokens: 1500,
    }, true);

    if (!response?.ok) {
      const errText = await response?.text?.().catch(() => 'Unknown error');
      return new Response(
        JSON.stringify({ error: `LLM API error: ${response?.status ?? 'unknown'} - ${errText}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const reader = response?.body?.getReader();
    if (!reader) {
      return new Response(
        JSON.stringify({ error: 'No response stream available' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          for await (const delta of parseTextDeltas(reader)) {
            buffer += delta;
            const progressData = JSON.stringify({
              status: 'processing',
              message: 'Nightingale is translating...',
              partial: buffer,
            });
            controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
          }
          const parsed = extractJson<{ translation?: string; culturalNote?: string | null }>(buffer);
          const finalResult = parsed ?? { translation: buffer, culturalNote: null };
          const finalData = JSON.stringify({
            status: 'completed',
            result: {
              translation: finalResult?.translation ?? buffer ?? '',
              culturalNote: finalResult?.culturalNote ?? null,
            },
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          controller.close();
        } catch (error: any) {
          const errData = JSON.stringify({ status: 'error', message: error?.message ?? 'Stream error' });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Translate API error:', error);
    return new Response(
      JSON.stringify({ error: error?.message ?? 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
