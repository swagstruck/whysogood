/**
 * Serialization and Format Transpilers Suite:
 * - YAML ↔ JSON Transpiler (multi-doc, anchors, formatting, diagnostics)
 * - JSON ↔ CSV Data Transpiler (dot flattening, unflattening, schema union, RFC 4180)
 *
 * 100% Client-Side Pure TypeScript.
 */

import * as yaml from 'js-yaml';
import { parseCsv, serializeCsv, detectDelimiter } from './csvEngine';
import type {
  YamlToJsonOptions,
  YamlToJsonResult,
  JsonToYamlOptions,
  JsonToYamlResult,
  JsonToCsvDataOptions,
  JsonToCsvDataResult,
  CsvToJsonDataOptions,
  CsvToJsonDataResult,
  ErrorDiagnostic,
} from './types';

// ============================================================================
// Error Helper: JSON Parse Coordinate Extraction
// ============================================================================

export function extractJsonError(err: unknown, text: string): ErrorDiagnostic {
  const msg = err instanceof Error ? err.message : String(err);
  let line = 1;
  let column = 1;
  let snippet: string | undefined;

  // Try matching "at line X column Y"
  const lineColMatch = msg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10);
    column = parseInt(lineColMatch[2], 10);
  } else {
    // Try matching "at position X"
    const posMatch = msg.match(/position\s+(\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const safePos = Math.min(Math.max(0, pos), text.length);
      const lines = text.slice(0, safePos).split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
      snippet = text.slice(Math.max(0, safePos - 20), Math.min(text.length, safePos + 20));
    } else {
      // V8 fallback: match snippet ..."... "... is not valid JSON
      const snippetMatch = msg.match(/\.\.\."([\s\S]*?)"\.\.\./);
      if (snippetMatch) {
        const rawSnippet = snippetMatch[1];
        const idx = text.indexOf(rawSnippet);
        if (idx !== -1) {
          const tokenMatch = msg.match(/Unexpected token '([^']+)'/i);
          const token = tokenMatch ? tokenMatch[1] : '';
          let pos = idx + rawSnippet.length - 1;
          if (token) {
            const tokenIdx = rawSnippet.indexOf(token);
            if (tokenIdx !== -1) {
              pos = idx + tokenIdx;
            }
          }
          const safePos = Math.min(Math.max(0, pos), text.length);
          const lines = text.slice(0, safePos).split('\n');
          line = lines.length;
          column = lines[lines.length - 1].length + 1;
          snippet = text.slice(Math.max(0, safePos - 20), Math.min(text.length, safePos + 20));
        }
      }
    }
  }

  return { line, column, message: msg, snippet };
}

// ============================================================================
// 1. YAML → JSON Transpiler
// ============================================================================

