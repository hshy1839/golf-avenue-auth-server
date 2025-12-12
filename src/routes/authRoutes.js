// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const {
  register,
  login,
  googleLogin,
  kakaoLogin,
} = require('../controllers/authController');

// 🔥 모든 요청 로깅
router.use((req, res, next) => {
  console.log(`📥 [AUTH ROUTE HIT] ${req.method} ${req.originalUrl}`);
  next();
});

// 회원가입
router.post('/register', register);

// 이메일 로그인
router.post('/login', login);

// 구글 로그인
router.post('/google', googleLogin);

// 카카오 로그인
router.post('/kakao', kakaoLogin);

module.exports = router;
