import crypto from 'crypto';

/**
 * Enterprise-grade password hashing using Node's native crypto.scrypt
 * Stored format: scrypt$N=16384,r=8,p=1$<salt_hex>$<hash_hex>
 */

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new Error('Senha não pode ser vazia');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);

  return new Promise((resolve, reject) => {
    crypto.scrypt(plainPassword, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      const saltHex = salt.toString('hex');
      const hashHex = derivedKey.toString('hex');
      resolve(`scrypt$N=16384,r=8,p=1$${saltHex}$${hashHex}`);
    });
  });
}

export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  if (!plainPassword || !storedHash) return false;

  try {
    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'scrypt') {
      // Fallback for demo / development legacy comparisons if any
      return false;
    }

    const saltHex = parts[2];
    const originalHashHex = parts[3];

    const salt = Buffer.from(saltHex, 'hex');
    const originalHash = Buffer.from(originalHashHex, 'hex');

    return new Promise((resolve) => {
      crypto.scrypt(plainPassword, salt, originalHash.length, SCRYPT_OPTIONS, (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          const match = crypto.timingSafeEqual(originalHash, derivedKey);
          resolve(match);
        } catch {
          resolve(false);
        }
      });
    });
  } catch {
    return false;
  }
}