function sortObjectKeys(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map(sortObjectKeys);
  }
  if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(val as Record<string, unknown>).sort()) {
      sorted[key] = sortObjectKeys((val as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return val;
}

/**
 * Transpiles YAML string (including multi-document streams and anchors) to JSON.
 */
export function yamlToJson(
  yamlContent: string,
  options: YamlToJsonOptions = {}
): YamlToJsonResult {
  const {
    indent = 2,
    minify = false,
    multiDocOutput = 'array',
    sortKeys = false,
  } = options;

  if (!yamlContent || !yamlContent.trim()) {
    return {
      json: minify ? 'null' : 'null\n',
      docCount: 0,
      documentsCount: 0,
      isMultiDoc: false,
      data: null,
      error: null,
    };
  }

  try {
    const rawDocs: unknown[] = [];
    yaml.loadAll(yamlContent, (doc: unknown) => {
      if (doc !== undefined) {
        rawDocs.push(doc);
      }
    });

    const documentsCount = rawDocs.length;
    const isMultiDoc = documentsCount > 1;

    let processedData: unknown;
    if (documentsCount === 0) {
      processedData = null;
    } else if (documentsCount === 1) {
      processedData = rawDocs[0];
    } else {
      processedData = rawDocs;
    }

    if (sortKeys) {
      processedData = sortObjectKeys(processedData);
    }

    let jsonOutput = '';
    if (isMultiDoc && multiDocOutput === 'ndjson' && Array.isArray(processedData)) {
      jsonOutput = processedData.map(doc => JSON.stringify(doc)).join('\n');
    } else {
      const space = minify ? 0 : indent;
      jsonOutput = JSON.stringify(processedData, null, space);
    }

    return {
      json: jsonOutput,
      docCount: documentsCount,
      documentsCount,
      isMultiDoc,
      data: processedData,
      error: null,
    };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'mark' in err) {
      const yErr = err as yaml.YAMLException;
      const mark = yErr.mark;
      const line = mark ? mark.line + 1 : 1;
      const column = mark ? mark.column + 1 : 1;
      const snippet = mark ? mark.snippet : undefined;
      const message = yErr.reason || yErr.message.split('\n')[0];

      return {
        json: '',
        docCount: 0,
        documentsCount: 0,
        isMultiDoc: false,
        data: null,
        error: { line, column, message, snippet },
      };
    }

    const message = err instanceof Error ? err.message : String(err);
    return {
      json: '',
      docCount: 0,
      documentsCount: 0,
      isMultiDoc: false,
      data: null,
      error: { line: 1, column: 1, message },
    };
  }
}

// ============================================================================
// 2. JSON → YAML Transpiler
// ============================================================================

/**
 * Converts JSON string or JavaScript object/array to YAML.
 */
export function jsonToYaml(
  jsonContent: string | unknown,
  options: JsonToYamlOptions = {}
): JsonToYamlResult {
  const {
    indent = 2,
    quoteStyle = 'as-needed',
    flowLevel = -1,
    sortKeys = false,
    noRefs = true,
    lineWidth = -1,
  } = options;

  let parsedData: unknown;
  if (typeof jsonContent === 'string') {
    if (!jsonContent.trim()) {
      return { yaml: '', error: null };
    }
    try {
      parsedData = JSON.parse(jsonContent);
    } catch (err) {
      return {
        yaml: '',
        error: extractJsonError(err, jsonContent),
      };
    }
  } else {
    parsedData = jsonContent;
  }

  try {
    const dumpOptions: yaml.DumpOptions = {
      indent,
      flowLevel,
      noRefs,
      lineWidth,
      sortKeys: sortKeys ? (a, b) => a.localeCompare(b) : false,
    };

    if (quoteStyle === 'single') {
      dumpOptions.quotingType = "'";
      dumpOptions.forceQuotes = true;
    } else if (quoteStyle === 'double') {
      dumpOptions.quotingType = '"';
      dumpOptions.forceQuotes = true;
    }

    const dumpedYaml = yaml.dump(parsedData, dumpOptions);
    return { yaml: dumpedYaml, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      yaml: '',
      error: { line: 1, column: 1, message },
    };
  }
}

// ============================================================================
// 3. JSON → CSV Data Transpiler
// ============================================================================

/**
 * Flattens a nested object into dot-notation keys: { user: { name: 'A' } } -> { 'user.name': 'A' }
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  depth = 0,
  maxDepth = 10,
  seen = new WeakSet<object>()
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (typeof obj === 'object' && obj !== null && seen.has(obj)) {
    result[prefix ? prefix.replace(/\.$/, '') : 'val'] = '[Circular]';
    return result;
  }

  if (depth > maxDepth) {
    let serialized: string;
    try {
      serialized = JSON.stringify(obj);
    } catch {
      serialized = '[Circular]';
    }
    result[prefix ? prefix.replace(/\.$/, '') : 'val'] = serialized;
    return result;
  }

  if (typeof obj === 'object' && obj !== null) {
    seen.add(obj);
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      const nested = flattenObject(
        value as Record<string, unknown>,
        fullKey,
        depth + 1,
        maxDepth,
        seen
      );
      Object.assign(result, nested);
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Converts a JSON array of objects to RFC 4180 CSV data,
 * handling heterogeneous schemas, nested dot-flattening, and array serialization.
 */
export function jsonToCsvData(
  jsonContent: string | unknown,
  options: JsonToCsvDataOptions = {}
): JsonToCsvDataResult {
  const {
    delimiter: rawDelimiter = ',',
    outputDelimiter,
    includeHeaders = true,
    flattenDepth = 10,
    arrayFormat = 'json',
    arrayJoinDelimiter = '; ',
    quoteStyle = 'as-needed',
  } = options;

  const delimiter = outputDelimiter || rawDelimiter;

  let parsed: unknown;
  if (typeof jsonContent === 'string') {
    if (!jsonContent.trim()) {
      return {
        csv: '',
        rows: [],
        headers: [],
        rowCount: 0,
        columnCount: 0,
        error: null,
      };
    }
    try {
      parsed = JSON.parse(jsonContent);
    } catch (err) {
      return {
        csv: '',
        rows: [],
        headers: [],
        rowCount: 0,
        columnCount: 0,
        error: extractJsonError(err, jsonContent),
      };
    }
  } else {
    parsed = jsonContent;
  }

  const shouldFlatten = options.flattenObjects !== undefined
    ? options.flattenObjects
    : ((options as Record<string, unknown>).flatten !== undefined
      ? Boolean((options as Record<string, unknown>).flatten)
      : true);

  // Normalize single object or array
  let items: unknown[] = [];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed !== null && typeof parsed === 'object') {
    items = [parsed];
  } else {
    return {
      csv: '',
      rows: [],
      headers: [],
      rowCount: 0,
      columnCount: 0,
      error: {
        line: 1,
        column: 1,
        message: 'JSON input must be an array of objects or a single JSON object.',
      },
    };
  }

  if (items.length === 0) {
    return {
      csv: '',
      rows: [],
      headers: [],
      rowCount: 0,
      columnCount: 0,
      error: null,
    };
  }

  try {
    // Step 1: Preprocess records (flatten objects if requested)
    const processedRecords: Array<Record<string, unknown>> = [];
    const headersSet = new Set<string>();

    for (const item of items) {
      if (item === null || typeof item !== 'object') {
        const rec = { value: item };
        processedRecords.push(rec);
        headersSet.add('value');
        continue;
      }

      const rec = shouldFlatten
        ? flattenObject(item as Record<string, unknown>, '', 0, flattenDepth)
        : (item as Record<string, unknown>);

      for (const key of Object.keys(rec)) {
        headersSet.add(key);
      }
      processedRecords.push(rec);
    }

    const headers = Array.from(headersSet);

    // Step 2: Build matrix
    const dataRows: string[][] = [];

    for (const record of processedRecords) {
      const row: string[] = [];
      for (const header of headers) {
        const val = record[header];

        if (val === undefined || val === null) {
          row.push('');
        } else if (Array.isArray(val)) {
          if (arrayFormat === 'join') {
            row.push(val.map(v => (v == null ? '' : String(v))).join(arrayJoinDelimiter));
          } else {
            // 'json' or default
            try {
              row.push(JSON.stringify(val));
            } catch {
              row.push('[Circular]');
            }
          }
        } else if (typeof val === 'object' && !(val instanceof Date)) {
          try {
            row.push(JSON.stringify(val));
          } catch {
            row.push('[Circular]');
          }
        } else {
          row.push(String(val));
        }
      }
      dataRows.push(row);
    }

    const finalRows = includeHeaders ? [headers, ...dataRows] : dataRows;
    const csv = serializeCsv(finalRows, delimiter, quoteStyle);

    return {
      csv,
      rows: finalRows,
      headers,
      rowCount: dataRows.length,
      columnCount: headers.length,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      csv: '',
      rows: [],
      headers: [],
      rowCount: 0,
      columnCount: 0,
      error: {
        line: 1,
        column: 1,
        message,
      },
    };
  }
}

