const fs = require('fs');
const path = require('path');

function getProjectRoot() {
    return path.resolve(__dirname, '..', '..', '..');
}

function getCandidateCredentialPaths() {
    const projectRoot = getProjectRoot();
    const candidates = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        path.join(projectRoot, 'firebase-service-account.json'),
        path.join(projectRoot, 'firebase-admin-service-account.json'),
        path.join(projectRoot, 'service-account.json')
    ].filter(Boolean);

    return [...new Set(candidates.map(candidate => (
        path.isAbsolute(candidate) ? candidate : path.resolve(projectRoot, candidate)
    )))];
}

function resolveServiceAccountConfig() {
    const inlineJson = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
    if (inlineJson) {
        return {
            serviceAccount: JSON.parse(inlineJson),
            credentialSource: 'env'
        };
    }

    for (const candidatePath of getCandidateCredentialPaths()) {
        if (!fs.existsSync(candidatePath)) {
            continue;
        }

        const fileContents = fs.readFileSync(candidatePath, 'utf8').trim();
        if (!fileContents) {
            continue;
        }

        return {
            serviceAccount: JSON.parse(fileContents),
            credentialSource: `file:${path.basename(candidatePath)}`
        };
    }

    return {
        serviceAccount: null,
        credentialSource: null
    };
}

function getFirebaseAdminConfigStatus() {
    try {
        const resolved = resolveServiceAccountConfig();
        return {
            configured: !!resolved.serviceAccount,
            credentialSource: resolved.credentialSource,
            projectId: resolved.serviceAccount ? resolved.serviceAccount.project_id || null : null,
            recommendedFileName: 'firebase-service-account.json'
        };
    } catch (error) {
        return {
            configured: false,
            credentialSource: null,
            projectId: null,
            recommendedFileName: 'firebase-service-account.json',
            error: error.message
        };
    }
}

module.exports = {
    resolveServiceAccountConfig,
    getFirebaseAdminConfigStatus
};