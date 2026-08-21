/**
 * Build a URL that opens a third-party translation tool with the given text
 * pre-filled for back-translation (target → source), so the user can
 * sanity-check Olia's output.
 *
 * Supported providers: google (default), deepl, bing, custom.
 */

export type VerifyProvider = 'google' | 'deepl' | 'bing' | 'custom';

export const VERIFY_PROVIDERS: { value: VerifyProvider; label: string }[] = [
  { value: 'google', label: 'Google Translate' },
  { value: 'deepl', label: 'DeepL' },
  { value: 'bing', label: 'Bing Translator' },
  { value: 'custom', label: 'Custom URL' },
];

/** Map app direction + partner language to ISO-ish codes the tools understand. */
function langCodes(direction: string, partnerLang: string): { source: string; target: string } {
  const isUkOutput = direction === 'en-to-ua';
  const partner = partnerLang === 'spanish' ? 'es' : 'en';

  // For back-translation we reverse: translate Olia's output BACK to the user's input language.
  // So if Olia produced Ukrainian (en-to-ua), we translate uk → en/es.
  // If Olia produced English/Spanish (ua-to-en), we translate en/es → uk.
  return isUkOutput
    ? { source: 'uk', target: partner }
    : { source: partner, target: 'uk' };
}

/** DeepL uses its own language codes */
function deepLCode(code: string): string {
  const map: Record<string, string> = { uk: 'uk', en: 'en', es: 'es' };
  return map[code] ?? code;
}

export function buildVerifyUrl(
  text: string,
  direction: string,
  partnerLang: string,
  provider: VerifyProvider,
  customUrl?: string,
): string {
  const { source, target } = langCodes(direction, partnerLang);
  const encoded = encodeURIComponent(text);

  switch (provider) {
    case 'google':
      return `https://translate.google.com/?sl=${source}&tl=${target}&text=${encoded}&op=translate`;

    case 'deepl':
      return `https://www.deepl.com/translator#${deepLCode(source)}/${deepLCode(target)}/${encoded}`;

    case 'bing':
      return `https://www.bing.com/translator?from=${source}&to=${target}&text=${encoded}`;

    case 'custom': {
      if (!customUrl) return '';
      return customUrl
        .replace('{text}', encoded)
        .replace('{source}', source)
        .replace('{target}', target);
    }

    default:
      return `https://translate.google.com/?sl=${source}&tl=${target}&text=${encoded}&op=translate`;
  }
}