// ============================================================================
// 4. CSV → JSON Data Transpiler (Bidirectional Integration)
// ============================================================================

/**
 * Reconstructs a nested object from dot notation keys:
 * { 'user.name': 'Alice', 'user.age': 30 } -> { user: { name: 'Alice', age: 30 } }
 */
export function unflattenObject(flatObj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flatObj)) {
    // CWE-1321 Security Guard: Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    if (!key.includes('.')) {
      result[key] = value;
      continue;
    }

    const parts = key.split('.');
    let hasDangerousPart = false;
    for (const part of parts) {
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
        hasDangerousPart = true;
        break;
      }
    }
    if (hasDangerousPart) {
      continue;
    }

    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = value;
      } else {
        if (
          !Object.prototype.hasOwnProperty.call(current, part) ||
          !current[part] ||
          typeof current[part] !== 'object' ||
          Array.isArray(current[part])
        ) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
    }
  }

  return result;
}

/**
 * Coerces string values to primitives (number, boolean, null) or parsed JSON structures.
 */
function coerceValue(
  raw: string,
  parsePrimitives: boolean,
  parseJsonValues: boolean
): unknown {
  if (raw === '') return '';

  const trimmed = raw.trim();

  // Try parsing embedded JSON array or object
  if (
    parseJsonValues &&
    ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Not valid JSON, fall through
    }
  }

  if (parsePrimitives) {
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    if (trimmed.toLowerCase() === 'null') return null;

    // Numeric conversion, but avoid stripping leading zeros for codes/phones like "0123"
    if (!isNaN(Number(trimmed)) && !/^\s*$/.test(trimmed)) {
      if (trimmed.length > 1 && trimmed.startsWith('0') && !trimmed.startsWith('0.')) {
        return trimmed; // Retain leading-zero strings
      }
      return Number(trimmed);
    }
  }

  return raw;
}

