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

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}
