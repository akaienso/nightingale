import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { anthropicComplete, extractJson, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { enforceRateLimits, rateLimitedResponse, LIMITS } from '@/lib/rate-limit';

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
    const { imageBase64, contentType, direction, dialect, englishDialect, formality, outputFormat, speakerGender, addresseeGender, uiLang } = body;
    const noteLang = uiLang === 'uk' ? 'uk' : 'en';
    const noteLangName = noteLang === 'uk' ? 'UKRAINIAN' : 'ENGLISH';
    const noteLangOther = noteLang === 'uk' ? 'English' : 'Ukrainian';

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dir = direction || 'en-to-ua';
    const englishVariantMap: Record<string, string> = {
      american: 'American English',
      british: 'British English',
      australian: 'Australian English',
      canadian: 'Canadian English',
      international: 'International English',
    };
    const englishVariant = englishVariantMap[englishDialect] || 'American English';
    const englishVariantGuidance = englishDialect === 'international'
      ? 'neutral, globally understood standard English (avoid region-specific slang, spelling, or idioms)'
      : `authentic ${englishVariant} (native spelling, vocabulary, and idioms)`;
    const sourceLangHint = dir === 'ua-to-en' ? 'Ukrainian' : englishVariant;
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

    const systemPrompt = `You are Nightingale, the AI translation engine — an expert OCR reader and translator between Ukrainian and ${englishVariant}, with deep expertise in Ukrainian culture, media, and regional dialects (drawing on the perspective of someone who understands both Odesa and Lviv worlds). Never refer to yourself by any personal name; you are simply Nightingale.

YOUR TASK:
1. Extract ALL text visible in the image, preserving line breaks and structure.
2. DETECT the actual language of the extracted text. The user indicated their content is in ${sourceLangHint}, but if the text you actually read is clearly in a different language, trust the text you read — not the hint.
3. TRANSLATE the extracted text into the OPPOSITE language from its source:
   - If the source text is Ukrainian, translate it into natural, colloquial ${englishVariant} — write in ${englishVariantGuidance}.
   - If the source text is English, translate it into natural, colloquial Ukrainian.
   - The "translation" field MUST be in the OPPOSITE language from the source. NEVER echo the source text back in the same language — returning the source language in the translation field is a critical failure.
4. When the TARGET language is Ukrainian, apply these preferences: ${dialectMap[dialect] || 'Western Ukraine / Lviv dialect'}, ${formality === 'formal' ? 'formal (Ви)' : 'informal (ти)'} register, speaker gender ${speakerGender || 'male'}, addressee gender ${addresseeGender || 'female'}, output format ${formatMap[outputFormat] || 'natural conversational speech'}.
5. Produce NATURAL, COLLOQUIAL translations, never literal or robotic.

CRITICAL RULES:
- The "culturalNote" field MUST ALWAYS be written in ${noteLangName}, regardless of the translation direction. Never write the cultural note in ${noteLangOther}.
- Only include a cultural note when there is a genuinely interesting cultural difference, idiom, or context worth explaining; otherwise set it to null.

Respond with raw JSON only:
{
  "extractedText": "original text exactly as it appears in the image",
  "translation": "the translated text, in the OPPOSITE language from the source",
  "culturalNote": "optional cultural context written in ${noteLangName}, or null"
}`;

    const mimeType = contentType || 'image/jpeg';
    const messages = [
      {
        role: 'user' as const,
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
          { type: 'text', text: 'Extract the text from this image and translate it according to the instructions.' },
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
