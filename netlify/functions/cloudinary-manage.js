// Netlify Function for Cloudinary image management (delete, usage, cleanup)
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfhxnpp9m',
    api_key: process.env.CLOUDINARY_API_KEY || '629699618349166',
    api_secret: process.env.CLOUDINARY_API_SECRET || '-8gGXZCe-4ORvEQSPcdajA38yQQ'
});

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { action, publicIds, maxAgeDays } = JSON.parse(event.body);

        // ── DELETE IMAGES BY PUBLIC IDs ──
        if (action === 'delete') {
            if (!Array.isArray(publicIds) || publicIds.length === 0) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'publicIds array required' }) };
            }

            // Cloudinary allows bulk delete of up to 100 at a time
            const results = [];
            const chunks = [];
            for (let i = 0; i < publicIds.length; i += 100) {
                chunks.push(publicIds.slice(i, i + 100));
            }

            for (const chunk of chunks) {
                try {
                    const result = await cloudinary.api.delete_resources(chunk);
                    results.push(result);
                } catch (err) {
                    console.error('Cloudinary bulk delete error:', err.message);
                    results.push({ error: err.message, ids: chunk });
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, results })
            };
        }

        // ── DELETE FOLDER (all images under a folder prefix) ──
        if (action === 'delete-folder') {
            if (!Array.isArray(publicIds) || publicIds.length === 0) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'folder prefixes array required' }) };
            }

            const results = [];
            for (const prefix of publicIds) {
                try {
                    const result = await cloudinary.api.delete_resources_by_prefix(prefix);
                    results.push({ prefix, result });
                    // Try to remove the empty folder too
                    try { await cloudinary.api.delete_folder(prefix); } catch (_) { /* ignore */ }
                } catch (err) {
                    console.error('Cloudinary folder delete error:', err.message);
                    results.push({ prefix, error: err.message });
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, results })
            };
        }

        // ── GET STORAGE USAGE ──
        if (action === 'usage') {
            const usage = await cloudinary.api.usage();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    storage: {
                        used_bytes: usage.storage ? usage.storage.usage : 0,
                        limit_bytes: usage.storage ? usage.storage.limit : 0,
                        used_percent: usage.storage ? usage.storage.used_percent : 0
                    },
                    credits: {
                        used: usage.credits ? usage.credits.usage : 0,
                        limit: usage.credits ? usage.credits.limit : 0,
                        used_percent: usage.credits ? usage.credits.used_percent : 0
                    },
                    transformations: {
                        used: usage.transformations ? usage.transformations.usage : 0,
                        limit: usage.transformations ? usage.transformations.limit : 0,
                        used_percent: usage.transformations ? usage.transformations.used_percent : 0
                    },
                    objects: {
                        used: usage.resources || 0,
                        limit: usage.resource_limit || 0
                    },
                    bandwidth: {
                        used_bytes: usage.bandwidth ? usage.bandwidth.usage : 0,
                        limit_bytes: usage.bandwidth ? usage.bandwidth.limit : 0,
                        used_percent: usage.bandwidth ? usage.bandwidth.used_percent : 0
                    }
                })
            };
        }

        // ── CLEANUP OLD IMAGES (older than maxAgeDays, default 10) ──
        if (action === 'cleanup') {
            const days = maxAgeDays || 10;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffISO = cutoffDate.toISOString();

            let deletedCount = 0;
            let nextCursor = null;
            const errors = [];

            // Paginate through all resources in the jb-creations-orders folder
            do {
                try {
                    const params = {
                        type: 'upload',
                        prefix: 'jb-creations-orders',
                        max_results: 100
                    };
                    if (nextCursor) params.next_cursor = nextCursor;

                    const resources = await cloudinary.api.resources(params);
                    nextCursor = resources.next_cursor || null;

                    const oldIds = resources.resources
                        .filter(r => r.created_at < cutoffISO)
                        .map(r => r.public_id);

                    if (oldIds.length > 0) {
                        await cloudinary.api.delete_resources(oldIds);
                        deletedCount += oldIds.length;
                    }
                } catch (err) {
                    console.error('Cleanup pagination error:', err.message);
                    errors.push(err.message);
                    nextCursor = null; // stop on error
                }
            } while (nextCursor);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    deletedCount,
                    cutoffDate: cutoffISO,
                    errors: errors.length > 0 ? errors : undefined
                })
            };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action. Use: delete, delete-folder, usage, cleanup' }) };

    } catch (error) {
        console.error('cloudinary-manage error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
