const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const reportPath = path.join(__dirname, '../database-report.html');

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatValue = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const renderTable = (title, rows) => {
  if (!rows.length) {
    return `
      <section class="panel">
        <h2>${escapeHtml(title)}</h2>
        <p class="muted">No rows found.</p>
      </section>
    `;
  }

  const columns = Object.keys(rows[0]);
  return `
    <section class="panel">
      <div class="panel-header">
        <h2>${escapeHtml(title)}</h2>
        <span>${rows.length} row${rows.length === 1 ? '' : 's'}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                ${columns.map((column) => `<td><pre>${escapeHtml(formatValue(row[column]))}</pre></td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
};

async function getTables() {
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map((row) => row.table_name);
}

async function getTableCounts(tables) {
  const counts = [];
  for (const table of tables) {
    const result = await pool.query(`SELECT COUNT(*)::int AS rows FROM ${quoteIdent(table)}`);
    counts.push({ table, rows: result.rows[0].rows });
  }
  return counts;
}

async function getColumns() {
  const result = await pool.query(`
    SELECT
      table_name AS table,
      column_name AS column,
      data_type AS type,
      is_nullable AS nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  return result.rows;
}

async function previewTable(table, limit = 25) {
  const result = await pool.query(`
    SELECT *
    FROM ${quoteIdent(table)}
    ORDER BY created_at DESC NULLS LAST
    LIMIT $1
  `, [limit]);
  return result.rows;
}

function renderHtml({ counts, columns, previews }) {
  const generatedAt = new Date().toLocaleString();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PawVerse Database Report</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7fb;
      --panel: #ffffff;
      --text: #172033;
      --muted: #667085;
      --line: #d8deea;
      --accent: #2563eb;
      --accent-soft: #eaf1ff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid var(--line);
      background: rgba(246, 247, 251, 0.94);
      backdrop-filter: blur(14px);
      padding: 18px 24px;
    }
    h1, h2 { margin: 0; letter-spacing: 0; }
    h1 { font-size: 24px; }
    h2 { font-size: 18px; }
    .subhead {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-top: 8px;
      color: var(--muted);
      font-size: 14px;
    }
    .chip {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--panel);
      padding: 5px 10px;
    }
    main {
      display: grid;
      gap: 18px;
      padding: 20px 24px 36px;
    }
    .panel {
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: 0 10px 24px rgba(16, 24, 40, 0.06);
    }
    .panel > h2,
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid var(--line);
      padding: 14px 16px;
    }
    .panel-header span {
      color: var(--muted);
      font-size: 13px;
    }
    .muted {
      margin: 0;
      padding: 14px 16px;
      color: var(--muted);
    }
    .table-wrap {
      overflow: auto;
      max-height: 70vh;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--accent-soft);
      color: #173d8f;
      text-align: left;
      white-space: nowrap;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 9px 10px;
      vertical-align: top;
    }
    tr:hover td { background: #fbfdff; }
    pre {
      max-width: 520px;
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font: inherit;
    }
    .toc {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .toc a {
      display: inline-flex;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--panel);
      color: var(--accent);
      padding: 7px 11px;
      font-size: 13px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <header>
    <h1>PawVerse Database Report</h1>
    <div class="subhead">
      <span class="chip">Database: ${escapeHtml(process.env.DB_NAME)}</span>
      <span class="chip">Host: ${escapeHtml(process.env.DB_HOST || 'localhost')}:${escapeHtml(process.env.DB_PORT || '5432')}</span>
      <span class="chip">Generated: ${escapeHtml(generatedAt)}</span>
    </div>
  </header>
  <main>
    <nav class="toc">
      <a href="#tables">Tables</a>
      <a href="#qanda">Q&A</a>
      <a href="#users">Users</a>
      <a href="#columns">Columns</a>
    </nav>
    <div id="tables">${renderTable('Tables And Row Counts', counts)}</div>
    <div id="qanda">
      ${renderTable('Recent Q&A Questions', previews.qa_questions || [])}
      ${renderTable('Recent Q&A Answers', previews.qa_answers || [])}
      ${renderTable('Recent Q&A Tags', previews.qa_tags || [])}
      ${renderTable('Recent Q&A Moderation Logs', previews.qa_moderation_logs || [])}
    </div>
    <div id="users">${renderTable('Recent Users', previews.users || [])}</div>
    <div id="columns">${renderTable('Columns', columns)}</div>
  </main>
</body>
</html>`;
}

async function main() {
  const tables = await getTables();
  const counts = await getTableCounts(tables);
  const columns = await getColumns();
  const previewNames = ['qa_questions', 'qa_answers', 'qa_tags', 'qa_moderation_logs', 'users'];
  const previews = {};

  for (const table of previewNames) {
    if (tables.includes(table)) {
      previews[table] = await previewTable(table);
    }
  }

  fs.writeFileSync(reportPath, renderHtml({ counts, columns, previews }));
  console.log(`Database report created: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error('Database report failed:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
