// Debug test
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function test() {
  const client = new Client({
    host: 'postgres',
    port: 5432,
    database: 'nexus',
    user: 'nexus',
    password: 'nexus'
  });

  await client.connect();

  const res = await client.query(
    `SELECT id, email, password_hash, is_active, r.name as role_name
     FROM nexus.users u
     LEFT JOIN nexus.roles r ON u.role_id = r.id
     WHERE u.email = $1 AND u.deleted_at IS NULL`,
    ['admin@nexus.local']
  );

  if (res.rows.length === 0) {
    console.log('User not found');
    return;
  }

  const user = res.rows[0];
  console.log('User from DB:', { id: user.id, email: user.email, hash: user.password_hash, active: user.is_active });

  const valid = await bcrypt.compare('Admin@123456', user.password_hash);
  console.log('Password valid?', valid);

  await client.end();
}

test().catch(console.error);
