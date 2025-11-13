import { parse } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

export function cleanAndTruncateText(
  rawText: string | null | undefined,
  maxSentences: number = 3
): string {
  if (!rawText) return '';

  const text = rawText.replace(/\s+/g, ' ').trim();
  const sentenceRegex = /[^.?!]+[.?!]+/g;
  const sentences = text.match(sentenceRegex);

  if (sentences) {
    return sentences.slice(0, maxSentences).join(' ').trim();
  }

  return text;
}

export function getEventCountry(title: string, description: string): string {
  const countryKeywordMap = new Map([
    ['japan', 'Japan'],
    ['japanese', 'Japan'],
    ['korea', 'South Korea'],
    ['korean', 'South Korea'],
    ['north korea', 'North Korea'],
    ['dprk', 'North Korea'],
    ['china', 'China'],
    ['chinese', 'China'],
    ['taiwan', 'Taiwan'],
    ['taiwanese', 'Taiwan'],
    ['india', 'India'],
    ['indian', 'India'],
    ['vietnam', 'Vietnam'],
    ['vietnamese', 'Vietnam'],
    ['thailand', 'Thailand'],
    ['thai', 'Thailand'],
    ['philippines', 'Philippines'],
    ['filipino', 'Philippines'],
    ['indonesia', 'Indonesia'],
    ['indonesian', 'Indonesia'],
    ['pakistan', 'Pakistan'],
    ['pakistani', 'Pakistan'],
    ['bangladesh', 'Bangladesh'],
    ['bangladeshi', 'Bangladesh'],
    ['uzbekistan', 'Uzbekistan'],
    ['uzbek', 'Uzbekistan'],
    ['iran', 'Iran'],
    ['iranian', 'Iran'],
    ['persian', 'Iran'],
    ['mexico', 'Mexico'],
    ['mexican', 'Mexico'],
    ['canada', 'Canada'],
    ['canadian', 'Canada'],
  ]);

  const defaultCountry = 'United States';

  const lowerTitle = title.toLowerCase();
  const lowerDescription = description.toLowerCase().replace(/<[^>]+>/g, ' ');

  for (const [keyword, country] of countryKeywordMap.entries()) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(lowerTitle)) {
      return country; // Found in title, high confidence
    }
  }

  // Priority 2: Check the Description
  for (const [keyword, country] of countryKeywordMap.entries()) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(lowerDescription)) {
      return country; // Found in description
    }
  }

  // Priority 3: Default
  return defaultCountry;
}

export function classifyEvent(title: string, description: string): string {
  const categories = ['Food', 'Games', 'Customs', 'Rituals', 'Media'];
  const keywordsMap = {
    Food: [
      'food',
      'cuisine',
      'culinary',
      'tasting',
      'recipe',
      'kitchen',
      'dining',
      'eat',
      'beverage',
      'drink',
      'wine',
      'feast',
      'restaurant',
      'chef',
      'taste',
    ],
    Games: [
      'game',
      'gaming',
      'play',
      'tournament',
      'competition',
      'board game',
      'video game',
      'esports',
      'match',
      'player',
    ],
    Customs: [
      'custom',
      'tradition',
      'traditional',
      'heritage',
      'cultural',
      'folklore',
      'social',
      'etiquette',
      'lifestyle',
      'clothing',
      'attire',
      'craft',
      'daily life',
    ],
    Rituals: [
      'ritual',
      'ceremony',
      'ceremonial',
      'rite',
      'religious',
      'spiritual',
      'worship',
      'prayer',
      'shrine',
      'temple',
      'offering',
      'meditation',
      'holy',
    ],
    Media: [
      'media',
      'film',
      'movie',
      'documentary',
      'screening',
      'broadcast',
      'journalism',
      'art',
      'artist',
      'exhibition',
      'performance',
      'music',
      'concert',
      'dance',
      'theater',
      'author',
      'book',
      'reading',
      'gallery',
    ],
  };

  const scores = new Map<string, number>();
  categories.forEach((cat) => scores.set(cat, 0));

  const lowerTitle = title.toLowerCase();
  const lowerDescription = description.toLowerCase();

  for (const [category, keywords] of Object.entries(keywordsMap)) {
    let categoryScore = 0;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');

      // Give more weight to title matches
      if (lowerTitle.match(regex)) {
        categoryScore += 3; // 3 points for a title match
      }
      if (lowerDescription.match(regex)) {
        categoryScore += 1; // 1 point for a description match
      }
    }
    scores.set(category, categoryScore);
  }

  // Find the category with the highest score
  let bestCategory = 'Uncategorized'; // Default
  let maxScore = 0;

  for (const [category, score] of scores.entries()) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  // If no keywords matched (score 0), keep it as 'Uncategorized'
  if (maxScore === 0) {
    return 'Uncategorized';
  }

  return bestCategory;
}

