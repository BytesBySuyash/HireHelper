// Test configuration is always independent of .env and development volumes.
import { randomBytes } from 'node:crypto';
export function testEnv(){return {...process.env,NODE_ENV:'test',DATABASE_URL:'postgresql://test:test-only-password@127.0.0.1:55432/hirehelper_test',SESSION_SECRET:randomBytes(32).toString('hex'),OTP_SECRET:randomBytes(32).toString('hex'),APP_ORIGIN:'http://localhost:4200',API_PORT:'3000',SMTP_HOST:'127.0.0.1',SMTP_PORT:'51025',SMTP_SECURE:'false',COOKIE_SECURE:'false',DEMO_SEED:'false',UPLOAD_DIR:'.tools/test-uploads'};}
