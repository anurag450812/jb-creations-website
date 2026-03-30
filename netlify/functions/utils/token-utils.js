const crypto = require('crypto');

function base64UrlEncode(value) {
    return Buffer.from(value)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function parseExpiresIn(expiresIn) {
    if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) {
        return expiresIn;
    }

    if (typeof expiresIn !== 'string') {
        return null;
    }

    const trimmed = expiresIn.trim();
    if (/^\d+$/.test(trimmed)) {
        return Number(trimmed);
    }

    const match = trimmed.match(/^(\d+)([smhd])$/i);
    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return amount * multipliers[unit];
}

function createSignature(unsignedToken, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(unsignedToken)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function createSignedToken(payload, secret, options = {}) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresInSeconds = parseExpiresIn(options.expiresIn);
    const tokenPayload = {
        ...payload,
        iat: nowSeconds
    };

    if (expiresInSeconds) {
        tokenPayload.exp = nowSeconds + expiresInSeconds;
    }

    const encodedHeader = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const signature = createSignature(unsignedToken, secret);

    return `${unsignedToken}.${signature}`;
}

function verifySignedToken(token, secret) {
    if (!token || typeof token !== 'string') {
        throw new Error('Token is required.');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Token format is invalid.');
    }

    const [encodedHeader, encodedPayload, providedSignature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = createSignature(unsignedToken, secret);

    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
        providedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
        throw new Error('Token signature is invalid.');
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (payload.exp && nowSeconds > payload.exp) {
        throw new Error('Token has expired.');
    }

    return payload;
}

module.exports = {
    createSignedToken,
    verifySignedToken
};