export function parseEventDateTime(
  dateString: string | null | undefined,
  timeZone: string = 'America/New_York'
): Date | null {
  if (!dateString) return null;

  try {
    // === [DEBUG] LOG 1 ===
    console.log('[DEBUG] Input dateString:', dateString);

    // === REGEX CHAIN (FIXED) ===

    // Input: "Sat 16 Nov 2025 7:30 - 9 p.m."
    // OR: "Wed 19 Nov 2025 5 - 7:30 p.m."

    const cleaned = dateString
      // 1. Standardize "p.m." to "PM" FIRST
      .replace(/p\.m\./i, 'PM') // -> "Sat 16 Nov 2025 7:30 - 9 PM"

      // 2. Standardize "a.m." to "AM"
      .replace(/a\.m\./i, 'AM') // -> (No change)

      // 3. Remove day of the week
      .replace(/^[A-Za-z]{3}\s/, '') // -> "16 Nov 2025 7:30 - 9 PM"

      // 4. Remove the end-time range (e.g., " - 9" or " - 7:30")
      .replace(/\s*(-|–|to)\s*[\d:]+/i, '') // -> "16 Nov 2025 7:30 PM" OR "19 Nov 2025 5 PM"

      // 5. === THIS IS THE FIX ===
      // Add ":00" ONLY to hours that are single numbers (e.g., " 5 PM")
      // It looks for (space)(number) (PM/AM)
      // It will NOT match "7:30 PM" because there is no (space) before the 30.
      .replace(/(\s\d{1,2})(\s*(?:PM|AM))/i, '$1:00$2') // -> "16 Nov 2025 7:30 PM" (no change) OR "19 Nov 2025 5:00 PM"

      // 6. Final cleanup
      .replace(/\s+/g, ' ')
      .trim();

    // 2. --- Define the Format ---
    const formatString = 'dd MMM yyyy h:mm a';

    // === [DEBUG] LOG 2 & 3 ===
    console.log('[DEBUG] Cleaned string:', `'${cleaned}'`);
    console.log('[DEBUG] Format string:', `'${formatString}'`);

    // 3. --- Parse the Date ---
    // "16 Nov 2025 7:30 PM" WILL match "dd MMM yyyy h:mm a"
    // "19 Nov 2025 5:00 PM" WILL match "dd MMM yyyy h:mm a"
    const naiveDate = parse(cleaned, formatString, new Date());

    // === [DEBUG] LOG 4 ===
    console.log('[DEBUG] naiveDate result:', naiveDate);

    if (isNaN(naiveDate.getTime())) {
      throw new Error(
        `'parse' resulted in Invalid Date for string: ${cleaned}`
      );
    }

    const eventDate = fromZonedTime(naiveDate, timeZone);

    // === [DEBUG] LOG 5 (Success) ===
    console.log('[DEBUG] Final Date object (UTC):', eventDate);

    return eventDate;
  } catch (error) {
    console.error(
      `[parseEventDateTime]: Failed to parse string: "${dateString}"`,
      error
    );
    return null; // Return null on failure
  }
}

export function parseScandinaviaHouseDateTime(
  dateString: string | null | undefined,
  timeZone: string = 'America/New_York'
): Date | null {
  if (!dateString) return null;

  try {
    // === [DEBUG 1] Log Input ===
    console.log('[DEBUG-SH] Input dateString:', dateString);

    // 1. Standardize and isolate the start date/time part.

    // Split by long dash (—) or hyphen (-) or 'to' to isolate the start time,
    // especially for range events like "November 14—7:00 pm – 9:30 pm"
    let cleaned = dateString
      // Use a more general approach to capture the start date/time block
      .split('–')[0] // CRITICAL: Stop at the first range separator (long dash)
      .split('-')[0] // Stop at hyphen range separator
      .trim();

    // Handle the internal separator (often a long dash or dash used by Tribe Events)
    // Example: "November 14—7:00 pm" -> "November 14 7:00 pm"
    cleaned = cleaned.replace(/—|—/g, ' ').trim();

    // === [DEBUG 2] Log After Isolating Start Time ===
    console.log('[DEBUG-SH] After isolating start time:', cleaned);

    // 2. Standardize AM/PM (for consistency with date-fns format tokens)
    cleaned = cleaned
      .replace(/p\.m\./i, 'PM')
      .replace(/a\.m\./i, 'AM')
      .replace(/\s+/g, ' ')
      .trim();

    // === [DEBUG 3] Log After Standardizing AM/PM ===
    console.log('[DEBUG-SH] After standardizing AM/PM:', cleaned);

    // 3. Define the Format
    // Expected formats: "November 14 7:00 PM"
    const formatString = 'MMMM d h:mm a';

    // === [DEBUG 4] Log Format String ===
    console.log('[DEBUG-SH] Format string:', formatString);

    // 4. Parse the Date
    // Note: We rely on new Date() to supply the current year (2025 in your logs) since the source string lacks it.
    const naiveDate = parse(cleaned, formatString, new Date());

    // === [DEBUG 5] Log naiveDate result ===
    console.log('[DEBUG-SH] naiveDate result (Pre-timezone):', naiveDate);

    if (isNaN(naiveDate.getTime())) {
      throw new Error(
        `'parse' resulted in Invalid Date for string: ${cleaned} using format ${formatString}`
      );
    }

    // 5. Convert to Zoned Time (UTC Date Object)
    const eventDate = fromZonedTime(naiveDate, timeZone);

    // === [DEBUG 6] Log Final Date (Success) ===
    console.log('[DEBUG-SH] Final Date object (UTC):', eventDate);

    return eventDate;
  } catch (error) {
    console.error(
      `[parseScandinaviaHouseDateTime]: Failed to parse string: "${dateString}"`,
      error
    );
    return null;
  }
}
