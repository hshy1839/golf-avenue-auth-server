// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const {
  register,
  login,
  googleLogin,
  kakaoLogin,
} = require('../controllers/authController');


// 🔥 모든 요청 로깅 미들웨어
router.use((req, res, next) => {
  console.log(`📥 [AUTH ROUTE HIT] ${req.method} ${req.originalUrl}`);
  next();
});

// -------------------------------
// 회원가입
// -------------------------------
router.post('/register', (req, res) => {
  console.log("🚀 Register endpoint triggered");
  register(req, res);
});

// -------------------------------
// 로그인
// -------------------------------
router.post('/login', (req, res) => {
  console.log("🚀 Login endpoint triggered");
  login(req, res);
});

// -------------------------------
// 구글 로그인
// -------------------------------
router.post('/google', (req, res) => {
  console.log("🚀 Google Login endpoint triggered");
  googleLogin(req, res);
});
router.post('/kakao', kakaoLogin);

module.exports = router;