/**
 * Converts RFC 4180 CSV data into structured JSON with unflattening and primitive coercion.
 */
export function csvToJsonData(
  csvContent: string,
  options: CsvToJsonDataOptions = {}
): CsvToJsonDataResult {
  const {
    delimiter: rawDelimiter = 'auto',
    hasHeaders = true,
    parsePrimitives = true,
    parseJsonValues = true,
  } = options;

  const shouldUnflatten = options.unflattenObjects !== undefined
    ? options.unflattenObjects
    : ((options as Record<string, unknown>).unflatten !== undefined
      ? Boolean((options as Record<string, unknown>).unflatten)
      : true);

  if (!csvContent || !csvContent.trim()) {
    return { json: '[]', data: [], rowCount: 0, error: null };
  }

  const detected = rawDelimiter === 'auto' || !rawDelimiter
    ? detectDelimiter(csvContent)
    : { delimiter: rawDelimiter, confidence: 1, columnsDetected: 0 };
  const activeDelimiter = detected.delimiter;

  const parsed = parseCsv(csvContent, { delimiter: activeDelimiter });
  if (parsed.error) {
    return {
      json: '[]',
      data: [],
      rowCount: 0,
      error: parsed.error,
    };
  }

  const rows = parsed.rows;
  if (rows.length === 0) {
    return { json: '[]', data: [], rowCount: 0, error: null };
  }

  if (!hasHeaders) {
    // Array of string arrays
    const matrix = rows.map(r =>
      r.map(cell => coerceValue(cell, parsePrimitives, parseJsonValues))
    );
    return {
      json: JSON.stringify(matrix, null, 2),
      data: matrix,
      rowCount: matrix.length,
      error: null,
    };
  }

  const headers = rows[0].map((h, i) => h.trim() || `col_${i + 1}`);
  const dataRows = rows.slice(1);

  const objects: Array<Record<string, unknown>> = [];

  for (const row of dataRows) {
    const flatRecord: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c];
      const cellVal = row[c] ?? '';
      flatRecord[headerName] = coerceValue(cellVal, parsePrimitives, parseJsonValues);
    }

    if (shouldUnflatten) {
      objects.push(unflattenObject(flatRecord));
    } else {
      objects.push(flatRecord);
    }
  }

  return {
    json: JSON.stringify(objects, null, 2),
    data: objects,
    rowCount: objects.length,
    error: null,
  };
}
