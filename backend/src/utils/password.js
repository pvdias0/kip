import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPassword = async (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('A senha deve ter pelo menos 8 caracteres.');
  }

  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password, hash) => {
  if (typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }

  return bcrypt.compare(password, hash);
};