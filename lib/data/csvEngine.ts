/**
 * RFC 4180 Compliant CSV Engine, Auto-Delimiter Detection,
 * Cleaning, Deduplication, Column Extraction, and Multi-Column Sorting.
 *
 * 100% Client-Side Pure TypeScript with Exact Positional Diagnostics.
 */

import type {
  CsvCleanerOptions,
  CsvCleanerResult,
  CsvDeduplicatorOptions,
  CsvDeduplicatorResult,
  CsvExtractorOptions,
  CsvExtractorResult,
  ExtractorColumnConfig,
  CsvSorterOptions,
  CsvSorterResult,
  SortCriterion,
  DelimiterDetectionResult,
  CsvParseResult,
  ErrorDiagnostic,
} from './types';

// ============================================================================
// 1. RFC 4180 Tokenizer & Parser with Exact Error Coordinates
// ============================================================================

export interface ParseOptions {
  delimiter?: string;
  relaxQuotes?: boolean;
}

/**
 * Parses RFC 4180 CSV/TSV text into an array of string rows.
 * Tracks 1-indexed line and column coordinates for syntax diagnostics.
 */
export function parseCsv(
  text: string,
  options: string | ParseOptions = ','
): CsvParseResult {
  const delimiter = typeof options === 'string' ? options : options.delimiter || ',';
  const relaxQuotes = typeof options === 'object' ? Boolean(options.relaxQuotes) : false;

  if (!text || text.length === 0) {
    return { rows: [], headers: [], delimiter };
  }

  // Strip leading UTF-8 Byte Order Mark (BOM) if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
    if (text.length === 0) {
      return { rows: [], headers: [], delimiter };
    }
  }

  let line = 1;
  let col = 1;
  let inQuotes = false;
  let quoteStart = { line: 1, column: 1 };
  let field = '';
  let row: string[] = [];
  const rows: string[][] = [];
  let afterQuote = false;

  const len = text.length;
  for (let i = 0; i < len; i++) {
    const char = text[i];
    const nextChar = i + 1 < len ? text[i + 1] : '';

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double-quote: "" -> "
          field += '"';
          i++;
          col += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          afterQuote = true;
          col++;
          continue;
        }
      } else {
        field += char;
        if (char === '\n') {
          line++;
          col = 1;
        } else if (char === '\r') {
          if (nextChar === '\n') {
            field += '\n';
            i++;
          }
          line++;
          col = 1;
        } else {
          col++;
        }
        continue;
      }
    }

    if (afterQuote) {
      if (char === delimiter) {
        row.push(field);
        field = '';
        afterQuote = false;
        col++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        afterQuote = false;
        line++;
        col = 1;
        continue;
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        afterQuote = false;
        line++;
        col = 1;
        continue;
      } else if (char === ' ' || char === '\t') {
        // Tolerable trailing whitespace after closing quote
        col++;
        continue;
      } else {
        if (!relaxQuotes) {
          const err: ErrorDiagnostic = {
            message: `Unexpected character '${char}' after closing quote at line ${line}, column ${col}. Expected delimiter '${delimiter}' or newline.`,
            line,
            column: col,
            snippet: text.slice(Math.max(0, i - 15), Math.min(len, i + 15)),
          };
          return { rows: [], headers: [], delimiter, error: err };
        } else {
          // In relaxed mode, append to field
          field += char;
          afterQuote = false;
          col++;
          continue;
        }
      }
    }

    // Starting a quoted field
    if (char === '"') {
      if (field.length === 0) {
        inQuotes = true;
        quoteStart = { line, column: col };
        col++;
        continue;
      } else {
        if (!relaxQuotes) {
          const err: ErrorDiagnostic = {
            message: `Unescaped double-quote inside unquoted field at line ${line}, column ${col}. Fields containing quotes must be enclosed in double-quotes.`,
            line,
            column: col,
            snippet: text.slice(Math.max(0, i - 15), Math.min(len, i + 15)),
          };
          return { rows: [], headers: [], delimiter, error: err };
        } else {
          field += '"';
          col++;
          continue;
        }
      }
    }

    // Delimiter encountered
    if (char === delimiter) {
      row.push(field);
      field = '';
      col++;
      continue;
    }

    // Carriage return / newline encountered outside quotes
    if (char === '\r') {
      if (nextChar === '\n') {
        i++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      line++;
      col = 1;
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      line++;
      col = 1;
      continue;
    }

    field += char;
    col++;
  }

  if (inQuotes) {
    const err: ErrorDiagnostic = {
      message: `Unclosed double-quote starting at line ${quoteStart.line}, column ${quoteStart.column}.`,
      line: quoteStart.line,
      column: quoteStart.column,
    };
    return { rows: [], headers: [], delimiter, error: err };
  }

  // Push remaining field / row if any
  if (field.length > 0 || row.length > 0 || afterQuote) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.length > 0 ? rows[0] : [];
  return { rows, headers, delimiter };
}

