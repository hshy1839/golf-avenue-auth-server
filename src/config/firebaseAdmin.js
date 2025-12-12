// firebaseAdmin.js
const admin = require('firebase-admin');
const path = require('path');

let serviceAccount;

/**
 * 1) 프로덕션 환경(Vercel/Render)이라면 환경변수에서 JSON 로드
 * 2) 로컬 개발환경이면 serviceAccountKey.json 파일 사용
 */
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  console.log('🔥 Using GOOGLE_SERVICE_ACCOUNT_KEY from environment');
  try {
    serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  } catch (err) {
    console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', err);
    throw err;
  }
} else {
  console.log('🔥 Using local serviceAccountKey.json file');
  serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
}

// Firebase 초기화 (중복 초기화 방지)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * 서버 시작 시 Firebase 연결 테스트
 */
async function testFirebaseConnection() {
  try {
    await admin.auth().listUsers(1);
    console.log('✅ Firebase Auth 연결 성공');

    const now = new Date();
    await db
      .collection('_health')
      .doc('startup')
      .set({ lastStartupCheck: now }, { merge: true });

    console.log('✅ Firestore Health Check 성공');
  } catch (err) {
    console.error('❌ Firebase 연결 테스트 실패:', err);
    throw err;
  }
}

module.exports = { admin, db, testFirebaseConnection };
