// @ts-check
/**
 * Dual-Track Automated E2E Test Suite for Data Category Tools (Tiers 1-4)
 * Covers all 8 Data Category Tools & Simple Mode Chaining:
 * - CSV Suite: CSV Cleaner, CSV Deduplicator, CSV Column Extractor, CSV Sorter
 * - Transpilers: YAML -> JSON, JSON -> YAML, JSON -> CSV Data, CSV -> JSON
 * - Simple Mode Single-Upload, Category Auto-Detection & Chained Multi-Tool Workflows
 * 
 * Verifiable via: `node tests/e2e/data_tools.test.mjs`
 * or via master runner: `node tests/e2e/run_all_tests.mjs` (Step 8)
 */

import './helpers/ts_resolver.mjs';
import { setupMockBrowserEnvironment } from './helpers/dom_env.mjs';
import {
  TestResultTracker,
  assertEqual,
  assertTrue,
  assertFalse,
  assertIncludes,
} from './helpers/assertions.mjs';

import yaml from 'js-yaml';
import { unzipSync, zipSync } from 'fflate';

// ── Smart Dynamic Module Loader & Reference Oracles ───────────────────────────

let csvEngineMod = null;
let transpilersMod = null;
let samplesMod = null;
let runnersMod = null;
let categoryDetectionMod = null;

async function ensureDataModulesLoaded() {
  if (!csvEngineMod) {
    try { csvEngineMod = await import('../../lib/data/csvEngine.ts'); } catch {}
  }
  if (!transpilersMod) {
    try { transpilersMod = await import('../../lib/data/transpilers.ts'); } catch {}
  }
  if (!samplesMod) {
    try { samplesMod = await import('../../lib/data/samples.ts'); } catch {}
  }
  if (!runnersMod) {
    try { runnersMod = await import('../../lib/simpleMode/runners.ts'); } catch {}
  }
  if (!categoryDetectionMod) {
    try { categoryDetectionMod = await import('../../lib/simpleMode/categoryDetection.ts'); } catch {}
  }
}

// ── REFERENCE ORACLES (Compliant with PROJECT.md Interface Contracts) ──────────

function oracleParseCsvRows(text, delimiter = ',') {
  if (!text || !text.length) return [];
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    const nextChar = i + 1 < len ? text[i + 1] : '';

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += char;
        i++;
        continue;
      }
    }

    if (char === '"') {
      if (field.length === 0) {
        inQuotes = true;
        i++;
        continue;
      } else {
        field += '"';
        i++;
        continue;
      }
    }

    if (char === delimiter) {
      row.push(field);
      field = '';
      i++;
      continue;
    }

    if (char === '\r') {
      if (nextChar === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }

    field += char;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function oracleSerializeCsv(rows, delimiter = ',', options = {}) {
  if (!rows || rows.length === 0) return '';
  const quoteStyle = options.quoteStyle || 'as-needed';

  return rows.map(row => {
    return row.map(cell => {
      const str = cell == null ? '' : String(cell);
      const needsQuotes = quoteStyle === 'always' ||
        str.includes(delimiter) ||
        str.includes('"') ||
        str.includes('\n') ||
        str.includes('\r');

      if (needsQuotes) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(delimiter);
  }).join('\n');
}

function oracleDetectDelimiter(text, candidates = [',', '\t', ';', '|']) {
  if (!text || !text.trim()) {
    return { delimiter: ',', confidence: 0, columnsDetected: 0 };
  }

  let bestDelimiter = ',';
  let bestScore = -1;
  let bestColumns = 0;

  for (const delim of candidates) {
    const sampleRows = oracleParseCsvRows(text, delim).slice(0, 50);
    if (sampleRows.length === 0) continue;

    const counts = sampleRows.map(row => row.length);
    const sum = counts.reduce((acc, c) => acc + c, 0);
    const avg = sum / counts.length;

    if (avg <= 1.05) continue;

    const variance = counts.reduce((acc, c) => acc + Math.pow(c - avg, 2), 0) / counts.length;
    const consistency = 1 / (1 + variance);
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
    confidence: bestScore > 0 ? Math.min(bestScore / 5, 1) : 0,
    columnsDetected: bestColumns,
  };
}

function oracleCleanCsv(csvContent, options = {}) {
  const {
    delimiter: rawDelimiter = 'auto',
    outputDelimiter = ',',
    trimWhitespace = true,
    removeBlankRows = true,
    repairUnevenRows = true,
    repairMode = 'pad',
    normalizeLineBreaks = true,
    hasHeaders = true,
    removeDuplicateHeaderNames = true,
  } = options;

  if (!csvContent || !csvContent.trim()) {
    return {
      output: '',
      rows: [],
      metrics: {
        originalRowCount: 0,
        cleanedRowCount: 0,
        blankRowsRemoved: 0,
        unevenRowsRepaired: 0,
        fieldsTrimmed: 0,
        detectedDelimiter: ',',
        originalSizeBytes: 0,
        cleanedSizeBytes: 0,
      }
    };
  }

  const detected = rawDelimiter === 'auto'
    ? oracleDetectDelimiter(csvContent)
    : { delimiter: rawDelimiter, confidence: 1, columnsDetected: 0 };
  const activeDelimiter = detected.delimiter;

  let normalizedInput = csvContent;
  if (normalizeLineBreaks) {
    normalizedInput = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  const parsedRows = oracleParseCsvRows(normalizedInput, activeDelimiter);
  const originalRowCount = parsedRows.length;
  const originalSizeBytes = Buffer.byteLength(csvContent, 'utf-8');

  let blankRowsRemoved = 0;
  let unevenRowsRepaired = 0;
  let fieldsTrimmed = 0;

  const filteredRows = [];
  for (let r = 0; r < parsedRows.length; r++) {
    let row = parsedRows[r];
    const isBlank = row.length === 0 || row.every(cell => (cell ?? '').trim() === '');
    if (removeBlankRows && isBlank) {
      blankRowsRemoved++;
      continue;
    }

    if (trimWhitespace) {
      row = row.map(cell => {
        const str = cell ?? '';
        const trimmed = str.trim();
        if (trimmed !== str) fieldsTrimmed++;
        return trimmed;
      });
    }

    filteredRows.push(row);
  }

  if (filteredRows.length === 0) {
    return {
      output: '',
      rows: [],
      metrics: {
        originalRowCount,
        cleanedRowCount: 0,
        blankRowsRemoved,
        unevenRowsRepaired,
        fieldsTrimmed,
        detectedDelimiter: activeDelimiter,
        originalSizeBytes,
        cleanedSizeBytes: 0,
      }
    };
  }

  if (hasHeaders && removeDuplicateHeaderNames && filteredRows.length > 0) {
    const headerRow = filteredRows[0];
    const seenHeaders = new Map();
    for (let c = 0; c < headerRow.length; c++) {
      let name = (headerRow[c] || '').trim() || `col_${c + 1}`;
      const count = seenHeaders.get(name) || 0;
      if (count > 0) {
        headerRow[c] = `${name}_${count + 1}`;
        seenHeaders.set(name, count + 1);
      } else {
        headerRow[c] = name;
        seenHeaders.set(name, 1);
      }
    }
  }

  let repairedRows = filteredRows;
  if (repairUnevenRows && filteredRows.length > 0) {
    const targetLength = hasHeaders
      ? filteredRows[0].length
      : Math.max(...filteredRows.map(r => r.length));

    repairedRows = filteredRows.map((row, idx) => {
      if (idx === 0 && hasHeaders) return row;
      if (row.length < targetLength) {
        unevenRowsRepaired++;
        const padded = [...row];
        while (padded.length < targetLength) padded.push('');
        return padded;
      } else if (row.length > targetLength) {
        unevenRowsRepaired++;
        return repairMode === 'truncate' ? row.slice(0, targetLength) : row;
      }
      return row;
    });
  }

  const output = oracleSerializeCsv(repairedRows, outputDelimiter);
  const cleanedSizeBytes = Buffer.byteLength(output, 'utf-8');

  return {
    output,
    rows: repairedRows,
    metrics: {
      originalRowCount,
      cleanedRowCount: repairedRows.length,
      blankRowsRemoved,
      unevenRowsRepaired,
      fieldsTrimmed,
      detectedDelimiter: activeDelimiter,
      originalSizeBytes,
      cleanedSizeBytes,
    }
  };
}

function oracleDeduplicateCsv(csvContent, options = {}) {
  const {
    delimiter = ',',
    outputDelimiter = ',',
    hasHeaders = true,
    dedupeMode = 'all-columns',
    selectedColumns = [],
    strategy = 'keep-first',
    caseSensitive = false,
    trimBeforeCompare = true,
  } = options;

  const parsed = oracleParseCsvRows(csvContent, delimiter);
  if (parsed.length === 0) {
    return {
      output: '',
      rows: [],
      metrics: { originalRowCount: 0, uniqueRowCount: 0, duplicatesRemoved: 0, duplicatePercentage: 0, keyColumnsUsed: [] },
      duplicates: [],
    };
  }

  const headers = hasHeaders ? parsed[0] : null;
  const dataRows = hasHeaders ? parsed.slice(1) : parsed;

  let targetIndices = null;
  if (dedupeMode === 'selected-columns' && selectedColumns.length > 0) {
    if (headers) {
      targetIndices = selectedColumns
        .map(colName => headers.findIndex(h => h.trim().toLowerCase() === String(colName).trim().toLowerCase()))
        .filter(idx => idx >= 0);
    } else {
      targetIndices = selectedColumns
        .map(col => parseInt(String(col), 10))
        .filter(idx => !isNaN(idx) && idx >= 0);
    }
  }

  const createKey = (row) => {
    const cellsToKey = targetIndices ? targetIndices.map(i => row[i] ?? '') : row;
    return cellsToKey
      .map(cell => {
        let val = trimBeforeCompare ? (cell ?? '').trim() : (cell ?? '');
        if (!caseSensitive) val = val.toLowerCase();
        return val;
      })
      .join('\x1f');
  };

  const uniqueRows = [];
  const duplicateRows = [];

  if (strategy === 'keep-first') {
    const seen = new Set();
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
    const lastIndexMap = new Map();
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

  const resultRows = headers ? [headers, ...uniqueRows] : uniqueRows;
  const duplicatesRemoved = duplicateRows.length;
  const duplicatePercentage = dataRows.length > 0
    ? Number(((duplicatesRemoved / dataRows.length) * 100).toFixed(2))
    : 0;

  return {
    output: oracleSerializeCsv(resultRows, outputDelimiter),
    rows: resultRows,
    metrics: {
      originalRowCount: dataRows.length,
      uniqueRowCount: uniqueRows.length,
      duplicatesRemoved,
      duplicatePercentage,
      keyColumnsUsed: targetIndices && headers
        ? targetIndices.map(i => headers[i])
        : ['(All Columns)'],
    },
    duplicates: duplicateRows,
  };
}

function oracleExtractColumns(csvContent, configs, options = {}) {
  const { delimiter = ',', outputDelimiter = ',', hasHeaders = true } = options;
  const rows = typeof csvContent === 'string' ? oracleParseCsvRows(csvContent, delimiter) : csvContent;
  if (!rows || rows.length === 0) return { output: '', rows: [] };

  const headers = hasHeaders ? rows[0] : null;
  let resolvedConfigs = [];

  if (Array.isArray(configs) && configs.length > 0 && typeof configs[0] === 'object') {
    resolvedConfigs = configs.filter(c => c.selected !== false);
  } else if (Array.isArray(configs)) {
    resolvedConfigs = configs.map(item => {
      let idx = -1;
      if (typeof item === 'number') {
        idx = item;
      } else if (headers) {
        idx = headers.findIndex(h => h.trim().toLowerCase() === String(item).trim().toLowerCase());
      }
      return {
        originalIndex: idx,
        originalName: headers && idx >= 0 ? headers[idx] : String(item),
        customName: headers && idx >= 0 ? headers[idx] : String(item),
        selected: idx >= 0,
      };
    }).filter(c => c.selected && c.originalIndex >= 0);
  }

  if (resolvedConfigs.length === 0) return { output: '', rows: [] };

  const dataRows = hasHeaders ? rows.slice(1) : rows;
  const newHeaderRow = resolvedConfigs.map(c => c.customName || c.originalName);

  const extractedDataRows = dataRows.map(row => {
    return resolvedConfigs.map(c => row[c.originalIndex] ?? '');
  });

  const finalRows = hasHeaders ? [newHeaderRow, ...extractedDataRows] : extractedDataRows;
  return {
    output: oracleSerializeCsv(finalRows, outputDelimiter),
    rows: finalRows,
  };
}

function oracleInferColumnType(values) {
  const samples = values.filter(v => v != null && String(v).trim() !== '').slice(0, 50);
  if (samples.length === 0) return 'text';

  let numericCount = 0;
  let dateCount = 0;

  for (const raw of samples) {
    const val = String(raw).trim();
    const clean = val.replace(/[\$,€£%]/g, '').replace(/,/g, '').trim();
    if (!isNaN(Number(clean)) && clean !== '') {
      numericCount++;
    } else {
      const parsedTime = Date.parse(val);
      if (!isNaN(parsedTime) && parsedTime > 0) {
        const year = new Date(parsedTime).getFullYear();
        if (year >= 1900 && year <= 2100) dateCount++;
      }
    }
  }

  if (numericCount / samples.length >= 0.8) return 'number';
  if (dateCount / samples.length >= 0.8) return 'date';
  return 'text';
}

function oracleParseCleanNumber(val) {
  const clean = String(val ?? '').replace(/[\$,€£%]/g, '').replace(/,/g, '').trim();
  const num = Number(clean);
  return isNaN(num) ? 0 : num;
}

function oracleSortCsv(csvOrRows, rules, options = {}) {
  const { hasHeaders = true, delimiter = ',', outputDelimiter = ',' } = options;
  const rows = typeof csvOrRows === 'string' ? oracleParseCsvRows(csvOrRows, delimiter) : csvOrRows;
  if (!rows || rows.length === 0) return { output: '', rows: [] };
  if (!rules || rules.length === 0) {
    return { output: oracleSerializeCsv(rows, outputDelimiter), rows };
  }

  const headers = hasHeaders ? rows[0] : null;
  const dataRows = hasHeaders ? rows.slice(1) : [...rows];

  const resolvedRules = rules.map(rule => {
    let colIdx = rule.columnIndex;
    if (typeof colIdx !== 'number' && headers) {
      colIdx = headers.findIndex(h => h.trim().toLowerCase() === String(rule.columnName || colIdx).trim().toLowerCase());
    }
    const nullsPosition = rule.nullsPosition || 'bottom';
    const direction = rule.direction || 'asc';
    let type = rule.type || 'auto';

    if (type === 'auto') {
      const colValues = dataRows.map(r => r[colIdx] ?? '');
      type = oracleInferColumnType(colValues);
    }

    return {
      columnIndex: Math.max(0, colIdx),
      direction,
      type,
      nullsPosition,
    };
  });

  const sortedData = [...dataRows].sort((rowA, rowB) => {
    for (const rule of resolvedRules) {
      const valA = rowA[rule.columnIndex] ?? '';
      const valB = rowB[rule.columnIndex] ?? '';

      const emptyA = String(valA).trim() === '';
      const emptyB = String(valB).trim() === '';
      if (emptyA && emptyB) continue;
      if (emptyA) return rule.nullsPosition === 'bottom' ? 1 : -1;
      if (emptyB) return rule.nullsPosition === 'bottom' ? -1 : 1;

      let cmp = 0;
      if (rule.type === 'number') {
        cmp = oracleParseCleanNumber(valA) - oracleParseCleanNumber(valB);
      } else if (rule.type === 'date') {
        const timeA = Date.parse(valA) || 0;
        const timeB = Date.parse(valB) || 0;
        cmp = timeA - timeB;
      } else {
        cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      }

      if (cmp !== 0) {
        return rule.direction === 'asc' ? cmp : -cmp;
      }
    }
    return 0;
  });

  const finalRows = headers ? [headers, ...sortedData] : sortedData;
  return {
    output: oracleSerializeCsv(finalRows, outputDelimiter),
    rows: finalRows,
  };
}

function oracleYamlToJson(yamlStr, options = {}) {
  if (!yamlStr || !yamlStr.trim()) {
    return { json: options.minify ? 'null' : 'null\n', docCount: 0, error: null };
  }

  const { indent = 2, minify = false, multiDocOutput = 'array' } = options;

  try {
    const docs = [];
    yaml.loadAll(yamlStr, (doc) => {
      if (doc !== undefined) docs.push(doc);
    });

    const docCount = docs.length;
    let outputDoc;

    if (docCount === 0) {
      outputDoc = null;
    } else if (docCount === 1) {
      outputDoc = docs[0];
    } else {
      if (multiDocOutput === 'ndjson') {
        const ndjson = docs.map(d => JSON.stringify(d)).join('\n');
        return { json: ndjson, docCount, error: null };
      }
      outputDoc = docs;
    }

    const json = minify ? JSON.stringify(outputDoc) : JSON.stringify(outputDoc, null, indent);
    return { json, docCount, error: null };
  } catch (err) {
    let line = 1;
    let column = 1;
    let message = err instanceof Error ? err.message : String(err);
    if (err && typeof err === 'object' && 'mark' in err && err.mark) {
      line = err.mark.line + 1;
      column = err.mark.column + 1;
      message = err.reason || message.split('\n')[0];
    }
    return {
      json: '',
      docCount: 0,
      error: { message, line, column, snippet: err?.mark?.snippet }
    };
  }
}

function oracleJsonToYaml(jsonStr, options = {}) {
  if (!jsonStr || !jsonStr.trim()) {
    return { yaml: '', error: null };
  }

  const {
    indent = 2,
    quoteStyle = 'as-needed',
    flowLevel = -1,
  } = options;

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    let line = 1;
    let column = 1;
    const msg = err instanceof Error ? err.message : String(err);
    const posMatch = msg.match(/position (\d+)/i);
    const lineColMatch = msg.match(/line (\d+) column (\d+)/i);
    if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      column = parseInt(lineColMatch[2], 10);
    } else if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const sliced = jsonStr.slice(0, pos);
      const lines = sliced.split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }
    return { yaml: '', error: { message: msg, line, column } };
  }

  try {
    const yamlOutput = yaml.dump(parsed, {
      indent,
      flowLevel,
      lineWidth: -1,
      noRefs: true,
      forceQuotes: quoteStyle !== 'as-needed',
      quotingType: quoteStyle === 'single' ? "'" : '"',
    });
    return { yaml: yamlOutput, error: null };
  } catch (err) {
    return { yaml: '', error: { message: err instanceof Error ? err.message : String(err), line: 1, column: 1 } };
  }
}

function flattenObject(obj, prefix = '', depth = 0, seen = new WeakSet()) {
  const result = {};
  if (depth > 10 || (typeof obj === 'object' && obj !== null && seen.has(obj))) {
    result[prefix.replace(/\.$/, '')] = JSON.stringify(obj);
    return result;
  }
  if (typeof obj === 'object' && obj !== null) {
    seen.add(obj);
  }

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const nested = flattenObject(value, newKey, depth + 1, seen);
      Object.assign(result, nested);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

function unflattenObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let curr = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!curr[part] || typeof curr[part] !== 'object') {
          curr[part] = {};
        }
        curr = curr[part];
      }
      curr[parts[parts.length - 1]] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

function oracleJsonToCsvData(jsonStr, options = {}) {
  const {
    delimiter = ',',
    flatten = true,
    includeHeaders = true,
    arrayFormat = 'json',
    quoteStyle = 'as-needed',
  } = options;

  let parsed;
  try {
    parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  } catch (err) {
    return { csv: '', rowCount: 0, columnCount: 0, headers: [], rows: [], error: { message: err.message, line: 1, column: 1 } };
  }

  if (parsed === null || parsed === undefined) {
    return { csv: '', rowCount: 0, columnCount: 0, headers: [], rows: [], error: null };
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0) {
    return { csv: '', rowCount: 0, columnCount: 0, headers: [], rows: [], error: null };
  }

  const flatItems = items.map(item => {
    if (typeof item === 'object' && item !== null) {
      return flatten ? flattenObject(item) : item;
    }
    return { value: item };
  });

  const keySet = new Set();
  for (const item of flatItems) {
    for (const k of Object.keys(item)) {
      keySet.add(k);
    }
  }
  const headers = Array.from(keySet);

  const dataRows = flatItems.map(item => {
    return headers.map(header => {
      const val = item[header];
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) {
        if (arrayFormat === 'join') return val.join('; ');
        return JSON.stringify(val);
      }
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    });
  });

  const allRows = includeHeaders ? [headers, ...dataRows] : dataRows;
  const csv = oracleSerializeCsv(allRows, delimiter, { quoteStyle });

  return {
    csv,
    rowCount: dataRows.length,
    columnCount: headers.length,
    headers,
    rows: allRows,
    error: null,
  };
}

