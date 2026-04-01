const { requireAdminUser } = require('./utils/admin-auth');
const { enqueueCleanupJob } = require('./utils/cloudinary-cleanup-queue');
const { deleteFolders, deleteResources, getUsageSummary, runCleanupPass } = require('./utils/cloudinary-cleanup');
const { emptyResponse, enforceAllowedOrigin, getAllowedOrigins, getRequestOrigin, jsonResponse, parseJsonBody } = require('./utils/http');

function createOriginOptions() {
    return {
        allowedOrigins: getAllowedOrigins(),
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['POST', 'OPTIONS']
    };
}

async function queueFailures(jobType, failures, requestedBy) {
    const jobIds = [];

    for (const failure of failures) {
        if (jobType === 'delete-resources') {
            jobIds.push(await enqueueCleanupJob({
                jobType,
                payload: { publicIds: failure.ids || [] },
                requestedBy,
                source: 'admin-cloudinary-manage',
                lastError: failure.error || 'Cloudinary resource delete failed'
            }));
            continue;
        }

        jobIds.push(await enqueueCleanupJob({
            jobType,
            payload: { prefixes: [failure.prefix].filter(Boolean) },
            requestedBy,
            source: 'admin-cloudinary-manage',
            lastError: failure.error || 'Cloudinary folder delete failed'
        }));
    }

    return jobIds;
}

exports.handler = async (event) => {
    const origin = getRequestOrigin(event);
    const originOptions = createOriginOptions();

    if (event.httpMethod === 'OPTIONS') {
        return emptyResponse(200, origin, originOptions);
    }

    if (event.httpMethod !== 'POST') {
        return jsonResponse(405, origin, { success: false, error: 'Method not allowed' }, originOptions);
    }

    try {
        enforceAllowedOrigin(event, originOptions);
        const adminUser = await requireAdminUser(event);
        const { action, publicIds, maxAgeDays, nextCursor, maxPages } = parseJsonBody(event);

        if (action === 'delete') {
            if (!Array.isArray(publicIds) || publicIds.length === 0) {
                return jsonResponse(400, origin, { success: false, error: 'publicIds array required' }, originOptions);
            }

            const result = await deleteResources(publicIds);
            const queuedJobIds = await queueFailures('delete-resources', result.failedChunks, adminUser.uid);

            return jsonResponse(200, origin, {
                success: true,
                deletedCount: result.deletedCount,
                queuedJobIds,
                partialFailure: queuedJobIds.length > 0,
                results: result.results
            }, originOptions);
        }

        if (action === 'delete-folder') {
            if (!Array.isArray(publicIds) || publicIds.length === 0) {
                return jsonResponse(400, origin, { success: false, error: 'folder prefixes array required' }, originOptions);
            }

            const result = await deleteFolders(publicIds);
            const queuedJobIds = await queueFailures('delete-prefixes', result.failedPrefixes, adminUser.uid);

            return jsonResponse(200, origin, {
                success: true,
                deletedCount: result.deletedCount,
                queuedJobIds,
                partialFailure: queuedJobIds.length > 0,
                results: result.results
            }, originOptions);
        }

        if (action === 'usage') {
            const usage = await getUsageSummary();
            return jsonResponse(200, origin, { success: true, ...usage }, originOptions);
        }

        if (action === 'cleanup') {
            const cleanupResult = await runCleanupPass({
                maxAgeDays,
                nextCursor,
                maxPages: maxPages || 2
            });

            return jsonResponse(200, origin, {
                success: cleanupResult.success,
                deletedCount: cleanupResult.deletedCount,
                cutoffDate: cleanupResult.cutoffDate,
                pagesProcessed: cleanupResult.pagesProcessed,
                nextCursor: cleanupResult.nextCursor,
                hasMore: cleanupResult.hasMore,
                errors: cleanupResult.errors.length > 0 ? cleanupResult.errors : undefined
            }, originOptions);
        }

        return jsonResponse(400, origin, { success: false, error: 'Invalid action. Use: delete, delete-folder, usage, cleanup' }, originOptions);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        console.error('cloudinary-manage error:', error);
        return jsonResponse(statusCode, origin, {
            success: false,
            error: error.message || 'Cloudinary management request failed.'
        }, originOptions);
    }
};
