/**
 * Pure Client-Side Developer Code & Query Formatters
 * HTML, CSS, JavaScript/TypeScript, and SQL Formatters
 * Zero external dependencies, 100% in-browser
 */

import type { FormatOptions, FormatResult } from './types';

/**
 * Calculates 1-indexed line and column numbers from a string offset.
 */
export function getLineAndColumn(text: string, index: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(index, text.length));
  const lines = text.slice(0, clamped).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Generates an indent string based on options.
 */
function getIndentUnit(options?: FormatOptions): string {
  if (options?.indentType === 'tabs') {
    return '\t';
  }
  const size = options?.indentSize ?? 2;
  return ' '.repeat(size);
}

// ============================================================================
// 1. HTML FORMATTER
// ============================================================================

const HTML_VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
]);

const HTML_BLOCK_ELEMENTS = new Set([
  'html', 'head', 'body', 'title', 'meta', 'link', 'style', 'script',
  'div', 'p', 'section', 'article', 'header', 'footer', 'nav', 'main',
  'aside', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr',
  'td', 'th', 'form', 'fieldset', 'legend', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'details', 'summary', 'figure', 'figcaption', 'dialog',
  'template', 'address', 'hr', 'dl', 'dt', 'dd', 'pre', 'textarea'
]);

export function formatHtml(code: string, options?: FormatOptions): FormatResult {
  if (!code || !code.trim()) {
    return { formatted: '' };
  }

  const indentUnit = getIndentUnit(options);
  let error: { message: string; line: number; column: number } | undefined;

  // Normalize newlines
  const input = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Tokenize HTML
  const tokens: Array<
    | { type: 'doctype' | 'comment' | 'tag' | 'raw_block'; content: string; tagName?: string; isClosing?: boolean; isSelfClosing?: boolean; startIndex: number }
    | { type: 'text'; content: string; startIndex: number }
  > = [];

  let idx = 0;
  const tagStack: Array<{ tag: string; index: number }> = [];

  while (idx < input.length) {
    if (input[idx] === '<') {
      const remaining = input.slice(idx);

      // 1. Comments: <!-- ... -->
      if (remaining.startsWith('<!--')) {
        const endComment = input.indexOf('-->', idx);
        const commentEnd = endComment !== -1 ? endComment + 3 : input.length;
        if (endComment === -1 && !error) {
          const pos = getLineAndColumn(input, idx);
          error = { message: 'Unclosed HTML comment', line: pos.line, column: pos.column };
        }
        tokens.push({
          type: 'comment',
          content: input.slice(idx, commentEnd),
          startIndex: idx,
        });
        idx = commentEnd;
        continue;
      }

      // 2. Doctype: <!DOCTYPE ...>
      if (remaining.toLowerCase().startsWith('<!doctype')) {
        const endDoctype = input.indexOf('>', idx);
        const doctypeEnd = endDoctype !== -1 ? endDoctype + 1 : input.length;
        tokens.push({
          type: 'doctype',
          content: input.slice(idx, doctypeEnd),
          startIndex: idx,
        });
        idx = doctypeEnd;
        continue;
      }

      // 3. CDATA: <![CDATA[ ... ]]>
      if (remaining.startsWith('<![CDATA[')) {
        const endCdata = input.indexOf(']]>', idx);
        const cdataEnd = endCdata !== -1 ? endCdata + 3 : input.length;
        tokens.push({
          type: 'comment',
          content: input.slice(idx, cdataEnd),
          startIndex: idx,
        });
        idx = cdataEnd;
        continue;
      }

      // 4. Closing Tag: </tag>
      const closeTagMatch = remaining.match(/^<\/([a-zA-Z0-9:-]+)\s*>/);
      if (closeTagMatch) {
        const tagName = closeTagMatch[1].toLowerCase();
        tokens.push({
          type: 'tag',
          content: closeTagMatch[0],
          tagName,
          isClosing: true,
          startIndex: idx,
        });

        // Verify balance
        if (tagStack.length === 0) {
          if (!error) {
            const pos = getLineAndColumn(input, idx);
            error = { message: `Unexpected closing tag </${tagName}> without matching open tag`, line: pos.line, column: pos.column };
          }
        } else {
          const top = tagStack[tagStack.length - 1];
          if (top.tag === tagName) {
            tagStack.pop();
          } else {
            // Find if it exists in stack
            const foundIndex = tagStack.findLastIndex(item => item.tag === tagName);
            if (foundIndex !== -1) {
              const unclosed = tagStack[tagStack.length - 1];
              if (!error) {
                const pos = getLineAndColumn(input, unclosed.index);
                error = { message: `Unclosed tag <${unclosed.tag}> before </${tagName}>`, line: pos.line, column: pos.column };
              }
              tagStack.splice(foundIndex);
            } else {
              if (!error) {
                const pos = getLineAndColumn(input, idx);
                error = { message: `Mismatched closing tag </${tagName}> (expected </${top.tag}>)`, line: pos.line, column: pos.column };
              }
            }
          }
        }

        idx += closeTagMatch[0].length;
        continue;
      }

      // 5. Raw blocks and opening tags (quote-aware scan to allow '>' inside attribute strings)
      let tagEnd = idx + 1;
      let inQuote: '"' | "'" | null = null;
      while (tagEnd < input.length) {
        const c = input[tagEnd];
        if (inQuote) {
          if (c === inQuote) inQuote = null;
        } else {
          if (c === '"' || c === "'") inQuote = c;
          else if (c === '>') break;
        }
        tagEnd++;
      }

      const rawTagStr = tagEnd < input.length ? input.slice(idx, tagEnd + 1) : '';
      const openTagMatch = rawTagStr ? rawTagStr.match(/^<([a-zA-Z0-9:-]+)((?:\s[\s\S]*?)?)(\/?)>$/) : null;
      if (openTagMatch) {
        const fullMatch = rawTagStr;
        const tagName = openTagMatch[1].toLowerCase();
        const isSelfClosing = openTagMatch[3] === '/' || HTML_VOID_ELEMENTS.has(tagName);

        if (!isSelfClosing && (tagName === 'script' || tagName === 'style' || tagName === 'pre' || tagName === 'textarea')) {
          const closeRegex = new RegExp(`</${tagName}\\s*>`, 'i');
          const closeMatch = remaining.slice(fullMatch.length).match(closeRegex);
          if (closeMatch && closeMatch.index !== undefined) {
            const innerStart = idx + fullMatch.length;
            const innerEnd = innerStart + closeMatch.index;
            const blockEnd = innerEnd + closeMatch[0].length;

            tokens.push({
              type: 'raw_block',
              tagName,
              content: input.slice(idx, blockEnd),
              startIndex: idx,
            });
            idx = blockEnd;
            continue;
          }
        }

        // Standard tag
        let tagContent = fullMatch;
        if (options?.quotes) {
          tagContent = normalizeTagQuotes(tagContent, options.quotes);
        }

        tokens.push({
          type: 'tag',
          content: tagContent,
          tagName,
          isClosing: false,
          isSelfClosing,
          startIndex: idx,
        });

        if (!isSelfClosing) {
          tagStack.push({ tag: tagName, index: idx });
        }

        idx += fullMatch.length;
        continue;
      }

      // If unmatched <, treat as text
      const nextAngle = input.indexOf('<', idx + 1);
      const textEnd = nextAngle !== -1 ? nextAngle : input.length;
      tokens.push({
        type: 'text',
        content: input.slice(idx, textEnd),
        startIndex: idx,
      });
      idx = textEnd;
    } else {
      // Text node
      const nextAngle = input.indexOf('<', idx);
      const textEnd = nextAngle !== -1 ? nextAngle : input.length;
      const textContent = input.slice(idx, textEnd);
      tokens.push({
        type: 'text',
        content: textContent,
        startIndex: idx,
      });
      idx = textEnd;
    }
  }

  // Check remaining unclosed tags
  if (tagStack.length > 0 && !error) {
    const unclosed = tagStack[tagStack.length - 1];
    const pos = getLineAndColumn(input, unclosed.index);
    error = { message: `Unclosed tag <${unclosed.tag}>`, line: pos.line, column: pos.column };
  }

  // Build formatted output string
  const outputLines: string[] = [];
  let currentIndentLevel = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'doctype') {
      outputLines.push(token.content.trim());
      continue;
    }

    if (token.type === 'comment') {
      const commentLines = token.content.trim().split('\n').map(l => l.trim());
      for (const line of commentLines) {
        outputLines.push(indentUnit.repeat(currentIndentLevel) + line);
      }
      continue;
    }

    if (token.type === 'raw_block') {
      const tagName = token.tagName!;
      // Match opening tag and closing tag
      const openMatch = token.content.match(/^<[a-zA-Z0-9:-]+(\s[^>]*?)?>/);
      const closeMatch = token.content.match(/<\/[a-zA-Z0-9:-]+\s*>$/);
      if (openMatch && closeMatch) {
        const openTag = openMatch[0];
        const closeTag = closeMatch[0];
        const innerContent = token.content.slice(openTag.length, token.content.length - closeTag.length);

        outputLines.push(indentUnit.repeat(currentIndentLevel) + openTag);

        if (tagName === 'pre' || tagName === 'textarea') {
          // Preserve verbatim
          outputLines.push(innerContent);
        } else if (tagName === 'style') {
          const formattedStyle = formatCss(innerContent, options);
          const innerLines = formattedStyle.formatted.trim().split('\n');
          for (const sLine of innerLines) {
            if (sLine.trim()) {
              outputLines.push(indentUnit.repeat(currentIndentLevel + 1) + sLine);
            }
          }
        } else if (tagName === 'script') {
          const formattedJs = formatJs(innerContent, options);
          const innerLines = formattedJs.formatted.trim().split('\n');
          for (const jLine of innerLines) {
            if (jLine.trim()) {
              outputLines.push(indentUnit.repeat(currentIndentLevel + 1) + jLine);
            }
          }
        }

        outputLines.push(indentUnit.repeat(currentIndentLevel) + closeTag);
      } else {
        outputLines.push(token.content);
      }
      continue;
    }

    if (token.type === 'tag') {
      const tagName = token.tagName || '';
      const isBlock = HTML_BLOCK_ELEMENTS.has(tagName);

      if (token.isClosing) {
        currentIndentLevel = Math.max(0, currentIndentLevel - 1);
        outputLines.push(indentUnit.repeat(currentIndentLevel) + token.content);
      } else if (token.isSelfClosing) {
        outputLines.push(indentUnit.repeat(currentIndentLevel) + token.content);
      } else {
        // Opening tag
        // Check if next token is short text followed immediately by closing tag: e.g. <title>Hello</title>
        const next1 = tokens[i + 1];
        const next2 = tokens[i + 2];
        if (
          next1 && next1.type === 'text' && !next1.content.includes('\n') &&
          next2 && next2.type === 'tag' && next2.isClosing && next2.tagName === tagName &&
          (next1.content.trim().length + token.content.length + next2.content.length < 80)
        ) {
          outputLines.push(
            indentUnit.repeat(currentIndentLevel) +
            token.content +
            next1.content.trim() +
            next2.content
          );
          i += 2;
          continue;
        }

        outputLines.push(indentUnit.repeat(currentIndentLevel) + token.content);
        if (isBlock) {
          currentIndentLevel++;
        } else {
          currentIndentLevel++;
        }
      }
      continue;
    }

    if (token.type === 'text') {
      const text = token.content.trim();
      if (!text) continue;
      // Multi-line text or inline text
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        outputLines.push(indentUnit.repeat(currentIndentLevel) + line);
      }
    }
  }

  return {
    formatted: outputLines.join('\n').trim() + '\n',
    error,
  };
}

