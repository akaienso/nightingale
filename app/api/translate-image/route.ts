import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { anthropicComplete, extractJson, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { enforceRateLimits, rateLimitedResponse, LIMITS } from '@/lib/rate-limit';
import { getPartnerInfo } from '@/lib/languages';
import { UKRAINIAN_PURITY_DIRECTIVE } from '@/lib/ukrainian-purity';
import { sniffMediaType, mediaContentBlock } from '@/lib/media-type';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Sign in required for image translation' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- Cost-protection shield: per-user daily cap before the paid LLM call ---
    const imgUserId = (session.user as { id?: string }).id;
    if (imgUserId) {
      const limit = await enforceRateLimits([
        { identifier: `user-image:${imgUserId}`, kind: 'day', limit: LIMITS.userImagePerDay() },
      ]);
      if (!limit.allowed) return rateLimitedResponse(limit);
    }

    const body = await request.json();
    const { imageBase64, contentType, direction, dialect, englishDialect, partnerLang, spanishDialect, formality, outputFormat, speakerGender, addresseeGender, uiLang } = body;
    const noteLang = uiLang === 'uk' ? 'uk' : uiLang === 'es' ? 'es' : 'en';
    const noteLangName = noteLang === 'uk' ? 'UKRAINIAN' : noteLang === 'es' ? 'SPANISH' : 'ENGLISH';

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Identify the upload from its bytes. `contentType` is only a hint — the
    // browser derives it from the file extension and it is empty for many
    // files. A wrong media_type is a hard 400 from Anthropic, not a soft
    // failure, so sniff first and use the declared type only as a tiebreak.
    const media = sniffMediaType(imageBase64, contentType);
    if (!media) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported file type. Upload a PDF or a JPEG, PNG, GIF, or WebP image.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const isPdf = media.kind === 'pdf';

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dir = direction || 'en-to-ua';
    // Partner language = the non-Ukrainian side (English or Spanish), decoupled from UI language.
    const partner = getPartnerInfo(partnerLang, englishDialect, spanishDialect);
    const partnerVariant = partner.variantName;
    const partnerBase = partner.base;
    const partnerVariantGuidance = partner.variantGuidance;
    const sourceLangHint = dir === 'ua-to-en' ? 'Ukrainian' : partnerVariant;
    const dialectMap: Record<string, string> = {
      western: 'Western Ukraine / Lviv dialect',
      central: 'Central Ukraine / Kyiv dialect',
      eastern: 'Eastern Ukraine dialect',
    };
    const formatMap: Record<string, string> = {
      conversational: 'natural conversational speech',
      subtitles: 'subtitle format',
      voiceover: 'voiceover script format',
      business: 'formal business correspondence',
    };

    // The prompt says "image" or "document" to match what was actually sent.
    const srcNoun = isPdf ? 'document' : 'image';
    const systemPrompt = `You are Nightingale, the AI translation engine — an expert OCR reader and translator between Ukrainian and ${partnerVariant}, with deep expertise in Ukrainian culture, media, and regional dialects (drawing on the perspective of someone who understands both Odesa and Lviv worlds). Never refer to yourself by any personal name; you are simply Nightingale.

YOUR TASK:
1. Extract ALL text visible in the ${srcNoun}, preserving line breaks and structure.
2. DETECT the actual language of the extracted text. The user indicated their content is in ${sourceLangHint}, but if the text you actually read is clearly in a different language, trust the text you read — not the hint.
3. TRANSLATE the extracted text into the OPPOSITE language from its source:
   - If the source text is Ukrainian, translate it into natural, everyday ${partnerVariant} — write in ${partnerVariantGuidance}.
   - If the source text is ${partnerBase}, translate it into natural, everyday Ukrainian.
   - The "translation" field MUST be in the OPPOSITE language from the source. NEVER echo the source text back in the same language — returning the source language in the translation field is a critical failure.
4. When the TARGET language is Ukrainian, apply these preferences: ${dialectMap[dialect] || 'Western Ukraine / Lviv dialect'}, ${formality === 'formal' ? 'formal (Ви)' : 'informal (ти)'} register, speaker gender ${speakerGender || 'male'}, addressee gender ${addresseeGender || 'female'}, output format ${formatMap[outputFormat] || 'natural conversational speech'}.
5. Produce NATURAL, EVERYDAY translations — the way a real native speaker actually talks. MATCH THE REGISTER of the source: keep plain text plain, and only use slang or idioms when they are genuinely in the original or are clearly the most natural phrasing. Never force dated, cheesy, or exaggerated slang (e.g. don't turn "watch a movie" into "catch a flick"); never be literal or robotic either.

${UKRAINIAN_PURITY_DIRECTIVE}

CRITICAL RULES:
- The "culturalNote" field MUST ALWAYS be written in ${noteLangName}, regardless of the translation direction. Never write it in any other language.
- Only include a cultural note when there is a genuinely interesting cultural difference, idiom, or context worth explaining; otherwise set it to null.

Respond with raw JSON only:
{
  "extractedText": "original text exactly as it appears in the ${srcNoun}",
  "translation": "the translated text, in the OPPOSITE language from the source",
  "culturalNote": "optional cultural context written in ${noteLangName}, or null"
}`;

    // The document/image block must come BEFORE the text block.
    const messages = [
      {
        role: 'user' as const,
        content: [
          mediaContentBlock(media, imageBase64),
          {
            type: 'text',
            text: isPdf
              ? 'Extract the text from this document and translate it according to the instructions.'
              : 'Extract the text from this image and translate it according to the instructions.',
          },
        ],
      },
    ];

    let content = '';
    try {
      content = await anthropicComplete({
        system: systemPrompt,
        messages,
        model: ANTHROPIC_MODEL,
        maxTokens: 3000,
        temperature: 0.5,
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e?.message || 'LLM API error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = extractJson(content) || { extractedText: content, translation: content, culturalNote: null };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Image translate error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to process image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
