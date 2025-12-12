// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const { testFirebaseConnection } = require('./src/config/firebaseAdmin');

const app = express();

// ─────────────────────────────
//  미들웨어 & 라우트
// ─────────────────────────────
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'GolfAvenue API Server Running' });
});

const PORT = process.env.PORT || 4000;

// ─────────────────────────────
//  부팅 로직 (Firebase 체크 + listen)
// ─────────────────────────────
async function bootstrap() {
  try {
    console.log('🔥 서버 부팅 시작 (Firebase 연결 테스트 중)...');
    await testFirebaseConnection();

    console.log('🚀 Firebase OK, Express 서버 시작합니다...');
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('💥 서버 시작 중단: Firebase 연결에 실패했습니다.', err);
    process.exit(1);
  }
}

// ─────────────────────────────
//  예외 캐치
// ─────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

// 🔥 여기 포인트
// node server.js 로 "직접 실행"할 때만 bootstrap() 호출
// Vercel이 빌드 과정에서 require('server.js') 할 때는 실행 안 됨
if (require.main === module) {
  bootstrap();
}

// Vercel / 테스트용으로 app export
module.exports = app;
