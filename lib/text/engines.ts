'use client'; // Not needed for lib, but mark as pure TS

// ── Case Converter ──
export function toUpperCase(text: string): string { return text.toUpperCase(); }
export function toLowerCase(text: string): string { return text.toLowerCase(); }
export function toTitleCase(text: string): string {
  return text.toLowerCase().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
export function toSentenceCase(text: string): string {
  return text.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, match => match.toUpperCase());
}
export function toCamelCase(text: string): string {
  return text.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}
export function toPascalCase(text: string): string {
  return text.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}
export function toSnakeCase(text: string): string {
  return text.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_').toLowerCase();
}
export function toKebabCase(text: string): string {
  return text.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
}
export function toAlternatingCase(text: string): string {
  let upper = true;
  return text.split('').map(char => {
    if (/\s/.test(char)) return char;
    const res = upper ? char.toUpperCase() : char.toLowerCase();
    upper = !upper;
    return res;
  }).join('');
}
export function toInverseCase(text: string): string {
  return text.split('').map(char => {
    if (char === char.toUpperCase()) return char.toLowerCase();
    return char.toUpperCase();
  }).join('');
}

// ── Duplicate Lines ──
export interface DedupeResult { result: string; duplicatesRemoved: number; uniqueLines: number }
export function removeDuplicateLines(text: string, caseSensitive: boolean): DedupeResult {
  const lines = text.split('\n');
  const seen = new Set<string>();
  const unique = [];
  let dupes = 0;
  for (const line of lines) {
    const key = caseSensitive ? line : line.toLowerCase();
    if (seen.has(key)) {
      dupes++;
    } else {
      seen.add(key);
      unique.push(line);
    }
  }
  return { result: unique.join('\n'), duplicatesRemoved: dupes, uniqueLines: unique.length };
}

// ── Sort Lines ──
export function sortLines(text: string, direction: 'asc' | 'desc', caseSensitive: boolean, trimLines: boolean, removeEmpty: boolean): string {
  let lines = text.split('\n');
  if (trimLines) lines = lines.map(l => l.trim());
  if (removeEmpty) lines = lines.filter(l => l.length > 0);
  lines.sort((a, b) => {
    const valA = caseSensitive ? a : a.toLowerCase();
    const valB = caseSensitive ? b : b.toLowerCase();
    return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });
  return lines.join('\n');
}

// ── Reverse Text ──
export function reverseChars(text: string): string { return text.split('').reverse().join(''); }
export function reverseWords(text: string): string {
  return text.split('\n').map(line => line.split(/\s+/).reverse().join(' ')).join('\n');
}
export function reverseLines(text: string): string {
  return text.split('\n').reverse().join('\n');
}

