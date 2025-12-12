// src/controllers/authController.js
const axios = require('axios');
const { admin, db } = require('../config/firebaseAdmin');
const { createUserJson } = require('../model/user.model');
const { OAuth2Client } = require('google-auth-library');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// -------------------------
// 이메일 회원가입
// -------------------------
const register = async (req, res) => {
  try {
    const { email, password, name, nickname, phone, birthdate, gender } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "email, password required" });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nickname || name || "",
    });

    const uid = userRecord.uid;

    const userJson = createUserJson({
      uid,
      email,
      name,
      nickname,
      phone,
      birthdate,
      gender,
    });

    await db.collection("users").doc(uid).set(userJson, { merge: true });

    const customToken = await admin.auth().createCustomToken(uid);

    res.json({
      ok: true,
      customToken,
      user: userJson,
    });
  } catch (err) {
    console.error("[register] Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// -------------------------
// 이메일 로그인
// -------------------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

    const { data } = await axios.post(url, {
      email,
      password,
      returnSecureToken: true,
    });

    const uid = data.localId;
    const customToken = await admin.auth().createCustomToken(uid);

    return res.json({
      ok: true,
      customToken,
      uid,
      email: data.email,
    });
  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: err.response?.data || err.message,
    });
  }
};

// -------------------------
// 구글 로그인
// -------------------------
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ ok: false, message: "idToken required" });
    }

    // 1) 구글 토큰 검증
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleUid = payload.sub;
    const email = payload.email;
    const name = payload.name || "";
    const picture = payload.picture || "";

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "Google account has no email.",
      });
    }

    let userRecord;
    let isNewUser = false;

    // 2) 이메일 기준으로 먼저 기존 유저 있는지 체크
    try {
      userRecord = await admin.auth().getUserByEmail(email);

      // 선택: displayName / photoURL이 비어있으면 업데이트
      const updateData = {};
      if (!userRecord.displayName && name) updateData.displayName = name;

      if (Object.keys(updateData).length > 0) {
        userRecord = await admin.auth().updateUser(userRecord.uid, updateData);
      }
    } catch (e) {
      if (e.code === "auth/user-not-found") {
        // 3) 없으면 새 구글 계정으로 생성
        isNewUser = true;
        userRecord = await admin.auth().createUser({
          uid: `google:${googleUid}`, // 새로 만드는 경우에만 google:sub 사용
          email,
          displayName: name,
        });
      } else {
        throw e; // 다른 에러는 그대로 던짐
      }
    }

    const uid = userRecord.uid;

    // 4) Firestore 유저 문서 upsert
    const userJson = createUserJson({
      uid,
      email,
      name,
      nickname: name,
      provider: "google", // 기존 이메일 회원이어도 지금은 구글 로그인으로 들어온 것
      // 필요하면 isNewUser로 신규/기존 분기해서 다른 필드도 줄 수 있음
    });

    await db.collection("users").doc(uid).set(userJson, { merge: true });

    // 5) 커스텀 토큰 발급
    const customToken = await admin.auth().createCustomToken(uid);

    return res.json({
      ok: true,
      customToken,
      user: userJson,
      isNewUser,
    });
  } catch (err) {
    console.error("[googleLogin] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// -------------------------
// 카카오 로그인
// -------------------------
const kakaoLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res
        .status(400)
        .json({ ok: false, message: "accessToken required" });
    }

    // 1) 카카오 사용자 정보 불러오기
    const kakaoUserRes = await axios.get(
      "https://kapi.kakao.com/v2/user/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      }
    );

    const kakaoUser = kakaoUserRes.data;
    const kakaoUid = kakaoUser.id.toString();

    const kakaoAccount = kakaoUser.kakao_account || {};
    const profile = kakaoAccount.profile || {};

    const email = kakaoAccount.email || null;

    // 🔥 카카오 쪽 닉네임 우선순위대로 가져오기
    const kakaoNickname =
      profile.nickname || // 보통 여기 들어옴
      kakaoAccount.name ||
      (kakaoUser.properties && kakaoUser.properties.nickname) ||
      `카카오사용자_${kakaoUid}`;

    // name / nickname 을 전부 카카오 닉네임으로 통일
    const name = kakaoNickname;

    // 프로필 이미지도 가능하면 가져오되, 유효한 URL일 때만 사용
    const rawPicture =
      profile.profile_image_url ||
      (kakaoUser.properties && kakaoUser.properties.profile_image) ||
      "";
    const safePhotoURL = isValidPhotoUrl(rawPicture) ? rawPicture : undefined;

    let userRecord;
    let isNewUser = false;

    // 2) 이메일이 있는 경우 → 이메일 기반으로 기존 계정 병합
    if (email) {
      try {
        // 기존 사용자 확인
        userRecord = await admin.auth().getUserByEmail(email);

        // displayName / photoURL 업데이트 (비어 있을 때만)
        const updateData = {};
        if (!userRecord.displayName && name) {
          updateData.displayName = name;
        }
        if (!userRecord.photoURL && safePhotoURL) {
          updateData.photoURL = safePhotoURL;
        }

        if (Object.keys(updateData).length > 0) {
          userRecord = await admin.auth().updateUser(
            userRecord.uid,
            updateData
          );
        }
      } catch (e) {
        if (e.code === "auth/user-not-found") {
          // 👉 새로운 이메일 유저 생성
          isNewUser = true;

          const createData = {
            uid: `kakao:${kakaoUid}`,
            email,
            displayName: name, // ✅ 카카오 닉네임
          };
          if (safePhotoURL) {
            createData.photoURL = safePhotoURL;
          }

          userRecord = await admin.auth().createUser(createData);
        } else {
          throw e;
        }
      }
    } else {
      // 3) 이메일이 없는 경우 → kakao:ID 기반으로 계정 관리
      const kakaoUidKey = `kakao:${kakaoUid}`;
      try {
        userRecord = await admin.auth().getUser(kakaoUidKey);

        const updateData = {};
        if (!userRecord.displayName && name) {
          updateData.displayName = name;
        }
        if (!userRecord.photoURL && safePhotoURL) {
          updateData.photoURL = safePhotoURL;
        }

        if (Object.keys(updateData).length > 0) {
          userRecord = await admin.auth().updateUser(
            userRecord.uid,
            updateData
          );
        }
      } catch (e) {
        if (e.code === "auth/user-not-found") {
          isNewUser = true;

          const createData = {
            uid: kakaoUidKey,
            displayName: name, // ✅ 카카오 닉네임
          };
          if (safePhotoURL) {
            createData.photoURL = safePhotoURL;
          }

          userRecord = await admin.auth().createUser(createData);
        } else {
          throw e;
        }
      }
    }

    const uid = userRecord.uid;

    // 4) Firestore 저장 JSON
    const userJson = createUserJson({
      uid,
      email,
      name,           // ✅ name = 카카오 닉네임
      nickname: name, // ✅ nickname = 카카오 닉네임
      provider: "kakao",
    });

    await db.collection("users").doc(uid).set(userJson, { merge: true });

    // 5) Firebase Custom Token 발급
    const customToken = await admin.auth().createCustomToken(uid);

    return res.json({
      ok: true,
      customToken,
      user: userJson,
      isNewUser,
    });
  } catch (err) {
    console.error("[kakaoLogin] error:", err.response?.data || err);
    return res.status(500).json({
      ok: false,
      error: err.response?.data || err.message,
    });
  }
};
function isValidPhotoUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
}



module.exports = { register, login, googleLogin, kakaoLogin };
