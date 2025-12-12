// src/services/kakaoService.js
const axios = require('axios');

/**
 * Kakao Access Token 으로 사용자 프로필 가져오기
 * @param {string} accessToken
 * @returns {Promise<Object>} kakao profile
 */
async function getKakaoUserProfile(accessToken) {
  const url = 'https://kapi.kakao.com/v2/user/me';

  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
  });

  return res.data;
}

module.exports = {
  getKakaoUserProfile,
};
