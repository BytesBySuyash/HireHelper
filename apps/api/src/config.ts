import { config as dotenv } from 'dotenv';
import { resolve } from 'node:path';
dotenv({path:resolve(process.cwd(), '.env'),quiet:true});
dotenv({path:resolve(process.cwd(), '../../.env'),quiet:true});
export function configuration() {
  const env=process.env;
  for(const key of ['DATABASE_URL','SESSION_SECRET','OTP_SECRET','APP_ORIGIN']) if(!env[key] || env[key]==='GENERATED_BY_SETUP') throw new Error(`Missing ${key}. Run npm run setup.`);
  if(env.SESSION_SECRET!.length<32 || env.OTP_SECRET!.length<32) throw new Error('Secrets must be at least 32 characters.');
  const production=env.NODE_ENV==='production';
  const origin=new URL(env.APP_ORIGIN!).origin;
  if(production && (new URL(origin).protocol!=='https:' || env.COOKIE_SECURE!=='true' || !env.SMTP_HOST || /mailpit|localhost/.test(env.SMTP_HOST) || env.DEMO_SEED==='true')) throw new Error('Production requires HTTPS, secure cookies, real SMTP, and no demo seed.');
  return {production, origin, databaseUrl:env.DATABASE_URL!, sessionSecret:env.SESSION_SECRET!, otpSecret:env.OTP_SECRET!, secure:env.COOKIE_SECURE==='true', port:Number(env.API_PORT||3000), uploads:resolve(env.UPLOAD_DIR||'uploads'), smtp:{host:env.SMTP_HOST||'localhost',port:Number(env.SMTP_PORT||1025),secure:env.SMTP_SECURE==='true',requireTLS:production && env.SMTP_SECURE!=='true',auth:env.SMTP_USER?{user:env.SMTP_USER,pass:env.SMTP_PASSWORD}:undefined}, from:env.SMTP_FROM||'HireHelper <no-reply@hirehelper.test>'};
}
export const settings=configuration();
