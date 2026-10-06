// Preloaded before test modules so application configuration never depends on a local .env.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test-only-password@127.0.0.1:55432/hirehelper_test';
process.env.SESSION_SECRET = 'test-only-session-secret-at-least-32-characters';
process.env.OTP_SECRET = 'test-only-otp-secret-at-least-32-characters';
process.env.APP_ORIGIN = 'http://localhost:4200';
process.env.COOKIE_SECURE = 'false';
process.env.DEMO_SEED = 'false';