function normalizeTagQuotes(tag: string, quoteType: 'double' | 'single'): string {
  const targetQuote = quoteType === 'single' ? "'" : '"';
  return tag.replace(/([a-zA-Z0-9:-]+)=(['"])(.*?)\2/g, (match, name, q, val) => {
    if (val.includes(targetQuote)) {
      return match; // Keep existing if contains conflicting quote
    }
    return `${name}=${targetQuote}${val}${targetQuote}`;
  });
}

// ============================================================================
// 2. CSS FORMATTER
// ============================================================================

export function formatCss(code: string, options?: FormatOptions): FormatResult {
  if (!code || !code.trim()) {
    return { formatted: '' };
  }

  const indentUnit = getIndentUnit(options);
  let error: { message: string; line: number; column: number } | undefined;

  const input = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const tokens: Array<{ type: 'comment' | 'string' | 'char' | 'word'; value: string; index: number }> = [];

  let i = 0;
  while (i < input.length) {
    // Comment
    if (input.slice(i, i + 2) === '/*') {
      const endComment = input.indexOf('*/', i + 2);
      const cEnd = endComment !== -1 ? endComment + 2 : input.length;
      if (endComment === -1 && !error) {
        const pos = getLineAndColumn(input, i);
        error = { message: 'Unterminated CSS comment', line: pos.line, column: pos.column };
      }
      tokens.push({ type: 'comment', value: input.slice(i, cEnd), index: i });
      i = cEnd;
      continue;
    }

    // String
    if (input[i] === '"' || input[i] === "'") {
      const q = input[i];
      let end = i + 1;
      let escaped = false;
      while (end < input.length) {
        if (input[end] === '\\') {
          escaped = !escaped;
        } else if (input[end] === q && !escaped) {
          end++;
          break;
        } else {
          escaped = false;
        }
        end++;
      }
      if (end >= input.length && input[end - 1] !== q && !error) {
        const pos = getLineAndColumn(input, i);
        error = { message: 'Unterminated CSS string literal', line: pos.line, column: pos.column };
      }

      let strVal = input.slice(i, end);
      if (options?.quotes) {
        const targetQ = options.quotes === 'single' ? "'" : '"';
        const inner = strVal.slice(1, -1);
        if (!inner.includes(targetQ)) {
          strVal = `${targetQ}${inner}${targetQ}`;
        }
      }

      tokens.push({ type: 'string', value: strVal, index: i });
      i = end;
      continue;
    }

    // Structural characters
    const ch = input[i];
    if (ch === '{' || ch === '}' || ch === ';' || ch === ':' || ch === ',') {
      tokens.push({ type: 'char', value: ch, index: i });
      i++;
      continue;
    }

    // Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Words / values
    const start = i;
    while (i < input.length && !/[\s{};:,"']/.test(input[i])) {
      if (input.slice(i, i + 2) === '/*') break;
      i++;
    }
    tokens.push({ type: 'word', value: input.slice(start, i), index: start });
  }

  // Check brace balance
  let braceDepth = 0;
  for (const t of tokens) {
    if (t.type === 'char' && t.value === '{') {
      braceDepth++;
    } else if (t.type === 'char' && t.value === '}') {
      braceDepth--;
      if (braceDepth < 0 && !error) {
        const pos = getLineAndColumn(input, t.index);
        error = { message: 'Unexpected closing brace "}" without opening "{"', line: pos.line, column: pos.column };
      }
    }
  }
  if (braceDepth > 0 && !error) {
    const lastOpen = tokens.findLast(t => t.type === 'char' && t.value === '{');
    const pos = getLineAndColumn(input, lastOpen ? lastOpen.index : input.length);
    error = { message: `Unclosed CSS block (${braceDepth} unclosed brace${braceDepth > 1 ? 's' : ''})`, line: pos.line, column: pos.column };
  }

  // Format CSS tokens
  const formattedLines: string[] = [];
  let currentIndent = 0;
  let currentLine = '';
  let inDeclaration = false;

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];

    if (t.type === 'comment') {
      if (currentLine.trim()) {
        formattedLines.push(indentUnit.repeat(currentIndent) + currentLine.trim());
        currentLine = '';
      }
      formattedLines.push(indentUnit.repeat(currentIndent) + t.value);
      continue;
    }

    if (t.type === 'char') {
      if (t.value === '{') {
        const selector = currentLine.trim();
        formattedLines.push(indentUnit.repeat(currentIndent) + (selector ? selector + ' {' : '{'));
        currentIndent++;
        currentLine = '';
        inDeclaration = false;
        continue;
      }

      if (t.value === '}') {
        if (currentLine.trim()) {
          // If declaration not terminated with semicolon, add one
          let decl = currentLine.trim();
          if (!decl.endsWith(';') && inDeclaration) {
            decl += ';';
          }
          formattedLines.push(indentUnit.repeat(currentIndent) + decl);
          currentLine = '';
        }
        currentIndent = Math.max(0, currentIndent - 1);
        formattedLines.push(indentUnit.repeat(currentIndent) + '}');
        inDeclaration = false;

        // Blank line after top-level rule
        if (currentIndent === 0 && idx < tokens.length - 1) {
          formattedLines.push('');
        }
        continue;
      }

      if (t.value === ';') {
        currentLine += ';';
        formattedLines.push(indentUnit.repeat(currentIndent) + currentLine.trim());
        currentLine = '';
        inDeclaration = false;
        continue;
      }

      if (t.value === ':') {
        const prev = tokens[idx - 1];
        const next = tokens[idx + 1];
        const isDoubleColon = (next && next.type === 'char' && next.value === ':') ||
                              (prev && prev.type === 'char' && prev.value === ':');

        let isSelector = false;
        let parenCount = 0;
        for (let k = idx + 1; k < tokens.length; k++) {
          const tk = tokens[k];
          if (tk.type === 'char') {
            if (tk.value === '(') parenCount++;
            else if (tk.value === ')') parenCount = Math.max(0, parenCount - 1);
            else if (parenCount === 0) {
              if (tk.value === '{') {
                isSelector = true;
                break;
              }
              if (tk.value === ';' || tk.value === '}') {
                isSelector = false;
                break;
              }
            }
          }
        }

        const isMediaFeature = currentLine.includes('@media') || currentLine.includes('@supports') || currentLine.includes('@container');

        if (isDoubleColon || (isSelector && !isMediaFeature)) {
          currentLine += ':';
        } else {
          currentLine += ': ';
          inDeclaration = true;
        }
        continue;
      }

      if (t.value === ',') {
        currentLine += ', ';
        continue;
      }
    }

    // Word or string
    if (t.type === 'word' || t.type === 'string') {
      if (currentLine.length > 0 &&
          !currentLine.endsWith(' ') &&
          !currentLine.endsWith('(') &&
          !currentLine.endsWith(':')) {
        currentLine += ' ';
      }
      currentLine += t.value;
    }
  }

  if (currentLine.trim()) {
    formattedLines.push(indentUnit.repeat(currentIndent) + currentLine.trim());
  }

  // Clean empty lines
  const cleaned = formattedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

  return {
    formatted: cleaned,
    error,
  };
}

