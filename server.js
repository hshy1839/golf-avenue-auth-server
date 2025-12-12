// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const { testFirebaseConnection } = require('./src/config/firebaseAdmin');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'GolfAvenue API Server Running' });
});

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    console.log('🔥 서버 부팅 시작 (Firebase 연결 테스트 중)...');
    await testFirebaseConnection(); // 👉 여기서 Firebase/Firestore 체크

    console.log('🚀 Firebase OK, Express 서버 시작합니다...');
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('💥 서버 시작 중단: Firebase 연결에 실패했습니다.');
    // 필요하면 여기서 슬랙/메일 알림 같은 것도 훅으로 붙일 수 있음
    process.exit(1);
  }
}

// 예외 캐치 (안 잡힌 Promise 에러 방지)
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

bootstrap();
