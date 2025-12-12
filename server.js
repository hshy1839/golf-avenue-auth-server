// server.js (수정 후)

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const { testFirebaseConnection } = require('./src/config/firebaseAdmin');
// testFirebaseConnection 함수가 비동기로 연결을 확인하는 경우,
// Render 빌드/시작 시점에 명시적으로 호출할 필요가 없거나,
// 혹은 Render의 "Start Command"에서 Node 실행 전에 체크하는 것이 좋습니다.
// 여기서는 간결화를 위해 Express 설정만 남기고,
// 부팅 로직은 Render의 실행 환경에 맞게 조정합니다.

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

// Render는 process.env.PORT를 사용하여 자동으로 포트를 설정합니다.
const PORT = process.env.PORT || 4000;

// ─────────────────────────────
//  부팅 로직 제거 및 Express 앱 Export
// ─────────────────────────────
// 로컬 테스트용으로 app.listen()은 살려두고,
// Vercel / Render / 테스트 환경에서는 app만 Export하여 사용하도록 합니다.

if (require.main === module) {
  console.log('🔥 서버 부팅 시작 (로컬 환경)...');
  // 로컬 환경에서는 Firebase 연결 테스트를 수행할 수 있습니다.
  // Render 환경에서는 빌드 및 시작 명령을 통해 연결 테스트를 관리하는 것이 좋습니다.
  // 여기서는 로컬 실행 시의 안정성을 위해 기존 로직을 유지합니다.
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
  bootstrap();
}

// Vercel / Render / 테스트용으로 app export
module.exports = app;