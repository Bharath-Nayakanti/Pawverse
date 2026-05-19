const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

const section = (title) => {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
};

const printRows = (rows, emptyMessage = 'No rows found.') => {
  if (!rows.length) {
    console.log(emptyMessage);
    return;
  }
  console.table(rows);
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

async function printPreview(table, columns) {
  const result = await pool.query(`
    SELECT ${columns.map(quoteIdent).join(', ')}
    FROM ${quoteIdent(table)}
    ORDER BY created_at DESC
    LIMIT 10
  `);
  printRows(result.rows, `No rows in ${table}.`);
}

async function main() {
  section('Database Connection');
  console.table([{
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5432',
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
  }]);

  const tables = await getTables();

  section('Tables And Row Counts');
  printRows(await getTableCounts(tables));

  section('Columns');
  printRows(await getColumns());

  const previews = [
    {
      table: 'qa_questions',
      columns: ['id', 'title', 'status', 'pet_type', 'category', 'answer_count', 'created_at'],
    },
    {
      table: 'qa_answers',
      columns: ['id', 'question_id', 'body', 'status', 'vote_score', 'created_at'],
    },
    {
      table: 'qa_tags',
      columns: ['id', 'name', 'slug', 'category', 'created_at'],
    },
    {
      table: 'users',
      columns: ['id', 'email', 'first_name', 'last_name', 'created_at'],
    },
  ];

  for (const preview of previews) {
    if (tables.includes(preview.table)) {
      section(`Recent ${preview.table}`);
      await printPreview(preview.table, preview.columns);
    }
  }
}

main()
  .catch((error) => {
    console.error('\nDatabase inspection failed:');
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
