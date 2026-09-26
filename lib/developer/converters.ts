/**
 * Transpilers & Data Format Converters for whysogood.app
 * Pure client-side processing, zero server uploads, zero external dependencies.
 *
 * Implements:
 * 1. JSON ↔ CSV (RFC 4180 with delimiter, quotation, headers, and object flattening/unflattening)
 * 2. JSON ↔ XML (Indented XML generation, node text, attribute handling, array repeated tags)
 * 3. XML ↔ JSON (Browser DOMParser + pure TS tokenizer fallback for Node.js test runs)
 * 4. Markdown → HTML (GFM: headings, bold/italic/strike, tables, code blocks, task lists, blockquotes, links)
 */

import type {
  JsonToCsvOptions,
  CsvToJsonOptions,
  JsonToXmlOptions,
  XmlToJsonOptions,
  MarkdownToHtmlOptions,
  ConverterResult,
  MarkdownResult,
} from './types';

// ============================================================================
// 1. JSON ↔ CSV Converter
// ============================================================================

/**
 * Flattens a nested object into dot-notation keys:
 * e.g., { user: { name: 'Alice', loc: { city: 'NYC' } } } => { 'user.name': 'Alice', 'user.loc.city': 'NYC' }
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  depth = 0,
  seen = new Set<unknown>()
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (depth > 8 || seen.has(obj)) {
    result[prefix.replace(/\.$/, '')] = JSON.stringify(obj);
    return result;
  }
  seen.add(obj);

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const nested = flattenObject(value as Record<string, unknown>, newKey, depth + 1, seen);
      Object.assign(result, nested);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * RFC 4180 CSV value escaping
 */
