// Central definition of the "partner language" — the non-Ukrainian language that
// Ukrainian is translated to/from. This is deliberately DECOUPLED from the app's
// UI language: a user can browse the interface in English while translating
// between Spanish and Ukrainian, or vice-versa.

export type PartnerLang = 'english' | 'spanish';

// English varieties (unchanged from the original app).
export const ENGLISH_VARIANTS: Record<string, string> = {
  american: 'American English',
  british: 'British English',
  australian: 'Australian English',
  canadian: 'Canadian English',
  international: 'International English',
};

// Spanish varieties offered when Spanish is the partner language.
export const SPANISH_VARIANTS: Record<string, string> = {
  castilian: 'Castilian Spanish (Spain)',
  mexican: 'Mexican Spanish',
  rioplatense: 'Rioplatense Spanish (Argentina & Uruguay)',
  colombian: 'Colombian Spanish',
  latam: 'Latin American Spanish (neutral)',
};

export const DEFAULT_ENGLISH_VARIETY = 'american';
export const DEFAULT_SPANISH_VARIETY = 'latam';

export interface PartnerInfo {
  // Bare language name.
  base: 'English' | 'Spanish';
  // Full variety name, e.g. "Mexican Spanish" or "British English".
  variantName: string;
  // Prompt-ready guidance describing how to write in that variety.
  variantGuidance: string;
  // Whether this partner language is Spanish.
  isSpanish: boolean;
}

// Resolve the partner-language details used to build translation prompts.
export function getPartnerInfo(
  partnerLang?: string,
  englishDialect?: string,
  spanishDialect?: string,
): PartnerInfo {
  if (partnerLang === 'spanish') {
    const key = spanishDialect ?? DEFAULT_SPANISH_VARIETY;
    const variantName = SPANISH_VARIANTS[key] ?? SPANISH_VARIANTS[DEFAULT_SPANISH_VARIETY];
    const variantGuidance = key === 'latam'
      ? 'neutral Latin American Spanish that reads naturally across the region — avoid slang, spelling, or grammar that marks it as tied to a single country'
      : `authentic ${variantName}: use its native vocabulary, idioms, expressions, and where relevant its characteristic grammar (e.g. voseo vs. tuteo, vosotros vs. ustedes) and spelling`;
    return { base: 'Spanish', variantName, variantGuidance, isSpanish: true };
  }
  const key = englishDialect ?? DEFAULT_ENGLISH_VARIETY;
  const variantName = ENGLISH_VARIANTS[key] ?? ENGLISH_VARIANTS[DEFAULT_ENGLISH_VARIETY];
  const variantGuidance = key === 'international'
    ? 'a neutral, globally understood standard English — avoid region-specific slang, spelling, or idioms that mark it as tied to one country'
    : `authentic ${variantName}: use its native spelling, vocabulary, idioms, and expressions`;
  return { base: 'English', variantName, variantGuidance, isSpanish: false };
}
