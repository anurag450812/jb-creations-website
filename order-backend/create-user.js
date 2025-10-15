const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

const userId = crypto.randomUUID();
const phone = '+918269909774';
const name = 'Anurag Singh';
const email = 'anuragrajput200274@gmail.com';
const now = new Date().toISOString();

console.log('🔧 Creating user in SQLite database...');
console.log('User:', name);
console.log('Phone:', phone);
console.log('Email:', email);

db.run(`
  INSERT OR REPLACE INTO users (id, name, phone, email, sign_in_method, created_at, updated_at, is_active)
  VALUES (?, ?, ?, ?, 'phone', ?, ?, 1)
`, [userId, name, phone, email, now, now], function(err) {
  if (err) {
    console.error('❌ Error creating user:', err.message);
  } else {
    console.log('✅ User created successfully:', name);
    console.log('📱 User can now login with OTP to phone:', phone);
  }
  
  // Verify the user was created
  db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
    if (err) {
      console.error('❌ Error verifying user:', err.message);
    } else if (row) {
      console.log('✅ User verified in database:', row.name);
    } else {
      console.log('❌ User not found in database');
    }
    db.close();
  });
});