function escapeCsvValue(
  val: unknown,
  delimiter: string,
  quoteStyle: 'as-needed' | 'always' | 'none' = 'as-needed'
): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  const str = String(val);

  if (quoteStyle === 'always') {
    return `"${str.replace(/"/g, '""')}"`;
  }
  if (quoteStyle === 'none') {
    return str.replace(new RegExp(delimiter, 'g'), ' ');
  }

  // 'as-needed' (RFC 4180 standard)
  if (
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts JSON string (array of objects) to RFC 4180 CSV
 */
export function jsonToCsv(jsonStr: string, options: JsonToCsvOptions = {}): ConverterResult {
  try {
    if (!jsonStr || !jsonStr.trim()) {
      return { output: '', error: 'Empty JSON input' };
    }

    const data = JSON.parse(jsonStr);

    if (!Array.isArray(data)) {
      return { output: '', error: 'Input must be a JSON array of objects.' };
    }

    if (data.length === 0) {
      return { output: '' };
    }

    const delimiter = options.delimiter || ',';
    const includeHeaders = options.includeHeaders !== false;
    const shouldFlatten = options.flattenNested !== false;
    const quoteStyle = options.quoteStyle || 'as-needed';

    // Flatten objects if requested
    const processedRows = data.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return shouldFlatten ? flattenObject(item as Record<string, unknown>) : (item as Record<string, unknown>);
      }
      return item;
    });

    // Collect unique headers across all records (handles sparse objects)
    const headers: string[] = [];
    for (const item of processedRows) {
      if (item && typeof item === 'object') {
        for (const k of Object.keys(item)) {
          if (!headers.includes(k)) {
            headers.push(k);
          }
        }
      }
    }

    const lines: string[] = [];

    // Header row
    if (includeHeaders && headers.length > 0) {
      lines.push(headers.map((h) => escapeCsvValue(h, delimiter, quoteStyle)).join(delimiter));
    }

    // Data rows
    for (const item of processedRows) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const row = headers.map((h) => escapeCsvValue((item as Record<string, unknown>)[h], delimiter, quoteStyle));
        lines.push(row.join(delimiter));
      } else {
        lines.push(escapeCsvValue(item, delimiter, quoteStyle));
      }
    }

    return { output: lines.join('\n') };
  } catch (err) {
    return { output: '', error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * RFC 4180 compliant CSV tokenizer and parser
 */
function parseCsvRows(text: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (text.slice(i, i + delimiter.length) === delimiter) {
        currentRow.push(currentField);
        currentField = '';
        i += delimiter.length;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Trailing field/row
  if (inQuotes || currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Sets a value on a nested object path: 'a.b.c' => obj.a.b.c = val
 */
function setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!curr[part] || typeof curr[part] !== 'object') {
      curr[part] = {};
    }
    curr = curr[part] as Record<string, unknown>;
  }
  curr[parts[parts.length - 1]] = value;
}

/**
 * Parses CSV string to formatted JSON
 */
export function csvToJson(csvStr: string, options: CsvToJsonOptions = {}): ConverterResult {
  try {
    if (!csvStr || !csvStr.trim()) {
      return { output: '[]' };
    }

    const delimiter = options.delimiter || ',';
    const hasHeaders = options.hasHeaders !== false;
    const parsePrimitives = options.parseNumbersAndBooleans !== false;
    const unflatten = options.unflattenNested !== false;

    const rows = parseCsvRows(csvStr, delimiter);
    if (rows.length === 0) {
      return { output: '[]' };
    }

    const coerceValue = (val: string): unknown => {
      if (!parsePrimitives) return val;
      if (val === '') return '';
      if (val === 'true') return true;
      if (val === 'false') return false;
      if (val === 'null') return null;
      if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(val.trim())) {
        const num = Number(val);
        if (!isNaN(num)) return num;
      }
      return val;
    };

    if (!hasHeaders) {
      const matrix = rows.map((r) => r.map(coerceValue));
      return { output: JSON.stringify(matrix, null, 2) };
    }

    const headers = rows[0].map((h) => h.trim());
    const dataRows = rows.slice(1);
    const records: Array<Record<string, unknown>> = [];

    for (const row of dataRows) {
      // Skip empty blank rows at EOF
      if (row.length === 1 && row[0] === '') continue;

      const record: Record<string, unknown> = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        const rawVal = c < row.length ? row[c] : '';
        const coerced = coerceValue(rawVal);

        if (unflatten && key.includes('.')) {
          setNestedProperty(record, key, coerced);
        } else {
          record[key] = coerced;
        }
      }
      records.push(record);
    }

    return { output: JSON.stringify(records, null, 2) };
  } catch (err) {
    return { output: '', error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================================
// 2. JSON → XML Converter
// ============================================================================

function escapeXml(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeXmlTag(name: string): string {
  let clean = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!clean) clean = 'item';
  if (/^[0-9]/.test(clean)) {
    clean = '_' + clean;
  }
  return clean;
}

/**
 * Converts a JSON value to an XML string tree
 */
function serializeJsonToXmlNode(
  val: unknown,
  tag: string,
  arrayItemTag: string,
  attributePrefix: string
): string {
  const safeTag = sanitizeXmlTag(tag);

  if (val === null || val === undefined) {
    return `<${safeTag}/>`;
  }

  if (Array.isArray(val)) {
    return val
      .map((item) => serializeJsonToXmlNode(item, arrayItemTag, arrayItemTag, attributePrefix))
      .join('');
  }

  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) {
      return `<${safeTag}></${safeTag}>`;
    }

    const attrs: string[] = [];
    const children: string[] = [];
    let textContent: string | null = null;

    for (const [k, v] of entries) {
      if (attributePrefix && k.startsWith(attributePrefix)) {
        const attrName = sanitizeXmlTag(k.slice(attributePrefix.length));
        attrs.push(`${attrName}="${escapeXml(v)}"`);
      } else if (k === '#text' || k === '_text') {
        textContent = escapeXml(v);
      } else {
        children.push(serializeJsonToXmlNode(v, k, arrayItemTag, attributePrefix));
      }
    }

    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

    if (children.length === 0 && textContent === null) {
      return `<${safeTag}${attrStr}></${safeTag}>`;
    }

    const innerContent = (textContent || '') + children.join('');
    return `<${safeTag}${attrStr}>${innerContent}</${safeTag}>`;
  }

  // Primitives: boolean, number, string
  return `<${safeTag}>${escapeXml(val)}</${safeTag}>`;
}

/**
 * Converts JSON string to well-formed, optionally indented XML
 */
export function jsonToXml(
  jsonStr: string,
  rootTag: string = 'root',
  options: JsonToXmlOptions = {}
): ConverterResult {
  try {
    if (!jsonStr || !jsonStr.trim()) {
      return { output: '', error: 'Empty JSON input' };
    }

    const data = JSON.parse(jsonStr);
    const resolvedRoot = rootTag || options.rootTag || 'root';
    const arrayItemTag = options.arrayItemTag || 'item';
    const attributePrefix = options.attributePrefix !== undefined ? options.attributePrefix : '@';
    const includeDeclaration = options.declaration !== false;

    let xmlBody = '';

    if (Array.isArray(data)) {
      const items = data
        .map((item) => serializeJsonToXmlNode(item, arrayItemTag, arrayItemTag, attributePrefix))
        .join('');
      xmlBody = `<${sanitizeXmlTag(resolvedRoot)}>${items}</${sanitizeXmlTag(resolvedRoot)}>`;
    } else if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        xmlBody = `<${sanitizeXmlTag(resolvedRoot)}></${sanitizeXmlTag(resolvedRoot)}>`;
      } else {
        xmlBody = serializeJsonToXmlNode(data, resolvedRoot, arrayItemTag, attributePrefix);
      }
    } else {
      xmlBody = serializeJsonToXmlNode(data, resolvedRoot, arrayItemTag, attributePrefix);
    }

    const declaration = includeDeclaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '';
    return { output: `${declaration}${xmlBody}` };
  } catch (err) {
    return { output: '', error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================================
// 3. XML → JSON Converter
// ============================================================================

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Tokenizing XML parser for Node.js test runs and fallback
 */
interface ParsedNode {
  name: string;
  attributes: Record<string, string>;
  children: ParsedNode[];
  text: string;
}

function parseXmlTokens(xmlStr: string): ParsedNode {
  const rootNode: ParsedNode = { name: 'root', attributes: {}, children: [], text: '' };
  const stack: ParsedNode[] = [rootNode];

  // Match tags, CDATA, comments, declarations, or text
  const tokenRegex = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/)?([a-zA-Z0-9_:-]+)([^>]*?)(\/)?>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(xmlStr)) !== null) {
    const cdata = match[1];
    const isClosing = match[2];
    const tagName = match[3];
    const rawAttrs = match[4];
    const isSelfClosing = match[5];
    const textContent = match[6];

    const current = stack[stack.length - 1];

    if (cdata !== undefined) {
      current.text += cdata;
    } else if (textContent !== undefined) {
      const trimmed = textContent.trim();
      if (trimmed) {
        current.text += (current.text ? ' ' : '') + unescapeXml(trimmed);
      }
    } else if (isClosing) {
      if (stack.length > 1) {
        stack.pop();
      }
    } else if (tagName) {
      const attributes: Record<string, string> = {};
      if (rawAttrs) {
        const attrRegex = /([a-zA-Z0-9_:-]+)=["']([^"']*)["']/g;
        let attrMatch: RegExpExecArray | null;
        while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
          attributes[attrMatch[1]] = unescapeXml(attrMatch[2]);
        }
      }

      const newNode: ParsedNode = {
        name: tagName,
        attributes,
        children: [],
        text: '',
      };

      current.children.push(newNode);

      if (!isSelfClosing) {
        stack.push(newNode);
      }
    }
  }

  return rootNode;
}