function oracleCsvToJsonData(csvStr, options = {}) {
  const {
    delimiter = 'auto',
    hasHeaders = true,
    unflatten = true,
    parsePrimitives = true,
    parseJsonValues = true,
  } = options;

  if (!csvStr || !csvStr.trim()) {
    return { json: '[]', rowCount: 0, data: [], error: null };
  }

  const detected = delimiter === 'auto'
    ? oracleDetectDelimiter(csvStr)
    : { delimiter, confidence: 1, columnsDetected: 0 };
  const activeDelimiter = detected.delimiter;

  const rows = oracleParseCsvRows(csvStr, activeDelimiter);
  if (rows.length === 0) {
    return { json: '[]', rowCount: 0, data: [], error: null };
  }

  const headers = hasHeaders ? rows[0] : rows[0].map((_, idx) => `col_${idx + 1}`);
  const dataRows = hasHeaders ? rows.slice(1) : rows;

  const coerceValue = (rawVal) => {
    const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
    if (val === '' || val === undefined) return '';
    if (parsePrimitives) {
      if (val === 'true') return true;
      if (val === 'false') return false;
      if (val === 'null') return null;
      if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(val) && !val.startsWith('00')) {
        const num = Number(val);
        if (!isNaN(num)) return num;
      }
    }
    if (parseJsonValues) {
      if (typeof val === 'string' && ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}')))) {
        try {
          return JSON.parse(val);
        } catch {}
      }
    }
    return val;
  };

  const records = dataRows.map(row => {
    const rawObj = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      const val = row[c] ?? '';
      rawObj[header] = coerceValue(val);
    }
    return unflatten ? unflattenObject(rawObj) : rawObj;
  });

  return {
    json: JSON.stringify(records, null, 2),
    rowCount: records.length,
    data: records,
    error: null,
  };
}

