// Use via stdout pipe directly into `wrangler secret put ADMIN_PASSWORD_RECORD`.
// Password never committed, echoed, or sent to build logs. Workerd PBKDF2 cap: 100000 iterations.
import {pbkdf2Sync,randomBytes} from 'node:crypto';
const password=process.env.QST_ADMIN_PASSWORD || '';
if(password.length<20 || password.length>128 || password.trim()!==password || /[\n\r]/.test(password)) {
  throw Error('QST_ADMIN_PASSWORD must be 20-128 characters without leading/trailing whitespace or line breaks');
}
const salt=randomBytes(16),iterations=100000;
const derived=pbkdf2Sync(password,salt,iterations,32,'sha256');
process.stdout.write(`pbkdf2-sha256:${iterations}:${salt.toString('hex')}:${derived.toString('hex')}`);
