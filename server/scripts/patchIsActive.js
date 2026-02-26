/**
 * scripts/patchIsActive.js
 * One-time migration: set isActive=true for any user document
 * that was created before the isActive field was added to the schema.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whiteboard';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db
        .collection('users')
        .updateMany(
            { isActive: { $exists: false } },
            { $set: { isActive: true } }
        );

    console.log(`✅ Patched ${result.modifiedCount} user(s) — isActive set to true`);
    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