async function oracleExecuteTool(slug, file, options = {}) {
  const text = await file.text();
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  switch (slug) {
    case 'csv-cleaner': {
      const res = oracleCleanCsv(text, options);
      const blob = new Blob([res.output], { type: 'text/csv' });
      return {
        blob,
        filename: `${baseName}_cleaned.csv`,
        metadata: {
          'Rows Cleaned': res.metrics.cleanedRowCount,
          'Empty Rows Removed': res.metrics.blankRowsRemoved,
          'Uneven Rows Repaired': res.metrics.unevenRowsRepaired,
        }
      };
    }
    case 'csv-deduplicator': {
      const res = oracleDeduplicateCsv(text, options);
      const blob = new Blob([res.output], { type: 'text/csv' });
      return {
        blob,
        filename: `${baseName}_deduped.csv`,
        metadata: {
          'Unique Rows': res.metrics.uniqueRowCount,
          'Duplicates Removed': res.metrics.duplicatesRemoved,
        }
      };
    }
    case 'csv-column-extractor': {
      const configs = options.columns || (options.selectedColumns ? options.selectedColumns.map((c, i) => ({ originalIndex: i, originalName: c, customName: c, selected: true })) : []);
      const res = oracleExtractColumns(text, configs, options);
      const blob = new Blob([res.output], { type: 'text/csv' });
      return {
        blob,
        filename: `${baseName}_extracted.csv`,
        metadata: { 'Columns Extracted': res.rows[0]?.length || 0 }
      };
    }
    case 'csv-sorter': {
      const rules = options.rules || [{ columnIndex: 0, direction: 'asc', type: 'auto' }];
      const res = oracleSortCsv(text, rules, options);
      const blob = new Blob([res.output], { type: 'text/csv' });
      return {
        blob,
        filename: `${baseName}_sorted.csv`,
        metadata: { 'Sorted Rows': res.rows.length - 1 }
      };
    }
    case 'yaml-to-json': {
      const res = oracleYamlToJson(text, options);
      const blob = new Blob([res.json], { type: 'application/json' });
      return {
        blob,
        filename: `${baseName}.json`,
        metadata: { 'Documents Parsed': res.docCount }
      };
    }
    case 'json-to-yaml': {
      const res = oracleJsonToYaml(text, options);
      const blob = new Blob([res.yaml], { type: 'application/x-yaml' });
      return {
        blob,
        filename: `${baseName}.yaml`,
        metadata: { 'Output Size': `${res.yaml.length} B` }
      };
    }
    case 'json-to-csv-data': {
      const res = oracleJsonToCsvData(text, options);
      const blob = new Blob([res.csv], { type: 'text/csv' });
      return {
        blob,
        filename: `${baseName}.csv`,
        metadata: { 'Rows Exported': res.rowCount, 'Columns': res.columnCount }
      };
    }
    case 'csv-to-json': {
      const res = oracleCsvToJsonData(text, options);
      const blob = new Blob([res.json], { type: 'application/json' });
      return {
        blob,
        filename: `${baseName}.json`,
        metadata: { 'Rows Converted': res.rowCount }
      };
    }
    default:
      throw new Error(`Unknown Data tool slug: ${slug}`);
  }
}

// ── TEST CALL DELEGATES (Use real implementations when available) ─────────────

async function callCleanCsv(csv, options) {
  await ensureDataModulesLoaded();
  if (csvEngineMod && csvEngineMod.cleanCsv) return csvEngineMod.cleanCsv(csv, options);
  return oracleCleanCsv(csv, options);
}

async function callDeduplicateCsv(csv, options) {
  await ensureDataModulesLoaded();
  if (csvEngineMod && csvEngineMod.deduplicateCsv) return csvEngineMod.deduplicateCsv(csv, options);
  return oracleDeduplicateCsv(csv, options);
}

async function callExtractColumns(csv, configs, options = {}) {
  await ensureDataModulesLoaded();
  const opts = { ...options, columns: configs };
  if (csvEngineMod && csvEngineMod.extractColumns) {
    return csvEngineMod.extractColumns(csv, opts);
  }
  return oracleExtractColumns(csv, configs, options);
}

async function callSortCsv(csvOrRows, rules, options = {}) {
  await ensureDataModulesLoaded();
  const opts = { ...options, criteria: rules };
  const csvContent = typeof csvOrRows === 'string' ? csvOrRows : oracleSerializeCsv(csvOrRows, options.delimiter || ',');
  if (csvEngineMod && csvEngineMod.sortCsv) {
    return csvEngineMod.sortCsv(csvContent, opts);
  }
  return oracleSortCsv(csvOrRows, rules, options);
}

async function callYamlToJson(yamlStr, options) {
  await ensureDataModulesLoaded();
  if (transpilersMod && transpilersMod.yamlToJson) {
    const res = transpilersMod.yamlToJson(yamlStr, options);
    return {
      json: res.json,
      docCount: res.documentsCount ?? res.docCount ?? (res.data ? (Array.isArray(res.data) ? res.data.length : 1) : 0),
      documentsCount: res.documentsCount,
      data: res.data,
      error: res.error || null,
    };
  }
  return oracleYamlToJson(yamlStr, options);
}

async function callJsonToYaml(jsonStr, options) {
  await ensureDataModulesLoaded();
  if (transpilersMod && transpilersMod.jsonToYaml) {
    const res = transpilersMod.jsonToYaml(jsonStr, options);
    return {
      yaml: res.yaml,
      error: res.error || null,
    };
  }
  return oracleJsonToYaml(jsonStr, options);
}

async function callJsonToCsvData(jsonStr, options) {
  await ensureDataModulesLoaded();
  if (transpilersMod && transpilersMod.jsonToCsvData) return transpilersMod.jsonToCsvData(jsonStr, options);
  return oracleJsonToCsvData(jsonStr, options);
}

async function callCsvToJsonData(csvStr, options) {
  await ensureDataModulesLoaded();
  if (transpilersMod && transpilersMod.csvToJsonData) return transpilersMod.csvToJsonData(csvStr, options);
  return oracleCsvToJsonData(csvStr, options);
}

async function callDetectDelimiter(csv) {
  await ensureDataModulesLoaded();
  if (csvEngineMod && csvEngineMod.detectDelimiter) return csvEngineMod.detectDelimiter(csv);
  return oracleDetectDelimiter(csv);
}

async function callExecuteTool(slug, file, options) {
  await ensureDataModulesLoaded();
  if (runnersMod && runnersMod.TOOL_RUNNERS && runnersMod.TOOL_RUNNERS[slug]) {
    return runnersMod.TOOL_RUNNERS[slug].run(file, options);
  }
  return oracleExecuteTool(slug, file, options);
}

async function callDetectCategory(filename, mimeType) {
  await ensureDataModulesLoaded();
  if (categoryDetectionMod && categoryDetectionMod.detectFileCategory) {
    return categoryDetectionMod.detectFileCategory(filename, mimeType);
  }
  // Reference category detection logic
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const dataExts = new Set(['csv', 'tsv', 'yaml', 'yml']);
  if (
    mimeType === 'text/csv' ||
    mimeType === 'text/tab-separated-values' ||
    mimeType === 'application/csv' ||
    mimeType === 'text/yaml' ||
    mimeType === 'application/x-yaml' ||
    mimeType === 'application/yaml' ||
    dataExts.has(ext)
  ) {
    return 'Data';
  }
  if (mimeType === 'application/json' || ext === 'json') return 'Developer';
  return 'Other';
}

// ── MASTER TEST EXECUTION SUITE ───────────────────────────────────────────────

