const DEFAULT_ALLOWED_ORIGINS = [
    'https://xidlz.com',
    'http://localhost:8888',
    'http://127.0.0.1:8888',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

function parseOriginList(value) {
    return (value || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function getAllowedOrigins(extraOrigins = []) {
    return [...new Set([
        ...DEFAULT_ALLOWED_ORIGINS,
        ...parseOriginList(process.env.ALLOWED_APP_ORIGINS),
        ...extraOrigins
    ])];
}

function getRequestOrigin(event) {
    return event?.headers?.origin || event?.headers?.Origin || '';
}

function isAllowedOrigin(origin, allowedOrigins = getAllowedOrigins()) {
    return !!origin && allowedOrigins.includes(origin);
}

function buildCorsHeaders(origin, options = {}) {
    const allowedOrigins = options.allowedOrigins || getAllowedOrigins();
    const allowHeaders = options.allowHeaders || ['Content-Type', 'Authorization'];
    const allowMethods = options.allowMethods || ['POST', 'OPTIONS'];
    const headers = {
        'Access-Control-Allow-Headers': allowHeaders.join(', '),
        'Access-Control-Allow-Methods': allowMethods.join(', '),
        'Vary': 'Origin',
        ...(options.extraHeaders || {})
    };

    if (origin && isAllowedOrigin(origin, allowedOrigins)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }

    return headers;
}

function jsonResponse(statusCode, origin, body, options = {}) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            ...buildCorsHeaders(origin, options)
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
}

function emptyResponse(statusCode, origin, options = {}) {
    return {
        statusCode,
        headers: buildCorsHeaders(origin, options),
        body: ''
    };
}

function parseJsonBody(event) {
    if (!event?.body) {
        return {};
    }

    try {
        return JSON.parse(event.body);
    } catch (error) {
        const parseError = new Error('Request body must be valid JSON.');
        parseError.statusCode = 400;
        throw parseError;
    }
}

function enforceAllowedOrigin(event, options = {}) {
    const origin = getRequestOrigin(event);
    const allowedOrigins = options.allowedOrigins || getAllowedOrigins();

    if (!origin || !isAllowedOrigin(origin, allowedOrigins)) {
        const error = new Error('Origin not allowed.');
        error.statusCode = 403;
        error.origin = origin;
        throw error;
    }

    return origin;
}

module.exports = {
    DEFAULT_ALLOWED_ORIGINS,
    buildCorsHeaders,
    emptyResponse,
    enforceAllowedOrigin,
    getAllowedOrigins,
    getRequestOrigin,
    isAllowedOrigin,
    jsonResponse,
    parseJsonBody
};