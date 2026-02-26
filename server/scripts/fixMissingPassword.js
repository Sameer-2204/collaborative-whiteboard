/**
 * scripts/fixMissingPassword.js
 * Patches a specific user with a temporary password if their 
 * password field is missing in the database.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whiteboard';
const TARGET_EMAIL = 'tripathisam2204@gmail.com';
const TEMP_PASSWORD = 'password123';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(TEMP_PASSWORD, salt);

    const result = await mongoose.connection.db
        .collection('users')
        .updateOne(
            { email: TARGET_EMAIL },
            { $set: { password: hash, isActive: true } }
        );

    if (result.matchedCount === 0) {
        console.log(`❌ No user found with email ${TARGET_EMAIL}`);
    } else {
        console.log(`✅ Patched user ${TARGET_EMAIL}. Password set to: ${TEMP_PASSWORD}`);
    }

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
