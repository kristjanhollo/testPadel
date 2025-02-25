import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'padel_user',
  host: 'padel_postgres',
  database: 'padel_db',
  password: 'padel_pass',
  port: 5432,
});

// ✅ Ensure the correct export
export default pool;
