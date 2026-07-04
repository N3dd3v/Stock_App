import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getDb } from './db';

async function seedUsers() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const staffUsername = process.env.STAFF_USERNAME;
    const staffPassword = process.env.STAFF_PASSWORD;

    if (!adminUsername || !adminPassword || !staffUsername || !staffPassword) {
      console.error('Missing required env vars: ADMIN_USERNAME, ADMIN_PASSWORD, STAFF_USERNAME, STAFF_PASSWORD');
      process.exit(1);
    }

    const db = await getDb();

    // Insert admin user
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await db.run(
      'INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [adminUsername, adminHash, 'admin']
    );

    // Insert staff user
    const staffHash = await bcrypt.hash(staffPassword, 10);
    await db.run(
      'INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [staffUsername, staffHash, 'staff']
    );

    console.log('Users seeded successfully');
    process.exit(0);
  } catch (e) {
    console.error('Failed to seed users:', e);
    process.exit(1);
  }
}

seedUsers();
