const { initFirebaseAdmin } = require('./firebase-admin');
const { deleteFolders, deleteResources } = require('./cloudinary-cleanup');

const COLLECTION_NAME = 'cloudinaryCleanupQueue';
const MAX_ATTEMPTS = Number(process.env.CLOUDINARY_CLEANUP_MAX_ATTEMPTS || 5);

function getRetryDelayMs(attempts) {
    const baseDelayMs = 5 * 60 * 1000;
    return Math.min(24 * 60 * 60 * 1000, baseDelayMs * Math.pow(2, Math.max(0, attempts - 1)));
}

async function enqueueCleanupJob(job) {
    const { admin, db } = await initFirebaseAdmin();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection(COLLECTION_NAME).add({
        jobType: job.jobType,
        payload: job.payload,
        requestedBy: job.requestedBy || null,
        source: job.source || 'unknown',
        status: 'pending',
        attempts: 0,
        lastError: job.lastError || null,
        createdAt: timestamp,
        updatedAt: timestamp,
        nextAttemptAt: new Date()
    });

    return docRef.id;
}

function normalizeFailurePayload(jobType, result, originalPayload) {
    if (jobType === 'delete-resources') {
        const failedIds = result.failedChunks.flatMap((failure) => failure.ids || []);
        return { publicIds: failedIds.length > 0 ? failedIds : (originalPayload.publicIds || []) };
    }

    const failedPrefixes = result.failedPrefixes.map((failure) => failure.prefix).filter(Boolean);
    return { prefixes: failedPrefixes.length > 0 ? failedPrefixes : (originalPayload.prefixes || []) };
}

async function processPendingCleanupJobs(options = {}) {
    const { admin, db } = await initFirebaseAdmin();
    const now = new Date();
    const snapshot = await db.collection(COLLECTION_NAME)
        .where('status', '==', 'pending')
        .limit(Number(options.limit || 10))
        .get();

    let processed = 0;
    let completed = 0;
    let failed = 0;
    let rescheduled = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const nextAttemptAt = data.nextAttemptAt && typeof data.nextAttemptAt.toDate === 'function'
            ? data.nextAttemptAt.toDate()
            : (data.nextAttemptAt ? new Date(data.nextAttemptAt) : null);

        if (nextAttemptAt && nextAttemptAt > now) {
            continue;
        }

        processed += 1;
        await doc.ref.set({
            status: 'processing',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        let result;
        try {
            if (data.jobType === 'delete-resources') {
                result = await deleteResources(data.payload.publicIds || []);
            } else if (data.jobType === 'delete-prefixes') {
                result = await deleteFolders(data.payload.prefixes || []);
            } else {
                throw new Error(`Unsupported cleanup job type: ${data.jobType}`);
            }
        } catch (error) {
            result = {
                success: false,
                failedChunks: data.jobType === 'delete-resources' ? [{ ids: data.payload.publicIds || [], error: error.message }] : [],
                failedPrefixes: data.jobType === 'delete-prefixes' ? (data.payload.prefixes || []).map((prefix) => ({ prefix, error: error.message })) : []
            };
        }

        if (result.success) {
            completed += 1;
            await doc.ref.set({
                status: 'completed',
                lastError: null,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                resultSummary: {
                    deletedCount: result.deletedCount || 0
                }
            }, { merge: true });
            continue;
        }

        const attempts = Number(data.attempts || 0) + 1;
        const exhausted = attempts >= MAX_ATTEMPTS;
        const failurePayload = normalizeFailurePayload(data.jobType, result, data.payload || {});
        const failureMessage = data.jobType === 'delete-resources'
            ? result.failedChunks.map((failure) => failure.error).join('; ')
            : result.failedPrefixes.map((failure) => failure.error).join('; ');

        if (exhausted) {
            failed += 1;
        } else {
            rescheduled += 1;
        }

        await doc.ref.set({
            status: exhausted ? 'failed' : 'pending',
            attempts,
            payload: failurePayload,
            lastError: failureMessage || 'Cloudinary cleanup failed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            failedAt: exhausted ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.delete(),
            nextAttemptAt: exhausted ? admin.firestore.FieldValue.delete() : new Date(Date.now() + getRetryDelayMs(attempts))
        }, { merge: true });
    }

    return {
        processed,
        completed,
        failed,
        rescheduled
    };
}

module.exports = {
    COLLECTION_NAME,
    enqueueCleanupJob,
    processPendingCleanupJobs
};