// ============================================================================
// 3. JAVASCRIPT / TYPESCRIPT FORMATTER
// ============================================================================

export function formatJs(code: string, options?: FormatOptions): FormatResult {
  if (!code || !code.trim()) {
    return { formatted: '' };
  }

  const indentUnit = getIndentUnit(options);
  const useSemicolons = options?.semicolons !== false;
  let error: { message: string; line: number; column: number } | undefined;

  const input = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Tokenize JS
  interface JsToken {
    type: 'keyword' | 'identifier' | 'number' | 'string' | 'template' | 'regex' | 'comment' | 'operator' | 'punct' | 'newline';
    value: string;
    index: number;
  }

  const tokens: JsToken[] = [];
  let i = 0;

  const JS_KEYWORDS = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
    'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch',
    'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
    'let', 'static', 'async', 'await', 'from', 'as', 'type', 'interface'
  ]);

  while (i < input.length) {
    const ch = input[i];

    // Single-line comment
    if (input.slice(i, i + 2) === '//') {
      const endLine = input.indexOf('\n', i + 2);
      const cEnd = endLine !== -1 ? endLine : input.length;
      tokens.push({ type: 'comment', value: input.slice(i, cEnd), index: i });
      i = cEnd;
      continue;
    }

    // Multi-line comment
    if (input.slice(i, i + 2) === '/*') {
      const endComment = input.indexOf('*/', i + 2);
      const cEnd = endComment !== -1 ? endComment + 2 : input.length;
      if (endComment === -1 && !error) {
        const pos = getLineAndColumn(input, i);
        error = { message: 'Unterminated block comment', line: pos.line, column: pos.column };
      }
      tokens.push({ type: 'comment', value: input.slice(i, cEnd), index: i });
      i = cEnd;
      continue;
    }

    // Template literal (with nested expression and nested template support)
    if (ch === '`') {
      let end = i + 1;
      let escaped = false;
      const stack: Array<{ type: 'template' } | { type: 'expr'; braceDepth: number }> = [{ type: 'template' }];

      while (end < input.length && stack.length > 0) {
        const c = input[end];
        if (escaped) {
          escaped = false;
          end++;
          continue;
        }
        if (c === '\\') {
          escaped = true;
          end++;
          continue;
        }

        const top = stack[stack.length - 1];
        if (top.type === 'template') {
          if (c === '`') {
            stack.pop();
            end++;
            continue;
          }
          if (c === '$' && input[end + 1] === '{') {
            stack.push({ type: 'expr', braceDepth: 1 });
            end += 2;
            continue;
          }
          end++;
        } else {
          // Inside ${ ... } expression
          if (c === '"' || c === "'") {
            const q = c;
            end++;
            let strEscaped = false;
            while (end < input.length) {
              if (strEscaped) {
                strEscaped = false;
              } else if (input[end] === '\\') {
                strEscaped = true;
              } else if (input[end] === q) {
                end++;
                break;
              }
              end++;
            }
            continue;
          }
          if (c === '`') {
            stack.push({ type: 'template' });
            end++;
            continue;
          }
          if (c === '{') {
            top.braceDepth++;
            end++;
            continue;
          }
          if (c === '}') {
            top.braceDepth--;
            if (top.braceDepth === 0) {
              stack.pop();
            }
            end++;
            continue;
          }
          end++;
        }
      }

      if (stack.length > 0 && !error) {
        const pos = getLineAndColumn(input, i);
        error = { message: 'Unterminated template literal', line: pos.line, column: pos.column };
      }

      tokens.push({ type: 'template', value: input.slice(i, end), index: i });
      i = end;
      continue;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      let end = i + 1;
      let escaped = false;
      while (end < input.length) {
        if (input[end] === '\\') {
          escaped = !escaped;
        } else if (input[end] === ch && !escaped) {
          end++;
          break;
        } else {
          escaped = false;
        }
        end++;
      }
      if (end >= input.length && input[end - 1] !== ch && !error) {
        const pos = getLineAndColumn(input, i);
        error = { message: `Unterminated string literal`, line: pos.line, column: pos.column };
      }

      let val = input.slice(i, end);
      if (options?.quotes) {
        const targetQ = options.quotes === 'single' ? "'" : '"';
        const inner = val.slice(1, -1);
        if (!inner.includes(targetQ)) {
          val = `${targetQ}${inner}${targetQ}`;
        }
      }

      tokens.push({ type: 'string', value: val, index: i });
      i = end;
      continue;
    }

    // Regex vs Division
    if (ch === '/') {
      const prevNonWhitespace = tokens.findLast(t => t.type !== 'newline' && t.type !== 'comment');
      const isRegex = !prevNonWhitespace ||
        prevNonWhitespace.type === 'operator' ||
        (prevNonWhitespace.type === 'punct' && ['(', '[', '{', ';', ',', ':'].includes(prevNonWhitespace.value)) ||
        (prevNonWhitespace.type === 'keyword' && ['return', 'case', 'throw', 'yield', 'typeof'].includes(prevNonWhitespace.value));

      if (isRegex) {
        let end = i + 1;
        let escaped = false;
        let inClass = false;
        while (end < input.length) {
          if (input[end] === '\\') {
            escaped = !escaped;
          } else if (input[end] === '[' && !escaped) {
            inClass = true;
          } else if (input[end] === ']' && !escaped) {
            inClass = false;
          } else if (input[end] === '/' && !escaped && !inClass) {
            end++;
            // flags
            while (end < input.length && /[a-z]/i.test(input[end])) {
              end++;
            }
            break;
          } else {
            escaped = false;
          }
          end++;
        }
        tokens.push({ type: 'regex', value: input.slice(i, end), index: i });
        i = end;
        continue;
      }
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(input[i + 1] || ''))) {
      let end = i;
      while (end < input.length && /[0-9a-fA-FxXoObB._eE+-]/.test(input[end])) {
        end++;
      }
      tokens.push({ type: 'number', value: input.slice(i, end), index: i });
      i = end;
      continue;
    }

    // Multi-character operators and symbols: ===, !==, <=, >=, ==, !=, &&, ||, ??, =>, ++, --, +=, -=, ..., etc.
    const multiOp = input.slice(i, i + 3).match(/^(===|!==|\?\?=|<<=|>>=|\.\.\.)/);
    if (multiOp) {
      if (multiOp[0] === '...') {
        tokens.push({ type: 'punct', value: '...', index: i });
      } else {
        tokens.push({ type: 'operator', value: multiOp[0], index: i });
      }
      i += multiOp[0].length;
      continue;
    }

    // Optional chaining ?.
    if (input.slice(i, i + 2) === '?.') {
      tokens.push({ type: 'punct', value: '?.', index: i });
      i += 2;
      continue;
    }

    // Punctuators
    if (/^[{}()[\];,:\.]/.test(ch)) {
      tokens.push({ type: 'punct', value: ch, index: i });
      i++;
      continue;
    }

    const twoOp = input.slice(i, i + 2).match(/^(&&|\|\||\?\?|==|!=|<=|>=|=>|\+\+|--|\+=|-=|\*=|\/=|%=|&=|\|=|\^=)/);
    if (twoOp) {
      tokens.push({ type: 'operator', value: twoOp[0], index: i });
      i += twoOp[0].length;
      continue;
    }

    if (/^[=+\-*\/%<>!&|^~?]/.test(ch)) {
      tokens.push({ type: 'operator', value: ch, index: i });
      i++;
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_$]/.test(ch)) {
      let end = i;
      while (end < input.length && /[a-zA-Z0-9_$]/.test(input[end])) {
        end++;
      }
      const word = input.slice(i, end);
      const isKw = JS_KEYWORDS.has(word);
      tokens.push({ type: isKw ? 'keyword' : 'identifier', value: word, index: i });
      i = end;
      continue;
    }

    // Newlines & Whitespace
    if (ch === '\n') {
      tokens.push({ type: 'newline', value: '\n', index: i });
      i++;
      continue;
    }

    i++;
  }

  // Bracket validation
  const bracketStack: Array<{ char: string; index: number }> = [];
  const bracketPairs: Record<string, string> = { '}': '{', ')': '(', ']': '[' };
  for (const t of tokens) {
    if (t.type === 'punct') {
      if (['{', '(', '['].includes(t.value)) {
        bracketStack.push({ char: t.value, index: t.index });
      } else if (['}', ')', ']'].includes(t.value)) {
        const expected = bracketPairs[t.value];
        if (bracketStack.length === 0 || bracketStack[bracketStack.length - 1].char !== expected) {
          if (!error) {
            const pos = getLineAndColumn(input, t.index);
            error = { message: `Unmatched closing bracket "${t.value}"`, line: pos.line, column: pos.column };
          }
        } else {
          bracketStack.pop();
        }
      }
    }
  }
  if (bracketStack.length > 0 && !error) {
    const unclosed = bracketStack[bracketStack.length - 1];
    const pos = getLineAndColumn(input, unclosed.index);
    error = { message: `Unclosed bracket "${unclosed.char}"`, line: pos.line, column: pos.column };
  }

  // Formatting assembly
  const outputLines: string[] = [];
  let currentIndent = 0;
  let currentLine = '';

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    const prev = tokens[idx - 1];
    const next = tokens[idx + 1];

    if (t.type === 'comment') {
      if (t.value.startsWith('//')) {
        if (currentLine.trim()) {
          currentLine += ' ' + t.value;
          outputLines.push(indentUnit.repeat(currentIndent) + currentLine.trim());
          currentLine = '';
        } else {
          outputLines.push(indentUnit.repeat(currentIndent) + t.value);
        }
      } else {
        if (currentLine.trim()) {
          currentLine += ' ' + t.value;
        } else {
          outputLines.push(indentUnit.repeat(currentIndent) + t.value);
        }
      }
      continue;
    }

    if (t.type === 'punct') {
      if (t.value === '.' || t.value === '?.') {
        currentLine = currentLine.trimEnd() + t.value;
        continue;
      }

      if (t.value === '...') {
        if (currentLine.length > 0 && !currentLine.endsWith(' ') && !currentLine.endsWith('(') && !currentLine.endsWith('[')) {
          currentLine += ' ';
        }
        currentLine += '...';
        continue;
      }

      if (t.value === '{') {
        if (currentLine.trim()) {
          currentLine += ' {';
        } else {
          currentLine = '{';
        }
        outputLines.push(indentUnit.repeat(currentIndent) + currentLine.trim());
        currentIndent++;
        currentLine = '';
        continue;
      }

      if (t.value === '}') {
        if (currentLine.trim()) {
          outputLines.push(indentUnit.repeat(currentIndent) + currentLine.trim());
          currentLine = '';
        }
        currentIndent = Math.max(0, currentIndent - 1);

        // Check if followed by else / catch / finally or ; / , / )
        if (next && next.type === 'keyword' && ['else', 'catch', 'finally'].includes(next.value)) {
          currentLine = '} ';
        } else if (next && next.type === 'punct' && (next.value === ';' || next.value === ',' || next.value === ')')) {
          currentLine = '}';
        } else {
          outputLines.push(indentUnit.repeat(currentIndent) + '}');
        }
        continue;
      }

      if (t.value === ';') {
        if (useSemicolons) {
          currentLine += ';';
        }
        outputLines.push(indentUnit.repeat(currentIndent) + currentLine.trim());
        currentLine = '';
        continue;
      }

      if (t.value === ',') {
        currentLine += ', ';
        continue;
      }

      if (t.value === ':') {
        currentLine += ': ';
        continue;
      }

      if (t.value === '(') {
        if (prev && prev.type === 'keyword' && ['if', 'for', 'while', 'switch', 'catch', 'with'].includes(prev.value)) {
          if (!currentLine.endsWith(' ')) currentLine += ' ';
        }
        currentLine += '(';
        continue;
      }

      if (t.value === '[') {
        if (prev && prev.type !== 'identifier' && prev.type !== 'punct' && !currentLine.endsWith(' ') && !currentLine.endsWith('=')) {
          currentLine += ' ';
        }
        currentLine += '[';
        continue;
      }

      if (t.value === ')' || t.value === ']') {
        currentLine = currentLine.trimEnd() + t.value;
        continue;
      }
    }

    if (t.type === 'operator') {
      if (['++', '--', '!', '~'].includes(t.value)) {
        currentLine += t.value;
      } else {
        if (currentLine.length > 0 && !currentLine.endsWith(' ') && !currentLine.endsWith('(')) {
          currentLine += ' ';
        }
        currentLine += t.value + ' ';
      }
      continue;
    }

    if (t.type === 'keyword') {
      if (currentLine.length > 0 && !currentLine.endsWith(' ') && !currentLine.endsWith('(') && !currentLine.endsWith('{')) {
        currentLine += ' ';
      }
      currentLine += t.value;
      if (['return', 'const', 'let', 'var', 'case', 'throw', 'import', 'export', 'type', 'interface', 'as', 'from', 'default'].includes(t.value)) {
        currentLine += ' ';
      }
      continue;
    }

    if (t.type === 'newline') {
      // Natural newline break if statement complete
      if (currentLine.trim().endsWith('{') || currentLine.trim().endsWith(';')) {
        outputLines.push(indentUnit.repeat(currentIndent) + currentLine.trim());
        currentLine = '';
      }
      continue;
    }

    // Default identifier, number, string, regex
    if (currentLine.length > 0 &&
        !currentLine.endsWith(' ') &&
        !currentLine.endsWith('(') &&
        !currentLine.endsWith('[') &&
        !currentLine.endsWith('{') &&
        !currentLine.endsWith('.') &&
        !currentLine.endsWith('?.') &&
        !currentLine.endsWith('...')) {
      currentLine += ' ';
    }
    currentLine += t.value;
  }

  if (currentLine.trim()) {
    outputLines.push(indentUnit.repeat(currentIndent) + currentLine.trim());
  }

  const cleaned = outputLines.filter(Boolean).join('\n').trim() + '\n';

  return {
    formatted: cleaned,
    error,
  };
}

