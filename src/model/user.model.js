// src/models/userModel.js

const createUserJson = (data) => {
  const {
    uid,
    email,
    name = "",
    nickname = "",
    phone = "",
    birthdate = null,
    gender = null,
    provider = "email",
  } = data;

  return {
    uid,
    email,
    name,
    nickname: nickname || name,
    phone,
    birthdate,
    gender,
    provider,
    role: "user",

    settings: {
      battingSide: "왼쪽",
      difficulty: "투어 프로",
    },

    measurement: {
      fieldLengthUnit: "yard",
      greenLengthUnit: "meter",
      teeHeight: 45,
      teePosition: "Champion Tee",
    },

    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

module.exports = { createUserJson };
