/**
 * Core type definitions for Data Category tools suite in whysogood.app
 */

export interface ErrorDiagnostic {
  line: number;      // 1-indexed
  column: number;    // 1-indexed
  message: string;
  snippet?: string;
}

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  data: string;
  category: string;
}

export interface DelimiterDetectionResult {
  delimiter: string;
  confidence: number;
  columnsDetected: number;
}

export interface CsvParseResult {
  rows: string[][];
  headers: string[];
  delimiter: string;
  error?: ErrorDiagnostic;
}

// -------------------------------------------------------------
// CSV Cleaner Types
// -------------------------------------------------------------
export interface CsvCleanerOptions {
  delimiter?: string;                    // Source delimiter or 'auto' (default: 'auto')
  outputDelimiter?: string;              // Output delimiter (default: ',')
  trimWhitespace?: boolean;              // Trim cell leading/trailing spaces (default: true)
  removeBlankRows?: boolean;             // Remove empty or whitespace-only rows (default: true)
  repairUnevenRows?: boolean;            // Normalize row lengths across dataset (default: true)
  repairMode?: 'pad' | 'truncate';       // 'pad' with empty strings or 'truncate' (default: 'pad')
  normalizeLineBreaks?: boolean;         // Convert CRLF/CR to LF (default: true)
  hasHeaders?: boolean;                  // First row is header row (default: true)
  removeDuplicateHeaderNames?: boolean;  // Deduplicate colliding headers with suffixes (default: true)
}

export interface CsvCleanerMetrics {
  originalRowCount: number;
  cleanedRowCount: number;
  blankRowsRemoved: number;
  unevenRowsRepaired: number;
  fieldsTrimmed: number;
  detectedDelimiter: string;
  originalSizeBytes: number;
  cleanedSizeBytes: number;
}

export interface CsvCleanerResult {
  output: string;
  rows: string[][];
  headers: string[];
  metrics: CsvCleanerMetrics;
  error?: ErrorDiagnostic | null;
}

// -------------------------------------------------------------
// CSV Deduplicator Types
// -------------------------------------------------------------
export interface CsvDeduplicatorOptions {
  delimiter?: string;                    // Source delimiter or 'auto' (default: 'auto')
  outputDelimiter?: string;              // Output delimiter (default: ',')
  hasHeaders?: boolean;                  // First row is header row (default: true)
  dedupeMode?: 'all-columns' | 'selected-columns'; // Comparison scope (default: 'all-columns')
  selectedColumns?: string[];            // Column names or 0-indexed column strings
  strategy?: 'keep-first' | 'keep-last'; // Retention strategy (default: 'keep-first')
  caseSensitive?: boolean;                // Case sensitivity for matching (default: false)
  trimBeforeCompare?: boolean;            // Trim whitespace before hashing (default: true)
}

export interface CsvDeduplicatorMetrics {
  originalRowCount: number;
  uniqueRowCount: number;
  duplicatesRemoved: number;
  totalDuplicates: number;
  removedCount: number;
  duplicatePercentage: number;
  keyColumnsUsed: string[];
}

export interface CsvDeduplicatorResult {
  output: string;
  rows: string[][];
  headers: string[];
  metrics: CsvDeduplicatorMetrics;
  duplicates: string[][];
  error?: ErrorDiagnostic | null;
}

// -------------------------------------------------------------
// CSV Column Extractor Types
// -------------------------------------------------------------
export interface ExtractorColumnConfig {
  originalIndex: number;
  originalName: string;
  customName?: string;
  selected: boolean;
  sampleValue?: string;
}

export interface CsvExtractorOptions {
  delimiter?: string;                    // Source delimiter or 'auto' (default: 'auto')
  outputDelimiter?: string;              // Output delimiter (default: ',')
  hasHeaders?: boolean;                  // First row is header row (default: true)
  columns?: (string | number | ExtractorColumnConfig)[]; // Column indices, names, or configs
}

