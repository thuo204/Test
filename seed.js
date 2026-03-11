#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'edustream',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seed() {
  const client = await pool.connect();
  try {
    const seedsDir = path.join(__dirname, '../../database/seeds');
    const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      console.log(`Running seed: ${file}`);
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✅ Seed applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Seed error in ${file}:`, err.message);
      }
    }
    console.log('\n✅ Seeding complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
