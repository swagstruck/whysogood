// Password Generator
export interface PasswordOptions {
  length: number; uppercase: boolean; lowercase: boolean;
  numbers: boolean; symbols: boolean; excludeAmbiguous: boolean;
  customSymbols: string;
}
export function generatePassword(options: PasswordOptions): string {
  let charset = '';
  if (options.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (options.numbers) charset += '0123456789';
  if (options.symbols) charset += '!@#$%^&*()_+~`|}{[]:;?><,./-=';
  if (options.customSymbols) charset += options.customSymbols;
  if (options.excludeAmbiguous) {
    charset = charset.replace(/[0O1lI]/g, '');
  }
  if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz';
  
  let result = '';
  const randomBytes = new Uint32Array(options.length);
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < options.length; i++) {
      result += charset[randomBytes[i] % charset.length];
    }
  } else {
    for (let i = 0; i < options.length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }
  return result;
}

export function generateMultiplePasswords(options: PasswordOptions, count: number): string[] {
  return Array.from({ length: count }, () => generatePassword(options));
}

// Random Number
export function generateRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function generateRandomFloat(min: number, max: number, decimals: number): number {
  const rand = Math.random() * (max - min) + min;
  return parseFloat(rand.toFixed(decimals));
}
export function generateRandomSet(min: number, max: number, count: number, unique: boolean): number[] {
  if (unique) {
    if (count > max - min + 1) count = max - min + 1;
    const set = new Set<number>();
    while (set.size < count) set.add(generateRandomInt(min, max));
    return Array.from(set);
  } else {
    return Array.from({ length: count }, () => generateRandomInt(min, max));
  }
}

// Placeholder Image
export function generatePlaceholderImageBlob(width: number, height: number, bgColor: string, textColor: string, text: string, format: 'png' | 'jpeg'): Blob {
  throw new Error('Not implemented in lib, use canvas directly in component');
}

// Timestamp
export function getTimestamps() {
  const now = new Date();
  return dateToTimestamp(now);
}

export function dateToTimestamp(date: Date) {
  const unixMs = date.getTime();
  const unix = Math.floor(unixMs / 1000);
  const iso = date.toISOString();
  const utc = date.toUTCString();
  const local = date.toString();
  return { unix, unixMs, iso, utc, local, relative: '' };
}

export function timestampToDate(unix: number) {
  const date = new Date(unix * 1000);
  return dateToTimestamp(date);
}
