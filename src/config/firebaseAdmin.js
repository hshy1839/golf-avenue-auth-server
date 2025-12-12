// firebaseAdmin.js
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * 서버 시작 시 Firebase 연결 테스트
 * - auth.listUsers(1) 로 Admin SDK 체크
 * - Firestore 에 _health/startup 문서 한 번 찍어봄
 */
async function testFirebaseConnection() {
  try {
    // 1) Firebase Auth 연결 확인
    await admin.auth().listUsers(1);
    console.log('✅ Firebase Auth 연결 성공');

    // 2) Firestore 쓰기 테스트
    const now = new Date();
    await db
      .collection('_health')
      .doc('startup')
      .set(
        {
          lastStartupCheck: now,
        },
        { merge: true },
      );

    console.log('✅ Firestore 쓰기 테스트 성공 (_health/startup)');
  } catch (err) {
    console.error('❌ Firebase 연결 테스트 실패:', err);
    throw err; // 부트스트랩 단계에서 잡아서 서버 시작 막을 수 있게
  }
}

module.exports = {
  admin,
  db,
  testFirebaseConnection,
};
