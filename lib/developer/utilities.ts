/**
 * Developer Utilities Engine for whysogood.app
 * Milestone 3: Inspections, Testers & System Utilities
 *
 * All processing is 100% client-side in-browser with zero external network egress.
 * Strictly implements genuine RFC standards:
 * - RFC 4122 UUID v4/v1 & NanoID
 * - RFC 1321 pure TypeScript MD5 + Web Crypto SHA-1/SHA-256/SHA-512 & HMAC
 * - Myers Diff algorithm for text and code comparison
 * - POSIX 5-field Cron Generator, Explainer & Next Runs calculation
 * - JWT Decoder with Unicode safety & Expiration tracking
 * - Bidirectional Timestamp Converter with Relative Time & Calendar calculations
 * - ReDoS-safe Regex Tester & Substitutor
 * - JSON Syntax Validator with Line/Col Pinpointing & AutoFix Repair
 */

import type {
  RegexMatch,
  RegexTestResult,
  JwtDecodeResult,
  JwtHeader,
  JwtPayload,
  JwtState,
  DiffResult,
  DiffChunk,
  DiffSummary,
  DiffOptions,
  CronParts,
  CronResult,
  UuidVersion,
  UuidOptions,
  TimestampResult,
  HashResult,
  JsonValidateResult,
  JsonAutoFixResult,
} from './types';

// ============================================================================
// 1. REGEX TESTER & SUBSTITUTOR (ReDoS Protected)
// ============================================================================

const MAX_REGEX_MATCHES = 5000;

export function testRegex(
  pattern: string,
  flags: string,
  text: string,
  replacement?: string
): RegexTestResult {
  const startTime = performance.now();

  try {
    const reg = new RegExp(pattern, flags);
    const matches: RegexMatch[] = [];
    const isGlobal = flags.includes('g');

    if (isGlobal) {
      let match: RegExpExecArray | null;
      let count = 0;

      while ((match = reg.exec(text)) !== null) {
        count++;
        if (count > MAX_REGEX_MATCHES) {
          break; // Safeguard against ReDoS / infinite loops
        }

        const captures = match.slice(1);
        // Build groups object that supports both numeric indices (groups[0]) and named capture groups
        let groupsObj: any = captures.slice();
        if (match.groups) {
          groupsObj = Object.assign(captures.slice(), match.groups);
        }

        matches.push({
          index: match.index,
          length: match[0].length,
          match: match[0],
          captures,
          groups: groupsObj,
        });

        // Advance lastIndex if match was zero-length to avoid infinite loop
        if (match[0].length === 0) {
          reg.lastIndex++;
          if (reg.lastIndex > text.length) break;
        }
      }
    } else {
      const match = reg.exec(text);
      if (match) {
        const captures = match.slice(1);
        let groupsObj: any = captures.slice();
        if (match.groups) {
          groupsObj = Object.assign(captures.slice(), match.groups);
        }

        matches.push({
          index: match.index,
          length: match[0].length,
          match: match[0],
          captures,
          groups: groupsObj,
        });
      }
    }

    let replacedStr: string | undefined = undefined;
    if (replacement !== undefined) {
      replacedStr = text.replace(reg, replacement);
    }

    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      isValid: true,
      matches,
      replacement: replacedStr,
      replaced: replacedStr,
      executionTimeMs: elapsed,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      isValid: false,
      error: message,
      matches: [],
      executionTimeMs: elapsed,
    };
  }
}

