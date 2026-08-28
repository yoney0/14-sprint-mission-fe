import bcrypt from 'bcryptjs';

const DUMMY_PASSWORD_HASH = '$2b$12$ERiLGAf3TmgbqplpdWXuiOUc8RBLdKycfVj0TgJQrfeOrqQ8dxT1a';

export async function verifyPassword(password, encryptedPassword) {
  const passwordMatches = await bcrypt.compare(
    password,
    encryptedPassword || DUMMY_PASSWORD_HASH,
  );
  return Boolean(encryptedPassword) && passwordMatches;
}
