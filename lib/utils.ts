import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Flag/icon shown for the selected English variety. International uses a globe
// (🌐) as a clearer "no single country" icon rather than a national flag.
export function englishFlag(dialect?: string): string {
  switch (dialect) {
    case 'british':
      return '🇬🇧';
    case 'australian':
      return '🇦🇺';
    case 'canadian':
      return '🇨🇦';
    case 'international':
      return '🌐';
    case 'american':
    default:
      return '🇺🇸';
  }
}

// Flag/icon shown for the selected Spanish variety. The neutral "latam" option
// uses a globe (🌎) rather than a single national flag.
export function spanishFlag(variety?: string): string {
  switch (variety) {
    case 'castilian':
      return '🇪🇸';
    case 'mexican':
      return '🇲🇽';
    case 'rioplatense':
      return '🇦🇷';
    case 'colombian':
      return '🇨🇴';
    case 'latam':
    default:
      return '🌎';
  }
}

// Flag for the active partner (non-Ukrainian) language, honouring whichever
// variety is selected for that language.
export function partnerFlag(partnerLang?: string, englishDialect?: string, spanishDialect?: string): string {
  return partnerLang === 'spanish' ? spanishFlag(spanishDialect) : englishFlag(englishDialect);
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}
