const { processPendingCleanupJobs } = require('./utils/cloudinary-cleanup-queue');
const { runCleanupPass } = require('./utils/cloudinary-cleanup');

const DEFAULT_MAX_PAGES = 2;
const DEFAULT_DAYS_OLD = 10;

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

async function runScheduledCleanupSweep() {
    const maxPages = parsePositiveInt(process.env.CLOUDINARY_CLEANUP_MAX_PAGES, DEFAULT_MAX_PAGES);
    const maxAgeDays = parsePositiveInt(process.env.CLOUDINARY_CLEANUP_DAYS_OLD, DEFAULT_DAYS_OLD);
    let nextCursor = null;
    let totalDeleted = 0;
    let totalScanned = 0;
    let passCount = 0;

    do {
        const result = await runCleanupPass({
            maxAgeDays,
            maxPages,
            nextCursor
        });

        totalDeleted += result.deletedCount;
        totalScanned += result.scannedCount;
        nextCursor = result.nextCursor;
        passCount += 1;
    } while (nextCursor && passCount < 3);

    return {
        totalDeleted,
        totalScanned,
        nextCursor,
        passCount
    };
}

exports.handler = async () => {
    try {
        const retrySummary = await processPendingCleanupJobs({ limit: 20 });
        const cleanupSummary = await runScheduledCleanupSweep();

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                retrySummary,
                cleanupSummary
            })
        };
    } catch (error) {
        console.error('cloudinary-maintenance-scheduled error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Scheduled Cloudinary maintenance failed.'
            })
        };
    }
};
