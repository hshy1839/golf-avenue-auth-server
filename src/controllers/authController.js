// src/controllers/authController.js
const axios = require('axios');
const { auth } = require('../config/firebaseAdmin');
const { OAuth2Client } = require('google-auth-library');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!FIREBASE_API_KEY) {
  throw new Error('FIREBASE_API_KEY env is required');
}
if (!GOOGLE_CLIENT_ID) {
  console.warn('⚠ GOOGLE_CLIENT_ID not set – Google login will fail.');
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function buildUserPayload(userRecord) {
  return {
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.displayName,
    phoneNumber: userRecord.phoneNumber,
    photoURL: userRecord.photoURL,
  };
}

// ─────────────────────────────
// 회원가입 (이메일/비번)
// ─────────────────────────────
const register = async (req, res) => {
  console.log('🟢 [register] called:', req.body);

  try {
    const { email, password, name, nickname, phone } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: 'email_and_password_required' });
    }

    const displayName = nickname || name || email.split('@')[0];

    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      phoneNumber: phone || undefined,
    });

    const customToken = await auth.createCustomToken(userRecord.uid);

    return res.status(201).json({
      ok: true,
      message: 'register_success',
      user: buildUserPayload(userRecord),
      customToken,
    });
  } catch (err) {
    console.error('🔴 [register] ERROR:', err);
    return res.status(500).json({
      ok: false,
      message: 'register_failed',
      error: err.message || String(err),
    });
  }
};

// ─────────────────────────────
// 이메일 로그인 (이메일/비번)
// ─────────────────────────────
const login = async (req, res) => {
  console.log('🟠 [login] called:', req.body);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: 'email_and_password_required' });
    }

    // Firebase Identity Toolkit으로 이메일/비번 검증
    const fbRes = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const { localId } = fbRes.data; // Firebase Auth UID

    // Admin SDK에서 사용자 조회 (없으면 생성)
    let userRecord;
    try {
      userRecord = await auth.getUser(localId);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          uid: localId,
          email,
        });
      } else {
        throw e;
      }
    }

    const customToken = await auth.createCustomToken(userRecord.uid);

    return res.json({
      ok: true,
      message: 'login_success',
      user: buildUserPayload(userRecord),
      customToken,
    });
  } catch (err) {
    console.error('🔴 [login] ERROR:', err.response?.data || err);

    const status =
      err.response?.status && err.response.status !== 200
        ? err.response.status
        : 500;

    return res.status(status).json({
      ok: false,
      message: 'login_failed',
      error: err.response?.data || err.message || String(err),
    });
  }
};

// ─────────────────────────────
// 구글 로그인 (Flutter에서 idToken 전달)
// ─────────────────────────────
const googleLogin = async (req, res) => {
  console.log('🟢 [googleLogin] called');

  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res
        .status(400)
        .json({ ok: false, message: 'idToken_required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const sub = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    const uid = `google:${sub}`;

    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          uid,
          email,
          displayName: name,
          photoURL: picture,
        });
      } else {
        throw e;
      }
    }

    const customToken = await auth.createCustomToken(uid);

    return res.json({
      ok: true,
      message: 'google_login_success',
      user: buildUserPayload(userRecord),
      customToken,
    });
  } catch (err) {
    console.error('🔴 [googleLogin] ERROR:', err.response?.data || err);
    return res.status(500).json({
      ok: false,
      message: 'google_login_failed',
      error: err.message || String(err),
    });
  }
};

// ─────────────────────────────
// 카카오 로그인 (Flutter에서 accessToken 전달)
// ─────────────────────────────
const kakaoLogin = async (req, res) => {
  console.log('🟡 [kakaoLogin] called');

  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res
        .status(400)
        .json({ ok: false, message: 'accessToken_required' });
    }

    // Kakao 유저 정보 조회
    const kakaoRes = await axios.get(
      'https://kapi.kakao.com/v2/user/me',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const kakaoData = kakaoRes.data;
    const kakaoId = kakaoData.id;
    const kakaoAccount = kakaoData.kakao_account || {};
    const profile = kakaoAccount.profile || {};

    const email = kakaoAccount.email;
    const nickname = profile.nickname;

    const uid = `kakao:${kakaoId}`;

    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          uid,
          email,
          displayName: nickname,
        });
      } else {
        throw e;
      }
    }

    const customToken = await auth.createCustomToken(uid);

    return res.json({
      ok: true,
      message: 'kakao_login_success',
      user: buildUserPayload(userRecord),
      customToken,
    });
  } catch (err) {
    console.error('🔴 [kakaoLogin] ERROR:', err.response?.data || err);

    const status =
      err.response?.status && err.response.status !== 200
        ? err.response.status
        : 500;

    return res.status(status).json({
      ok: false,
      message: 'kakao_login_failed',
      error: err.response?.data || err.message || String(err),
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  kakaoLogin,
};
