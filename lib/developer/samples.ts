/**
 * Realistic Developer Code Samples for whysogood.app
 * High quality real-world presets for HTML, CSS, JS, SQL, and JSON
 */

export const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>whysogood - Developer Studio</title>
<!-- Primary styling -->
<style>
.container { max-width: 1200px; margin: 0 auto; padding: 24px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.card { background: #ffffff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
</style>
</head>
<body>
<header class="header">
<div class="container">
<h1>whysogood Utilities</h1>
<nav><a href="#tools">Tools</a><a href="#about">About</a><a href="#privacy">Privacy</a></nav>
</div>
</header>
<main class="container">
<section id="tools">
<h2>Developer Tools Suite</h2>
<p>All processing executes <strong>100% in-browser</strong> with zero server uploads.</p>
<div class="card-grid">
<article class="card">
<h3>Code Formatter</h3>
<p>Beautify and indent HTML, CSS, JavaScript, and SQL in seconds.</p>
<button type="button" onclick="activateTool('formatter')">Launch Tool</button>
</article>
<article class="card">
<h3>Asset Minifier</h3>
<p>Compress markup and styles while strictly preserving calc expressions.</p>
<button type="button" onclick="activateTool('minifier')">Launch Tool</button>
</article>
</div>
</section>
</main>
<script>
function activateTool(name) {
console.log('Activating tool:', name);
alert('Ready to format and optimize: ' + name);
}
</script>
</body>
</html>`;

export const SAMPLE_CSS = `:root {
  --brand: #6060e8;
  --brand-hover: #4e4ed4;
  --bg-surface: #141414;
  --border-color: #2a2a2a;
  --text-primary: #fafafa;
  --header-height: 64px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--bg-surface);
  color: var(--text-primary);
  line-height: 1.6;
}

.workspace-shell {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - var(--header-height));
  width: 100%;
}

.editor-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: calc(100% - 32px);
  margin: 16px auto;
}

.editor-pane {
  background: #1c1c1c;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.editor-pane:hover {
  border-color: var(--brand);
  box-shadow: 0 8px 24px rgba(96, 96, 232, 0.15);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
}

@media (max-width: 768px) {
  .editor-split {
    grid-template-columns: 1fr;
    width: calc(100% - 16px);
    margin: 8px auto;
  }
}`;

export const SAMPLE_JS = `// Developer Tools Execution Pipeline
import { calcReductionPct } from '@/lib/utils';

export interface ProcessingJob {
  id: string;
  sourceType: 'html' | 'css' | 'js' | 'sql';
  payload: string;
  options: Record<string, unknown>;
}

