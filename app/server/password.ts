import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Stored format: scrypt$N$r$p$salt$hash (base64url). Parameters travel with the hash so they can be raised later.
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const derive = (password: string, salt: Buffer, options: ScryptOptions) => new Promise<Buffer>((resolve, reject) =>
  scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, { ...options, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash || password.length > PASSWORD_MAX) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await derive(password, Buffer.from(salt, 'base64url'), { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Spends the same work as a real check so unknown emails are not distinguishable by response time.
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(password, await dummyHash);
  return false;
}
