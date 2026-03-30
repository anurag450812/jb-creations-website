const crypto = require('crypto');

function loadBcryptIfAvailable() {
    try {
        return eval('require')('bcryptjs');
    } catch (error) {
        return null;
    }
}

function scryptAsync(password, salt, keyLength) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, keyLength, (error, derivedKey) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(derivedKey);
        });
    });
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const derivedKey = await scryptAsync(password, salt, 64);
    return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyScryptPassword(password, storedHash) {
    const [, saltHex, hashHex] = storedHash.split('$');
    if (!saltHex || !hashHex) {
        return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(hashHex, 'hex');
    const derivedKey = await scryptAsync(password, salt, expectedHash.length);

    if (derivedKey.length !== expectedHash.length) {
        return false;
    }

    return crypto.timingSafeEqual(derivedKey, expectedHash);
}

async function verifyPassword(password, storedHash) {
    if (!storedHash || typeof storedHash !== 'string') {
        return { valid: false };
    }

    if (storedHash.startsWith('scrypt$')) {
        return { valid: await verifyScryptPassword(password, storedHash) };
    }

    if (storedHash.startsWith('$2')) {
        const bcrypt = loadBcryptIfAvailable();
        if (!bcrypt) {
            return {
                valid: false,
                requiresReset: true,
                message: 'This password uses the older bcrypt format. Please sign in with OTP once and set a new password for local testing.'
            };
        }

        return { valid: await bcrypt.compare(password, storedHash) };
    }

    return { valid: false };
}

module.exports = {
    hashPassword,
    verifyPassword
};