// ── Find & Replace ──
export interface FindReplaceResult { result: string; matchCount: number; error?: string }
export function findAndReplace(text: string, find: string, replace: string, caseSensitive: boolean, wholeWord: boolean, useRegex: boolean, replaceAll: boolean): FindReplaceResult {
  if (!find) return { result: text, matchCount: 0 };
  try {
    let searchStr = find;
    if (!useRegex) {
      searchStr = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (wholeWord) {
      searchStr = `\\b${searchStr}\\b`;
    }
    let flags = '';
    if (replaceAll || !useRegex) flags += 'g'; // Replace All toggle typically implies global flag, but if not set we might only want first match. The instructions say "flags gi or g or i".
    // Wait, let's just construct flags carefully.
    if (replaceAll) flags += 'g';
    if (!caseSensitive) flags += 'i';
    // Deduplicate flags
    flags = Array.from(new Set(flags.split(''))).join('');
    
    const regex = new RegExp(searchStr, flags);
    const matches = text.match(new RegExp(searchStr, flags.includes('g') ? flags : flags + 'g'));
    const matchCount = matches ? matches.length : 0;
    
    const result = text.replace(regex, replace);
    return { result, matchCount };
  } catch (err: any) {
    return { result: text, matchCount: 0, error: err.message };
  }
}

// ── Text Cleaner ──
export interface TextCleanerOptions {
  removeExtraSpaces: boolean;
  trimLeadingTrailing: boolean;
  removeBlankLines: boolean;
  removeSpecialChars: boolean;
  removeNumbers: boolean;
  removePunctuation: boolean;
  removeHtmlTags: boolean;
  normalizeLineBreaks: boolean;
  removeInvisibleChars: boolean;
}
export interface TextCleanerResult { result: string; charsRemoved: number; linesRemoved: number }
export function cleanText(text: string, options: TextCleanerOptions): TextCleanerResult {
  let result = text;
  const initialLines = text.split('\n').length;
  
  if (options.normalizeLineBreaks) result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (options.removeHtmlTags) result = result.replace(/<[^>]*>/g, '');
  if (options.removeInvisibleChars) result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (options.removeSpecialChars) result = result.replace(/[^\w\s\n.,!?@-]/g, '');
  if (options.removeNumbers) result = result.replace(/\d+/g, '');
  if (options.removePunctuation) result = result.replace(/[.,!?()[\]{}:;"'-]/g, '');
  if (options.removeExtraSpaces) result = result.replace(/[ \t]{2,}/g, ' ');
  if (options.removeBlankLines) result = result.replace(/\n\s*\n/g, '\n');
  if (options.trimLeadingTrailing) {
    result = result.split('\n').map(l => l.trim()).join('\n').trim();
  }

  const charsRemoved = text.length - result.length;
  const linesRemoved = initialLines - result.split('\n').length;
  return { result, charsRemoved: charsRemoved > 0 ? charsRemoved : 0, linesRemoved: linesRemoved > 0 ? linesRemoved : 0 };
}

// ── Whitespace Remover ──
export interface WhitespaceOptions {
  trimLeading: boolean;
  trimTrailing: boolean;
  collapseInner: boolean;
  removeBlankLines: boolean;
  normalizeToUnix: boolean;
}
export interface WhitespaceResult { result: string; spacesRemoved: number }
export function removeWhitespace(text: string, options: WhitespaceOptions): WhitespaceResult {
  const originalLength = text.length;
  let lines = text.split(options.normalizeToUnix ? /\r\n|\r|\n/ : '\n');
  
  lines = lines.map(line => {
    let l = line;
    if (options.trimLeading) l = l.replace(/^\s+/, '');
    if (options.trimTrailing) l = l.replace(/\s+$/, '');
    if (options.collapseInner) l = l.replace(/\s{2,}/g, ' ');
    return l;
  });
  
  if (options.removeBlankLines) {
    lines = lines.filter(l => l.length > 0);
  }
  
  const result = lines.join(options.normalizeToUnix ? '\n' : '\n');
  const spacesRemoved = originalLength - result.length;
  
  return { result, spacesRemoved: spacesRemoved > 0 ? spacesRemoved : 0 };
}

// ── Slug Generator ──
export type SlugSeparator = '-' | '_' | '.';
export interface SlugOptions { separator: SlugSeparator; lowercase: boolean; removeStopWords: boolean; maxLength: number }
export function generateSlug(text: string, options: SlugOptions): string {
  let slug = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (options.lowercase) slug = slug.toLowerCase();
  
  if (options.removeStopWords) {
    const stopWords = ['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with'];
    const regex = new RegExp(`\\b(${stopWords.join('|')})\\b`, 'gi');
    slug = slug.replace(regex, '');
  }
  
  slug = slug.replace(/[^a-zA-Z0-9]+/g, options.separator);
  
  while (slug.startsWith(options.separator)) slug = slug.slice(1);
  while (slug.endsWith(options.separator)) slug = slug.slice(0, -1);
  
  if (options.maxLength > 0 && slug.length > options.maxLength) {
    slug = slug.substring(0, options.maxLength);
    while (slug.endsWith(options.separator)) slug = slug.slice(0, -1);
  }
  
  return slug;
}

// ── Lorem Ipsum ──
export type LoremUnit = 'words' | 'sentences' | 'paragraphs';
const loremBank = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor', 'in', 'reprehenderit', 'in', 'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'];

export function generateLorem(count: number, unit: LoremUnit, startWithLorem: boolean): string {
  const getRandomWord = () => loremBank[Math.floor(Math.random() * loremBank.length)];
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  
  const genSentence = () => {
    const numWords = Math.floor(Math.random() * 7) + 6; // 6 to 12
    const words = Array.from({length: numWords}, getRandomWord);
    return capitalize(words.join(' ')) + '.';
  };
  
  const genParagraph = () => {
    const numSentences = Math.floor(Math.random() * 4) + 3; // 3 to 6
    return Array.from({length: numSentences}, genSentence).join(' ');
  };

  const starter = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

  if (unit === 'words') {
    let words = Array.from({length: count}, getRandomWord);
    if (startWithLorem && count > 0) {
      const starterWords = starter.replace(/[.,]/g, '').toLowerCase().split(' ');
      words = starterWords.concat(words).slice(0, count);
      if (words.length > 0) words[0] = capitalize(words[0]);
    }
    return words.join(' ');
  }
  
  if (unit === 'sentences') {
    let sentences = Array.from({length: count}, genSentence);
    if (startWithLorem && count > 0) {
      sentences[0] = starter;
    }
    return sentences.join(' ');
  }
  
  if (unit === 'paragraphs') {
    let paragraphs = Array.from({length: count}, genParagraph);
    if (startWithLorem && count > 0) {
      if (count === 1) paragraphs[0] = starter;
      else {
        const rest = genParagraph();
        paragraphs[0] = `${starter} ${rest}`;
      }
    }
    return paragraphs.join('\n\n');
  }
  
  return '';
}
