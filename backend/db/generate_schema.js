const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../../supabase/migrations');
const OUTPUT_FILE = path.join(__dirname, 'schema.sql');

const USERS_TABLE_SQL = `
-- Custom users table for Express JWT Auth
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

function generate() {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort to ensure chronological migration order

    let combinedSql = '';

    // Add users table at the top
    combinedSql += '-- ==========================================\n';
    combinedSql += '-- 00_users.sql (Express Auth Base)\n';
    combinedSql += '-- ==========================================\n';
    combinedSql += USERS_TABLE_SQL + '\n';

    for (const file of files) {
      combinedSql += `-- ==========================================\n`;
      combinedSql += `-- Migration File: ${file}\n`;
      combinedSql += `-- ==========================================\n\n`;

      const filePath = path.join(MIGRATIONS_DIR, file);
      let content = fs.readFileSync(filePath, 'utf8');

      // Strip Row Level Security enabling
      content = content.replace(/ALTER TABLE\s+[\w\.]+\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/gi, '');

      // Strip Policy statements (CREATE POLICY, DROP POLICY)
      content = content.replace(/CREATE POLICY[\s\S]*?TO\s+[\w, ]+\s+USING\s*\([\s\S]*?\)(?:\s*WITH CHECK\s*\([\s\S]*?\))?;/gi, '');
      content = content.replace(/DROP POLICY[\s\S]*?ON\s+[\w\.]+;/gi, '');

      // Replace Supabase Auth table references with our custom users table
      content = content.replace(/REFERENCES\s+auth\.users\s*\(id\)/gi, 'REFERENCES public.users(id)');

      // Clean up multiple newlines created by stripping
      content = content.replace(/\n{3,}/g, '\n\n');

      combinedSql += content + '\n\n';
    }

    // Write final output
    fs.writeFileSync(OUTPUT_FILE, combinedSql, 'utf8');
    console.log(`Successfully generated schema.sql at ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error generating schema:', error.message);
  }
}

generate();
