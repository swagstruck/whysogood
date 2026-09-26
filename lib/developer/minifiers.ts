/**
 * Pure Client-Side Developer Code & Markup Minifiers
 * HTML, CSS, and JSON Minifiers with Compression Metrics
 * Safely preserves CSS calc(...) operators and embedded tags
 */

import { calcReductionPct } from '../utils';
import type { MinifyResult, MinifyOptions } from './types';
import { getLineAndColumn } from './formatters';

const encoder = new TextEncoder();

function getByteSize(str: string): number {
  return encoder.encode(str).length;
}

// String-aware JavaScript comment stripper for embedded <script> tags
function stripJsComments(code: string): string {
  let out = '';
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    // Single-line comment
    if (code.slice(i, i + 2) === '//') {
      const endLine = code.indexOf('\n', i + 2);
      i = endLine !== -1 ? endLine : code.length;
      continue;
    }
    // Multi-line comment
    if (code.slice(i, i + 2) === '/*') {
      const endComment = code.indexOf('*/', i + 2);
      i = endComment !== -1 ? endComment + 2 : code.length;
      continue;
    }
    // String literal or template literal: preserve verbatim including //
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      out += q;
      i++;
      let escaped = false;
      while (i < code.length) {
        const c = code[i];
        out += c;
        if (escaped) {
          escaped = false;
        } else if (c === '\\') {
          escaped = true;
        } else if (c === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

// ============================================================================
// 1. HTML MINIFIER
// ============================================================================

export function minifyHtml(code: string, options?: MinifyOptions): MinifyResult {
  if (!code || !code.trim()) {
    return {
      minified: '',
      originalSize: 0,
      minifiedSize: 0,
      bytesSaved: 0,
      reductionPercentage: 0,
    };
  }

  const originalSize = getByteSize(code);
  let error: { message: string; line?: number; column?: number } | undefined;

  let result = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Preserve <pre>, <textarea>, <script>, <style> blocks temporarily
  const preservedBlocks: string[] = [];
  const placeholderPrefix = `__WHYSO_RAW_BLOCK_${Date.now()}_`;

  result = result.replace(/<(pre|textarea)(\s[^>]*?)?>([\s\S]*?)<\/\1>/gi, (match) => {
    const id = `${placeholderPrefix}${preservedBlocks.length}__`;
    preservedBlocks.push(match);
    return id;
  });

  // Minify embedded <style>
  result = result.replace(/<style(\s[^>]*?)?>([\s\S]*?)<\/style>/gi, (match, attrs, cssContent) => {
    const minCss = minifyCss(cssContent).minified;
    const tag = `<style${attrs || ''}>${minCss}</style>`;
    const id = `${placeholderPrefix}${preservedBlocks.length}__`;
    preservedBlocks.push(tag);
    return id;
  });

  // Minify embedded <script>
  result = result.replace(/<script(\s[^>]*?)?>([\s\S]*?)<\/script>/gi, (match, attrs, jsContent) => {
    // Basic script compression: remove comments safely without corrupting strings containing //
    const strippedJs = stripJsComments(jsContent);
    const minJs = strippedJs
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n');
    const tag = `<script${attrs || ''}>${minJs}</script>`;
    const id = `${placeholderPrefix}${preservedBlocks.length}__`;
    preservedBlocks.push(tag);
    return id;
  });

  const stripComments = options?.stripComments !== false;
  const collapseWhitespace = options?.collapseWhitespace !== false;

  // 2. Strip HTML comments (preserving conditional comments <!--[if ...]> if any)
  if (stripComments) {
    result = result.replace(/<!--(?!\s*\[if)[\s\S]*?-->/g, '');
  }

  // 3. Collapse whitespace between tags
  if (collapseWhitespace) {
    result = result.replace(/>\s+</g, '><');
    result = result.replace(/\s{2,}/g, ' ');
  }

  // 5. Clean whitespace inside tags: <div   class="  foo   bar  "  > -> <div class="foo bar">
  result = result.replace(/<([a-zA-Z0-9:-]+)((?:\s+[^"'>=\s]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^"'>\s]+))?)*)\s*(\/?)>/g, (fullMatch, tagName, attrs, selfClose) => {
    if (!attrs || !attrs.trim()) {
      return `<${tagName}${selfClose ? ' /' : ''}>`;
    }
    // Clean attribute spaces
    let cleanedAttrs = attrs.replace(/\s+/g, ' ');
    // Clean spaces inside quotes
    cleanedAttrs = cleanedAttrs.replace(/="([^"]*)"/g, (m: string, val: string) => `="${val.trim().replace(/\s{2,}/g, ' ')}"`);
    cleanedAttrs = cleanedAttrs.replace(/='([^']*)'/g, (m: string, val: string) => `='${val.trim().replace(/\s{2,}/g, ' ')}'`);
    return `<${tagName} ${cleanedAttrs.trim()}${selfClose ? ' /' : ''}>`;
  });

  // 6. Restore preserved blocks safely using function replacer to prevent $ pattern interpretation
  result = result.replace(new RegExp(`${placeholderPrefix}(\\d+)__`, 'g'), (_, idxStr) => {
    return preservedBlocks[parseInt(idxStr, 10)];
  });

  const minified = result.trim();
  const minifiedSize = getByteSize(minified);
  const bytesSaved = Math.max(0, originalSize - minifiedSize);
  const reductionPercentage = calcReductionPct(originalSize, minifiedSize);

  return {
    minified,
    originalSize,
    minifiedSize,
    bytesSaved,
    reductionPercentage,
    error,
  };
}

// ============================================================================
// 2. CSS MINIFIER
// ============================================================================

export function minifyCss(code: string, options?: MinifyOptions): MinifyResult {
  if (!code || !code.trim()) {
    return {
      minified: '',
      originalSize: 0,
      minifiedSize: 0,
      bytesSaved: 0,
      reductionPercentage: 0,
    };
  }

  const originalSize = getByteSize(code);
  let error: { message: string; line?: number; column?: number } | undefined;

  let css = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Preserve string literals so comments/colons/semicolons inside strings are not corrupted
  const preservedStrings: string[] = [];
  const strPlaceholderPrefix = `__WHYSO_CSS_STR_${Date.now()}_`;

  css = css.replace(/("(\\"|[^"])*"|'(\\'|[^'])*')/g, (match) => {
    const id = `${strPlaceholderPrefix}${preservedStrings.length}__`;
    preservedStrings.push(match);
    return id;
  });

  // 2. Preserve CSS calc(...) / min(...) / max(...) / clamp(...) expressions
  // MANDATORY REQUIREMENT: calc() requires spaces around + and - operators!
  const preservedCalcs: string[] = [];
  const calcPlaceholderPrefix = `__WHYSO_CSS_CALC_${Date.now()}_`;

  // Extract calc/min/max/clamp with balanced parentheses
  const calcRegex = /\b(calc|min|max|clamp)\(/gi;
  let calcMatch: RegExpExecArray | null;
  const calcRanges: Array<{ start: number; end: number; replacement: string }> = [];

  while ((calcMatch = calcRegex.exec(css)) !== null) {
    const fnName = calcMatch[1].toLowerCase();
    const startIndex = calcMatch.index;
    let depth = 1;
    let idx = startIndex + calcMatch[0].length;
    while (idx < css.length && depth > 0) {
      if (css[idx] === '(') depth++;
      else if (css[idx] === ')') depth--;
      idx++;
    }
    if (depth === 0) {
      calcRegex.lastIndex = idx;
      const inner = css.slice(startIndex + calcMatch[0].length, idx - 1);
      // Normalize calc inner: preserve var(...) calls first
      const preservedVars: string[] = [];
      let s = inner.replace(/var\([^)]+\)/gi, (m) => {
        const vId = `__V_${preservedVars.length}__`;
        preservedVars.push(m);
        return vId;
      });

      // Normalize spaces around binary + and -
      s = s.replace(/\s+/g, ' ');
      s = s.replace(/([0-9%a-z_\)\]]|__V_\d+__)\s*([\+\-])\s*([0-9%a-z_\(\[]|__V_\d+__)/gi, '$1 $2 $3');
      s = s.replace(/\s*([\*\/])\s*/g, '$1');
      s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
      s = s.replace(/\s*,\s*/g, ',');

      for (let v = 0; v < preservedVars.length; v++) {
        s = s.replace(`__V_${v}__`, () => preservedVars[v]);
      }

      const safeExpr = `${fnName}(${s.trim()})`;
      const id = `${calcPlaceholderPrefix}${preservedCalcs.length}__`;
      preservedCalcs.push(safeExpr);
      calcRanges.push({ start: startIndex, end: idx, replacement: id });
    }
  }

  // Replace calc ranges in a single O(N) pass so string offsets stay valid and performance scales linearly
  if (calcRanges.length > 0) {
    let newCss = '';
    let lastIdx = 0;
    for (let r = 0; r < calcRanges.length; r++) {
      const range = calcRanges[r];
      newCss += css.slice(lastIdx, range.start) + range.replacement;
      lastIdx = range.end;
    }
    newCss += css.slice(lastIdx);
    css = newCss;
  }

  const stripComments = options?.stripComments !== false;
  const removeTrailingSemicolons = options?.removeTrailingSemicolons !== false;
  const optimizeColors = options?.optimizeColors !== false;
  const optimizeZeroUnits = options?.optimizeZeroUnits !== false;

  // 3. Strip CSS comments: /* ... */ (preserve /*! ... */ license comments if needed)
  if (stripComments) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  // 4. Strip whitespace around syntax symbols: { } : ; , > ~
  css = css.replace(/\s*([\{\}:;,>~])\s*/g, '$1');

  // 5. Remove trailing semicolons before closing brace: ;} -> }
  if (removeTrailingSemicolons) {
    css = css.replace(/;\}/g, '}');
  }

  // 6. Color optimization: #ffffff -> #fff, #000000 -> #000
  if (optimizeColors) {
    css = css.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3(?![0-9a-fA-F])/g, '#$1$2$3');
  }

  // 7. Unit and zero optimization: 0px -> 0, 0.5em -> .5em (outside preserved strings/calc)
  if (optimizeZeroUnits) {
    css = css.replace(/\b0(px|em|rem|%|in|cm|mm|pt|pc|vw|vh)\b/gi, '0');
    css = css.replace(/(^|[^0-9])0\.([0-9]+)/g, '$1.$2');
  }

  // 8. Restore preserved calc expressions safely without $ pattern expansion
  css = css.replace(new RegExp(`${calcPlaceholderPrefix}(\\d+)__`, 'g'), (_, idxStr) => {
    return preservedCalcs[parseInt(idxStr, 10)];
  });

  // 9. Restore preserved strings safely without $ pattern expansion
  css = css.replace(new RegExp(`${strPlaceholderPrefix}(\\d+)__`, 'g'), (_, idxStr) => {
    return preservedStrings[parseInt(idxStr, 10)];
  });

  const minified = css.trim();
  const minifiedSize = getByteSize(minified);
  const bytesSaved = Math.max(0, originalSize - minifiedSize);
  const reductionPercentage = calcReductionPct(originalSize, minifiedSize);

  return {
    minified,
    originalSize,
    minifiedSize,
    bytesSaved,
    reductionPercentage,
    error,
  };
}

// ============================================================================
// 3. JSON MINIFIER
// ============================================================================

export function minifyJson(code: string, options?: MinifyOptions): MinifyResult {
  if (!code || !code.trim()) {
    return {
      minified: '',
      originalSize: 0,
      minifiedSize: 0,
      bytesSaved: 0,
      reductionPercentage: 0,
    };
  }

  const originalSize = getByteSize(code);

  try {
    const parsed = JSON.parse(code);

    let minified: string;
    if (options?.sortKeys) {
      minified = JSON.stringify(sortObjectKeys(parsed));
    } else {
      minified = JSON.stringify(parsed);
    }

    const minifiedSize = getByteSize(minified);
    const bytesSaved = Math.max(0, originalSize - minifiedSize);
    const reductionPercentage = calcReductionPct(originalSize, minifiedSize);

    return {
      minified,
      originalSize,
      minifiedSize,
      bytesSaved,
      reductionPercentage,
    };
  } catch (err: unknown) {
    let message = 'Invalid JSON syntax';
    let line: number | undefined;
    let column: number | undefined;

    if (err instanceof SyntaxError) {
      message = err.message;
      // 1. Check if line and column are directly in message
      const lineColMatch = message.match(/line (\d+) column (\d+)/i);
      const posMatch = message.match(/at position (\d+)/i);
      const v8SnippetMatch = message.match(/\.\.\."([\s\S]+?)"\s+is not valid JSON/);

      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
      } else if (posMatch) {
        const offset = parseInt(posMatch[1], 10);
        const pos = getLineAndColumn(code, offset);
        line = pos.line;
        column = pos.column;
      } else if (v8SnippetMatch) {
        const rawSnippet = v8SnippetMatch[1];
        const unescaped = rawSnippet.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
        let idx = code.indexOf(unescaped);
        if (idx === -1) idx = code.indexOf(rawSnippet);
        if (idx !== -1) {
          const pos = getLineAndColumn(code, idx + unescaped.length);
          line = pos.line;
          column = pos.column;
        }
      }
    }

    if (line === undefined || column === undefined) {
      // Fallback: search for unexpected token or first syntax discrepancy
      const tokenMatch = message.match(/Unexpected token '([^']+)'/);
      if (tokenMatch) {
        const tok = tokenMatch[1];
        const idx = code.lastIndexOf(tok);
        if (idx !== -1) {
          const pos = getLineAndColumn(code, idx);
          line = pos.line;
          column = pos.column;
        }
      }
    }

    if (line === undefined || column === undefined) {
      line = 1;
      column = 1;
    }

    return {
      minified: '',
      originalSize,
      minifiedSize: 0,
      bytesSaved: 0,
      reductionPercentage: 0,
      error: {
        message,
        line,
        column,
      },
    };
  }
}

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sortedObj[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sortedObj;
  }
  return obj;
}
