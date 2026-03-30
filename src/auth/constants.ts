export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'dev_secret_change_me',
  expiresIn: (process.env.JWT_EXPIRES_IN || '30d') as string,
};