function convertParsedNodeToJson(
  node: ParsedNode,
  options: XmlToJsonOptions
): unknown {
  const attributePrefix = options.attributePrefix !== undefined ? options.attributePrefix : '@';
  const parsePrimitives = options.parseNumbersAndBooleans !== false;

  const coerce = (val: string): unknown => {
    if (!parsePrimitives) return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(val.trim())) {
      const n = Number(val);
      if (!isNaN(n)) return n;
    }
    return val;
  };

  const hasAttrs = Object.keys(node.attributes).length > 0;
  const hasChildren = node.children.length > 0;
  const hasText = node.text.trim().length > 0;

  // Self closing empty tag without attrs
  if (!hasAttrs && !hasChildren && !hasText) {
    return null;
  }

  // Primitive text node without attributes or children
  if (!hasAttrs && !hasChildren && hasText) {
    return coerce(node.text.trim());
  }

  const result: Record<string, unknown> = {};

  // Attributes
  if (hasAttrs && attributePrefix !== 'none') {
    for (const [k, v] of Object.entries(node.attributes)) {
      result[`${attributePrefix}${k}`] = coerce(v);
    }
  }

  // Text content when combined with attrs or children
  if (hasText) {
    result['#text'] = coerce(node.text.trim());
  }

  // Children: Group duplicate child tag names into arrays
  for (const child of node.children) {
    const childJson = convertParsedNodeToJson(child, options);
    const existing = result[child.name];

    if (existing !== undefined) {
      if (Array.isArray(existing)) {
        existing.push(childJson);
      } else {
        result[child.name] = [existing, childJson];
      }
    } else {
      result[child.name] = childJson;
    }
  }

  return result;
}

/**
 * Converts XML string into formatted JSON string
 */
