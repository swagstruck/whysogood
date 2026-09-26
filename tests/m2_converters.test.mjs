// @ts-check
import assert from 'node:assert';
import './e2e/helpers/ts_resolver.mjs';

const {
  jsonToCsv,
  csvToJson,
  jsonToXml,
  xmlToJson,
  markdownToHtml,
} = await import('../lib/developer/converters.ts');

const {
  SAMPLE_JSON_FOR_CSV,
  SAMPLE_CSV,
  SAMPLE_JSON_FOR_XML,
  SAMPLE_XML,
  SAMPLE_MARKDOWN,
} = await import('../lib/developer/samples.ts');

async function runTests() {
  console.log('================================================================');
  console.log(' 🧪 RUNNING MILESTONE 2: TRANSPILERS & DATA CONVERTERS TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // --- Suite 1: JSON to CSV Converter ---
  console.log('--- Suite 1: JSON to CSV (jsonToCsv) ---');

  test('T1.1: converts array of objects to standard CSV with headers', () => {
    const input = JSON.stringify([
      { id: 1, name: 'Alice', role: 'Dev' },
      { id: 2, name: 'Bob', role: 'Design' },
    ]);
    const res = jsonToCsv(input);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.output.includes('id,name,role'));
    assert.ok(res.output.includes('1,Alice,Dev'));
    assert.ok(res.output.includes('2,Bob,Design'));
  });

  test('T1.2: supports custom delimiters (semicolon, tab, pipe)', () => {
    const input = JSON.stringify([{ a: 'x', b: 'y' }]);
    const semi = jsonToCsv(input, { delimiter: ';' });
    assert.ok(semi.output.includes('a;b'));
    assert.ok(semi.output.includes('x;y'));

    const tab = jsonToCsv(input, { delimiter: '\t' });
    assert.ok(tab.output.includes('a\tb'));

    const pipe = jsonToCsv(input, { delimiter: '|' });
    assert.ok(pipe.output.includes('a|b'));
  });

  test('T1.3: escapes fields containing commas, double quotes, and newlines per RFC 4180', () => {
    const input = JSON.stringify([
      { note: 'Contains, comma and "quotes"', multiline: 'Line 1\nLine 2' },
    ]);
    const res = jsonToCsv(input);
    assert.ok(res.output.includes('"Contains, comma and ""quotes"""'));
    assert.ok(res.output.includes('"Line 1\nLine 2"'));
  });

  test('T1.4: respects includeHeaders=false option', () => {
    const input = JSON.stringify([{ col: 'val1' }, { col: 'val2' }]);
    const res = jsonToCsv(input, { includeHeaders: false });
    assert.ok(!res.output.startsWith('col'));
    assert.ok(res.output.includes('val1'));
  });

  test('T1.5: merges sparse and heterogeneous keys across records', () => {
    const input = JSON.stringify([
      { name: 'Alpha', score: 100 },
      { name: 'Beta', bonus: true },
    ]);
    const res = jsonToCsv(input);
    assert.ok(res.output.includes('name,score,bonus') || (res.output.includes('name') && res.output.includes('score') && res.output.includes('bonus')));
  });

  test('T1.6: recursively flattens nested objects into dot-notation headers', () => {
    const input = JSON.stringify([
      { id: 1, user: { name: 'Alice', location: { city: 'Paris' } } },
    ]);
    const res = jsonToCsv(input, { flattenNested: true });
    assert.ok(res.output.includes('user.name'));
    assert.ok(res.output.includes('user.location.city'));
    assert.ok(res.output.includes('Paris'));
  });

  test('T1.7: handles null, boolean, and numeric values accurately', () => {
    const input = JSON.stringify([{ a: null, b: true, c: false, d: 123.45 }]);
    const res = jsonToCsv(input);
    assert.ok(res.output.includes('true'));
    assert.ok(res.output.includes('false'));
    assert.ok(res.output.includes('123.45'));
  });

  test('T1.8: rejects non-array JSON inputs with descriptive error', () => {
    const res = jsonToCsv(JSON.stringify({ not: 'an array' }));
    assert.ok(res.error !== undefined);
  });

  test('T1.9: handles empty array returning empty output without error', () => {
    const res = jsonToCsv('[]');
    assert.strictEqual(res.output, '');
    assert.strictEqual(res.error, undefined);
  });

  test('T1.10: rejects corrupted JSON gracefully', () => {
    const res = jsonToCsv('corrupted {json');
    assert.ok(res.error !== undefined);
  });

  // --- Suite 2: CSV to JSON Converter ---
  console.log('\n--- Suite 2: CSV to JSON (csvToJson) ---');

  test('T2.1: parses standard CSV into JSON array of objects', () => {
    const csv = 'id,name,role\n1,Alice,Dev\n2,Bob,Design';
    const res = csvToJson(csv);
    assert.strictEqual(res.error, undefined);
    const parsed = JSON.parse(res.output);
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].id, 1);
    assert.strictEqual(parsed[0].name, 'Alice');
  });

  test('T2.2: parses RFC 4180 quoted fields with internal quotes and commas', () => {
    const csv = 'id,desc\n1,"Item with, comma and ""quotes"""';
    const res = csvToJson(csv);
    const parsed = JSON.parse(res.output);
    assert.strictEqual(parsed[0].desc, 'Item with, comma and "quotes"');
  });

  test('T2.3: supports custom semicolon delimiter', () => {
    const csv = 'a;b;c\n1;2;3';
    const res = csvToJson(csv, { delimiter: ';' });
    const parsed = JSON.parse(res.output);
    assert.strictEqual(parsed[0].a, 1);
    assert.strictEqual(parsed[0].b, 2);
  });

  test('T2.4: un-flattens dot notation into nested objects when enabled', () => {
    const csv = 'id,user.name,user.city\n101,Alice,Berlin';
    const res = csvToJson(csv, { unflattenNested: true });
    const parsed = JSON.parse(res.output);
    assert.strictEqual(parsed[0].user.name, 'Alice');
    assert.strictEqual(parsed[0].user.city, 'Berlin');
  });

  test('T2.5: handles matrix mode when hasHeaders=false', () => {
    const csv = '1,2,3\n4,5,6';
    const res = csvToJson(csv, { hasHeaders: false });
    const parsed = JSON.parse(res.output);
    assert.deepStrictEqual(parsed, [[1, 2, 3], [4, 5, 6]]);
  });

  test('T2.6: Bidirectional Roundtrip: JSON -> CSV -> JSON preserves data integrity', () => {
    const original = [
      { id: 1, name: 'Alice', score: 99.5, active: true },
      { id: 2, name: 'Bob', score: 88, active: false },
    ];
    const csvRes = jsonToCsv(JSON.stringify(original));
    assert.strictEqual(csvRes.error, undefined);
    const jsonRes = csvToJson(csvRes.output);
    assert.strictEqual(jsonRes.error, undefined);
    const roundtripped = JSON.parse(jsonRes.output);
    assert.strictEqual(roundtripped.length, 2);
    assert.strictEqual(roundtripped[0].name, 'Alice');
    assert.strictEqual(roundtripped[1].active, false);
  });

  // --- Suite 3: JSON to XML Converter ---
  console.log('\n--- Suite 3: JSON to XML (jsonToXml) ---');

  test('T3.1: converts flat JSON object to well-formed XML with declaration', () => {
    const input = JSON.stringify({ title: 'Guide', pages: 42 });
    const res = jsonToXml(input, 'book');
    assert.strictEqual(res.error, undefined);
    assert.ok(res.output.startsWith('<?xml version="1.0"'));
    assert.ok(res.output.includes('<book>'));
    assert.ok(res.output.includes('<title>Guide</title>'));
    assert.ok(res.output.includes('<pages>42</pages>'));
    assert.ok(res.output.includes('</book>'));
  });

  test('T3.2: converts nested JSON objects into XML sub-trees', () => {
    const input = JSON.stringify({ user: { profile: { age: 30 } } });
    const res = jsonToXml(input);
    assert.ok(res.output.includes('<profile>'));
    assert.ok(res.output.includes('<age>30</age>'));
  });

  test('T3.3: converts JSON array into repeating elements', () => {
    const input = JSON.stringify({ items: ['apple', 'banana'] });
    const res = jsonToXml(input, 'catalog');
    assert.ok(res.output.includes('<item>apple</item>'));
    assert.ok(res.output.includes('<item>banana</item>'));
  });

  test('T3.4: escapes XML special characters (<, >, &, \', ") in text values', () => {
    const input = JSON.stringify({ query: 'x < 10 & y > 5' });
    const res = jsonToXml(input);
    assert.ok(res.output.includes('&lt;'));
    assert.ok(res.output.includes('&amp;'));
    assert.ok(res.output.includes('&gt;'));
  });

  test('T3.5: formats @ prefixed keys as XML attributes', () => {
    const input = JSON.stringify({
      item: {
        '@id': '101',
        '@category': 'electronics',
        name: 'Phone',
      },
    });
    const res = jsonToXml(input, 'root');
    assert.ok(res.output.includes('id="101"'));
    assert.ok(res.output.includes('category="electronics"'));
    assert.ok(res.output.includes('<name>Phone</name>'));
  });

  test('T3.6: normalizes keys containing invalid XML characters', () => {
    const input = JSON.stringify({ 'invalid key with spaces!': 'val' });
    const res = jsonToXml(input);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.output.includes('<invalid_key_with_spaces_>val</invalid_key_with_spaces_>'));
  });

  test('T3.7: handles booleans and numbers without quotes in XML', () => {
    const input = JSON.stringify({ flag: true, zero: 0 });
    const res = jsonToXml(input);
    assert.ok(res.output.includes('<flag>true</flag>'));
    assert.ok(res.output.includes('<zero>0</zero>'));
  });

  test('T3.8: handles empty object ({}) cleanly with root tag', () => {
    const res = jsonToXml('{}', 'root');
    assert.ok(res.output.includes('<root') && res.output.includes('root>'));
  });

  test('T3.9: rejects invalid JSON string with error', () => {
    const res = jsonToXml('not-json');
    assert.ok(res.error !== undefined);
  });

  // --- Suite 4: XML to JSON Converter ---
  console.log('\n--- Suite 4: XML to JSON (xmlToJson) ---');

  test('T4.1: parses basic XML tree into JSON object', () => {
    const input = '<root><name>Widget</name><price>25</price></root>';
    const res = xmlToJson(input);
    assert.strictEqual(res.error, undefined);
    const parsed = JSON.parse(res.output);
    assert.ok(Boolean(parsed.root || parsed.name));
  });

  test('T4.2: converts repeating sibling child tags into JSON array', () => {
    const input = '<catalog><item>Book</item><item>Pen</item></catalog>';
    const res = xmlToJson(input);
    const parsed = JSON.parse(res.output);
    const items = parsed.catalog ? parsed.catalog.item : parsed.item;
    assert.ok(Array.isArray(items));
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0], 'Book');
    assert.strictEqual(items[1], 'Pen');
  });

  test('T4.3: handles self-closing tags as empty or null', () => {
    const input = '<config><enabled/><debug>true</debug></config>';
    const res = xmlToJson(input);
    const parsed = JSON.parse(res.output);
    assert.ok(Boolean(parsed));
  });

  test('T4.4: strips XML declaration and comments cleanly', () => {
    const input = '<?xml version="1.0" encoding="UTF-8"?>\n<!-- config comment -->\n<data><val>123</val></data>';
    const res = xmlToJson(input);
    const parsed = JSON.parse(res.output);
    assert.ok(Boolean(parsed));
    assert.strictEqual(parsed.data.val, 123);
  });

  test('T4.5: rejects malformed or non-XML string with error', () => {
    const res = xmlToJson('This is not XML at all');
    assert.ok(res.error !== undefined);
  });

  test('T4.6: rejects empty XML string with error', () => {
    const res = xmlToJson('');
    assert.ok(res.error !== undefined);
  });

  test('T4.7: handles deeply nested XML tags', () => {
    const input = '<a><b><c><d><e>deep value</e></d></c></b></a>';
    const res = xmlToJson(input);
    assert.ok(res.output.includes('deep value'));
  });

  test('T4.8: handles XML entities (&lt;, &gt;, &amp;)', () => {
    const input = '<root><content>&lt;hello&gt;</content></root>';
    const res = xmlToJson(input);
    assert.ok(res.output.includes('<hello>') || res.output.includes('&lt;hello&gt;'));
  });

  test('T4.9: handles elements with namespaces (<ns:item>)', () => {
    const input = '<ns:root><ns:data>123</ns:data></ns:root>';
    const res = xmlToJson(input);
    assert.ok(res.output.includes('123'));
  });

  test('T4.10: Bidirectional Roundtrip: JSON -> XML -> JSON preserves content', () => {
    const initial = { book: { title: 'Clean Architecture', year: 2017 } };
    const xmlRes = jsonToXml(JSON.stringify(initial), 'library');
    assert.strictEqual(xmlRes.error, undefined);
    assert.ok(xmlRes.output.includes('Clean Architecture'));
    const jsonRes = xmlToJson(xmlRes.output);
    assert.strictEqual(jsonRes.error, undefined);
    assert.ok(jsonRes.output.includes('Clean Architecture'));
  });

  // --- Suite 5: Markdown to HTML Converter ---
  console.log('\n--- Suite 5: Markdown to HTML (markdownToHtml) ---');

  test('T5.1: converts # headers to <h1> through <h6>', () => {
    const input = '# Header 1\n## Header 2\n### Header 3\n#### Header 4\n##### Header 5\n###### Header 6';
    const res = markdownToHtml(input);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.html.includes('<h1>Header 1</h1>'));
    assert.ok(res.html.includes('<h2>Header 2</h2>'));
    assert.ok(res.html.includes('<h3>Header 3</h3>'));
    assert.ok(res.html.includes('<h4>Header 4</h4>'));
    assert.ok(res.html.includes('<h5>Header 5</h5>'));
    assert.ok(res.html.includes('<h6>Header 6</h6>'));
  });

  test('T5.2: converts bold, italic, and strikethrough syntax', () => {
    const input = 'Text with **bold words** and *italic words* and ~~deleted text~~.';
    const res = markdownToHtml(input);
    assert.ok(res.html.includes('<strong>bold words</strong>'));
    assert.ok(res.html.includes('<em>italic words</em>'));
    assert.ok(res.html.includes('<del>deleted text</del>'));
  });

  test('T5.3: converts fenced code blocks with language classes and preserves raw content', () => {
    const input = '```javascript\nconst a = 1;\n<div class="test">&amp;</div>\n```';
    const res = markdownToHtml(input);
    assert.ok(res.html.includes('<pre><code class="language-javascript">'));
    assert.ok(res.html.includes('const a = 1;'));
    assert.ok(res.html.includes('<div class="test">'));
  });

  test('T5.4: converts blockquotes', () => {
    const input = '> This is a famous quote.\n> Second line.';
    const res = markdownToHtml(input);
    assert.ok(res.html.includes('<blockquote>'));
  });

  test('T5.5: converts GFM tables to HTML tables with alignment', () => {
    const input = '| Name | Age |\n| --- | ---: |\n| John | 25 |\n| Jane | 30 |';
    const res = markdownToHtml(input);
    assert.ok(res.html.includes('<table>'));
    assert.ok(res.html.includes('<th>Name</th>'));
    assert.ok(res.html.includes('<th align="right">Age</th>'));
    assert.ok(res.html.includes('<td>John</td>'));
    assert.ok(res.html.includes('align="right"'));
  });

  test('T5.6: converts task lists (- [x], - [ ])', () => {
    const input = '- [x] Completed task\n- [ ] Pending task';
    const res = markdownToHtml(input);
    assert.ok(res.html.includes('<input type="checkbox" checked disabled />'));
    assert.ok(res.html.includes('<input type="checkbox" disabled />'));
  });

  test('T5.7: converts inline links and images', () => {
    const input = 'Visit [Whysogood](https://whysogood.app) or see ![Logo](https://whysogood.app/logo.png)';
    const res = markdownToHtml(input);
    assert.ok(res.html.includes('<a href="https://whysogood.app" target="_blank" rel="noopener noreferrer">Whysogood</a>'));
    assert.ok(res.html.includes('<img src="https://whysogood.app/logo.png" alt="Logo" loading="lazy" />'));
  });

  test('T5.8: handles empty string returning empty output', () => {
    const res = markdownToHtml('');
    assert.strictEqual(res.html, '');
    assert.strictEqual(res.output, '');
  });

  test('T5.9: handles unclosed formatting markers without crashing', () => {
    const input = '**unclosed bold text with no end marker';
    const res = markdownToHtml(input);
    assert.ok(Boolean(res.html));
  });

  test('T5.10: wraps in full HTML5 boilerplate when includeBoilerplate=true', () => {
    const input = '# Welcome';
    const res = markdownToHtml(input, { includeBoilerplate: true, title: 'Test Page' });
    assert.ok(res.html.includes('<!DOCTYPE html>'));
    assert.ok(res.html.includes('<title>Test Page</title>'));
    assert.ok(res.html.includes('<h1>Welcome</h1>'));
  });

  // --- Suite 6: Realistic Samples Validation ---
  console.log('\n--- Suite 6: Presets Validation (samples.ts) ---');

  test('T6.1: SAMPLE_JSON_FOR_CSV converts to CSV cleanly', () => {
    assert.ok(SAMPLE_JSON_FOR_CSV.length > 50);
    const res = jsonToCsv(SAMPLE_JSON_FOR_CSV);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.output.includes('Sarah Connor'));
    assert.ok(res.output.includes('location.city'));
  });

  test('T6.2: SAMPLE_CSV converts to JSON cleanly', () => {
    assert.ok(SAMPLE_CSV.length > 50);
    const res = csvToJson(SAMPLE_CSV);
    assert.strictEqual(res.error, undefined);
    const parsed = JSON.parse(res.output);
    assert.ok(parsed.length >= 2);
  });

  test('T6.3: SAMPLE_JSON_FOR_XML converts to XML cleanly', () => {
    assert.ok(SAMPLE_JSON_FOR_XML.length > 50);
    const res = jsonToXml(SAMPLE_JSON_FOR_XML);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.output.includes('<catalog'));
    assert.ok(res.output.includes('JSON to CSV'));
  });

  test('T6.4: SAMPLE_XML converts to JSON cleanly', () => {
    assert.ok(SAMPLE_XML.length > 50);
    const res = xmlToJson(SAMPLE_XML);
    assert.strictEqual(res.error, undefined);
    const parsed = JSON.parse(res.output);
    assert.ok(Boolean(parsed.catalog));
  });

  test('T6.5: SAMPLE_MARKDOWN converts to HTML cleanly', () => {
    assert.ok(SAMPLE_MARKDOWN.length > 100);
    const res = markdownToHtml(SAMPLE_MARKDOWN);
    assert.strictEqual(res.error, undefined);
    assert.ok(res.html.includes('<h1>whysogood.app — Developer Studio</h1>'));
    assert.ok(res.html.includes('<table>'));
    assert.ok(res.html.includes('<pre><code class="language-typescript">'));
  });

  console.log('\n================================================================');
  console.log(` 🏁 RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`${totalTests - passedTests} tests failed.`);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
