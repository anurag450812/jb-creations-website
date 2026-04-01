const { getCloudinaryClient } = require('./cloudinary-client');

function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

function countDeletedResources(result) {
    return Object.values(result?.deleted || {}).filter((value) => value === 'deleted').length;
}

async function deleteResources(publicIds) {
    const uniquePublicIds = [...new Set((publicIds || []).filter(Boolean))];
    if (uniquePublicIds.length === 0) {
        return { success: true, deletedCount: 0, results: [], failedChunks: [] };
    }

    const cloudinary = getCloudinaryClient();
    const results = [];
    const failedChunks = [];
    let deletedCount = 0;

    for (const chunk of chunkArray(uniquePublicIds, 100)) {
        try {
            const result = await cloudinary.api.delete_resources(chunk);
            deletedCount += countDeletedResources(result);
            results.push({ ids: chunk, result });
        } catch (error) {
            failedChunks.push({ ids: chunk, error: error.message });
            results.push({ ids: chunk, error: error.message });
        }
    }

    return {
        success: failedChunks.length === 0,
        deletedCount,
        results,
        failedChunks
    };
}

async function deleteFolders(prefixes) {
    const uniquePrefixes = [...new Set((prefixes || []).filter(Boolean))];
    if (uniquePrefixes.length === 0) {
        return { success: true, deletedCount: 0, results: [], failedPrefixes: [] };
    }

    const cloudinary = getCloudinaryClient();
    const results = [];
    const failedPrefixes = [];
    let deletedCount = 0;

    for (const prefix of uniquePrefixes) {
        try {
            const result = await cloudinary.api.delete_resources_by_prefix(prefix);
            deletedCount += countDeletedResources(result);
            results.push({ prefix, result });
            try {
                await cloudinary.api.delete_folder(prefix);
            } catch (_) {
                // Ignore folder cleanup failures when resources are already removed.
            }
        } catch (error) {
            failedPrefixes.push({ prefix, error: error.message });
            results.push({ prefix, error: error.message });
        }
    }

    return {
        success: failedPrefixes.length === 0,
        deletedCount,
        results,
        failedPrefixes
    };
}

async function getUsageSummary() {
    const usage = await getCloudinaryClient().api.usage();
    return {
        storage: {
            used_bytes: (usage.storage && usage.storage.usage) || 0,
            limit_bytes: (usage.storage && usage.storage.limit) || 0,
            used_percent: (usage.storage && usage.storage.used_percent) || 0
        },
        credits: {
            used: (usage.credits && usage.credits.usage) || 0,
            limit: (usage.credits && usage.credits.limit) || 0,
            used_percent: (usage.credits && usage.credits.used_percent) || 0
        },
        transformations: {
            used: (usage.transformations && usage.transformations.usage) || 0,
            limit: (usage.transformations && usage.transformations.limit) || 0,
            used_percent: (usage.transformations && usage.transformations.used_percent) || 0
        },
        objects: {
            used: usage.resources || 0,
            limit: usage.resource_limit || 0
        },
        bandwidth: {
            used_bytes: (usage.bandwidth && usage.bandwidth.usage) || 0,
            limit_bytes: (usage.bandwidth && usage.bandwidth.limit) || 0,
            used_percent: (usage.bandwidth && usage.bandwidth.used_percent) || 0
        }
    };
}

async function runCleanupPass(options = {}) {
    const maxAgeDays = Number(options.maxAgeDays || options.olderThanDays || 10);
    const maxPages = Math.max(1, Number(options.maxPages || 2));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    const cutoffISO = cutoffDate.toISOString();

    const cloudinary = getCloudinaryClient();
    let nextCursor = options.nextCursor || null;
    let pagesProcessed = 0;
    let deletedCount = 0;
    let scannedCount = 0;
    const errors = [];

    while (pagesProcessed < maxPages) {
        let resourcesResponse;
        try {
            const params = {
                type: 'upload',
                prefix: 'jb-creations-orders',
                max_results: 100
            };

            if (nextCursor) {
                params.next_cursor = nextCursor;
            }

            resourcesResponse = await cloudinary.api.resources(params);
        } catch (error) {
            errors.push(error.message);
            break;
        }

        pagesProcessed += 1;
        nextCursor = resourcesResponse.next_cursor || null;
        scannedCount += (resourcesResponse.resources || []).length;

        const oldIds = (resourcesResponse.resources || [])
            .filter((resource) => resource.created_at < cutoffISO)
            .map((resource) => resource.public_id);

        if (oldIds.length > 0) {
            const deleteResult = await deleteResources(oldIds);
            deletedCount += deleteResult.deletedCount;
            deleteResult.failedChunks.forEach((failure) => errors.push(failure.error));
        }

        if (!nextCursor) {
            break;
        }
    }

    return {
        success: errors.length === 0,
        cutoffDate: cutoffISO,
        deletedCount,
        scannedCount,
        pagesProcessed,
        nextCursor,
        hasMore: !!nextCursor,
        errors
    };
}

module.exports = {
    deleteFolders,
    deleteResources,
    getUsageSummary,
    runCleanupPass
};