export function xmlToJson(
  xmlStr: string,
  indent: number = 2,
  options: XmlToJsonOptions = {}
): ConverterResult {
  try {
    if (!xmlStr || !xmlStr.trim()) {
      return { output: '', error: 'Empty XML input' };
    }

    // Strip DOCTYPE and processing instructions for validity check
    const clean = xmlStr.replace(/<\?xml[\s\S]*?\?>/i, '').replace(/<!DOCTYPE[\s\S]*?>/i, '').trim();
    if (!clean.startsWith('<') || !clean.endsWith('>')) {
      return { output: '', error: 'Malformed XML structure' };
    }

    // Browser Tier: Use native DOMParser if available
    if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlStr, 'application/xml');
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          return { output: '', error: parserError.textContent || 'XML parsing error' };
        }

        const parseDomElement = (elem: Element): unknown => {
          const attributePrefix = options.attributePrefix !== undefined ? options.attributePrefix : '@';
          const parsePrimitives = options.parseNumbersAndBooleans !== false;

          const coerce = (val: string): unknown => {
            if (!parsePrimitives) return val;
            if (val === 'true') return true;
            if (val === 'false') return false;
            if (/^-?\d+(\.\d+)?$/.test(val.trim())) {
              const n = Number(val);
              if (!isNaN(n)) return n;
            }
            return val;
          };

          const childElements = Array.from(elem.children);
          const hasAttrs = elem.attributes.length > 0;
          const text = elem.textContent?.trim() || '';

          if (childElements.length === 0 && !hasAttrs) {
            return text ? coerce(text) : null;
          }

          const obj: Record<string, unknown> = {};

          if (hasAttrs && attributePrefix !== 'none') {
            for (let i = 0; i < elem.attributes.length; i++) {
              const attr = elem.attributes[i];
              obj[`${attributePrefix}${attr.name}`] = coerce(attr.value);
            }
          }

          if (childElements.length === 0 && text) {
            obj['#text'] = coerce(text);
          }

          for (const child of childElements) {
            const childVal = parseDomElement(child);
            const tag = child.nodeName;
            if (obj[tag] !== undefined) {
              if (Array.isArray(obj[tag])) {
                (obj[tag] as unknown[]).push(childVal);
              } else {
                obj[tag] = [obj[tag], childVal];
              }
            } else {
              obj[tag] = childVal;
            }
          }

          return obj;
        };

        const rootTag = doc.documentElement.nodeName;
        const rootContent = parseDomElement(doc.documentElement);
        const result = { [rootTag]: rootContent };
        return { output: JSON.stringify(result, null, indent) };
      } catch {
        // Fall back to pure TS tokenizer
      }
    }

    // Pure TypeScript Tokenizer Tier (Node.js & Universal Fallback)
    const parsedRoot = parseXmlTokens(clean);
    if (parsedRoot.children.length === 0) {
      return { output: '', error: 'Malformed XML: No root element found' };
    }

    const firstChild = parsedRoot.children[0];
    const jsonContent = convertParsedNodeToJson(firstChild, options);
    const result = { [firstChild.name]: jsonContent };

    return { output: JSON.stringify(result, null, indent) };
  } catch (err) {
    return { output: '', error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================================
// 4. Markdown → HTML Converter (Full GFM Support)
// ============================================================================

/**
 * Escapes characters for HTML output
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Transforms inline GFM formatting (bold, italic, strikethrough, inline code, links, images)
 */
function parseInlineMarkdown(text: string): string {
  let res = text;

  // Strikethrough ~~strike~~
  res = res.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Bold **bold** or __bold__
  res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italics *italic* or _italic_
  res = res.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  res = res.replace(/(^|[\s(])_([^_]+)_(?=$|[\s),.:;!?])/g, '$1<em>$2</em>');

  // Images ![alt](url)
  res = res.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');

  // Links [text](url)
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Autolinks https://... or http://... (only when preceded by whitespace, start of line, or open paren)
  res = res.replace(/(^|[\s(])(https?:\/\/[^\s<)"]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');

  return res;
}

/**
 * Transpiles GitHub Flavored Markdown (GFM) to semantic HTML
 */
export function markdownToHtml(
  mdStr: string,
  options: MarkdownToHtmlOptions = {}
): MarkdownResult {
  if (!mdStr) {
    return { html: '', output: '' };
  }

  try {
    // 1. Extract fenced code blocks into unicode private-use placeholders
    const codeBlocks: string[] = [];
    let processed = mdStr.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      const langTrimmed = lang ? lang.trim() : '';
      const langClass = langTrimmed ? ` class="language-${langTrimmed}"` : '';
      // Preserve verbatim code content inside pre code
      codeBlocks.push(`<pre><code${langClass}>${code.trim()}</code></pre>`);
      return `\uE000CB${idx}\uE001`;
    });

    // 2. Extract inline code `...` into placeholders
    const inlineCodes: string[] = [];
    processed = processed.replace(/`([^`\n]+)`/g, (_, codeContent) => {
      const idx = inlineCodes.length;
      inlineCodes.push(`<code>${codeContent}</code>`);
      return `\uE000INLINE${idx}\uE001`;
    });

    // 3. Parse GFM Tables
    const lines = processed.split(/\r?\n/);
    const outputLines: string[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    const flushTable = () => {
      if (tableBuffer.length >= 2) {
        const headerRow = tableBuffer[0];
        const delimiterRow = tableBuffer[1];
        const dataRows = tableBuffer.slice(2);

        // Parse alignments from delimiter row (center or right; left is default)
        const alignments = delimiterRow
          .split('|')
          .slice(1, -1)
          .map((d) => {
            const trimmed = d.trim();
            if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
            if (trimmed.endsWith(':')) return 'right';
            return '';
          });

        const headerCells = headerRow
          .split('|')
          .slice(1, -1)
          .map((c, i) => {
            const align = alignments[i] ? ` align="${alignments[i]}"` : '';
            return `<th${align}>${parseInlineMarkdown(c.trim())}</th>`;
          })
          .join('');

        const renderedRows = dataRows
          .map((r) => {
            const cells = r
              .split('|')
              .slice(1, -1)
              .map((c, i) => {
                const align = alignments[i] ? ` align="${alignments[i]}"` : '';
                return `<td${align}>${parseInlineMarkdown(c.trim())}</td>`;
              })
              .join('');
            return `<tr>${cells}</tr>`;
          })
          .join('');

        outputLines.push(
          `<table><thead><tr>${headerCells}</tr></thead><tbody>${renderedRows}</tbody></table>`
        );
      }
      tableBuffer = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        tableBuffer.push(trimmed);
      } else {
        if (inTable) {
          flushTable();
        }
        outputLines.push(line);
      }
    }
    if (inTable) {
      flushTable();
    }

    processed = outputLines.join('\n');

    // 4. Headers (# Heading to ###### Heading)
    processed = processed.replace(/^######\s+(.*$)/gim, '<h6>$1</h6>');
    processed = processed.replace(/^#####\s+(.*$)/gim, '<h5>$1</h5>');
    processed = processed.replace(/^####\s+(.*$)/gim, '<h4>$1</h4>');
    processed = processed.replace(/^###\s+(.*$)/gim, '<h3>$1</h3>');
    processed = processed.replace(/^##\s+(.*$)/gim, '<h2>$1</h2>');
    processed = processed.replace(/^#\s+(.*$)/gim, '<h1>$1</h1>');

    // 5. Blockquotes (> Quote)
    processed = processed.replace(/^\>\s+(.*$)/gim, '<blockquote>$1</blockquote>');

    // 6. Horizontal Rules (---, ***, ___)
    processed = processed.replace(/^(?:---|\*\*\*|___)\s*$/gim, '<hr />');

    // 7. Task lists and standard lists
    // Task lists: - [x] or - [ ]
    processed = processed.replace(
      /^[\t\s]*[-*+]\s+\[x\]\s+(.*$)/gim,
      '<li><input type="checkbox" checked disabled /> $1</li>'
    );
    processed = processed.replace(
      /^[\t\s]*[-*+]\s+\[ \]\s+(.*$)/gim,
      '<li><input type="checkbox" disabled /> $1</li>'
    );

    // Standard Unordered lists
    processed = processed.replace(/^[\t\s]*[-*+]\s+(?!<input)(.*$)/gim, '<li>$1</li>');

    // Ordered lists
    processed = processed.replace(/^[\t\s]*\d+\.\s+(.*$)/gim, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    processed = processed.replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, '<ul>\n$1</ul>');

    // 8. Parse Inline Markdown across all non-code lines
    processed = parseInlineMarkdown(processed);

    // 9. Re-inject inline code placeholders
    for (let ic = 0; ic < inlineCodes.length; ic++) {
      processed = processed.replace(`\uE000INLINE${ic}\uE001`, inlineCodes[ic]);
    }

    // 10. Re-inject Code Blocks
    for (let c = 0; c < codeBlocks.length; c++) {
      processed = processed.replace(`\uE000CB${c}\uE001`, codeBlocks[c]);
    }

    let finalHtml = processed.trim();

    // 11. Boilerplate wrapper if requested
    if (options.includeBoilerplate) {
      const title = options.title || 'Converted Document';
      finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 24px; color: #1a1a1a; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { font-family: monospace; background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #6060e8; margin-left: 0; padding-left: 16px; color: #555; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; }
    th { background: #f8f8f8; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${finalHtml}
</body>
</html>`;
    }

    return { html: finalHtml, output: finalHtml };
  } catch (err) {
    return {
      html: '',
      output: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
