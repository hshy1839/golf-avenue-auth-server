// src/config/firebaseAdmin.js
const admin = require('firebase-admin');

if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env is required');
}

let serviceAccountJson;

try {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.trim();

  // ✅ base64 또는 raw JSON 둘 다 지원
  const decoded =
    raw.startsWith('{') || raw.startsWith('{"')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');

  serviceAccountJson = JSON.parse(decoded);
} catch (e) {
  console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e);
  throw e;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountJson),
  });
}

const auth = admin.auth();

async function testFirebaseConnection() {
  await auth.listUsers(1);
  console.log('✅ Firebase Admin 연결 OK');
}

module.exports = { admin, auth, testFirebaseConnection };