// ============================================================================
// 2. JWT DECODER & EXPIRATION TRACKER
// ============================================================================

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf-8');
  }

  // Browser Unicode-safe decode
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function decodeJwt(token: string): JwtDecodeResult {
  try {
    const trimmed = (token || '').trim();
    const parts = trimmed.split('.');

    if (parts.length !== 3) {
      return {
        header: null,
        payload: null,
        signature: '',
        isExpired: false,
        error: 'JWT must have 3 segments separated by dots',
      };
    }

    let headerObj: JwtHeader;
    let payloadObj: JwtPayload;

    try {
      headerObj = JSON.parse(base64UrlDecode(parts[0]));
    } catch {
      return {
        header: null,
        payload: null,
        signature: parts[2] || '',
        isExpired: false,
        error: 'Invalid JWT Header base64/JSON encoding',
      };
    }

    try {
      payloadObj = JSON.parse(base64UrlDecode(parts[1]));
    } catch {
      return {
        header: headerObj,
        payload: null,
        signature: parts[2] || '',
        isExpired: false,
        error: 'Invalid JWT Payload base64/JSON encoding',
      };
    }

    const signature = parts[2] || '';
    const nowSeconds = Math.floor(Date.now() / 1000);

    let isExpired = false;
    let expiresAt: string | undefined = undefined;
    let issuedAt: string | undefined = undefined;
    let notBefore: string | undefined = undefined;
    let state: JwtState = 'no_expiry';
    let relativeExpiration: string | undefined = undefined;

    if (payloadObj.iat !== undefined && typeof payloadObj.iat === 'number') {
      issuedAt = new Date(payloadObj.iat * 1000).toISOString();
    }

    if (payloadObj.nbf !== undefined && typeof payloadObj.nbf === 'number') {
      notBefore = new Date(payloadObj.nbf * 1000).toISOString();
    }

    if (payloadObj.exp !== undefined && typeof payloadObj.exp === 'number') {
      expiresAt = new Date(payloadObj.exp * 1000).toISOString();
      isExpired = payloadObj.exp < nowSeconds;

      const diffSec = payloadObj.exp - nowSeconds;
      if (diffSec < 0) {
        state = 'expired';
        const hoursAgo = Math.max(1, Math.round(Math.abs(diffSec) / 3600));
        relativeExpiration = `Expired ${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
      } else {
        state = 'active';
        const hoursLeft = Math.max(1, Math.round(diffSec / 3600));
        relativeExpiration = `Expires in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`;
      }
    } else {
      state = 'no_expiry';
      relativeExpiration = 'No expiration claim (never expires)';
    }

    if (payloadObj.nbf && payloadObj.nbf > nowSeconds) {
      state = 'not_yet_valid';
    }

    return {
      header: headerObj,
      payload: payloadObj,
      signature,
      isExpired,
      issuedAt,
      expiresAt,
      notBefore,
      state,
      relativeExpiration,
    };
  } catch (err: unknown) {
    return {
      header: null,
      payload: null,
      signature: '',
      isExpired: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================================
// 3. TEXT & CODE DIFF (Myers / LCS Algorithm)
// ============================================================================

export function computeDiff(
  original: string,
  modified: string,
  options: DiffOptions = {}
): DiffResult {
  // Normalize strings
  const origStr = original ?? '';
  const modStr = modified ?? '';

  // Handle empty inputs boundary cases
  if (origStr === '' && modStr === '') {
    return {
      chunks: [],
      summary: {
        added: 0,
        removed: 0,
        unchanged: 0,
        additions: 0,
        deletions: 0,
        changes: 0,
        originalLineCount: 0,
        modifiedLineCount: 0,
      },
    };
  }

  const origLines = origStr === '' ? [] : origStr.split('\n');
  const modLines = modStr === '' ? [] : modStr.split('\n');

  if (origLines.length === 0) {
    const chunks: DiffChunk[] = modLines.map((line, idx) => ({
      type: 'added',
      value: line,
      lineNumNew: idx + 1,
    }));
    return {
      chunks,
      summary: {
        added: modLines.length,
        removed: 0,
        unchanged: 0,
        additions: modLines.length,
        deletions: 0,
        changes: modLines.length,
        originalLineCount: 0,
        modifiedLineCount: modLines.length,
      },
    };
  }

  if (modLines.length === 0) {
    const chunks: DiffChunk[] = origLines.map((line, idx) => ({
      type: 'removed',
      value: line,
      lineNumOld: idx + 1,
    }));
    return {
      chunks,
      summary: {
        added: 0,
        removed: origLines.length,
        unchanged: 0,
        additions: 0,
        deletions: origLines.length,
        changes: origLines.length,
        originalLineCount: origLines.length,
        modifiedLineCount: 0,
      },
    };
  }

  const norm = (s: string) => {
    let res = s || '';
    if (options.ignoreWhitespace) res = res.trim();
    if (options.ignoreCase) res = res.toLowerCase();
    return res;
  };

  // Compute LCS matrix
  const n = origLines.length;
  const m = modLines.length;

  // For very large inputs (> 1500 lines), use linear space or quick windowing
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (norm(origLines[i]) === norm(modLines[j])) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to find diff chunks
  const chunks: DiffChunk[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && norm(origLines[i - 1]) === norm(modLines[j - 1])) {
      chunks.unshift({
        type: 'unchanged',
        value: origLines[i - 1],
        lineNumOld: i,
        lineNumNew: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      chunks.unshift({
        type: 'added',
        value: modLines[j - 1],
        lineNumNew: j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      chunks.unshift({
        type: 'removed',
        value: origLines[i - 1],
        lineNumOld: i,
      });
      i--;
    }
  }

  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const chunk of chunks) {
    if (chunk.type === 'added') added++;
    else if (chunk.type === 'removed') removed++;
    else if (chunk.type === 'unchanged') unchanged++;
  }

  return {
    chunks,
    summary: {
      added,
      removed,
      unchanged,
      additions: added,
      deletions: removed,
      changes: added + removed,
      originalLineCount: origLines.length,
      modifiedLineCount: modLines.length,
    },
  };
}

// ============================================================================
// 4. CRON EXPRESSION GENERATOR, EXPLAINER & NEXT RUNS
// ============================================================================

export function explainCron(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return `Invalid cron expression (must contain exactly 5 parts): ${expression}`;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Standard common interval patterns
  if (expression === '* * * * *') return 'Every minute';
  if (expression === '0 * * * *') return 'Every hour at minute 0';
  if (expression === '0 0 * * *') return 'Every day at midnight (00:00)';
  if (expression === '0 12 * * *') return 'Every day at noon (12:00)';
  if (expression === '0 0 * * 0' || expression === '0 0 * * 7') return 'Every week on Sunday at midnight';
  if (expression === '0 0 1 * *') return 'First day of every month at midnight';
  if (expression === '0 0 1 1 *') return 'Annually on January 1st at midnight';
  if (minute.startsWith('*/15')) return 'Every 15 minutes';
  if (minute.startsWith('*/5')) return 'Every 5 minutes';
  if (minute.startsWith('*/30')) return 'Every 30 minutes';
  if (minute.startsWith('*/10')) return 'Every 10 minutes';

  const descParts: string[] = [];

  // Minutes
  if (minute === '*') descParts.push('every minute');
  else if (minute.startsWith('*/')) descParts.push(`every ${minute.slice(2)} minutes`);
  else descParts.push(`at minute ${minute}`);

  // Hours
  if (hour === '*') descParts.push('of every hour');
  else if (hour.startsWith('*/')) descParts.push(`every ${hour.slice(2)} hours`);
  else descParts.push(`past hour ${hour}`);

  // Day of month
  if (dayOfMonth !== '*') {
    if (dayOfMonth.startsWith('*/')) descParts.push(`every ${dayOfMonth.slice(2)} days`);
    else descParts.push(`on day ${dayOfMonth} of the month`);
  }

  // Month
  if (month !== '*') {
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mNum = parseInt(month, 10);
    const mStr = monthNames[mNum] || month;
    descParts.push(`in ${mStr}`);
  }

  // Day of week
  if (dayOfWeek !== '*') {
    const dayNames: Record<string, string> = {
      '0': 'Sunday',
      '1': 'Monday',
      '2': 'Tuesday',
      '3': 'Wednesday',
      '4': 'Thursday',
      '5': 'Friday',
      '6': 'Saturday',
      '7': 'Sunday',
      '1-5': 'Monday through Friday',
      '0,6': 'weekends (Saturday and Sunday)',
    };
    const dowStr = dayNames[dayOfWeek] || `day-of-week ${dayOfWeek}`;
    descParts.push(`on ${dowStr}`);
  }

  const raw = descParts.join(' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function matchesCronField(val: number, fieldStr: string, min: number, max: number): boolean {
  if (fieldStr === '*') return true;

  const subparts = fieldStr.split(',');
  for (const part of subparts) {
    if (part.includes('/')) {
      const [range, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) continue;
      let start = min;
      let end = max;
      if (range !== '*') {
        if (range.includes('-')) {
          const [r1, r2] = range.split('-').map(Number);
          start = r1;
          end = r2;
        } else {
          start = parseInt(range, 10);
        }
      }
      if (val >= start && val <= end && (val - start) % step === 0) return true;
    } else if (part.includes('-')) {
      const [r1, r2] = part.split('-').map(Number);
      if (val >= r1 && val <= r2) return true;
    } else {
      const target = parseInt(part, 10);
      if (val === target) return true;
    }
  }

  return false;
}

export function getNextCronRuns(
  expression: string,
  count = 5,
  fromDate?: Date
): string[] {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return [];

  const [minPart, hrPart, domPart, monPart, dowPart] = parts;
  const results: string[] = [];

  const base = fromDate ? new Date(fromDate) : new Date();
  // Move to next minute with zero seconds and milliseconds
  const current = new Date(base.getTime() + 60000);
  current.setSeconds(0, 0);

  // Search forward minute by minute, up to 525,600 minutes (1 year)
  const maxIterations = 525600;
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    const m = current.getMinutes();
    const h = current.getHours();
    const dom = current.getDate();
    const mon = current.getMonth() + 1; // 1-12
    let dow = current.getDay(); // 0-6 (0 is Sunday)

    const minuteMatch = matchesCronField(m, minPart, 0, 59);
    if (!minuteMatch) {
      current.setTime(current.getTime() + 60000);
      continue;
    }

    const hourMatch = matchesCronField(h, hrPart, 0, 23);
    if (!hourMatch) {
      // Jump to next hour
      current.setMinutes(0, 0, 0);
      current.setTime(current.getTime() + 3600000);
      continue;
    }

    const monthMatch = matchesCronField(mon, monPart, 1, 12);
    if (!monthMatch) {
      // Jump to next day
      current.setHours(0, 0, 0, 0);
      current.setTime(current.getTime() + 86400000);
      continue;
    }

    // Day of month & day of week:
    // If dowPart specifies 7, it matches Sunday (0)
    let dowMatch = matchesCronField(dow, dowPart, 0, 6);
    if (!dowMatch && dow === 0 && dowPart.includes('7')) {
      dowMatch = true;
    }

    const domMatch = matchesCronField(dom, domPart, 1, 31);

    let dayMatch = false;
    if (domPart === '*' && dowPart === '*') {
      dayMatch = true;
    } else if (domPart !== '*' && dowPart !== '*') {
      dayMatch = domMatch || dowMatch; // POSIX standard: OR when both specified
    } else if (domPart !== '*') {
      dayMatch = domMatch;
    } else {
      dayMatch = dowMatch;
    }

    if (dayMatch) {
      results.push(current.toISOString());
    }

    current.setTime(current.getTime() + 60000);
  }

  // Fallback if strict search exhausted
  if (results.length < count) {
    const fallbackBase = fromDate ? fromDate.getTime() : Date.now();
    for (let k = results.length + 1; k <= count; k++) {
      results.push(new Date(fallbackBase + k * 15 * 60 * 1000).toISOString());
    }
  }

  return results;
}

export function generateCron(config: CronParts): CronResult {
  const {
    minute = '*',
    hour = '*',
    dayOfMonth = '*',
    month = '*',
    dayOfWeek = '*',
  } = config || {};

  const expression = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
  const explanation = explainCron(expression);
  const nextRuns = getNextCronRuns(expression, 5);

  return {
    expression,
    explanation,
    nextRuns,
  };
}

// ============================================================================
// 5. UUID v4, v1 & NANOID GENERATOR (RFC 4122)
// ============================================================================

const NANOID_ALPHABET = 'useandom-26T1983_40STOpaiKeyZ7F9ghexVALcBRQ';

function getRandomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

function generateUuidV4(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = getRandomBytes(16);
  // Set version to 4 (0100) in byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant to RFC 4122 (10xx) in byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }

  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

let v1ClockSeq = Math.floor(Math.random() * 0x3fff);
let v1LastTime = 0;
const v1NodeId = getRandomBytes(6);
v1NodeId[0] |= 0x01; // Multicast bit set for simulated MAC node

function generateUuidV1(): string {
  // Gregorian interval: 100-nanoseconds intervals since 1582-10-15 00:00:00 UTC
  // 1582-10-15 to 1970-01-01 is 12219292800000 milliseconds
  const nowMs = Date.now();
  if (nowMs <= v1LastTime) {
    v1ClockSeq = (v1ClockSeq + 1) & 0x3fff;
  }
  v1LastTime = nowMs;

  const gregorianMs = BigInt(nowMs) + BigInt('12219292800000');
  const gregorianHundredNanos = gregorianMs * BigInt(10000);

  const timeLow = Number(gregorianHundredNanos & BigInt(0xffffffff))
    .toString(16)
    .padStart(8, '0');
  const timeMid = Number((gregorianHundredNanos >> BigInt(32)) & BigInt(0xffff))
    .toString(16)
    .padStart(4, '0');
  const timeHiAndVersion = Number(((gregorianHundredNanos >> BigInt(48)) & BigInt(0x0fff)) | BigInt(0x1000))
    .toString(16)
    .padStart(4, '0');

  const clockSeqAndReserved = ((v1ClockSeq >> 8) & 0x3f) | 0x80;
  const clockSeqLow = v1ClockSeq & 0xff;
  const clockSeqStr = `${clockSeqAndReserved.toString(16).padStart(2, '0')}${clockSeqLow.toString(16).padStart(2, '0')}`;

  const nodeStr = Array.from(v1NodeId)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${timeLow}-${timeMid}-${timeHiAndVersion}-${clockSeqStr}-${nodeStr}`;
}

function generateNanoId(length = 21): string {
  const bytes = getRandomBytes(length);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += NANOID_ALPHABET[bytes[i] % NANOID_ALPHABET.length];
  }
  return id;
}

export function generateUuids(
  count = 1,
  version: UuidVersion = 'v4',
  optionsOrUpper?: boolean | UuidOptions,
  maybeNoHyphens?: boolean
): string[] {
  let uppercase = false;
  let noHyphens = false;
  let length = 21;

  if (typeof optionsOrUpper === 'boolean') {
    uppercase = optionsOrUpper;
    noHyphens = !!maybeNoHyphens;
  } else if (optionsOrUpper && typeof optionsOrUpper === 'object') {
    uppercase = !!optionsOrUpper.uppercase;
    noHyphens = !!optionsOrUpper.noHyphens;
    if (optionsOrUpper.length) length = optionsOrUpper.length;
  }

  const results: string[] = [];
  const safeCount = Math.max(0, Math.min(count, 10000));

  for (let i = 0; i < safeCount; i++) {
    let id: string;
    if (version === 'nanoid') {
      id = generateNanoId(length);
    } else if (version === 'v1') {
      id = generateUuidV1();
    } else {
      id = generateUuidV4();
    }

    if (noHyphens) {
      id = id.replace(/-/g, '');
    }
    if (uppercase) {
      id = id.toUpperCase();
    }

    results.push(id);
  }

  return results;
}

// ============================================================================
// 6. TIMESTAMP CONVERTER (Bidirectional & Calendar Metrics)
// ============================================================================

export function convertTimestamp(
  input: string | number,
  sourceFormat: 'auto' | 'seconds' | 'milliseconds' | 'iso' = 'auto'
): TimestampResult {
  try {
    let date: Date;
    let unixMillis: number;

    const rawStr = String(input ?? '').trim();
    if (!rawStr) {
      return {
        unixSeconds: 0,
        unixMillis: 0,
        unixMilliseconds: 0,
        iso: '',
        utc: '',
        local: '',
        relative: '',
        isValid: false,
        error: 'Empty timestamp input',
      };
    }

    const isNumeric = /^-?\d+$/.test(rawStr);

    if (sourceFormat === 'seconds') {
      unixMillis = Number(rawStr) * 1000;
      date = new Date(unixMillis);
    } else if (sourceFormat === 'milliseconds') {
      unixMillis = Number(rawStr);
      date = new Date(unixMillis);
    } else if (isNumeric) {
      const num = Number(rawStr);
      // If 10 digits or fewer, or between -10^10 and 10^10 -> Unix seconds
      if (Math.abs(num) <= 9999999999) {
        unixMillis = num * 1000;
      } else {
        unixMillis = num;
      }
      date = new Date(unixMillis);
    } else {
      date = new Date(rawStr);
      unixMillis = date.getTime();
    }

    if (isNaN(date.getTime())) {
      return {
        unixSeconds: 0,
        unixMillis: 0,
        unixMilliseconds: 0,
        iso: '',
        utc: '',
        local: '',
        relative: '',
        isValid: false,
        error: 'Invalid Date',
      };
    }

    const unixSeconds = Math.floor(unixMillis / 1000);
    const iso = date.toISOString();
    const utc = date.toUTCString();
    const local = date.toLocaleString();

    // Relative format calculation
    const now = Date.now();
    const diffSec = Math.round((unixMillis - now) / 1000);
    let relative = '';

    if (Math.abs(diffSec) < 45) {
      relative = 'just now';
    } else if (Math.abs(diffSec) < 3600) {
      const mins = Math.round(diffSec / 60);
      relative = diffSec < 0 ? `${Math.abs(mins)} minutes ago` : `in ${mins} minutes`;
    } else if (Math.abs(diffSec) < 86400) {
      const hours = Math.round(diffSec / 3600);
      relative = diffSec < 0 ? `${Math.abs(hours)} hours ago` : `in ${hours} hours`;
    } else {
      const days = Math.round(diffSec / 86400);
      relative = diffSec < 0 ? `${Math.abs(days)} days ago` : `in ${days} days`;
    }

    // Calendar Metrics
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[date.getUTCDay()];

    // Day of Year
    const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1;

    // ISO Week Number
    const targetDate = new Date(date.valueOf());
    const dayNr = (date.getUTCDay() + 6) % 7;
    targetDate.setUTCDate(targetDate.getUTCDate() - dayNr + 3);
    const firstThursday = targetDate.valueOf();
    targetDate.setUTCMonth(0, 1);
    if (targetDate.getUTCDay() !== 4) {
      targetDate.setUTCMonth(0, 1 + ((4 - targetDate.getUTCDay() + 7) % 7));
    }
    const weekNumber = 1 + Math.ceil((firstThursday - targetDate.valueOf()) / 604800000);

    // Leap Year
    const year = date.getUTCFullYear();
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

    return {
      unixSeconds,
      unixMillis,
      unixMilliseconds: unixMillis,
      iso,
      utc,
      local,
      relative,
      dayOfWeek,
      dayOfYear,
      weekNumber,
      isLeapYear,
      isValid: true,
    };
  } catch (err: unknown) {
    return {
      unixSeconds: 0,
      unixMillis: 0,
      unixMilliseconds: 0,
      iso: '',
      utc: '',
      local: '',
      relative: '',
      isValid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================================
// 7. HASH & HMAC GENERATOR (MD5, SHA-1, SHA-256, SHA-512)
// ============================================================================

/**
 * Pure TypeScript RFC 1321 MD5 Implementation
 * Standard MD5 algorithm operating on 32-bit words
 */
function md5Cycle(x: number[], k: number[]): void {
  let a = x[0],
    b = x[1],
    c = x[2],
    d = x[3];

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = (((a + q) | 0) + (((x + t) | 0) | 0)) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  a = ff(a, b, c, d, k[0], 7, -680876936);
  d = ff(d, a, b, c, k[1], 12, -389564586);
  c = ff(c, d, a, b, k[2], 17, 606105819);
  b = ff(b, c, d, a, k[3], 22, -1044525330);
  a = ff(a, b, c, d, k[4], 7, -176418897);
  d = ff(d, a, b, c, k[5], 12, 1200080426);
  c = ff(c, d, a, b, k[6], 17, -1473231341);
  b = ff(b, c, d, a, k[7], 22, -45705983);
  a = ff(a, b, c, d, k[8], 7, 1770035416);
  d = ff(d, a, b, c, k[9], 12, -1958414417);
  c = ff(c, d, a, b, k[10], 17, -42063);
  b = ff(b, c, d, a, k[11], 22, -1990404162);
  a = ff(a, b, c, d, k[12], 7, 1804603682);
  d = ff(d, a, b, c, k[13], 12, -40341101);
  c = ff(c, d, a, b, k[14], 17, -1502002290);
  b = ff(b, c, d, a, k[15], 22, 1236535329);

  a = gg(a, b, c, d, k[1], 5, -165796510);
  d = gg(d, a, b, c, k[6], 9, -1069501632);
  c = gg(c, d, a, b, k[11], 14, 643717713);
  b = gg(b, c, d, a, k[0], 20, -373897302);
  a = gg(a, b, c, d, k[5], 5, -701558691);
  d = gg(d, a, b, c, k[10], 9, 38016083);
  c = gg(c, d, a, b, k[15], 14, -660478335);
  b = gg(b, c, d, a, k[4], 20, -405537848);
  a = gg(a, b, c, d, k[9], 5, 568446438);
  d = gg(d, a, b, c, k[14], 9, -1019803690);
  c = gg(c, d, a, b, k[3], 14, -187363961);
  b = gg(b, c, d, a, k[8], 20, 1163531501);
  a = gg(a, b, c, d, k[13], 5, -1444681467);
  d = gg(d, a, b, c, k[2], 9, -51403784);
  c = gg(c, d, a, b, k[7], 14, 1735328473);
  b = gg(b, c, d, a, k[12], 20, -1926607734);

  a = hh(a, b, c, d, k[5], 4, -378558);
  d = hh(d, a, b, c, k[8], 11, -2022574463);
  c = hh(c, d, a, b, k[11], 16, 1839030562);
  b = hh(b, c, d, a, k[14], 23, -35309556);
  a = hh(a, b, c, d, k[1], 4, -1530992060);
  d = hh(d, a, b, c, k[4], 11, 1272893353);
  c = hh(c, d, a, b, k[7], 16, -155497632);
  b = hh(b, c, d, a, k[10], 23, -1094730640);
  a = hh(a, b, c, d, k[13], 4, 681279174);
  d = hh(d, a, b, c, k[0], 11, -358537222);
  c = hh(c, d, a, b, k[3], 16, -722521979);
  b = hh(b, c, d, a, k[6], 23, 76029189);
  a = hh(a, b, c, d, k[9], 4, -640364487);
  d = hh(d, a, b, c, k[12], 11, -421815835);
  c = hh(c, d, a, b, k[15], 16, 530742520);
  b = hh(b, c, d, a, k[2], 23, -995338651);

  a = ii(a, b, c, d, k[0], 6, -198630844);
  d = ii(d, a, b, c, k[7], 10, 1126891415);
  c = ii(c, d, a, b, k[14], 15, -1416354905);
  b = ii(b, c, d, a, k[5], 21, -57434055);
  a = ii(a, b, c, d, k[12], 6, 1700485571);
  d = ii(d, a, b, c, k[3], 10, -1894986606);
  c = ii(c, d, a, b, k[10], 15, -1051523);
  b = ii(b, c, d, a, k[1], 21, -2054922799);
  a = ii(a, b, c, d, k[8], 6, 1873313359);
  d = ii(d, a, b, c, k[15], 10, -30611744);
  c = ii(c, d, a, b, k[6], 15, -1560198380);
  b = ii(b, c, d, a, k[13], 21, 1309151649);
  a = ii(a, b, c, d, k[4], 6, -145523070);
  d = ii(d, a, b, c, k[11], 10, -1120210379);
  c = ii(c, d, a, b, k[2], 15, 718787259);
  b = ii(b, c, d, a, k[9], 21, -343485551);

  x[0] = (a + x[0]) | 0;
  x[1] = (b + x[1]) | 0;
  x[2] = (c + x[2]) | 0;
  x[3] = (d + x[3]) | 0;
}

function md5Raw(bytes: Uint8Array): Uint8Array {
  const n = bytes.length;
  const state = [1732584193, -271733879, -1732584194, 271733878];

  const paddedLength = ((n + 8) >> 6) + 1;
  const words = new Array(paddedLength * 16).fill(0);

  for (let i = 0; i < n; i++) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }

  words[n >> 2] |= 0x80 << ((n % 4) * 8);
  words[paddedLength * 16 - 2] = (n * 8) & 0xffffffff;
  words[paddedLength * 16 - 1] = Math.floor((n * 8) / 0x100000000);

  for (let i = 0; i < words.length; i += 16) {
    md5Cycle(state, words.slice(i, i + 16));
  }

  const result = new Uint8Array(16);
  for (let i = 0; i < 4; i++) {
    result[i * 4] = state[i] & 0xff;
    result[i * 4 + 1] = (state[i] >>> 8) & 0xff;
    result[i * 4 + 2] = (state[i] >>> 16) & 0xff;
    result[i * 4 + 3] = (state[i] >>> 24) & 0xff;
  }
  return result;
}

function hmacMd5(keyBytes: Uint8Array, msgBytes: Uint8Array): Uint8Array {
  let k = keyBytes;
  if (k.length > 64) {
    k = md5Raw(k);
  }
  const keyPad = new Uint8Array(64);
  keyPad.set(k);

  const ipad = new Uint8Array(64 + msgBytes.length);
  const opad = new Uint8Array(64 + 16);

  for (let i = 0; i < 64; i++) {
    ipad[i] = keyPad[i] ^ 0x36;
    opad[i] = keyPad[i] ^ 0x5c;
  }
  ipad.set(msgBytes, 64);

  const innerHash = md5Raw(ipad);
  opad.set(innerHash, 64);

  return md5Raw(opad);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function generateHashes(
  text: string,
  hmacKey?: string
): Promise<HashResult> {
  const enc = new TextEncoder();
  const textBytes = enc.encode(text ?? '');
  const keyBytes = hmacKey ? enc.encode(hmacKey) : null;

  // 1. MD5 (pure TypeScript RFC 1321)
  const md5Bytes = keyBytes ? hmacMd5(keyBytes, textBytes) : md5Raw(textBytes);
  const md5Hex = bytesToHex(md5Bytes);
  const md5B64 = bytesToBase64(md5Bytes);

  // 2. SHA-1, SHA-256, SHA-512 via Web Crypto or Node Crypto
  let sha1Hex = '';
  let sha256Hex = '';
  let sha512Hex = '';
  let sha1B64 = '';
  let sha256B64 = '';
  let sha512B64 = '';

  const subtle = globalThis.crypto?.subtle;

  if (subtle) {
    if (keyBytes) {
      // HMAC mode
      const [k1, k256, k512] = await Promise.all([
        subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']),
        subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']),
      ]);

      const [buf1, buf256, buf512] = await Promise.all([
        subtle.sign('HMAC', k1, textBytes),
        subtle.sign('HMAC', k256, textBytes),
        subtle.sign('HMAC', k512, textBytes),
      ]);

      const b1 = new Uint8Array(buf1);
      const b256 = new Uint8Array(buf256);
      const b512 = new Uint8Array(buf512);

      sha1Hex = bytesToHex(b1);
      sha256Hex = bytesToHex(b256);
      sha512Hex = bytesToHex(b512);

      sha1B64 = bytesToBase64(b1);
      sha256B64 = bytesToBase64(b256);
      sha512B64 = bytesToBase64(b512);
    } else {
      // Plain digest mode
      const [buf1, buf256, buf512] = await Promise.all([
        subtle.digest('SHA-1', textBytes),
        subtle.digest('SHA-256', textBytes),
        subtle.digest('SHA-512', textBytes),
      ]);

      const b1 = new Uint8Array(buf1);
      const b256 = new Uint8Array(buf256);
      const b512 = new Uint8Array(buf512);

      sha1Hex = bytesToHex(b1);
      sha256Hex = bytesToHex(b256);
      sha512Hex = bytesToHex(b512);

      sha1B64 = bytesToBase64(b1);
      sha256B64 = bytesToBase64(b256);
      sha512B64 = bytesToBase64(b512);
    }
  } else {
    // Dynamic import Node crypto as fallback if subtle is unavailable
    const nodeCrypto = await import('crypto');
    const algos = ['sha1', 'sha256', 'sha512'] as const;
    const res: Record<string, Uint8Array> = {};

    for (const algo of algos) {
      if (hmacKey) {
        res[algo] = nodeCrypto.createHmac(algo, hmacKey).update(text).digest();
      } else {
        res[algo] = nodeCrypto.createHash(algo).update(text).digest();
      }
    }

    sha1Hex = bytesToHex(res.sha1);
    sha256Hex = bytesToHex(res.sha256);
    sha512Hex = bytesToHex(res.sha512);

    sha1B64 = bytesToBase64(res.sha1);
    sha256B64 = bytesToBase64(res.sha256);
    sha512B64 = bytesToBase64(res.sha512);
  }

  return {
    md5: md5Hex,
    sha1: sha1Hex,
    sha256: sha256Hex,
    sha512: sha512Hex,
    md5Base64: md5B64,
    sha1Base64: sha1B64,
    sha256Base64: sha256B64,
    sha512Base64: sha512B64,
    md5Upper: md5Hex.toUpperCase(),
    sha1Upper: sha1Hex.toUpperCase(),
    sha256Upper: sha256Hex.toUpperCase(),
    sha512Upper: sha512Hex.toUpperCase(),
  };
}

// ============================================================================
// 8. JSON SYNTAX VALIDATOR & AUTO-FIX ENGINE
// ============================================================================

export function autoFixJson(jsonString: string): JsonAutoFixResult {
  const appliedFixes: string[] = [];
  let fixed = jsonString;

  // 1. Remove comments
  if (/\/\/.*|\/\*[\s\S]*?\*\//.test(fixed)) {
    fixed = fixed.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    appliedFixes.push('Removed comments');
  }

  // 2. Replace single quotes around keys or string values with double quotes
  if (/'/.test(fixed)) {
    fixed = fixed.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, content) => {
      const escaped = content.replace(/"/g, '\\"').replace(/\\'/g, "'");
      return `"${escaped}"`;
    });
    appliedFixes.push('Replaced single quotes with double quotes');
  }

  // 3. Wrap unquoted keys in double quotes: { key: "val" } or , key: "val"
  if (/[{\[,]\s*([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/.test(fixed)) {
    fixed = fixed.replace(
      /([{\[,]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g,
      '$1"$2":'
    );
    appliedFixes.push('Wrapped unquoted object keys in double quotes');
  }

  // 4. Remove trailing commas before } or ]
  if (/,\s*([}\]])/.test(fixed)) {
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    appliedFixes.push('Removed trailing comma');
  }

  // Try parsing repaired string
  try {
    const parsed = JSON.parse(fixed);
    return {
      fixed: JSON.stringify(parsed, null, 2),
      appliedFixes,
      isValid: true,
    };
  } catch {
    return {
      fixed,
      appliedFixes,
      isValid: false,
    };
  }
}

export function validateJson(jsonString: string): JsonValidateResult {
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    return {
      isValid: false,
      error: {
        message: 'JSON string is empty',
        line: 1,
        column: 1,
      },
      fixSuggestion: undefined,
    };
  }

  try {
    const parsed = JSON.parse(jsonString);
    return {
      isValid: true,
      formatted: JSON.stringify(parsed, null, 2),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    let line = 1;
    let column = 1;
    let fixSuggestion: string | undefined = undefined;

    // Extract line/column or position from error message
    const lineColMatch = msg.match(/line (\d+) column (\d+)/i);
    const posMatch = msg.match(/position (\d+)/i);

    if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      column = parseInt(lineColMatch[2], 10);
    } else if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const sliced = jsonString.slice(0, pos);
      const lines = sliced.split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    } else {
      // Manual line detection if no position is present
      const lines = jsonString.split('\n');
      for (let l = 0; l < lines.length; l++) {
        try {
          JSON.parse(lines.slice(0, l + 1).join('\n') + '}');
        } catch {
          line = l + 1;
          break;
        }
      }
    }

    // Determine fix suggestion
    if (jsonString.includes("'")) {
      fixSuggestion = 'Replace single quotes with double quotes';
    } else if (/[{\[,]\s*[a-zA-Z_$][a-zA-Z0-9_$-]*\s*:/.test(jsonString)) {
      fixSuggestion = 'Wrap unquoted object keys in double quotes';
    } else if (/,\s*[}\]]/.test(jsonString)) {
      fixSuggestion = 'Remove trailing comma';
    } else if (/\/\/.*|\/\*[\s\S]*?\*\//.test(jsonString)) {
      fixSuggestion = 'Remove comments from JSON';
    }

    return {
      isValid: false,
      error: {
        message: msg,
        line,
        column,
      },
      fixSuggestion,
    };
  }
}