export interface CsvExtractorResult {
  output: string;
  rows: string[][];
  headers: string[];
  columnsExtractedCount: number;
  totalColumnsCount: number;
  error?: ErrorDiagnostic | null;
}

// -------------------------------------------------------------
// CSV Sorter Types
// -------------------------------------------------------------
export type SortDataType = 'auto' | 'number' | 'date' | 'text';

export interface SortCriterion {
  id?: string;
  columnIndex?: number;
  columnName?: string;
  direction: 'asc' | 'desc';
  type?: SortDataType;
  nullsPosition?: 'bottom' | 'top';
}

export interface CsvSorterOptions {
  delimiter?: string;                    // Source delimiter or 'auto' (default: 'auto')
  outputDelimiter?: string;              // Output delimiter (default: ',')
  hasHeaders?: boolean;                  // First row is header row (default: true)
  criteria?: SortCriterion[];            // Sort hierarchy (primary, secondary, etc.)
}

export interface CsvSorterResult {
  output: string;
  rows: string[][];
  headers: string[];
  sortedRowCount: number;
  error?: ErrorDiagnostic | null;
}

// -------------------------------------------------------------
// YAML ↔ JSON Transpiler Types
// -------------------------------------------------------------
export interface YamlToJsonOptions {
  indent?: number;                       // 2, 4, etc. (0 for minified)
  minify?: boolean;                      // Strips formatting whitespace (default: false)
  multiDocOutput?: 'array' | 'ndjson';   // Output format if multi-document stream
  sortKeys?: boolean;                    // Alphabetical sorting of object keys
}

export interface YamlToJsonResult {
  json: string;
  docCount: number;
  documentsCount: number;
  isMultiDoc: boolean;
  data: unknown;
  error: ErrorDiagnostic | null;
}

export interface JsonToYamlOptions {
  indent?: number;                       // 2 or 4 spaces (default: 2)
  quoteStyle?: 'as-needed' | 'single' | 'double'; // Scalar quotation style
  flowLevel?: number;                    // -1 for block, 0 for flow style (default: -1)
  sortKeys?: boolean;                    // Alphabetical sorting of object keys
  noRefs?: boolean;                      // Suppress YAML aliases/anchors (default: true)
  lineWidth?: number;                    // Line wrapping width (-1 for unlimited, default: -1)
}

export interface JsonToYamlResult {
  yaml: string;
  error: ErrorDiagnostic | null;
}

// -------------------------------------------------------------
// JSON ↔ CSV Data Transpiler Types
// -------------------------------------------------------------
export interface JsonToCsvDataOptions {
  delimiter?: string;                    // Field delimiter (default: ',')
  includeHeaders?: boolean;              // Include header row (default: true)
  flattenObjects?: boolean;              // Dot-notation flattening: user.address.city (default: true)
  flattenDepth?: number;                 // Maximum recursion depth (default: 10)
  arrayFormat?: 'json' | 'join' | 'indexed'; // Serialization mode for array fields (default: 'json')
  arrayJoinDelimiter?: string;           // Separator for 'join' mode (default: '; ')
  quoteStyle?: 'as-needed' | 'always' | 'none'; // Quote enclosing style (default: 'as-needed')
  outputDelimiter?: string;              // Synonym for delimiter
}

export interface JsonToCsvDataResult {
  csv: string;
  rows: string[][];
  headers: string[];
  rowCount: number;
  columnCount: number;
  error: ErrorDiagnostic | null;
}

export interface CsvToJsonDataOptions {
  delimiter?: string;                    // Field delimiter or 'auto' (default: 'auto')
  hasHeaders?: boolean;                  // First row contains column names (default: true)
  unflattenObjects?: boolean;            // Reconstruct nested objects from dot notation (default: true)
  parsePrimitives?: boolean;             // Convert numeric/boolean/null strings (default: true)
  parseJsonValues?: boolean;             // Convert embedded JSON strings in cells (default: true)
}

export interface CsvToJsonDataResult {
  json: string;
  data: unknown[];
  rowCount: number;
  error: ErrorDiagnostic | null;
}
