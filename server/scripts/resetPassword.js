/**
 * scripts/resetPassword.js
 * Resets a user's password to a known value.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whiteboard';
const TARGET_EMAIL = 'tripathisam2204@gmail.com';
const NEW_PASSWORD = '123456';

async function run() {
    await mongoose.connect(MONGO_URI);
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(NEW_PASSWORD, salt);

    const result = await mongoose.connection.db
        .collection('users')
        .updateOne(
            { email: TARGET_EMAIL },
            { $set: { password: hash, isActive: true } }
        );

    console.log(result.matchedCount
        ? `✅ Password for ${TARGET_EMAIL} reset to: ${NEW_PASSWORD}`
        : `❌ No user found with email ${TARGET_EMAIL}`
    );

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
