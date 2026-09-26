/**
 * Developer Tools Shared TypeScript Interfaces & Types
 * Strictly aligned with PROJECT.md Interface Contracts
 */

export interface FormatOptions {
  indentType?: 'spaces' | 'tabs';
  indentSize?: number; // e.g. 2, 4
  quotes?: 'double' | 'single';
  semicolons?: boolean;
  sqlKeywordCase?: 'upper' | 'lower' | 'preserve';
  // Additional optional ergonomic settings
  wrapAttributes?: 'auto' | 'force' | 'never';
  preserveComments?: boolean;
  bracketSpacing?: boolean;
  commaPosition?: 'after' | 'before';
}

export interface FormatResult {
  formatted: string;
  error?: {
    message: string;
    line?: number;
    column?: number;
  };
}

export interface MinifyResult {
  minified: string;
  originalSize: number;
  minifiedSize: number;
  bytesSaved: number;
  reductionPercentage: number;
  error?: {
    message: string;
    line?: number;
    column?: number;
  };
}

export interface MinifyOptions {
  stripComments?: boolean;
  collapseWhitespace?: boolean;
  removeTrailingSemicolons?: boolean;
  optimizeColors?: boolean;
  optimizeZeroUnits?: boolean;
  sortKeys?: boolean;
}

export interface CompressionMetrics {
  originalSize: number;
  minifiedSize: number;
  bytesSaved: number;
  reductionPercentage: number;
}

// ============================================================================
// Transpilers & Data Converters Types (Milestone 2)
// ============================================================================

export interface JsonToCsvOptions {
  delimiter?: string;
  flattenNested?: boolean;
  includeHeaders?: boolean;
  quoteStyle?: 'as-needed' | 'always' | 'none';
}

export interface CsvToJsonOptions {
  delimiter?: string;
  hasHeaders?: boolean;
  parseNumbersAndBooleans?: boolean;
  unflattenNested?: boolean;
}

export interface JsonToXmlOptions {
  rootTag?: string;
  declaration?: boolean;
  indent?: number;
  attributePrefix?: string;
  arrayItemTag?: string;
}

export interface XmlToJsonOptions {
  attributePrefix?: string;
  parseNumbersAndBooleans?: boolean;
  indent?: number;
}

export interface MarkdownToHtmlOptions {
  includeBoilerplate?: boolean;
  title?: string;
  generateHeadingSlugs?: boolean;
}

export interface ConverterResult {
  output: string;
  error?: string;
}

export interface MarkdownResult {
  html: string;
  output: string;
  error?: string;
}

// ============================================================================
// Inspections, Testers & System Utilities Types (Milestone 3)
// ============================================================================

export interface RegexMatch {
  index: number;
  length: number;
  match: string;
  groups?: Record<string, string> | (string | undefined)[];
  captures?: (string | undefined)[];
}

export interface RegexTestResult {
  isValid: boolean;
  matches: RegexMatch[];
  replacement?: string;
  replaced?: string;
  error?: string;
  executionTimeMs?: number;
}

export type JwtState = 'active' | 'expired' | 'not_yet_valid' | 'no_expiry';

export interface JwtHeader {
  alg?: string;
  typ?: string;
  kid?: string;
  [key: string]: unknown;
}

export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface JwtDecodeResult {
  header: JwtHeader | null;
  payload: JwtPayload | null;
  signature: string;
  isExpired: boolean;
  issuedAt?: string;
  expiresAt?: string;
  notBefore?: string;
  state?: JwtState;
  relativeExpiration?: string;
  error?: string;
}

export type DiffChunkType = 'added' | 'removed' | 'unchanged';

export interface DiffChunk {
  type: DiffChunkType;
  value: string;
  lineNumOld?: number;
  lineNumNew?: number;
  originalLineStart?: number;
  originalLineCount?: number;
  modifiedLineStart?: number;
  modifiedLineCount?: number;
}

export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
  additions?: number;
  deletions?: number;
  changes?: number;
  originalLineCount?: number;
  modifiedLineCount?: number;
}

export interface DiffResult {
  chunks: DiffChunk[];
  summary: DiffSummary;
}

export interface DiffOptions {
  mode?: 'lines' | 'words' | 'chars';
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

export interface CronParts {
  minute?: string;
  hour?: string;
  dayOfMonth?: string;
  month?: string;
  dayOfWeek?: string;
}

export interface CronResult {
  expression: string;
  explanation: string;
  nextRuns: string[];
}

export type UuidVersion = 'v4' | 'v1' | 'nanoid';

export interface UuidOptions {
  uppercase?: boolean;
  noHyphens?: boolean;
  length?: number;
}

export interface TimestampResult {
  unixSeconds: number;
  unixMillis: number;
  unixMilliseconds?: number;
  iso: string;
  utc: string;
  local: string;
  relative: string;
  isValid: boolean;
  error?: string;
  dayOfWeek?: string;
  dayOfYear?: number;
  weekNumber?: number;
  isLeapYear?: boolean;
}

export interface HashResult {
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
  md5Base64?: string;
  sha1Base64?: string;
  sha256Base64?: string;
  sha512Base64?: string;
  md5Upper?: string;
  sha1Upper?: string;
  sha256Upper?: string;
  sha512Upper?: string;
}

export interface JsonValidateError {
  message: string;
  line: number;
  column: number;
}

export interface JsonValidateResult {
  isValid: boolean;
  formatted?: string;
  error?: JsonValidateError;
  fixSuggestion?: string;
  appliedFixes?: string[];
}

export interface JsonAutoFixResult {
  fixed: string;
  appliedFixes: string[];
  isValid: boolean;
}

export type CronConfig = CronParts;
export type JsonValidationResult = JsonValidateResult;