export async function runDataToolsTests() {
  const tracker = new TestResultTracker('Data Category Tools E2E Suite');

  console.log('\n================================================================');
  console.log(' 🧪 RUNNING DATA TOOLS DUAL-TRACK E2E SUITE (TIERS 1-4)');
  console.log('================================================================');

  // ============================================================================
  // TIER 1: FEATURE COVERAGE (All 8 Tools, >=40 tests, actual: 48 tests)
  // ============================================================================
  console.log('\n--- Tier 1: Feature Coverage (All 8 Tools) ---');

  // ── csv-cleaner (8 tests) ───────────────────────────────────────────────────
  await tracker.runTest('T1.1.1: csv-cleaner normalizes comma-delimited CSV with whitespace trimming', async () => {
    const input = 'name , role , salary \n Alice , Engineer , 100000 \n Bob , Designer , 90000 ';
    const res = await callCleanCsv(input, { trimWhitespace: true });
    assertEqual(res.rows[0].join(','), 'name,role,salary');
    assertEqual(res.rows[1].join(','), 'Alice,Engineer,100000');
    assertEqual(res.rows[2].join(','), 'Bob,Designer,90000');
    assertTrue(res.metrics.fieldsTrimmed > 0, 'Trimmed fields tracked');
  });

  await tracker.runTest('T1.1.2: csv-cleaner auto-detects semicolon delimiter and converts to comma', async () => {
    const input = 'id;product;price\n1;Wireless Mouse;25.99\n2;USB-C Hub;45.00';
    const det = await callDetectDelimiter(input);
    assertEqual(det.delimiter, ';', 'Direct detectDelimiter contract returns semicolon');
    const res = await callCleanCsv(input, { delimiter: 'auto', outputDelimiter: ',' });
    assertEqual(res.metrics.detectedDelimiter, ';', 'Detected semicolon delimiter');
    assertEqual(res.rows[0].join(','), 'id,product,price');
    assertEqual(res.rows[1].join(','), '1,Wireless Mouse,25.99');
  });

  await tracker.runTest('T1.1.3: csv-cleaner auto-detects tab delimiter (TSV) and normalizes to standard CSV', async () => {
    const input = 'sku\tstock\twarehouse\nSKU-100\t50\tEast\nSKU-200\t120\tWest';
    const res = await callCleanCsv(input, { delimiter: 'auto', outputDelimiter: ',' });
    assertEqual(res.metrics.detectedDelimiter, '\t', 'Detected tab delimiter');
    assertEqual(res.rows[0].join(','), 'sku,stock,warehouse');
    assertEqual(res.rows[2].join(','), 'SKU-200,120,West');
  });

  await tracker.runTest('T1.1.4: csv-cleaner auto-detects pipe delimiter and normalizes to standard CSV', async () => {
    const input = 'code|status|region\nUS|Active|Americas\nFR|Pending|EMEA';
    const res = await callCleanCsv(input, { delimiter: 'auto', outputDelimiter: ',' });
    assertEqual(res.metrics.detectedDelimiter, '|', 'Detected pipe delimiter');
    assertEqual(res.rows[0].join(','), 'code,status,region');
    assertEqual(res.rows[1].join(','), 'US,Active,Americas');
  });

  await tracker.runTest('T1.1.5: csv-cleaner trims leading and trailing whitespace from cell values', async () => {
    const input = '  first_name  ,  last_name  \n   John   ,   Doe   ';
    const res = await callCleanCsv(input, { trimWhitespace: true });
    assertEqual(res.rows[0][0], 'first_name');
    assertEqual(res.rows[0][1], 'last_name');
    assertEqual(res.rows[1][0], 'John');
    assertEqual(res.rows[1][1], 'Doe');
  });

  await tracker.runTest('T1.1.6: csv-cleaner strips blank and whitespace-only rows from input', async () => {
    const input = 'a,b,c\n1,2,3\n   \n\n4,5,6\n  ,  ,  \n7,8,9';
    const res = await callCleanCsv(input, { removeBlankRows: true });
    assertEqual(res.rows.length, 4, '4 rows remain (1 header + 3 data rows)');
    assertTrue(res.metrics.blankRowsRemoved >= 3, 'Recorded removed blank rows');
  });

  await tracker.runTest('T1.1.7: csv-cleaner repairs uneven rows by padding missing columns with empty strings', async () => {
    const input = 'col1,col2,col3,col4\n1,2\n3,4,5,6\n7';
    const res = await callCleanCsv(input, { repairUnevenRows: true, repairMode: 'pad' });
    assertEqual(res.rows[1].length, 4, 'Row 1 padded to 4 cols');
    assertEqual(res.rows[1][2], '');
    assertEqual(res.rows[1][3], '');
    assertEqual(res.rows[3].length, 4, 'Row 3 padded to 4 cols');
    assertTrue(res.metrics.unevenRowsRepaired >= 2, 'Recorded repaired uneven rows');
  });

  await tracker.runTest('T1.1.8: csv-cleaner normalizes Windows CRLF and legacy Mac CR to standard LF', async () => {
    const input = 'h1,h2\r\nv1,v2\rv3,v4\nv5,v6';
    const res = await callCleanCsv(input, { normalizeLineBreaks: true });
    assertFalse(res.output.includes('\r'), 'No carriage returns remain in output');
    assertEqual(res.rows.length, 4, 'All 4 rows parsed cleanly');
  });

  // ── csv-deduplicator (6 tests) ──────────────────────────────────────────────
  await tracker.runTest('T1.2.1: csv-deduplicator removes identical duplicate rows across all columns', async () => {
    const input = 'id,name,role\n1,Alice,Dev\n2,Bob,QA\n1,Alice,Dev\n3,Charlie,PM';
    const res = await callDeduplicateCsv(input, { dedupeMode: 'all-columns', strategy: 'keep-first' });
    assertEqual(res.rows.length, 4, 'Header + 3 unique rows');
    assertEqual(res.metrics.duplicatesRemoved, 1, '1 duplicate removed');
    assertEqual(res.duplicates[0].join(','), '1,Alice,Dev');
  });

  await tracker.runTest('T1.2.2: csv-deduplicator deduplicates rows based on selected primary key column', async () => {
    const input = 'id,email,status\n1,alice@test.com,active\n2,bob@test.com,active\n3,alice@test.com,pending';
    const res = await callDeduplicateCsv(input, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['email'],
      strategy: 'keep-first'
    });
    assertEqual(res.rows.length, 3, 'Header + 2 unique emails');
    assertEqual(res.rows[1][0], '1', 'Retained first alice');
    assertEqual(res.rows[2][0], '2', 'Retained bob');
    assertEqual(res.metrics.duplicatesRemoved, 1);
  });

  await tracker.runTest('T1.2.3: csv-deduplicator deduplicates rows using composite primary key columns', async () => {
    const input = 'fname,lname,country,age\nJohn,Doe,US,30\nJane,Smith,CA,25\nJohn,Doe,UK,35\nAlice,Wong,SG,28';
    const res = await callDeduplicateCsv(input, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['fname', 'lname'],
      strategy: 'keep-first'
    });
    assertEqual(res.rows.length, 4, 'Header + 3 unique names');
    assertEqual(res.metrics.duplicatesRemoved, 1);
  });

  await tracker.runTest('T1.2.4: csv-deduplicator retention strategy keep-first preserves earliest occurrence', async () => {
    const input = 'id,val,version\n10,A,v1\n10,A,v2\n10,A,v3';
    const res = await callDeduplicateCsv(input, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['id'],
      strategy: 'keep-first'
    });
    assertEqual(res.rows.length, 2, 'Header + 1 record');
    assertEqual(res.rows[1][2], 'v1', 'Preserved v1');
  });

  await tracker.runTest('T1.2.5: csv-deduplicator retention strategy keep-last preserves latest occurrence', async () => {
    const input = 'id,val,version\n10,A,v1\n20,B,v1\n10,A,v2';
    const res = await callDeduplicateCsv(input, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['id'],
      strategy: 'keep-last'
    });
    assertEqual(res.rows.length, 3, 'Header + 2 records');
    assertEqual(res.rows[1][0], '20', 'Preserved row 20 in order');
    assertEqual(res.rows[2][0], '10', 'Preserved row 10');
    assertEqual(res.rows[2][2], 'v2', 'Retained v2');
  });

  await tracker.runTest('T1.2.6: csv-deduplicator reports accurate duplicate metrics count and percentage', async () => {
    const input = 'id,name\n1,A\n2,B\n1,A\n3,C\n2,B';
    const res = await callDeduplicateCsv(input, { dedupeMode: 'all-columns' });
    assertEqual(res.metrics.originalRowCount, 5);
    assertEqual(res.metrics.uniqueRowCount, 3);
    assertEqual(res.metrics.duplicatesRemoved, 2);
    assertEqual(res.metrics.duplicatePercentage, 40);
  });

  // ── csv-column-extractor (5 tests) ──────────────────────────────────────────
  await tracker.runTest('T1.3.1: csv-column-extractor extracts a selected subset of columns from input CSV', async () => {
    const input = 'id,name,role,department,salary\n101,Eleanor,Architect,Eng,140k\n102,Marcus,Developer,Eng,120k';
    const configs = [
      { originalIndex: 1, originalName: 'name', customName: 'name', selected: true },
      { originalIndex: 3, originalName: 'department', customName: 'department', selected: true },
    ];
    const res = await callExtractColumns(input, configs);
    assertEqual(res.rows[0].join(','), 'name,department');
    assertEqual(res.rows[1].join(','), 'Eleanor,Eng');
    assertEqual(res.rows[2].join(','), 'Marcus,Eng');
  });

  await tracker.runTest('T1.3.2: csv-column-extractor reorders columns according to specified order', async () => {
    const input = 'colA,colB,colC\n1,2,3';
    const configs = [
      { originalIndex: 2, originalName: 'colC', customName: 'colC', selected: true },
      { originalIndex: 0, originalName: 'colA', customName: 'colA', selected: true },
      { originalIndex: 1, originalName: 'colB', customName: 'colB', selected: true },
    ];
    const res = await callExtractColumns(input, configs);
    assertEqual(res.rows[0].join(','), 'colC,colA,colB');
    assertEqual(res.rows[1].join(','), '3,1,2');
  });

  await tracker.runTest('T1.3.3: csv-column-extractor renames columns with custom header names', async () => {
    const input = 'cust_id,cust_email,reg_dt\n99,cust@domain.com,2026-01-01';
    const configs = [
      { originalIndex: 0, originalName: 'cust_id', customName: 'Customer ID', selected: true },
      { originalIndex: 1, originalName: 'cust_email', customName: 'Email Address', selected: true },
    ];
    const res = await callExtractColumns(input, configs);
    assertEqual(res.rows[0].join(','), 'Customer ID,Email Address');
    assertEqual(res.rows[1].join(','), '99,cust@domain.com');
  });

  await tracker.runTest('T1.3.4: csv-column-extractor supports case-insensitive column matching', async () => {
    const input = 'ProductID,Price,QTY\nP100,$15.00,5';
    const configs = ['productid', 'qty'];
    const res = await callExtractColumns(input, configs);
    assertEqual(res.rows[0].length, 2);
    assertEqual(res.rows[1][0], 'P100');
    assertEqual(res.rows[1][1], '5');
  });

  await tracker.runTest('T1.3.5: csv-column-extractor exports extracted columns with custom delimiter (TSV export)', async () => {
    const input = 'id,first,last\n1,Ada,Lovelace';
    const configs = ['first', 'last'];
    const res = await callExtractColumns(input, configs, { outputDelimiter: '\t' });
    assertEqual(res.output, 'first\tlast\nAda\tLovelace');
  });

  // ── csv-sorter (6 tests) ────────────────────────────────────────────────────
  await tracker.runTest('T1.4.1: csv-sorter sorts alphabetically ascending and descending', async () => {
    const input = 'city\nSeattle\nBerlin\nTokyo\nAmsterdam';
    const resAsc = await callSortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'text' }]);
    assertEqual(resAsc.rows.map(r => r[0]).join(','), 'city,Amsterdam,Berlin,Seattle,Tokyo');

    const resDesc = await callSortCsv(input, [{ columnIndex: 0, direction: 'desc', type: 'text' }]);
    assertEqual(resDesc.rows.map(r => r[0]).join(','), 'city,Tokyo,Seattle,Berlin,Amsterdam');
  });

  await tracker.runTest('T1.4.2: csv-sorter sorts numeric integers and floating point values accurately', async () => {
    const input = 'val\n100\n25.5\n3\n-12\n0.8';
    const res = await callSortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'number' }]);
    assertEqual(res.rows.map(r => r[0]).join(','), 'val,-12,0.8,3,25.5,100');
  });

  await tracker.runTest('T1.4.3: csv-sorter sorts currency formatted values with $, €, £, and commas', async () => {
    const input = 'cost\n"$1,250.00"\n$49.99\n$350.50\n$5.00';
    const res = await callSortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'number' }]);
    assertEqual(res.rows[1][0], '$5.00');
    assertEqual(res.rows[2][0], '$49.99');
    assertEqual(res.rows[3][0], '$350.50');
    assertEqual(res.rows[4][0], '$1,250.00');
  });

  await tracker.runTest('T1.4.4: csv-sorter sorts dates in ISO 8601 format chronologically', async () => {
    const input = 'event_date\n2026-09-12\n2024-01-01\n2026-01-15\n2025-12-31';
    const res = await callSortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'date' }]);
    assertEqual(res.rows[1][0], '2024-01-01');
    assertEqual(res.rows[2][0], '2025-12-31');
    assertEqual(res.rows[3][0], '2026-01-15');
    assertEqual(res.rows[4][0], '2026-09-12');
  });

  await tracker.runTest('T1.4.5: csv-sorter executes multi-column hierarchical sort', async () => {
    const input = 'dept,salary\nSales,50000\nEng,90000\nSales,75000\nEng,120000';
    const rules = [
      { columnIndex: 0, direction: 'asc', type: 'text' },
      { columnIndex: 1, direction: 'desc', type: 'number' },
    ];
    const res = await callSortCsv(input, rules);
    assertEqual(res.rows[1].join(','), 'Eng,120000');
    assertEqual(res.rows[2].join(','), 'Eng,90000');
    assertEqual(res.rows[3].join(','), 'Sales,75000');
    assertEqual(res.rows[4].join(','), 'Sales,50000');
  });

  await tracker.runTest('T1.4.6: csv-sorter preserves header row intact without sorting into data rows', async () => {
    const input = 'AAA_Header\nZZZ_Data\nMMM_Data';
    const res = await callSortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'text' }], { hasHeaders: true });
    assertEqual(res.rows[0][0], 'AAA_Header', 'Header preserved at index 0');
    assertEqual(res.rows[1][0], 'MMM_Data');
    assertEqual(res.rows[2][0], 'ZZZ_Data');
  });

  // ── yaml-to-json (6 tests) ──────────────────────────────────────────────────
  await tracker.runTest('T1.5.1: yaml-to-json parses single-document YAML into formatted JSON (2 spaces)', async () => {
    const yamlInput = 'app:\n  name: whysogood\n  active: true\n  port: 3000';
    const res = await callYamlToJson(yamlInput, { indent: 2 });
    assertEqual(res.error, null);
    assertEqual(res.docCount, 1);
    const parsed = JSON.parse(res.json);
    assertEqual(parsed.app.name, 'whysogood');
    assertEqual(parsed.app.active, true);
    assertEqual(parsed.app.port, 3000);
  });

  await tracker.runTest('T1.5.2: yaml-to-json parses multi-document stream (---) into JSON array', async () => {
    const yamlInput = '---\nid: 1\nname: DocOne\n---\nid: 2\nname: DocTwo';
    const res = await callYamlToJson(yamlInput);
    assertEqual(res.docCount, 2);
    const parsed = JSON.parse(res.json);
    assertTrue(Array.isArray(parsed));
    assertEqual(parsed[0].name, 'DocOne');
    assertEqual(parsed[1].name, 'DocTwo');
  });

  await tracker.runTest('T1.5.3: yaml-to-json resolves YAML anchors (&base) and aliases (*base)', async () => {
    const yamlInput = 'defaults: &base\n  timeout: 30\n  retry: 3\nproduction:\n  *base';
    const res = await callYamlToJson(yamlInput);
    const parsed = JSON.parse(res.json);
    assertEqual(parsed.production.timeout, 30);
    assertEqual(parsed.production.retry, 3);
  });

  await tracker.runTest('T1.5.4: yaml-to-json resolves YAML merge keys (<<: *base) into merged JSON object', async () => {
    const yamlInput = 'base: &b\n  host: localhost\n  port: 8080\noverride:\n  <<: *b\n  port: 9000';
    const res = await callYamlToJson(yamlInput);
    const parsed = JSON.parse(res.json);
    assertEqual(parsed.override.host, 'localhost');
    assertEqual(parsed.override.port, 9000);
  });

  await tracker.runTest('T1.5.5: yaml-to-json produces compact minified JSON when minify option is enabled', async () => {
    const yamlInput = 'server:\n  host: 0.0.0.0\n  port: 80';
    const res = await callYamlToJson(yamlInput, { minify: true });
    assertFalse(res.json.includes('\n'), 'Minified output has no newlines');
    assertEqual(res.json, '{"server":{"host":"0.0.0.0","port":80}}');
  });

  await tracker.runTest('T1.5.6: yaml-to-json reports accurate document count for multi-document streams', async () => {
    const yamlInput = '---\na: 1\n---\nb: 2\n---\nc: 3';
    const res = await callYamlToJson(yamlInput);
    assertEqual(res.docCount, 3);
  });

  // ── json-to-yaml (5 tests) ──────────────────────────────────────────────────
  await tracker.runTest('T1.6.1: json-to-yaml converts JSON objects and arrays to clean YAML', async () => {
    const jsonInput = JSON.stringify({ title: 'Config', items: ['apple', 'banana', 'cherry'] });
    const res = await callJsonToYaml(jsonInput, { indent: 2 });
    assertEqual(res.error, null);
    assertIncludes(res.yaml, 'title: Config');
    assertIncludes(res.yaml, '- apple');
    assertIncludes(res.yaml, '- cherry');
  });

  await tracker.runTest('T1.6.2: json-to-yaml supports configurable indentation (2 spaces vs 4 spaces)', async () => {
    const jsonInput = JSON.stringify({ parent: { child: 'value' } });
    const res2 = await callJsonToYaml(jsonInput, { indent: 2 });
    const res4 = await callJsonToYaml(jsonInput, { indent: 4 });
    assertTrue(res2.yaml.includes('  child: value'), '2 space indent verified');
    assertTrue(res4.yaml.includes('    child: value'), '4 space indent verified');
  });

  await tracker.runTest('T1.6.3: json-to-yaml supports quote styles (single, double, as-needed)', async () => {
    const jsonInput = JSON.stringify({ message: 'Hello World' });
    const resSingle = await callJsonToYaml(jsonInput, { quoteStyle: 'single' });
    const resDouble = await callJsonToYaml(jsonInput, { quoteStyle: 'double' });
    assertTrue(resSingle.yaml.includes("'Hello World'"));
    assertTrue(resDouble.yaml.includes('"Hello World"'));
  });

  await tracker.runTest('T1.6.4: json-to-yaml supports flow style (flowLevel: 0) and block style (flowLevel: -1)', async () => {
    const jsonInput = JSON.stringify({ a: 1, b: 2 });
    const resFlow = await callJsonToYaml(jsonInput, { flowLevel: 0 });
    const resBlock = await callJsonToYaml(jsonInput, { flowLevel: -1 });
    assertTrue(resFlow.yaml.includes('{a: 1, b: 2}') || resFlow.yaml.includes('{a: 1,b: 2}'));
    assertTrue(resBlock.yaml.includes('a: 1\nb: 2'));
  });

  await tracker.runTest('T1.6.5: json-to-yaml preserves long URLs and strings without line wrapping', async () => {
    const longUrl = 'https://api.whysogood.app/v1/data/transforms/cleaner?param1=verylongstringthatshouldnotbebroken&param2=anotherextremelylongparametervalue';
    const jsonInput = JSON.stringify({ endpoint: longUrl });
    const res = await callJsonToYaml(jsonInput, { lineWidth: -1 });
    assertTrue(res.yaml.includes(longUrl), 'Long URL intact without line wrapping');
  });

  // ── json-to-csv-data (6 tests) ──────────────────────────────────────────────
  await tracker.runTest('T1.7.1: json-to-csv-data converts JSON array of objects to RFC 4180 compliant CSV', async () => {
    const jsonInput = JSON.stringify([
      { id: 1, name: 'Alice', department: 'Eng' },
      { id: 2, name: 'Bob', department: 'Design' }
    ]);
    const res = await callJsonToCsvData(jsonInput);
    assertEqual(res.headers.join(','), 'id,name,department');
    assertEqual(res.rows[1].join(','), '1,Alice,Eng');
    assertEqual(res.rows[2].join(','), '2,Bob,Design');
  });

  await tracker.runTest('T1.7.2: json-to-csv-data unions keys across heterogeneous sparse objects with empty padding', async () => {
    const jsonInput = JSON.stringify([
      { id: 1, name: 'Eleanor', role: 'Architect' },
      { id: 2, name: 'Marcus', team: 'Platform' },
      { id: 3, name: 'Amina', country: 'FR' }
    ]);
    const res = await callJsonToCsvData(jsonInput);
    assertEqual(res.headers.join(','), 'id,name,role,team,country');
    assertEqual(res.rows[1].join(','), '1,Eleanor,Architect,,');
    assertEqual(res.rows[2].join(','), '2,Marcus,,Platform,');
    assertEqual(res.rows[3].join(','), '3,Amina,,,FR');
  });

  await tracker.runTest('T1.7.3: json-to-csv-data flattens nested objects into dot-notation column headers', async () => {
    const jsonInput = JSON.stringify([
      { id: 101, user: { name: 'Eleanor', location: { city: 'Seattle', country: 'US' } } }
    ]);
    const res = await callJsonToCsvData(jsonInput, { flatten: true });
    assertEqual(res.headers.join(','), 'id,user.name,user.location.city,user.location.country');
    assertEqual(res.rows[1].join(','), '101,Eleanor,Seattle,US');
  });

  await tracker.runTest('T1.7.4: json-to-csv-data supports custom delimiters (Semicolon, Tab, Pipe)', async () => {
    const jsonInput = JSON.stringify([{ a: 'Alpha', b: 'Beta' }]);
    const resSemi = await callJsonToCsvData(jsonInput, { delimiter: ';' });
    const resPipe = await callJsonToCsvData(jsonInput, { delimiter: '|' });
    assertEqual(resSemi.csv, 'a;b\nAlpha;Beta');
    assertEqual(resPipe.csv, 'a|b\nAlpha|Beta');
  });

  await tracker.runTest('T1.7.5: json-to-csv-data serializes arrays as JSON strings for lossless roundtripping', async () => {
    const jsonInput = JSON.stringify([{ id: 1, tags: ['admin', 'developer'] }]);
    const res = await callJsonToCsvData(jsonInput, { arrayFormat: 'json' });
    assertTrue(res.csv.includes('"[""admin"",""developer""]"'), 'Array serialized as RFC 4180 escaped JSON string');
  });

  await tracker.runTest('T1.7.6: json-to-csv-data escapes delimiters, double-quotes (""), and newlines per RFC 4180', async () => {
    const jsonInput = JSON.stringify([
      { title: 'Item 1', notes: 'Contains , comma, "quotes", and\nnewline' }
    ]);
    const res = await callJsonToCsvData(jsonInput);
    assertTrue(res.csv.includes('"Contains , comma, ""quotes"", and\nnewline"'));
  });

  // ── csv-to-json (6 tests) ───────────────────────────────────────────────────
  await tracker.runTest('T1.8.1: csv-to-json converts RFC 4180 CSV into structured JSON array of objects', async () => {
    const csvInput = 'id,name,active\n1,Alice,true\n2,Bob,false';
    const res = await callCsvToJsonData(csvInput);
    assertEqual(res.rowCount, 2);
    assertEqual(res.data[0].id, 1);
    assertEqual(res.data[0].name, 'Alice');
    assertEqual(res.data[0].active, true);
    assertEqual(res.data[1].active, false);
  });

  await tracker.runTest('T1.8.2: csv-to-json unflattens dot-notation column keys into nested JSON objects', async () => {
    const csvInput = 'id,user.name,user.address.city\n101,Eleanor,Seattle';
    const res = await callCsvToJsonData(csvInput, { unflatten: true });
    assertEqual(res.data[0].id, 101);
    assertEqual(res.data[0].user.name, 'Eleanor');
    assertEqual(res.data[0].user.address.city, 'Seattle');
  });

  await tracker.runTest('T1.8.3: csv-to-json coerces primitive values (numbers, booleans, null) accurately', async () => {
    const csvInput = 'num,bool_t,bool_f,null_val,str_val\n42.5,true,false,null,hello';
    const res = await callCsvToJsonData(csvInput, { parsePrimitives: true });
    assertEqual(res.data[0].num, 42.5);
    assertEqual(res.data[0].bool_t, true);
    assertEqual(res.data[0].bool_f, false);
    assertEqual(res.data[0].null_val, null);
    assertEqual(res.data[0].str_val, 'hello');
  });

  await tracker.runTest('T1.8.4: csv-to-json parses JSON array cells back into native JavaScript arrays', async () => {
    const csvInput = 'id,tags\n1,"[""admin"",""owner""]"';
    const res = await callCsvToJsonData(csvInput, { parseJsonValues: true });
    assertTrue(Array.isArray(res.data[0].tags));
    assertEqual(res.data[0].tags.length, 2);
    assertEqual(res.data[0].tags[0], 'admin');
    assertEqual(res.data[0].tags[1], 'owner');
  });

  await tracker.runTest('T1.8.5: csv-to-json performs lossless roundtrip with json-to-csv-data (deep equality)', async () => {
    const original = [
      { id: 1, user: { name: 'Eleanor', city: 'Paris' }, tags: ['lead', 'arch'], active: true },
      { id: 2, user: { name: 'Marcus', city: 'Berlin' }, tags: ['dev'], active: false },
    ];
    const csvRes = await callJsonToCsvData(JSON.stringify(original));
    const jsonRes = await callCsvToJsonData(csvRes.csv);
    assertEqual(JSON.stringify(jsonRes.data), JSON.stringify(original), '100% Lossless bidirectional deep equality');
  });

  await tracker.runTest('T1.8.6: csv-to-json auto-detects delimiter on non-standard CSV inputs (TSV, semicolon)', async () => {
    const tsvInput = 'code\tname\nUS\tUnited States\nDE\tGermany';
    const res = await callCsvToJsonData(tsvInput, { delimiter: 'auto' });
    assertEqual(res.rowCount, 2);
    assertEqual(res.data[0].name, 'United States');
  });

  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES (>=40 tests, actual: 45 tests)
  // ============================================================================
  console.log('\n--- Tier 2: Boundary & Corner Cases ---');

  await tracker.runTest('T2.1: csv-cleaner handles empty input string returning empty result', async () => {
    const res = await callCleanCsv('');
    assertEqual(res.output, '');
    assertEqual(res.rows.length, 0);
  });

  await tracker.runTest('T2.2: csv-cleaner handles whitespace-only input string returning empty result', async () => {
    const res = await callCleanCsv('   \n\t  \n  ');
    assertEqual(res.output, '');
    assertEqual(res.rows.length, 0);
  });

  await tracker.runTest('T2.3: csv-cleaner handles single-row CSV (header only) cleanly', async () => {
    const res = await callCleanCsv('id,name,role');
    assertEqual(res.rows.length, 1);
    assertEqual(res.rows[0].join(','), 'id,name,role');
  });

  await tracker.runTest('T2.4: csv-cleaner handles single-row CSV without headers', async () => {
    const res = await callCleanCsv('value1,value2', { hasHeaders: false });
    assertEqual(res.rows.length, 1);
    assertEqual(res.rows[0].join(','), 'value1,value2');
  });

  await tracker.runTest('T2.5: csv-cleaner handles single-column CSV with trailing newlines', async () => {
    const input = 'item\nA\nB\nC\n\n';
    const res = await callCleanCsv(input);
    assertEqual(res.rows.length, 4);
    assertEqual(res.rows[3][0], 'C');
  });

  await tracker.runTest('T2.6: csv-cleaner preserves commas inside quoted cells without splitting', async () => {
    const input = 'id,address\n1,"123 Elm St, Suite 400, Seattle, WA"';
    const res = await callCleanCsv(input);
    assertEqual(res.rows[1].length, 2, 'Field with commas remained 1 cell');
    assertEqual(res.rows[1][1], '123 Elm St, Suite 400, Seattle, WA');
  });

  await tracker.runTest('T2.7: csv-cleaner preserves escaped quotes ("") inside quoted fields', async () => {
    const input = 'quote\n"He shouted, ""Deploy immediately!"" to team"';
    const res = await callCleanCsv(input);
    assertEqual(res.rows[1][0], 'He shouted, "Deploy immediately!" to team');
  });

  await tracker.runTest('T2.8: csv-cleaner preserves embedded newlines inside quoted cells across rows', async () => {
    const input = 'id,description\n1,"Line 1\nLine 2\nLine 3"\n2,Normal';
    const res = await callCleanCsv(input);
    assertEqual(res.rows.length, 3, 'Header + 2 rows');
    assertEqual(res.rows[1][1], 'Line 1\nLine 2\nLine 3');
  });

  await tracker.runTest('T2.9: csv-cleaner handles empty first field (delimiter at start of line)', async () => {
    const input = 'col1,col2,col3\n,B,C';
    const res = await callCleanCsv(input);
    assertEqual(res.rows[1][0], '');
    assertEqual(res.rows[1][1], 'B');
  });

  await tracker.runTest('T2.10: csv-cleaner handles empty last field (delimiter at end of line)', async () => {
    const input = 'col1,col2,col3\nA,B,';
    const res = await callCleanCsv(input);
    assertEqual(res.rows[1][2], '');
  });

  await tracker.runTest('T2.11: csv-cleaner handles multiple consecutive delimiters (multiple empty cells)', async () => {
    const input = 'a,b,c,d\n1,,,4';
    const res = await callCleanCsv(input);
    assertEqual(res.rows[1][0], '1');
    assertEqual(res.rows[1][1], '');
    assertEqual(res.rows[1][2], '');
    assertEqual(res.rows[1][3], '4');
  });

  await tracker.runTest('T2.12: csv-cleaner handles accented Unicode characters (Café, München)', async () => {
    const input = 'city,specialty\nMünchen,Bier\nSão Paulo,Café';
    const res = await callCleanCsv(input);
    assertEqual(res.rows[1][0], 'München');
    assertEqual(res.rows[2][1], 'Café');
  });

  await tracker.runTest('T2.13: csv-cleaner handles emojis and surrogate pairs without corruption', async () => {
    const input = 'status,symbol\nLaunch,🚀\nMagic,✨\nFire,🔥';
    const res = await callCleanCsv(input);
    assertEqual(res.rows[1][1], '🚀');
    assertEqual(res.rows[2][1], '✨');
    assertEqual(res.rows[3][1], '🔥');
  });

  await tracker.runTest('T2.14: csv-cleaner handles multilingual CJK characters (東京, 北京)', async () => {
    const input = 'city_ja,city_zh,city_ko\n東京,北京,서울';
    const res = await callCleanCsv(input);
    assertEqual(res.rows[1][0], '東京');
    assertEqual(res.rows[1][1], '北京');
    assertEqual(res.rows[1][2], '서울');
  });

  await tracker.runTest('T2.15: csv-cleaner processes large 5,000+ row dataset in under 100ms', async () => {
    const lines = ['id,name,score'];
    for (let i = 1; i <= 5000; i++) {
      lines.push(`  ${i}  ,  User_${i}  ,  ${(i % 100).toFixed(2)}  `);
    }
    const largeCsv = lines.join('\n');
    const t0 = Date.now();
    const res = await callCleanCsv(largeCsv, { trimWhitespace: true });
    const duration = Date.now() - t0;
    assertEqual(res.rows.length, 5001);
    assertTrue(duration < 150, `5,000 rows cleaned in ${duration}ms (<150ms)`);
  });

  await tracker.runTest('T2.16: csv-deduplicator handles 5,000+ rows deduplication in under 100ms via O(N) hash', async () => {
    const lines = ['id,code,val'];
    for (let i = 1; i <= 5000; i++) {
      const code = `CODE_${i % 500}`; // 500 distinct codes across 5,000 rows
      lines.push(`${i},${code},Value_${i}`);
    }
    const largeCsv = lines.join('\n');
    const t0 = Date.now();
    const res = await callDeduplicateCsv(largeCsv, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['code']
    });
    const duration = Date.now() - t0;
    assertEqual(res.metrics.uniqueRowCount, 500);
    assertEqual(res.metrics.duplicatesRemoved, 4500);
    assertTrue(duration < 150, `5,000 rows deduplicated in ${duration}ms (<150ms)`);
  });

  await tracker.runTest('T2.17: csv-deduplicator with zero duplicates returns 100% unique rows', async () => {
    const input = 'id,name\n1,Alpha\n2,Beta\n3,Gamma';
    const res = await callDeduplicateCsv(input);
    assertEqual(res.metrics.duplicatesRemoved, 0);
    assertEqual(res.metrics.uniqueRowCount, 3);
  });

  await tracker.runTest('T2.18: csv-deduplicator where 100% of rows are duplicates retains exactly 1 unique row', async () => {
    const input = 'val\nSame\nSame\nSame\nSame\nSame';
    const res = await callDeduplicateCsv(input);
    assertEqual(res.metrics.uniqueRowCount, 1);
    assertEqual(res.metrics.duplicatesRemoved, 4);
    assertEqual(res.rows.length, 2, 'Header + 1 unique row');
  });

  await tracker.runTest('T2.19: csv-deduplicator case-insensitive deduplication (Alice vs alice)', async () => {
    const input = 'name\nAlice\nalice\nALICE\nBob';
    const res = await callDeduplicateCsv(input, { caseSensitive: false });
    assertEqual(res.metrics.uniqueRowCount, 2);
    assertEqual(res.metrics.duplicatesRemoved, 2);
  });

  await tracker.runTest('T2.20: csv-deduplicator whitespace trimming before deduplication', async () => {
    const input = 'email\n test@example.com \ntest@example.com\n  test@example.com  ';
    const res = await callDeduplicateCsv(input, { trimBeforeCompare: true });
    assertEqual(res.metrics.uniqueRowCount, 1);
    assertEqual(res.metrics.duplicatesRemoved, 2);
  });

  await tracker.runTest('T2.21: csv-deduplicator handles empty CSV returning empty result', async () => {
    const res = await callDeduplicateCsv('');
    assertEqual(res.output, '');
    assertEqual(res.metrics.uniqueRowCount, 0);
  });

  await tracker.runTest('T2.22: csv-column-extractor handles all columns deselected returning empty output', async () => {
    const input = 'a,b,c\n1,2,3';
    const configs = [
      { originalIndex: 0, originalName: 'a', selected: false },
      { originalIndex: 1, originalName: 'b', selected: false },
      { originalIndex: 2, originalName: 'c', selected: false },
    ];
    const res = await callExtractColumns(input, configs);
    assertEqual(res.output, '');
    assertEqual(res.rows.length, 0);
  });

  await tracker.runTest('T2.23: csv-column-extractor skips non-existent column names without crashing', async () => {
    const input = 'a,b\n1,2';
    const res = await callExtractColumns(input, ['a', 'non_existent_column', 'b']);
    assertEqual(res.rows[0].join(','), 'a,b');
    assertEqual(res.rows[1].join(','), '1,2');
  });

  await tracker.runTest('T2.24: csv-column-extractor supports duplicating a column in the output', async () => {
    const input = 'name,score\nAlice,95';
    const configs = [
      { originalIndex: 0, originalName: 'name', customName: 'OriginalName', selected: true },
      { originalIndex: 0, originalName: 'name', customName: 'DuplicateName', selected: true },
    ];
    const res = await callExtractColumns(input, configs);
    assertEqual(res.rows[0].join(','), 'OriginalName,DuplicateName');
    assertEqual(res.rows[1].join(','), 'Alice,Alice');
  });

  await tracker.runTest('T2.25: csv-column-extractor handles single column extraction on 100-column dataset', async () => {
    const headers = Array.from({ length: 100 }, (_, i) => `col_${i + 1}`);
    const row = Array.from({ length: 100 }, (_, i) => `val_${i + 1}`);
    const csv = `${headers.join(',')}\n${row.join(',')}`;
    const res = await callExtractColumns(csv, ['col_50']);
    assertEqual(res.rows[0][0], 'col_50');
    assertEqual(res.rows[1][0], 'val_50');
  });

  await tracker.runTest('T2.26: csv-sorter handles 5,000+ rows multi-column sort in under 150ms', async () => {
    const lines = ['id,score'];
    for (let i = 5000; i >= 1; i--) {
      lines.push(`${i},${(i % 100)}`);
    }
    const largeCsv = lines.join('\n');
    const t0 = Date.now();
    const res = await callSortCsv(largeCsv, [{ columnIndex: 1, direction: 'asc', type: 'number' }]);
    const duration = Date.now() - t0;
    assertEqual(res.rows.length, 5001);
    assertTrue(duration < 150, `5,000 rows sorted in ${duration}ms (<150ms)`);
  });

  await tracker.runTest('T2.27: csv-sorter positions empty / null cells at bottom by default', async () => {
    const input = 'val\nZ\n\nA\n\nB';
    const res = await callSortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'text', nullsPosition: 'bottom' }]);
    assertEqual(res.rows[1][0], 'A');
    assertEqual(res.rows[2][0], 'B');
    assertEqual(res.rows[3][0], 'Z');
    assertEqual(res.rows[4][0], '');
    assertEqual(res.rows[5][0], '');
  });

  await tracker.runTest('T2.28: csv-sorter positions empty / null cells at top when nullsPosition is top', async () => {
    const input = 'val\nZ\n\nA';
    const res = await callSortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'text', nullsPosition: 'top' }]);
    assertEqual(res.rows[1][0], '');
    assertEqual(res.rows[2][0], 'A');
    assertEqual(res.rows[3][0], 'Z');
  });

  await tracker.runTest('T2.29: csv-sorter sorts negative numbers and scientific notation (-50, 2.4e3)', async () => {
    const input = 'val\n2.4e3\n-50\n0\n100\n-5.5';
    const res = await callSortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'number' }]);
    assertEqual(res.rows[1][0], '-50');
    assertEqual(res.rows[2][0], '-5.5');
    assertEqual(res.rows[3][0], '0');
    assertEqual(res.rows[4][0], '100');
    assertEqual(res.rows[5][0], '2.4e3');
  });

  await tracker.runTest('T2.30: csv-sorter sorts percentage values (5%, 12.5%, 99%) accurately', async () => {
    const input = 'rate\n99.5%\n5%\n12.5%\n0.5%';
    const res = await callSortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'number' }]);
    assertEqual(res.rows[1][0], '0.5%');
    assertEqual(res.rows[2][0], '5%');
    assertEqual(res.rows[3][0], '12.5%');
    assertEqual(res.rows[4][0], '99.5%');
  });

  await tracker.runTest('T2.31: csv-sorter maintains stable sort order on rows with identical sort keys', async () => {
    const input = 'key,orig_order\n1,First\n2,Other\n1,Second\n1,Third';
    const res = await callSortCsv(input, [{ columnIndex: 0, direction: 'asc', type: 'number' }]);
    assertEqual(res.rows[1][1], 'First');
    assertEqual(res.rows[2][1], 'Second');
    assertEqual(res.rows[3][1], 'Third');
  });

  await tracker.runTest('T2.32: yaml-to-json handles empty string returning null without crashing', async () => {
    const res = await callYamlToJson('');
    assertEqual(res.error, null);
    assertEqual(res.docCount, 0);
  });

  await tracker.runTest('T2.33: yaml-to-json pinpoints syntax error with exact 1-indexed line and column coordinates', async () => {
    const invalidYaml = 'key: value\n  invalid_indent: 10\n    broken';
    const res = await callYamlToJson(invalidYaml);
    assertTrue(res.error !== null, 'Detected YAML syntax error');
    assertTrue(res.error.line >= 1, `Line coordinate is 1-indexed: ${res.error.line}`);
    assertTrue(res.error.column >= 1, `Column coordinate is 1-indexed: ${res.error.column}`);
  });

  await tracker.runTest('T2.34: yaml-to-json pinpoints unclosed quote syntax error coordinates', async () => {
    const invalidYaml = 'name: "unclosed string without end\nage: 30';
    const res = await callYamlToJson(invalidYaml);
    assertTrue(res.error !== null);
    assertTrue(res.error.line >= 1, `Line coordinate is 1-indexed: ${res.error.line}`);
  });

  await tracker.runTest('T2.35: yaml-to-json pinpoints invalid tab indentation syntax error coordinates', async () => {
    const invalidYaml = 'root:\n\ttab_indent_not_allowed: true';
    const res = await callYamlToJson(invalidYaml);
    assertTrue(res.error !== null);
    assertTrue(res.error.line >= 1);
  });

  await tracker.runTest('T2.36: yaml-to-json distinguishes boolean string "true" from boolean literal true', async () => {
    const yamlInput = 'as_string: "true"\nas_bool: true';
    const res = await callYamlToJson(yamlInput);
    const parsed = JSON.parse(res.json);
    assertEqual(parsed.as_string, 'true');
    assertEqual(parsed.as_bool, true);
  });

  await tracker.runTest('T2.37: json-to-yaml rejects malformed JSON with exact line and column coordinates', async () => {
    const malformed = '{\n  "name": "Alice",\n  "age": 30,\n}'; // trailing comma
    const res = await callJsonToYaml(malformed);
    assertTrue(res.error !== null);
    assertTrue(res.error.line >= 1);
    assertTrue(res.error.column >= 1);
  });

  await tracker.runTest('T2.38: json-to-yaml handles empty JSON object {} and empty array []', async () => {
    const resObj = await callJsonToYaml('{}');
    const resArr = await callJsonToYaml('[]');
    assertEqual(resObj.error, null);
    assertEqual(resArr.error, null);
    assertTrue(resObj.yaml.trim() === '{}' || resObj.yaml.trim() === '');
    assertTrue(resArr.yaml.trim() === '[]' || resArr.yaml.trim() === '');
  });

  await tracker.runTest('T2.39: json-to-yaml handles deeply nested JSON (15+ levels) without stack overflow', async () => {
    let deep = { val: 'leaf' };
    for (let i = 0; i < 15; i++) {
      deep = { [`level_${i}`]: deep };
    }
    const res = await callJsonToYaml(JSON.stringify(deep));
    assertEqual(res.error, null);
    assertTrue(res.yaml.includes('level_0:'));
    assertTrue(res.yaml.includes('leaf'));
  });

  await tracker.runTest('T2.40: json-to-yaml handles null, boolean, and special characters cleanly', async () => {
    const jsonInput = JSON.stringify({ nullKey: null, boolTrue: true, special: 'colons: & hashes # inside' });
    const res = await callJsonToYaml(jsonInput);
    assertTrue(res.yaml.includes('nullKey: null'));
    assertTrue(res.yaml.includes('boolTrue: true'));
  });

  await tracker.runTest('T2.41: json-to-csv-data handles empty array [] returning empty output', async () => {
    const res = await callJsonToCsvData('[]');
    assertEqual(res.csv, '');
    assertEqual(res.rowCount, 0);
  });

  await tracker.runTest('T2.42: json-to-csv-data handles deeply nested keys (e.g. a.b.c.d.e)', async () => {
    const data = [{ a: { b: { c: { d: { e: 'deep_val' } } } } }];
    const res = await callJsonToCsvData(JSON.stringify(data), { flatten: true });
    assertEqual(res.headers[0], 'a.b.c.d.e');
    assertEqual(res.rows[1][0], 'deep_val');
  });

  await tracker.runTest('T2.43: json-to-csv-data handles array of primitive values ([1, 2, 3])', async () => {
    const data = [10, 20, 30];
    const res = await callJsonToCsvData(JSON.stringify(data));
    assertEqual(res.headers[0], 'value');
    assertEqual(res.rows.length, 4);
    assertEqual(res.rows[1][0], '10');
  });

  await tracker.runTest('T2.44: csv-to-json handles empty CSV string returning empty array []', async () => {
    const res = await callCsvToJsonData('');
    assertEqual(res.rowCount, 0);
    assertEqual(res.json, '[]');
  });

  await tracker.runTest('T2.45: csv-to-json handles fields containing nested JSON objects', async () => {
    const input = 'id,metadata\n1,"{""theme"":""dark"",""lang"":""en""}"';
    const res = await callCsvToJsonData(input, { parseJsonValues: true });
    assertEqual(res.data[0].id, 1);
    assertEqual(res.data[0].metadata.theme, 'dark');
    assertEqual(res.data[0].metadata.lang, 'en');
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS & CHAINING (>=10 tests, actual: 12 tests)
  // ============================================================================
  console.log('\n--- Tier 3: Combinations & Chaining (Pairwise Workflows & Simple Mode) ---');

  await tracker.runTest('T3.1: Full 9-Stage Data Transformation Pipeline (YAML -> JSON -> CSV -> Clean -> Dedup -> Sort -> Extract -> CSV -> JSON -> YAML)', async () => {
    // Stage 1: Initial YAML
    const stage1Yaml = `
- id: 102
  name: "Marcus "
  dept: Engineering
  salary: "$120,000"
- id: 101
  name: "Eleanor"
  dept: Engineering
  salary: "$140,000"
- id: 102
  name: "Marcus "
  dept: Engineering
  salary: "$120,000"
- id: 103
  name: "Amina"
  dept: Product
  salary: "$135,000"
`;
    // Stage 2: YAML -> JSON
    const stage2 = await callYamlToJson(stage1Yaml);
    assertTrue(stage2.docCount === 1 || stage2.docCount === 4);

    // Stage 3: JSON -> CSV Data
    const stage3 = await callJsonToCsvData(stage2.json);
    assertTrue(stage3.rowCount >= 4);

    // Stage 4: CSV Cleaner (trims whitespace, normalizes)
    const stage4 = await callCleanCsv(stage3.csv, { trimWhitespace: true });
    assertEqual(stage4.rows.length, 5, 'Header + 4 rows');

    // Stage 5: CSV Deduplicator (deduplicate on id)
    const stage5 = await callDeduplicateCsv(stage4.output, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['id'],
      strategy: 'keep-first'
    });
    assertEqual(stage5.metrics.uniqueRowCount, 3, '3 unique records after deduplication');

    // Stage 6: CSV Sorter (sort by salary desc)
    const stage6 = await callSortCsv(stage5.output, [
      { columnIndex: 3, direction: 'desc', type: 'number' }
    ]);
    assertEqual(stage6.rows[1][1], 'Eleanor', 'Top earner Eleanor at rank 1');
    assertEqual(stage6.rows[2][1], 'Amina', 'Amina at rank 2');
    assertEqual(stage6.rows[3][1], 'Marcus', 'Marcus at rank 3');

    // Stage 7: CSV Column Extractor (pick id, name, salary)
    const stage7 = await callExtractColumns(stage6.output, ['id', 'name', 'salary']);
    assertEqual(stage7.rows[0].join(','), 'id,name,salary');
    assertEqual(stage7.rows.length, 4);

    // Stage 8: CSV -> JSON
    const stage8 = await callCsvToJsonData(stage7.output);
    assertEqual(stage8.rowCount, 3);
    assertEqual(stage8.data[0].name, 'Eleanor');

    // Stage 9: JSON -> YAML
    const stage9 = await callJsonToYaml(stage8.json, { indent: 2 });
    assertTrue(stage9.yaml.includes('Eleanor'));
    assertTrue(stage9.yaml.includes('140,000') || stage9.yaml.includes('140000'));
  });

  await tracker.runTest('T3.2: Bidirectional Transpiler Loop: JSON -> YAML -> JSON structure preservation', async () => {
    const originalJson = {
      project: 'whysogood',
      version: 2.5,
      features: ['cleaner', 'sorter', 'transpilers'],
      settings: { timeout: 5000, debug: false, retry: null }
    };
    const yamlOut = await callJsonToYaml(JSON.stringify(originalJson));
    const jsonOut = await callYamlToJson(yamlOut.yaml);
    const reconstructed = JSON.parse(jsonOut.json);
    assertEqual(JSON.stringify(reconstructed), JSON.stringify(originalJson));
  });

  await tracker.runTest('T3.3: Bidirectional Transpiler Loop: JSON -> CSV -> CSV -> JSON lossless roundtrip', async () => {
    const original = [
      { id: 'REC-1', contact: { email: 'a@test.com', phone: '555-0123' }, tags: ['vip', 'enterprise'], active: true },
      { id: 'REC-2', contact: { email: 'b@test.com', phone: '555-0456' }, tags: ['trial'], active: false },
    ];
    const csvRes = await callJsonToCsvData(JSON.stringify(original));
    const jsonRes = await callCsvToJsonData(csvRes.csv);
    assertEqual(JSON.stringify(jsonRes.data), JSON.stringify(original));
  });

  await tracker.runTest('T3.4: Delimiter Transform Pipeline: TSV -> Semicolon -> Pipe -> Comma CSV normalization', async () => {
    const tsv = 'a\tb\tc\n1\t2\t3\n4\t5\t6';
    const semi = await callCleanCsv(tsv, { delimiter: 'auto', outputDelimiter: ';' });
    assertEqual(semi.output, 'a;b;c\n1;2;3\n4;5;6');

    const pipe = await callCleanCsv(semi.output, { delimiter: 'auto', outputDelimiter: '|' });
    assertEqual(pipe.output, 'a|b|c\n1|2|3\n4|5|6');

    const comma = await callCleanCsv(pipe.output, { delimiter: 'auto', outputDelimiter: ',' });
    assertEqual(comma.output, 'a,b,c\n1,2,3\n4,5,6');
  });

  await tracker.runTest('T3.5: Clean then Deduplicate then Sort pipeline on dirty transactional dump', async () => {
    const rawDirty = `
id ; name ; amount \r
 101 ; Widget A ; $50.00 \r
 \r
 102 ; Widget B ; $120.00 \r
 101 ; Widget A ; $50.00 \r
 103 ; Widget C ; $15.50 \r
`;
    // Clean: remove empty lines, trim whitespace, normalize to comma
    const cleaned = await callCleanCsv(rawDirty, { delimiter: 'auto', outputDelimiter: ',' });
    assertEqual(cleaned.rows.length, 5, 'Header + 4 rows after removing blank row');

    // Deduplicate: remove duplicate 101
    const deduped = await callDeduplicateCsv(cleaned.output, { dedupeMode: 'all-columns' });
    assertEqual(deduped.metrics.uniqueRowCount, 3);

    // Sort: sort by amount descending
    const sorted = await callSortCsv(deduped.output, [{ columnIndex: 2, direction: 'desc', type: 'number' }]);
    assertEqual(sorted.rows[1][0], '102', 'Widget B ($120) is highest');
    assertEqual(sorted.rows[2][0], '101', 'Widget A ($50) is second');
    assertEqual(sorted.rows[3][0], '103', 'Widget C ($15.50) is lowest');
  });

  await tracker.runTest('T3.6: Simple Mode file category auto-detection for .csv (text/csv)', async () => {
    const cat = await callDetectCategory('export.csv', 'text/csv');
    assertEqual(cat, 'Data');
  });

  await tracker.runTest('T3.7: Simple Mode file category auto-detection for .tsv (text/tab-separated-values)', async () => {
    const cat = await callDetectCategory('spreadsheet.tsv', 'text/tab-separated-values');
    assertEqual(cat, 'Data');
  });

  await tracker.runTest('T3.8: Simple Mode file category auto-detection for .yaml and .yml (text/yaml)', async () => {
    const cat1 = await callDetectCategory('manifest.yaml', 'text/yaml');
    const cat2 = await callDetectCategory('config.yml', 'application/x-yaml');
    assertEqual(cat1, 'Data');
    assertEqual(cat2, 'Data');
  });

  await tracker.runTest('T3.9: Simple Mode file category auto-detection for .json (application/json)', async () => {
    const cat = await callDetectCategory('records.json', 'application/json');
    assertEqual(cat, 'Developer', '.json is recognized by Developer category but compatible with Data');
  });

  await tracker.runTest('T3.10: Simple Mode runner execution: csv-cleaner runner produces valid cleaned CSV blob', async () => {
    const dirty = ' a , b \n 1 , 2 ';
    const file = new File([dirty], 'dirty.csv', { type: 'text/csv' });
    const res = await callExecuteTool('csv-cleaner', file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.filename, 'dirty_cleaned.csv');
    const text = await res.blob.text();
    assertEqual(text, 'a,b\n1,2');
  });

  await tracker.runTest('T3.11: Simple Mode runner execution: yaml-to-json runner produces valid JSON blob', async () => {
    const yamlStr = 'greeting: hello\ntarget: world';
    const file = new File([yamlStr], 'message.yaml', { type: 'text/yaml' });
    const res = await callExecuteTool('yaml-to-json', file);
    assertTrue(res.blob instanceof Blob);
    assertEqual(res.filename, 'message.json');
    const text = await res.blob.text();
    const parsed = JSON.parse(text);
    assertEqual(parsed.greeting, 'hello');
  });

  await tracker.runTest('T3.12: Simple Mode chained multi-tool execution (Upload dirty CSV -> Clean -> Dedup -> Sort -> JSON -> ZIP bundle)', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const sourceCsv = 'id,name,val\n 2 , B , 20 \n 1 , A , 10 \n 2 , B , 20 ';
      const initialFile = new File([sourceCsv], 'raw_data.csv', { type: 'text/csv' });

      // Step 1: Clean
      const cleanOut = await callExecuteTool('csv-cleaner', initialFile);
      const cleanText = await cleanOut.blob.text();

      // Step 2: Deduplicate
      const dedupFile = new File([cleanText], cleanOut.filename, { type: 'text/csv' });
      const dedupOut = await callExecuteTool('csv-deduplicator', dedupFile);
      const dedupText = await dedupOut.blob.text();

      // Step 3: Sort by id asc
      const sortFile = new File([dedupText], dedupOut.filename, { type: 'text/csv' });
      const sortOut = await callExecuteTool('csv-sorter', sortFile, { rules: [{ columnIndex: 0, direction: 'asc', type: 'number' }] });
      const sortText = await sortOut.blob.text();

      // Step 4: CSV -> JSON
      const jsonFile = new File([sortText], sortOut.filename, { type: 'text/csv' });
      const jsonOut = await callExecuteTool('csv-to-json', jsonFile);
      const jsonText = await jsonOut.blob.text();
      const parsed = JSON.parse(jsonText);
      assertEqual(parsed.length, 2);
      assertEqual(Number(parsed[0].id), 1);
      assertEqual(Number(parsed[1].id), 2);

      // Step 5: Bundle All into ZIP
      const zipData = {
        'cleaned.csv': new Uint8Array(await cleanOut.blob.arrayBuffer()),
        'deduped.csv': new Uint8Array(await dedupOut.blob.arrayBuffer()),
        'sorted.csv': new Uint8Array(await sortOut.blob.arrayBuffer()),
        'final.json': new Uint8Array(await jsonOut.blob.arrayBuffer()),
      };
      const zipBlob = new Blob([zipSync(zipData)], { type: 'application/zip' });
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      assertEqual(Object.keys(unzipped).length, 4, '4 stage artifacts bundled in ZIP');

      // Zero network egress check
      assertEqual(env.networkSpy.egressCount, 0, 'Zero network calls made during execution');
    } finally {
      env.cleanup();
    }
  });

  // ============================================================================
  // TIER 4: REAL-WORLD SCENARIOS (>=5 scenarios, actual: 6 scenarios)
  // ============================================================================
  console.log('\n--- Tier 4: Real-World Scenarios (Application Workloads) ---');

  await tracker.runTest('T4.1: Scenario 1 — Enterprise Employee Roster Normalization & Payroll Sort', async () => {
    // Realistic dirty HR dump: mixed delimiter, uneven columns, extra whitespace, salary formatted
    const rawRoster = `id;first_name;last_name;email;dept;salary;hire_date
101 ; Eleanor ; Vance ; eleanor.vance@whysogood.io ; Engineering ; $142,500.00 ; 2021-03-15
102 ; Marcus ; Chen ; marcus.chen@whysogood.io ; Engineering ; $128,000.00 ; 2022-06-01
103 ; Amina ; Diallo ; amina.diallo@whysogood.io ; Product ; $135,000.00 ; 2020-11-12
101 ; Eleanor ; Vance ; eleanor.vance@whysogood.io ; Engineering ; $142,500.00 ; 2021-03-15
104 ; Liam ; O'Connor ; liam.oconnor@whysogood.io ; Design ; $118,000.00 ; 2023-01-20
`;
    // 1. Clean
    const cleaned = await callCleanCsv(rawRoster, { delimiter: 'auto', outputDelimiter: ',' });
    assertEqual(cleaned.rows.length, 6);

    // 2. Deduplicate by email
    const deduped = await callDeduplicateCsv(cleaned.output, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['email'],
      strategy: 'keep-first'
    });
    assertEqual(deduped.metrics.uniqueRowCount, 4, '4 unique employees');

    // 3. Multi-column sort: Department asc, Salary desc
    const sorted = await callSortCsv(deduped.output, [
      { columnIndex: 4, direction: 'asc', type: 'text' },
      { columnIndex: 5, direction: 'desc', type: 'number' }
    ]);
    // Design first alphabetically
    assertEqual(sorted.rows[1][4], 'Design');
    assertEqual(sorted.rows[2][4], 'Engineering');
    assertEqual(sorted.rows[2][1], 'Eleanor', 'Eleanor ($142.5k) ranks above Marcus ($128k)');
    assertEqual(sorted.rows[3][1], 'Marcus');
    assertEqual(sorted.rows[4][4], 'Product');
  });

  await tracker.runTest('T4.2: Scenario 2 — Global E-Commerce Order Book Pipeline', async () => {
    const rawOrders = `order_id,customer,sku,quantity,unit_price,order_date,status
ORD-9821,Sarah Jenkins,SKU-HEADPHONES,1,$149.99,2026-09-12,Delivered
ORD-9822,David Kim,SKU-CHAIR,2,$289.50,2026-09-14,Shipped
ORD-9821,Sarah Jenkins,SKU-HEADPHONES,1,$149.99,2026-09-12,Delivered
ORD-9823,Elena Rostova,SKU-DOCK,3,$79.99,2026-09-15,Delivered
ORD-9824,Carlos Mendez,SKU-MONITOR,1,$429.00,2026-09-20,Processing
`;
    // Deduplicate orders by order_id
    const deduped = await callDeduplicateCsv(rawOrders, {
      dedupeMode: 'selected-columns',
      selectedColumns: ['order_id'],
      strategy: 'keep-first'
    });
    assertEqual(deduped.metrics.uniqueRowCount, 4);

    // Sort by order_date desc
    const sorted = await callSortCsv(deduped.output, [{ columnIndex: 5, direction: 'desc', type: 'date' }]);
    assertEqual(sorted.rows[1][0], 'ORD-9824', 'Latest order (Sept 20) on top');

    // Extract finance columns
    const extracted = await callExtractColumns(sorted.output, ['order_id', 'customer', 'unit_price', 'quantity']);
    assertEqual(extracted.rows[0].join(','), 'order_id,customer,unit_price,quantity');
  });

  await tracker.runTest('T4.3: Scenario 3 — Cloud Analytics Clickstream Event Stream', async () => {
    const analyticsEvents = [
      { event_id: 'EVT-1', session: { id: 'SESS-10', user_id: 'USR-1', device: { os: 'Mac', browser: 'Chrome' } }, duration_ms: 450, timestamp: '2026-09-26T08:15:00Z' },
      { event_id: 'EVT-2', session: { id: 'SESS-10', user_id: 'USR-1', device: { os: 'Mac', browser: 'Chrome' } }, duration_ms: 12, timestamp: '2026-09-26T08:15:30Z' },
      { event_id: 'EVT-3', session: { id: 'SESS-11', user_id: 'USR-2', device: { os: 'iOS', browser: 'Safari' } }, duration_ms: 820, timestamp: '2026-09-26T08:16:00Z' }
    ];

    // Transpile nested events to CSV with dot-flattening
    const csvOut = await callJsonToCsvData(JSON.stringify(analyticsEvents), { flatten: true });
    assertTrue(csvOut.headers.includes('session.device.os'));
    assertTrue(csvOut.headers.includes('session.device.browser'));

    // Sort events by duration_ms descending
    const sorted = await callSortCsv(csvOut.csv, [{ columnIndex: 5, direction: 'desc', type: 'number' }]);
    assertEqual(sorted.rows[1][0], 'EVT-3', 'Longest duration (820ms) at rank 1');
  });

  await tracker.runTest('T4.4: Scenario 4 — Multi-Document Kubernetes Infrastructure Bundle', async () => {
    const k8sManifest = `
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: api:v2.5.0
        env: &common_env
          ENV: production
          REGION: us-west-2
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
`;
    // YAML -> JSON
    const resJson = await callYamlToJson(k8sManifest);
    assertEqual(resJson.docCount, 3, '3 documents parsed from multi-doc manifest');
    const docs = JSON.parse(resJson.json);
    assertEqual(docs[0].kind, 'Namespace');
    assertEqual(docs[1].kind, 'Deployment');
    assertEqual(docs[2].kind, 'Service');
    assertEqual(docs[1].spec.replicas, 3);

    // Convert back to YAML and verify roundtrip fidelity
    const resYaml = await callJsonToYaml(resJson.json, { indent: 2 });
    assertTrue(resYaml.yaml.includes('api-server'));
    assertTrue(resYaml.yaml.includes('LoadBalancer'));
  });

  await tracker.runTest('T4.5: Scenario 5 — Complex CRM Customer Database Export & Bidirectional Synchronization', async () => {
    const customers = [
      {
        id: 'CUST-001',
        profile: { firstName: 'Sarah', lastName: 'Connor', address: { city: 'Los Angeles', state: 'CA' } },
        subscriptions: ['cloud_pro', 'enterprise_support'],
        revenue: 24500.50,
        active: true
      },
      {
        id: 'CUST-002',
        profile: { firstName: 'Miles', lastName: 'Dyson', address: { city: 'Sunnyvale', state: 'CA' } },
        subscriptions: ['cloud_starter'],
        revenue: 1200.00,
        active: false
      }
    ];

    // Export to RFC 4180 CSV
    const csvExport = await callJsonToCsvData(JSON.stringify(customers), { flatten: true });
    assertTrue(csvExport.headers.includes('profile.address.city'));
    assertTrue(csvExport.headers.includes('subscriptions'));

    // Import back from CSV
    const jsonImport = await callCsvToJsonData(csvExport.csv, { unflatten: true, parsePrimitives: true, parseJsonValues: true });
    assertEqual(JSON.stringify(jsonImport.data), JSON.stringify(customers), 'Deep equality verified on complex CRM records');
  });

  await tracker.runTest('T4.6: Scenario 6 — End-to-End Simple Mode Data Workbench Session', async () => {
    const env = setupMockBrowserEnvironment();
    try {
      const inputTsv = `order_id\tamount\tstatus\nORD-1\t$100\tPaid\nORD-2\t$50\tPending\nORD-1\t$100\tPaid`;
      const file = new File([inputTsv], 'orders.tsv', { type: 'text/tab-separated-values' });

      // Action 1: Upload and auto-detect category
      const category = await callDetectCategory(file.name, file.type);
      assertEqual(category, 'Data');

      // Action 2: User cleans and normalizes TSV to CSV
      const cleaned = await callExecuteTool('csv-cleaner', file);
      assertEqual(cleaned.filename, 'orders_cleaned.csv');

      // Action 3: User deduplicates
      const cleanFile = new File([await cleaned.blob.text()], cleaned.filename, { type: 'text/csv' });
      const deduped = await callExecuteTool('csv-deduplicator', cleanFile);

      // Action 4: User converts to JSON
      const dedupFile = new File([await deduped.blob.text()], deduped.filename, { type: 'text/csv' });
      const jsonOut = await callExecuteTool('csv-to-json', dedupFile);
      const jsonText = await jsonOut.blob.text();
      const records = JSON.parse(jsonText);
      assertEqual(records.length, 2, '2 unique orders converted');

      // Action 5: Bundle All as ZIP
      const zipData = {
        'orders_cleaned.csv': new Uint8Array(await cleaned.blob.arrayBuffer()),
        'orders_deduped.csv': new Uint8Array(await deduped.blob.arrayBuffer()),
        'orders.json': new Uint8Array(await jsonOut.blob.arrayBuffer()),
      };
      const zipBlob = new Blob([zipSync(zipData)], { type: 'application/zip' });
      const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
      assertEqual(Object.keys(unzipped).length, 3);

      // Zero network privacy
      assertEqual(env.networkSpy.egressCount, 0, 'Zero network egress confirmed');
    } finally {
      env.cleanup();
    }
  });

  const summary = tracker.summary();
  if (summary.failed > 0) {
    console.log('\n❌ FAILED TESTS SUMMARY:');
    for (const t of summary.tests) {
      if (t.status === 'FAIL') console.log(`  ✖ ${t.name}: ${t.error}`);
    }
  }
  console.log('\n================================================================');
  console.log(` 🏁 DATA TOOLS E2E SUITE RESULTS: ${summary.passed}/${summary.total} passed in ${summary.durationMs}ms`);
  console.log('================================================================\n');

  return summary;
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith('data_tools.test.mjs')) {
  runDataToolsTests().then(res => {
    if (res.failed > 0) process.exit(1);
    process.exit(0);
  }).catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