// ============================================================================
// 4. SQL FORMATTER
// ============================================================================

const SQL_MAJOR_CLAUSES = [
  'WITH', 'SELECT DISTINCT', 'SELECT', 'FROM', 'WHERE',
  'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET',
  'UNION ALL', 'UNION', 'INSERT INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE FROM', 'DELETE',
  'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE'
];

const SQL_JOIN_CLAUSES = [
  'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN',
  'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'CROSS JOIN', 'JOIN'
];

const SQL_KEYWORDS = new Set([
  'SELECT', 'DISTINCT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'CROSS', 'ON', 'AS',
  'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'PRIMARY', 'KEY',
  'FOREIGN', 'REFERENCES', 'UNION', 'ALL', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'COALESCE', 'COUNT', 'SUM',
  'AVG', 'MIN', 'MAX', 'OVER', 'PARTITION', 'ROW_NUMBER', 'WITH'
]);

export function formatSql(code: string, options?: FormatOptions): FormatResult {
  if (!code || !code.trim()) {
    return { formatted: '' };
  }

  const indentUnit = getIndentUnit(options);
  const keywordCase = options?.sqlKeywordCase ?? 'upper';
  let error: { message: string; line: number; column: number } | undefined;

  const input = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Tokenize SQL
  interface SqlToken {
    type: 'comment' | 'string' | 'identifier' | 'word' | 'punct' | 'number' | 'operator';
    value: string;
    index: number;
  }

  const tokens: SqlToken[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // Single-line comment: -- or #
    if (input.slice(i, i + 2) === '--' || ch === '#') {
      const endLine = input.indexOf('\n', i);
      const cEnd = endLine !== -1 ? endLine : input.length;
      tokens.push({ type: 'comment', value: input.slice(i, cEnd), index: i });
      i = cEnd;
      continue;
    }

    // Block comment: /* ... */
    if (input.slice(i, i + 2) === '/*') {
      const endComment = input.indexOf('*/', i + 2);
      const cEnd = endComment !== -1 ? endComment + 2 : input.length;
      if (endComment === -1 && !error) {
        const pos = getLineAndColumn(input, i);
        error = { message: 'Unclosed SQL block comment', line: pos.line, column: pos.column };
      }
      tokens.push({ type: 'comment', value: input.slice(i, cEnd), index: i });
      i = cEnd;
      continue;
    }

    // String literal: '...' (escaped by '')
    if (ch === "'") {
      let end = i + 1;
      while (end < input.length) {
        if (input[end] === "'") {
          if (input[end + 1] === "'") {
            end += 2;
            continue;
          }
          end++;
          break;
        }
        end++;
      }
      if (end >= input.length && input[end - 1] !== "'" && !error) {
        const pos = getLineAndColumn(input, i);
        error = { message: 'Unclosed SQL string literal', line: pos.line, column: pos.column };
      }
      tokens.push({ type: 'string', value: input.slice(i, end), index: i });
      i = end;
      continue;
    }

    // Quoted Identifier: "..." or `...` or [...]
    if (ch === '"' || ch === '`' || ch === '[') {
      const closing = ch === '[' ? ']' : ch;
      let end = i + 1;
      while (end < input.length && input[end] !== closing) {
        end++;
      }
      if (end < input.length) end++;
      tokens.push({ type: 'identifier', value: input.slice(i, end), index: i });
      i = end;
      continue;
    }

    // Numbers: e.g. 100, 3.14, .5
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(input[i + 1] || ''))) {
      let end = i;
      while (end < input.length && /[0-9.]/.test(input[end])) {
        end++;
      }
      tokens.push({ type: 'number', value: input.slice(i, end), index: i });
      i = end;
      continue;
    }

    // Operators & Punctuation
    if (['(', ')', ',', ';', '.'].includes(ch)) {
      tokens.push({ type: 'punct', value: ch, index: i });
      i++;
      continue;
    }

    if (/^[=<>!+*\/%\-]/.test(ch)) {
      const twoOp = input.slice(i, i + 2).match(/^(<=|>=|<>|!=)/);
      if (twoOp) {
        tokens.push({ type: 'operator', value: twoOp[0], index: i });
        i += 2;
      } else {
        tokens.push({ type: 'operator', value: ch, index: i });
        i++;
      }
      continue;
    }

    // Words
    if (/[a-zA-Z_]/.test(ch)) {
      let end = i;
      while (end < input.length && /[a-zA-Z0-9_]/.test(input[end])) {
        end++;
      }
      const rawWord = input.slice(i, end);
      const upperWord = rawWord.toUpperCase();

      let transformed = rawWord;
      if (SQL_KEYWORDS.has(upperWord)) {
        if (keywordCase === 'upper') {
          transformed = upperWord;
        } else if (keywordCase === 'lower') {
          transformed = rawWord.toLowerCase();
        }
      }

      tokens.push({ type: 'word', value: transformed, index: i });
      i = end;
      continue;
    }

    i++;
  }

  // Parentheses check
  let parenDepth = 0;
  for (const t of tokens) {
    if (t.type === 'punct' && t.value === '(') {
      parenDepth++;
    } else if (t.type === 'punct' && t.value === ')') {
      parenDepth--;
      if (parenDepth < 0 && !error) {
        const pos = getLineAndColumn(input, t.index);
        error = { message: 'Unexpected closing parenthesis ")"', line: pos.line, column: pos.column };
      }
    }
  }
  if (parenDepth > 0 && !error) {
    const lastOpen = tokens.findLast(t => t.type === 'punct' && t.value === '(');
    const pos = getLineAndColumn(input, lastOpen ? lastOpen.index : input.length);
    error = { message: `Unclosed parenthesis (${parenDepth} unclosed)`, line: pos.line, column: pos.column };
  }

  // Formatting logic
  const lines: string[] = [];
  let currentIndent = 0;
  let currentLine = '';
  let totalParenDepth = 0;
  const subqueryDepths: number[] = [];

  const pushLine = (lineContent: string) => {
    if (lineContent.trim()) {
      lines.push(indentUnit.repeat(currentIndent) + lineContent.trim());
    }
  };

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    const upperVal = t.value.toUpperCase();

    // Check for multi-word major clauses: e.g. "GROUP BY", "ORDER BY", "INSERT INTO", "UNION ALL"
    const nextToken = tokens[idx + 1];
    const twoWordClause = nextToken ? `${upperVal} ${nextToken.value.toUpperCase()}` : '';

    if (t.type === 'comment') {
      if (currentLine.trim()) {
        pushLine(currentLine);
        currentLine = '';
      }
      lines.push(indentUnit.repeat(currentIndent) + t.value);
      continue;
    }

    if (SQL_MAJOR_CLAUSES.includes(twoWordClause)) {
      if (currentLine.trim()) {
        pushLine(currentLine);
        currentLine = '';
      }
      const clauseText = keywordCase === 'lower' ? twoWordClause.toLowerCase() : twoWordClause;
      currentLine = clauseText;
      idx++; // skip second word
      continue;
    }

    if (SQL_MAJOR_CLAUSES.includes(upperVal)) {
      if (currentLine.trim()) {
        pushLine(currentLine);
        currentLine = '';
      }
      currentLine = t.value;
      continue;
    }

    // Check join clauses
    const next2 = tokens[idx + 2];
    const threeWordClause = nextToken && next2 ? `${upperVal} ${nextToken.value.toUpperCase()} ${next2.value.toUpperCase()}` : '';
    if (SQL_JOIN_CLAUSES.includes(threeWordClause)) {
      if (currentLine.trim()) {
        pushLine(currentLine);
        currentLine = '';
      }
      const jText = keywordCase === 'lower' ? threeWordClause.toLowerCase() : threeWordClause;
      currentLine = jText;
      idx += 2;
      continue;
    }

    if (SQL_JOIN_CLAUSES.includes(twoWordClause)) {
      if (currentLine.trim()) {
        pushLine(currentLine);
        currentLine = '';
      }
      const jText = keywordCase === 'lower' ? twoWordClause.toLowerCase() : twoWordClause;
      currentLine = jText;
      idx++;
      continue;
    }

    if (SQL_JOIN_CLAUSES.includes(upperVal)) {
      if (currentLine.trim()) {
        pushLine(currentLine);
        currentLine = '';
      }
      currentLine = t.value;
      continue;
    }

    // AND / OR logical operators
    if (upperVal === 'AND' || upperVal === 'OR') {
      if (currentLine.trim()) {
        pushLine(currentLine);
        currentLine = '';
      }
      currentLine = '  ' + t.value;
      continue;
    }

    // Dot operator (table.column)
    if (t.type === 'punct' && t.value === '.') {
      currentLine = currentLine.trimEnd() + '.';
      continue;
    }

    // Comma formatting in column list
    if (t.type === 'punct' && t.value === ',') {
      currentLine += ',';
      // In select clause, put each column on a new line indented
      if (currentLine.trim().toUpperCase().startsWith('SELECT')) {
        pushLine(currentLine);
        currentLine = '  ';
      } else {
        currentLine += ' ';
      }
      continue;
    }

    // Parentheses
    if (t.type === 'punct' && t.value === '(') {
      totalParenDepth++;
      // Check if subquery follows
      if (nextToken && nextToken.value.toUpperCase() === 'SELECT') {
        subqueryDepths.push(totalParenDepth);
        currentLine += ' (';
        pushLine(currentLine);
        currentLine = '';
        currentIndent++;
        continue;
      }
      currentLine += '(';
      continue;
    }

    if (t.type === 'punct' && t.value === ')') {
      const isSubqueryClose = subqueryDepths.length > 0 && subqueryDepths[subqueryDepths.length - 1] === totalParenDepth;
      totalParenDepth = Math.max(0, totalParenDepth - 1);

      if (isSubqueryClose) {
        subqueryDepths.pop();
        if (currentLine.trim()) {
          pushLine(currentLine);
          currentLine = '';
        }
        currentIndent = Math.max(0, currentIndent - 1);
        currentLine = ')';
        continue;
      }
      currentLine = currentLine.trimEnd() + ')';
      continue;
    }

    if (t.type === 'punct' && t.value === ';') {
      currentLine += ';';
      pushLine(currentLine);
      currentLine = '';
      continue;
    }

    // Operators
    if (t.type === 'operator') {
      if (t.value === '*' && currentLine.endsWith('(') && nextToken && nextToken.value === ')') {
        currentLine += '*';
      } else {
        currentLine += ` ${t.value} `;
      }
      continue;
    }

    // Normal tokens
    if (currentLine.length > 0 && !currentLine.endsWith(' ') && !currentLine.endsWith('(') && !currentLine.endsWith('.')) {
      currentLine += ' ';
    }
    currentLine += t.value;
  }

  if (currentLine.trim()) {
    pushLine(currentLine);
  }

  const cleaned = lines.join('\n').replace(/[ \t]+$/gm, '').trim() + '\n';

  return {
    formatted: cleaned,
    error,
  };
}