// ============================================================================
// 2. RFC 4180 Serialization
// ============================================================================

/**
 * Serializes rows of string cells into RFC 4180 compliant CSV format.
 */
export function serializeCsv(
  rows: string[][],
  delimiter = ',',
  quoteStyle: 'as-needed' | 'always' | 'none' = 'as-needed'
): string {
  if (!rows || rows.length === 0) return '';

  const formatCell = (val: string | null | undefined): string => {
    const str = val == null ? '' : String(val);
    if (quoteStyle === 'always') {
      return `"${str.replace(/"/g, '""')}"`;
    }
    if (quoteStyle === 'none') {
      return str.split(delimiter).join(' ').replace(/[\r\n]+/g, ' ');
    }
    // 'as-needed'
    if (
      str.includes(delimiter) ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  return rows.map(row => row.map(formatCell).join(delimiter)).join('\n');
}

// ============================================================================
// 3. Statistical Variance Delimiter Auto-Detection
// ============================================================================

/**
 * Detects the most probable delimiter (comma, semicolon, tab, pipe)
 * using quote-aware parsing and variance consistency scoring.
 */
export function detectDelimiter(
  csv: string,
  candidates: string[] = [',', ';', '\t', '|']
): DelimiterDetectionResult {
  if (!csv || !csv.trim()) {
    return { delimiter: ',', confidence: 0, columnsDetected: 0 };
  }

  let bestDelimiter = ',';
  let bestScore = -1;
  let bestColumns = 0;

  for (const delim of candidates) {
    // Parse sample with quote relaxation to avoid crashing on candidate mismatches
    const parsed = parseCsv(csv, { delimiter: delim, relaxQuotes: true });
    const sampleRows = parsed.rows.slice(0, 50).filter(r => r.length > 0 && r.some(c => c.trim() !== ''));
    if (sampleRows.length === 0) continue;

    const counts = sampleRows.map(row => row.length);
    const sum = counts.reduce((acc, c) => acc + c, 0);
    const avg = sum / counts.length;

    // Must yield at least 2 columns on average to be considered a delimiter
    if (avg < 1.5) continue;

    const variance = counts.reduce((acc, c) => acc + Math.pow(c - avg, 2), 0) / counts.length;
    const consistency = 1 / (1 + variance);

    // Standard locale tie-breaking weights
    const weight = delim === ',' ? 1.0 : delim === '\t' ? 0.98 : delim === ';' ? 0.95 : 0.90;
    const score = avg * consistency * weight;

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
      bestColumns = Math.round(avg);
    }
  }

  return {
    delimiter: bestDelimiter,
    confidence: bestScore > 0 ? Math.min(Number((bestScore / 4).toFixed(2)), 1) : 0,
    columnsDetected: bestColumns,
  };
}

// ============================================================================
// 4. CSV Cleaner Engine
// ============================================================================

/**
 * Normalizes delimiters, trims whitespace, removes empty rows,
 * and repairs uneven row lengths.
 */
export function cleanCsv(
  csvContent: string,
  options: CsvCleanerOptions = {}
): CsvCleanerResult {
  const {
    delimiter: rawDelimiter = 'auto',
    outputDelimiter = ',',
    trimWhitespace = true,
    removeBlankRows = true,
    repairUnevenRows = true,
    repairMode = 'pad',
    hasHeaders = true,
    removeDuplicateHeaderNames = true,
  } = options;

  const detected = rawDelimiter === 'auto' || !rawDelimiter
    ? detectDelimiter(csvContent)
    : { delimiter: rawDelimiter, confidence: 1, columnsDetected: 0 };
  const activeDelimiter = detected.delimiter;

  const parsed = parseCsv(csvContent, { delimiter: activeDelimiter });
  if (parsed.error) {
    return {
      output: '',
      rows: [],
      headers: [],
      metrics: {
        originalRowCount: 0,
        cleanedRowCount: 0,
        blankRowsRemoved: 0,
        unevenRowsRepaired: 0,
        fieldsTrimmed: 0,
        detectedDelimiter: activeDelimiter,
        originalSizeBytes: new TextEncoder().encode(csvContent).length,
        cleanedSizeBytes: 0,
      },
      error: parsed.error,
    };
  }

  const originalRows = parsed.rows;
  const originalRowCount = originalRows.length;
  const originalSizeBytes = new TextEncoder().encode(csvContent).length;

  let blankRowsRemoved = 0;
  let unevenRowsRepaired = 0;
  let fieldsTrimmed = 0;

  // Step 1: Remove blank rows and trim whitespace
  const filteredRows: string[][] = [];
  for (let r = 0; r < originalRows.length; r++) {
    let row = originalRows[r];

    const isBlank = row.length === 0 || row.every(cell => (cell ?? '').trim() === '');
    if (removeBlankRows && isBlank) {
      blankRowsRemoved++;
      continue;
    }

    if (trimWhitespace) {
      row = row.map(cell => {
        const val = cell ?? '';
        const trimmed = val.trim();
        if (trimmed !== val) {
          fieldsTrimmed++;
        }
        return trimmed;
      });
    }

    filteredRows.push(row);
  }

  if (filteredRows.length === 0) {
    return {
      output: '',
      rows: [],
      headers: [],
      metrics: {
        originalRowCount,
        cleanedRowCount: 0,
        blankRowsRemoved,
        unevenRowsRepaired,
        fieldsTrimmed,
        detectedDelimiter: activeDelimiter,
        originalSizeBytes,
        cleanedSizeBytes: 0,
      },
    };
  }

  // Step 2: Deduplicate colliding header names if requested
  if (hasHeaders && removeDuplicateHeaderNames && filteredRows.length > 0) {
    const headerRow = filteredRows[0];
    const allocated = new Set<string>();
    const seenCounts = new Map<string, number>();

    for (let c = 0; c < headerRow.length; c++) {
      const original = headerRow[c].trim() || `col_${c + 1}`;
      let candidate = original;
      if (allocated.has(candidate)) {
        let suffix = seenCounts.get(original) || 1;
        while (allocated.has(`${original}_${suffix}`)) {
          suffix++;
        }
        candidate = `${original}_${suffix}`;
        seenCounts.set(original, suffix + 1);
      }
      allocated.add(candidate);
      headerRow[c] = candidate;
    }
  }

  // Step 3: Repair uneven column lengths
  let repairedRows = filteredRows;
  if (repairUnevenRows && filteredRows.length > 0) {
    // Stack-safe calculation of maximum column width
    let maxCols = 0;
    for (let i = 0; i < filteredRows.length; i++) {
      if (filteredRows[i].length > maxCols) {
        maxCols = filteredRows[i].length;
      }
    }

    const targetLength = hasHeaders
      ? filteredRows[0].length
      : maxCols;

    repairedRows = filteredRows.map((row, idx) => {
      if (idx === 0 && hasHeaders) return row;

      if (row.length < targetLength) {
        unevenRowsRepaired++;
        const padded = [...row];
        while (padded.length < targetLength) {
          padded.push('');
        }
        return padded;
      } else if (row.length > targetLength) {
        if (repairMode === 'truncate') {
          unevenRowsRepaired++;
          return row.slice(0, targetLength);
        }
        return row;
      }
      return row;
    });
  }

  const output = serializeCsv(repairedRows, outputDelimiter);
  const cleanedSizeBytes = new TextEncoder().encode(output).length;
  const headers = hasHeaders && repairedRows.length > 0 ? repairedRows[0] : [];

  return {
    output,
    rows: repairedRows,
    headers,
    metrics: {
      originalRowCount,
      cleanedRowCount: repairedRows.length,
      blankRowsRemoved,
      unevenRowsRepaired,
      fieldsTrimmed,
      detectedDelimiter: activeDelimiter,
      originalSizeBytes,
      cleanedSizeBytes,
    },
    error: null,
  };
}

// ============================================================================
// 5. CSV Deduplicator Engine
// ============================================================================

/**
 * Removes duplicate rows with O(N) composite hashing using ASCII Unit Separator (\x1f).
 * Supports full-row and primary-key deduplication with Keep First and Keep Last strategies.
 */
export function deduplicateCsv(
  csvContent: string,
  options: CsvDeduplicatorOptions = {}
): CsvDeduplicatorResult {
  const {
    delimiter: rawDelimiter = 'auto',
    outputDelimiter = ',',
    hasHeaders = true,
    dedupeMode = 'all-columns',
    selectedColumns = [],
    strategy = 'keep-first',
    caseSensitive = false,
    trimBeforeCompare = true,
  } = options;

  const detected = rawDelimiter === 'auto' || !rawDelimiter
    ? detectDelimiter(csvContent)
    : { delimiter: rawDelimiter, confidence: 1, columnsDetected: 0 };
  const activeDelimiter = detected.delimiter;

  const parsed = parseCsv(csvContent, { delimiter: activeDelimiter });
  if (parsed.error) {
    return {
      output: '',
      rows: [],
      headers: [],
      metrics: {
        originalRowCount: 0,
        uniqueRowCount: 0,
        duplicatesRemoved: 0,
        totalDuplicates: 0,
        removedCount: 0,
        duplicatePercentage: 0,
        keyColumnsUsed: [],
      },
      duplicates: [],
      error: parsed.error,
    };
  }

  if (parsed.rows.length === 0) {
    return {
      output: '',
      rows: [],
      headers: [],
      metrics: {
        originalRowCount: 0,
        uniqueRowCount: 0,
        duplicatesRemoved: 0,
        totalDuplicates: 0,
        removedCount: 0,
        duplicatePercentage: 0,
        keyColumnsUsed: [],
      },
      duplicates: [],
    };
  }

  const headers = hasHeaders ? parsed.rows[0] : [];
  const dataRows = hasHeaders ? parsed.rows.slice(1) : parsed.rows;

  // Resolve target column indices to compare
  let targetIndices: number[] | null = null;
  if (dedupeMode === 'selected-columns' && selectedColumns.length > 0) {
    if (headers && headers.length > 0) {
      targetIndices = selectedColumns
        .map(nameOrIdx => {
          const lower = nameOrIdx.trim().toLowerCase();
          const foundIdx = headers.findIndex(h => h.trim().toLowerCase() === lower);
          if (foundIdx >= 0) return foundIdx;
          const parsedNum = parseInt(nameOrIdx, 10);
          return !isNaN(parsedNum) && parsedNum >= 0 && parsedNum < headers.length ? parsedNum : -1;
        })
        .filter(idx => idx >= 0);
    } else {
      targetIndices = selectedColumns
        .map(col => parseInt(col, 10))
        .filter(idx => !isNaN(idx) && idx >= 0);
    }
  }

  // Composite key generator with delimiter collision prevention
  const createKey = (row: string[]): string => {
    const cells = targetIndices && targetIndices.length > 0
      ? targetIndices.map(i => row[i] ?? '')
      : row;
    const normalized: string[] = [];
    for (let i = 0; i < cells.length; i++) {
      let val = trimBeforeCompare ? cells[i].trim() : cells[i];
      if (!caseSensitive) val = val.toLowerCase();
      normalized.push(val);
    }
    return JSON.stringify(normalized);
  };

  const uniqueRows: string[][] = [];
  const duplicateRows: string[][] = [];

  if (strategy === 'keep-first') {
    const seen = new Set<string>();
    for (const row of dataRows) {
      const key = createKey(row);
      if (seen.has(key)) {
        duplicateRows.push(row);
      } else {
        seen.add(key);
        uniqueRows.push(row);
      }
    }
  } else {
    // Keep last: Map composite key to last observed index
    const lastIndexMap = new Map<string, number>();
    for (let i = 0; i < dataRows.length; i++) {
      lastIndexMap.set(createKey(dataRows[i]), i);
    }
    for (let i = 0; i < dataRows.length; i++) {
      const key = createKey(dataRows[i]);
      if (lastIndexMap.get(key) === i) {
        uniqueRows.push(dataRows[i]);
      } else {
        duplicateRows.push(dataRows[i]);
      }
    }
  }

  const finalRows = hasHeaders ? [headers, ...uniqueRows] : uniqueRows;
  const duplicatesRemoved = duplicateRows.length;
  const duplicatePercentage = dataRows.length > 0
    ? Number(((duplicatesRemoved / dataRows.length) * 100).toFixed(2))
    : 0;

  const keyColumnsUsed = targetIndices && targetIndices.length > 0 && headers.length > 0
    ? targetIndices.map(i => headers[i] || `col_${i}`)
    : ['(All Columns)'];

  return {
    output: serializeCsv(finalRows, outputDelimiter),
    rows: finalRows,
    headers,
    metrics: {
      originalRowCount: dataRows.length,
      uniqueRowCount: uniqueRows.length,
      duplicatesRemoved,
      totalDuplicates: duplicatesRemoved,
      removedCount: duplicatesRemoved,
      duplicatePercentage,
      keyColumnsUsed,
    },
    duplicates: duplicateRows,
    error: null,
  };
}

// ============================================================================
// 6. CSV Column Extractor Engine
// ============================================================================

/**
 * Selects, reorders, renames, and filters columns from CSV data.
 */
export function extractColumns(
  csvContent: string | string[][],
  configsOrOptions?: (string | number | ExtractorColumnConfig)[] | CsvExtractorOptions,
  maybeOptions: CsvExtractorOptions = {}
): CsvExtractorResult {
  let configs: (string | number | ExtractorColumnConfig)[] | undefined;
  let options: CsvExtractorOptions = {};

  if (Array.isArray(configsOrOptions)) {
    configs = configsOrOptions;
    options = maybeOptions || {};
  } else if (configsOrOptions && typeof configsOrOptions === 'object') {
    options = configsOrOptions;
    configs = options.columns;
  } else {
    options = maybeOptions || {};
    configs = options.columns;
  }

  const {
    delimiter: rawDelimiter = ',',
    outputDelimiter = ',',
    hasHeaders = true,
  } = options;

  let rows: string[][];
  if (Array.isArray(csvContent)) {
    rows = csvContent;
  } else {
    const activeDelimiter = rawDelimiter === 'auto'
      ? detectDelimiter(csvContent).delimiter
      : (rawDelimiter || ',');
    const parsed = parseCsv(csvContent, { delimiter: activeDelimiter });
    if (parsed.error) {
      return {
        output: '',
        rows: [],
        headers: [],
        columnsExtractedCount: 0,
        totalColumnsCount: 0,
        error: parsed.error,
      };
    }
    rows = parsed.rows;
  }

  if (rows.length === 0) {
    return {
      output: '',
      rows: [],
      headers: [],
      columnsExtractedCount: 0,
      totalColumnsCount: 0,
      error: null,
    };
  }

  const originalHeaders = hasHeaders ? rows[0] : null;
  const dataRows = hasHeaders ? rows.slice(1) : rows;
  const totalColumnsCount = originalHeaders
    ? originalHeaders.length
    : rows.reduce((max, r) => (r.length > max ? r.length : max), 0);

  let resolvedConfigs: ExtractorColumnConfig[] = [];

  if (configs === undefined) {
    // Default: select all original columns
    resolvedConfigs = (originalHeaders || Array.from({ length: totalColumnsCount }, (_, i) => `col_${i + 1}`))
      .map((name, idx) => ({
        originalIndex: idx,
        originalName: name,
        customName: name,
        selected: true,
        sampleValue: dataRows[0]?.[idx] ?? '',
      }));
  } else if (Array.isArray(configs)) {
    if (configs.length > 0 && typeof configs[0] === 'object' && configs[0] !== null && 'originalIndex' in configs[0]) {
      resolvedConfigs = (configs as ExtractorColumnConfig[]).filter(c => c.selected !== false);
    } else {
      resolvedConfigs = configs.map(item => {
        let idx = -1;
        if (typeof item === 'number') {
          idx = item;
        } else if (originalHeaders) {
          const lower = String(item).trim().toLowerCase();
          idx = originalHeaders.findIndex(h => h.trim().toLowerCase() === lower);
        }
        if (idx === -1 && typeof item === 'string') {
          const parsed = parseInt(item, 10);
          if (!isNaN(parsed) && parsed >= 0) idx = parsed;
        }
        const origName = originalHeaders && idx >= 0 ? originalHeaders[idx] : String(item);
        return {
          originalIndex: idx,
          originalName: origName,
          customName: origName,
          selected: idx >= 0,
        };
      }).filter(c => c.selected && c.originalIndex >= 0);
    }
  }

  if (resolvedConfigs.length === 0) {
    return {
      output: '',
      rows: [],
      headers: [],
      columnsExtractedCount: 0,
      totalColumnsCount,
      error: null,
    };
  }

  const newHeaders = resolvedConfigs.map(c => c.customName || c.originalName);
  const extractedDataRows = dataRows.map(row => {
    return resolvedConfigs.map(c => row[c.originalIndex] ?? '');
  });

  const finalRows = hasHeaders ? [newHeaders, ...extractedDataRows] : extractedDataRows;

  return {
    output: serializeCsv(finalRows, outputDelimiter),
    rows: finalRows,
    headers: newHeaders,
    columnsExtractedCount: resolvedConfigs.length,
    totalColumnsCount,
    error: null,
  };
}

// ============================================================================
// 7. CSV Sorter Engine
// ============================================================================

/**
 * Infers column data type (number, date, text) based on non-empty values.
 */
export function inferColumnType(values: string[]): 'number' | 'date' | 'text' {
  const samples = values.filter(v => v != null && v.trim() !== '').slice(0, 50);
  if (samples.length === 0) return 'text';

  let numericCount = 0;
  let dateCount = 0;

  for (const val of samples) {
    // Strip currencies, commas, and percentage
    const cleanNum = val.replace(/[\$,€£¥%]/g, '').replace(/,/g, '').trim();
    if (!isNaN(Number(cleanNum)) && cleanNum !== '') {
      numericCount++;
    } else {
      const parsedTime = Date.parse(val);
      if (!isNaN(parsedTime) && parsedTime > 0) {
        const year = new Date(parsedTime).getFullYear();
        if (year >= 1900 && year <= 2100) {
          dateCount++;
        }
      }
    }
  }

  if (numericCount / samples.length >= 0.75) return 'number';
  if (dateCount / samples.length >= 0.75) return 'date';
  return 'text';
}

function parseCleanNumber(val: string): number {
  const clean = val.replace(/[\$,€£¥%]/g, '').replace(/,/g, '').trim();
  const num = Number(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Multi-column sorting engine supporting numeric, date, and natural text ordering
 * with asc/desc directions and header preservation.
 */
export function sortCsv(
  csvOrRows: string | string[][],
  rulesOrOptions?: SortCriterion[] | CsvSorterOptions,
  maybeOptions: CsvSorterOptions = {}
): CsvSorterResult {
  let rules: SortCriterion[] | undefined;
  let options: CsvSorterOptions = {};

  if (Array.isArray(rulesOrOptions)) {
    rules = rulesOrOptions;
    options = maybeOptions || {};
  } else if (rulesOrOptions && typeof rulesOrOptions === 'object') {
    options = rulesOrOptions;
    rules = options.criteria;
  } else {
    options = maybeOptions || {};
    rules = options.criteria;
  }

  const {
    delimiter = ',',
    outputDelimiter = ',',
    hasHeaders = true,
  } = options;

  let rows: string[][];
  if (Array.isArray(csvOrRows)) {
    rows = csvOrRows;
  } else {
    const activeDelimiter = delimiter === 'auto'
      ? detectDelimiter(csvOrRows).delimiter
      : (delimiter || ',');
    const parsed = parseCsv(csvOrRows, { delimiter: activeDelimiter });
    if (parsed.error) {
      return {
        output: '',
        rows: [],
        headers: [],
        sortedRowCount: 0,
        error: parsed.error,
      };
    }
    rows = parsed.rows;
  }

  if (rows.length === 0) {
    return {
      output: '',
      rows: [],
      headers: [],
      sortedRowCount: 0,
      error: null,
    };
  }

  const headers = hasHeaders ? rows[0] : null;
  const dataRows = hasHeaders ? rows.slice(1) : [...rows];

  if (!rules || rules.length === 0) {
    return {
      output: serializeCsv(rows, outputDelimiter),
      rows,
      headers: headers || [],
      sortedRowCount: dataRows.length,
      error: null,
    };
  }

  const resolvedRules = rules.map((rule, idx) => {
    let colIdx = rule.columnIndex ?? 0;
    if (typeof colIdx !== 'number' || (rule.columnName && headers)) {
      const colName = rule.columnName || String(colIdx);
      const lower = colName.trim().toLowerCase();
      if (headers) {
        const found = headers.findIndex(h => h.trim().toLowerCase() === lower);
        if (found >= 0) colIdx = found;
      }
    }

    const direction: 'asc' | 'desc' = rule.direction === 'desc' ? 'desc' : 'asc';
    const nullsPosition: 'bottom' | 'top' = rule.nullsPosition === 'top' ? 'top' : 'bottom';

    let resolvedType: 'number' | 'date' | 'text' = 'text';
    if (!rule.type || rule.type === 'auto') {
      const colValues = dataRows.map(r => r[colIdx] ?? '');
      resolvedType = inferColumnType(colValues);
    } else {
      resolvedType = rule.type;
    }

    return {
      id: rule.id || `crit_${idx}`,
      columnIndex: Math.max(0, colIdx),
      columnName: rule.columnName || (headers ? headers[colIdx] : `col_${colIdx + 1}`),
      direction,
      type: resolvedType,
      nullsPosition,
    };
  });

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  const sortedData = [...dataRows].sort((rowA, rowB) => {
    for (const rule of resolvedRules) {
      const valA = rowA[rule.columnIndex] ?? '';
      const valB = rowB[rule.columnIndex] ?? '';

      const emptyA = String(valA).trim() === '';
      const emptyB = String(valB).trim() === '';
      if (emptyA && emptyB) continue;
      if (emptyA) return rule.nullsPosition === 'top' ? -1 : 1;
      if (emptyB) return rule.nullsPosition === 'top' ? 1 : -1;

      let cmp = 0;
      if (rule.type === 'number') {
        cmp = parseCleanNumber(String(valA)) - parseCleanNumber(String(valB));
      } else if (rule.type === 'date') {
        const timeA = Date.parse(String(valA)) || 0;
        const timeB = Date.parse(String(valB)) || 0;
        cmp = timeA - timeB;
      } else {
        cmp = collator.compare(String(valA), String(valB));
      }

      if (cmp !== 0) {
        return rule.direction === 'asc' ? cmp : -cmp;
      }
    }
    return 0;
  });

  const finalRows = headers ? [headers, ...sortedData] : sortedData;

  return {
    output: serializeCsv(finalRows, outputDelimiter),
    rows: finalRows,
    headers: headers || [],
    sortedRowCount: sortedData.length,
    error: null,
  };
}