export async function processDeveloperJob(job: ProcessingJob): Promise<{
  success: boolean;
  output: string;
  metrics?: { originalBytes: number; resultBytes: number; savingsPct: number };
}> {
  const startTime = performance.now();
  console.log(\`[Runner] Starting \${job.sourceType} job ID: \${job.id}\`);

  try {
    const originalBytes = new TextEncoder().encode(job.payload).length;
    let formattedOutput = '';

    switch (job.sourceType) {
      case 'html':
      case 'css':
      case 'js':
      case 'sql':
        formattedOutput = job.payload.trim();
        break;
      default:
        throw new Error(\`Unsupported tool type: \${job.sourceType}\`);
    }

    const resultBytes = new TextEncoder().encode(formattedOutput).length;
    const savingsPct = calcReductionPct(originalBytes, resultBytes);
    const elapsed = Math.round(performance.now() - startTime);

    console.log(\`[Runner] Completed in \${elapsed}ms (\${savingsPct}% savings)\`);

    return {
      success: true,
      output: formattedOutput,
      metrics: { originalBytes, resultBytes, savingsPct },
    };
  } catch (error) {
    console.error('[Runner] Execution failure:', error);
    return {
      success: false,
      output: '',
    };
  }
}`;

export const SAMPLE_SQL = `SELECT
  u.id AS user_id,
  u.username,
  u.email,
  p.full_name,
  COUNT(o.id) AS total_orders,
  COALESCE(SUM(o.total_amount), 0.00) AS lifetime_spent,
  MAX(o.created_at) AS last_order_date
FROM users u
INNER JOIN profiles p ON p.user_id = u.id
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'completed'
WHERE u.is_active = TRUE
  AND u.created_at >= '2025-01-01'
  AND (p.country = 'IN' OR p.country = 'US')
GROUP BY u.id, u.username, u.email, p.full_name
HAVING COUNT(o.id) > 0
ORDER BY lifetime_spent DESC, total_orders DESC
LIMIT 50 OFFSET 0;`;

export const SAMPLE_JSON = `{
  "application": "whysogood",
  "version": "2.4.0",
  "privacy": {
    "zeroServerUploads": true,
    "clientSideExecution": true,
    "dataRetention": "none",
    "analytics": "disabled"
  },
  "developerTools": [
    {
      "slug": "html-formatter",
      "category": "Developer",
      "name": "HTML Formatter",
      "status": "active",
      "features": ["indent-customization", "style-script-beautify", "tag-validation"]
    },
    {
      "slug": "css-formatter",
      "category": "Developer",
      "name": "CSS Formatter",
      "status": "active",
      "features": ["nested-rules", "media-queries", "quote-normalization"]
    },
    {
      "slug": "js-formatter",
      "category": "Developer",
      "name": "JS Formatter",
      "status": "active",
      "features": ["bracket-alignment", "semicolons", "operator-spacing"]
    },
    {
      "slug": "sql-formatter",
      "category": "Developer",
      "name": "SQL Formatter",
      "status": "active",
      "features": ["clause-alignment", "keyword-casing", "subqueries"]
    },
    {
      "slug": "css-minifier",
      "category": "Developer",
      "name": "CSS Minifier",
      "status": "active",
      "features": ["calc-safe-preservation", "color-compaction", "zero-units"]
    }
  ],
  "stats": {
    "totalTools": 120,
    "activeUsers": 45000,
    "avgExecutionMs": 4.2
  }
}`;

// ============================================================================
// Milestone 2 Sample Presets: Converters & Transpilers
// ============================================================================

export const SAMPLE_JSON_FOR_CSV = `[
  {
    "id": 101,
    "name": "Sarah Connor",
    "role": "Lead Architect",
    "department": "Engineering",
    "active": true,
    "location": {
      "city": "San Francisco",
      "country": "USA"
    },
    "skills": "TypeScript, React, Rust",
    "notes": "Prefers remote work; \\"key\\" contributor"
  },
  {
    "id": 102,
    "name": "Alex Mercer",
    "role": "Security Analyst",
    "department": "Infrastructure",
    "active": true,
    "location": {
      "city": "Berlin",
      "country": "Germany"
    },
    "skills": "AppSec, Cryptography",
    "notes": "On-call weekend rotation\\nLine 2 info"
  },
  {
    "id": 103,
    "name": "Elena Rostova",
    "role": "Product Designer",
    "department": "Design",
    "active": false,
    "location": {
      "city": "Tokyo",
      "country": "Japan"
    },
    "skills": "Figma, Design Systems",
    "notes": null
  }
]`;

export const SAMPLE_CSV = `id,name,role,department,location.city,location.country,active
101,"Sarah Connor","Lead Architect","Engineering","San Francisco","USA",true
102,"Alex Mercer","Security Analyst","Infrastructure","Berlin","Germany",true
103,"Elena Rostova","Product Designer","Design","Tokyo","Japan",false`;

export const SAMPLE_JSON_FOR_XML = `{
  "catalog": {
    "@id": "cat-developer-tools",
    "@version": "2.0",
    "name": "Developer Utilities Suite",
    "tools": [
      {
        "@status": "active",
        "name": "JSON to CSV",
        "category": "Converters",
        "description": "Tabular RFC 4180 exporter with recursive flattening"
      },
      {
        "@status": "active",
        "name": "Markdown to HTML",
        "category": "Transpilers",
        "description": "GitHub Flavored Markdown renderer with live preview"
      }
    ],
    "settings": {
      "clientOnly": true,
      "maxExportRows": 100000,
      "retention": "zero"
    }
  }
}`;

export const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<catalog id="cat-developer-tools" version="2.0">
  <name>Developer Utilities Suite</name>
  <tools>
    <tool status="active">
      <name>JSON to CSV</name>
      <category>Converters</category>
      <description>Tabular RFC 4180 exporter with recursive flattening</description>
    </tool>
    <tool status="active">
      <name>Markdown to HTML</name>
      <category>Transpilers</category>
      <description>GitHub Flavored Markdown renderer with live preview</description>
    </tool>
  </tools>
  <settings>
    <clientOnly>true</clientOnly>
    <maxExportRows>100000</maxExportRows>
    <retention>zero</retention>
  </settings>
</catalog>`;

export const SAMPLE_MARKDOWN = `# whysogood.app — Developer Studio

A high-performance **client-side privacy-first** developer suite. All operations execute strictly within the browser with *zero server uploads*.

---

## Key Features

- [x] Fast client-side execution
- [x] Zero server network egress
- [ ] Multi-threaded Web Worker pipelines
- [x] Full RFC 4180 CSV compliance

## Format Conversion Matrix

| Source Format | Target Format | Engine Status | Latency |
| :--- | :---: | ---: | :---: |
| **JSON** | CSV | *Active* | < 5ms |
| **JSON** | XML | *Active* | < 8ms |
| **XML** | JSON | *Active* | < 12ms |
| **Markdown** | HTML | *Active* | < 4ms |

> "Simplicity is prerequisite for reliability."
> — Edsger W. Dijkstra

### Sample Code Block

\`\`\`typescript
import { jsonToCsv } from '@/lib/developer/converters';

const data = [{ id: 1, name: 'whysogood', fast: true }];
const csv = jsonToCsv(JSON.stringify(data));
console.log('Result:', csv.output);
\`\`\`

Visit [whysogood.app](https://whysogood.app) for more private utilities!
`;

// ============================================================================
// Inspections, Testers & Utilities Samples (Milestone 3)
// ============================================================================

export const SAMPLE_REGEX_PATTERN = '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b';
export const SAMPLE_REGEX_FLAGS = 'g';
export const SAMPLE_REGEX_TEXT = `Hello! Please send your inquiries to support@whysogood.app or contact our engineering lead directly at alex.chen@example.org.
For billing questions, write to billing@payments.io or security-team@internal.net.
We guarantee a response within 24 hours.`;
export const SAMPLE_REGEX_REPLACEMENT = '[REDACTED_EMAIL]';

export const SAMPLE_JWT = (() => {
  const b64 = (obj: any) => {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str).toString('base64url');
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const header = b64({ alg: 'HS256', typ: 'JWT', kid: 'key-2026-auth' });
  const payload = b64({
    sub: 'usr_84920491',
    name: 'Ada Lovelace',
    email: 'ada@whysogood.app',
    roles: ['admin', 'developer'],
    org: { id: 'org_enterprise_1', plan: 'pro' },
    iat: 1758750000,
    exp: 2500000000,
  });
  return `${header}.${payload}.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ`;
})();

export const SAMPLE_DIFF_ORIGINAL = `// User Account Service v1.0
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'admin';
}

export function getUser(id: string): User | null {
  console.log('Fetching user with ID:', id);
  return db.query('SELECT * FROM users WHERE id = ?', [id]);
}

export function deleteUser(id: string): boolean {
  return db.execute('DELETE FROM users WHERE id = ?', [id]);
}`;

export const SAMPLE_DIFF_MODIFIED = `// User Account Service v2.0
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'admin' | 'owner';
  createdAt: Date;
}

export async function getUser(id: string): Promise<User | null> {
  console.log('Fetching user with ID (async):', id);
  return await db.query('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
}

export async function deleteUser(id: string): Promise<boolean> {
  // Soft delete implementation
  return await db.execute('UPDATE users SET deleted_at = NOW() WHERE id = ?', [id]);
}`;

export const SAMPLE_JSON_VALIDATOR_INVALID = `{
  // Application Configuration
  "name": 'whysogood',
  "version": "2.4.0",
  "active": true,
  "features": [
    "client-side",
    "zero-telemetry",
    "instant-format",
  ],
  status: 200
}`;

export const SAMPLE_CRON_EXPRESSION = '*/15 9-17 * * 1-5';
export const SAMPLE_CRON_CONFIG = {
  minute: '*/15',
  hour: '9-17',
  dayOfMonth: '*',
  month: '*',
  dayOfWeek: '1-5',
};

export const SAMPLE_TIMESTAMP_INPUT = '1758750000';

export const SAMPLE_HASH_INPUT = 'whysogood.app — 100% Client-Side Privacy-First Developer Tools';
export const SAMPLE_HMAC_KEY = 'secret-developer-key';


