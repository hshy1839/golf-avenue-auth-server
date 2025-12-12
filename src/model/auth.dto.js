// models/auth.dto.js

/**
 * 이메일 회원가입 요청 DTO
 */
class RegisterDTO {
  constructor({ email, password, name, nickname, phone, birthdate, gender }) {
    this.email = email;
    this.password = password;
    this.name = name;
    this.nickname = nickname;
    this.phone = phone;
    this.birthdate = birthdate;
    this.gender = gender;
  }

  validate() {
    if (!this.email || !this.password) {
      return "email and password are required";
    }
    return null;
  }
}

/**
 * 이메일 로그인 DTO
 */
class LoginDTO {
  constructor({ email, password }) {
    this.email = email;
    this.password = password;
  }

  validate() {
    if (!this.email || !this.password) {
      return "email and password are required";
    }
    return null;
  }
}

module.exports = { RegisterDTO, LoginDTO };
