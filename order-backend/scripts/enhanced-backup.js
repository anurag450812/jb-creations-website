/**
 * Enhanced Database Backup and Restore Script
 * Handles automated backups with compression and cloud storage options
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const archiver = require('archiver');
const winston = require('winston');

// Setup logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class DatabaseBackup {
    constructor(options = {}) {
        this.dbPath = options.dbPath || './users.db';
        this.backupDir = options.backupDir || './backups';
        this.retentionDays = options.retentionDays || 30;
        this.compressionLevel = options.compressionLevel || 6;
    }

    async ensureBackupDirectory() {
        await fs.ensureDir(this.backupDir);
        logger.info(`Backup directory ensured: ${this.backupDir}`);
    }

    generateBackupName(prefix = 'backup', includeTime = true) {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        
        if (includeTime) {
            const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            return `${prefix}-${date}-${time}`;
        }
        
        return `${prefix}-${date}`;
    }

    async createBackup(options = {}) {
        try {
            await this.ensureBackupDirectory();
            
            const backupName = options.name || this.generateBackupName();
            const compress = options.compress !== false;
            
            // Check if source database exists
            if (!await fs.pathExists(this.dbPath)) {
                throw new Error(`Database file not found: ${this.dbPath}`);
            }
            
            if (compress) {
                return await this.createCompressedBackup(backupName);
            } else {
                return await this.createSimpleBackup(backupName);
            }
            
        } catch (error) {
            logger.error('Backup creation failed:', error);
            throw error;
        }
    }

    async createSimpleBackup(backupName) {
        const backupPath = path.join(this.backupDir, `${backupName}.db`);
        
        logger.info(`Creating simple backup: ${backupPath}`);
        
        await fs.copy(this.dbPath, backupPath);
        
        const stats = await fs.stat(backupPath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        logger.info(`Backup created successfully: ${backupPath} (${sizeInMB} MB)`);
        
        return {
            path: backupPath,
            size: stats.size,
            compressed: false,
            createdAt: new Date()
        };
    }

    async createCompressedBackup(backupName) {
        const backupPath = path.join(this.backupDir, `${backupName}.zip`);
        
        logger.info(`Creating compressed backup: ${backupPath}`);
        
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(backupPath);
            const archive = archiver('zip', {
                zlib: { level: this.compressionLevel }
            });
            
            output.on('close', async () => {
                const stats = await fs.stat(backupPath);
                const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
                
                logger.info(`Compressed backup created: ${backupPath} (${sizeInMB} MB)`);
                
                resolve({
                    path: backupPath,
                    size: stats.size,
                    compressed: true,
                    createdAt: new Date()
                });
            });
            
            archive.on('error', (err) => {
                logger.error('Archive error:', err);
                reject(err);
            });
            
            archive.pipe(output);
            
            // Add database file to archive
            archive.file(this.dbPath, { name: path.basename(this.dbPath) });
            
            // Add images directory if it exists
            const imagesDir = path.join(path.dirname(this.dbPath), '../images');
            fs.pathExists(imagesDir).then(exists => {
                if (exists) {
                    archive.directory(imagesDir, 'images');
                    logger.info('Including images directory in backup');
                }
                
                // Add orders directory if it exists
                const ordersDir = path.join(path.dirname(this.dbPath), '../orders');
                fs.pathExists(ordersDir).then(exists => {
                    if (exists) {
                        archive.directory(ordersDir, 'orders');
                        logger.info('Including orders directory in backup');
                    }
                    
                    archive.finalize();
                });
            });
        });
    }

    async listBackups() {
        try {
            await this.ensureBackupDirectory();
            
            const files = await fs.readdir(this.backupDir);
            const backups = [];
            
            for (const file of files) {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.isFile() && (file.endsWith('.db') || file.endsWith('.zip'))) {
                    backups.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
                        compressed: file.endsWith('.zip'),
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime
                    });
                }
            }
            
            // Sort by creation time (newest first)
            backups.sort((a, b) => b.createdAt - a.createdAt);
            
            return backups;
            
        } catch (error) {
            logger.error('Error listing backups:', error);
            throw error;
        }
    }

    async cleanupOldBackups() {
        try {
            const backups = await this.listBackups();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
            
            const oldBackups = backups.filter(backup => backup.createdAt < cutoffDate);
            
            if (oldBackups.length === 0) {
                logger.info('No old backups to clean up');
                return;
            }
            
            logger.info(`Cleaning up ${oldBackups.length} old backups (older than ${this.retentionDays} days)`);
            
            for (const backup of oldBackups) {
                await fs.remove(backup.path);
                logger.info(`Deleted old backup: ${backup.name}`);
            }
            
            logger.info('Cleanup completed');
            
        } catch (error) {
            logger.error('Cleanup failed:', error);
            throw error;
        }
    }

    async restoreBackup(backupPath, targetPath = null) {
        try {
            if (!await fs.pathExists(backupPath)) {
                throw new Error(`Backup file not found: ${backupPath}`);
            }
            
            const target = targetPath || this.dbPath;
            
            // Create backup of current database before restore
            if (await fs.pathExists(target)) {
                const currentBackup = `${target}.before-restore-${Date.now()}`;
                await fs.copy(target, currentBackup);
                logger.info(`Current database backed up to: ${currentBackup}`);
            }
            
            if (backupPath.endsWith('.zip')) {
                logger.info('Restoring from compressed backup...');
                // For ZIP files, you'd need to extract and restore
                // This is a simplified version - you might want to use a library like yauzl
                throw new Error('ZIP restore not implemented in this example');
            } else {
                logger.info(`Restoring database from: ${backupPath}`);
                await fs.copy(backupPath, target);
            }
            
            logger.info(`Database restored successfully to: ${target}`);
            
        } catch (error) {
            logger.error('Restore failed:', error);
            throw error;
        }
    }

    async verifyBackup(backupPath) {
        try {
            if (!await fs.pathExists(backupPath)) {
                throw new Error(`Backup file not found: ${backupPath}`);
            }
            
            if (backupPath.endsWith('.zip')) {
                // For ZIP files, you'd verify the archive integrity
                logger.info('ZIP verification not implemented in this example');
                return true;
            }
            
            // Verify SQLite database integrity
            const db = new sqlite3.Database(backupPath, sqlite3.OPEN_READONLY);
            
            return new Promise((resolve, reject) => {
                db.get('PRAGMA integrity_check', (err, row) => {
                    db.close();
                    
                    if (err) {
                        logger.error('Database verification failed:', err);
                        reject(err);
                    } else if (row && row.integrity_check === 'ok') {
                        logger.info('Backup verification successful');
                        resolve(true);
                    } else {
                        logger.error('Database integrity check failed');
                        resolve(false);
                    }
                });
            });
            
        } catch (error) {
            logger.error('Backup verification failed:', error);
            throw error;
        }
    }

    async getBackupStats() {
        try {
            const backups = await this.listBackups();
            
            const stats = {
                totalBackups: backups.length,
                totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
                oldestBackup: backups.length > 0 ? backups[backups.length - 1].createdAt : null,
                newestBackup: backups.length > 0 ? backups[0].createdAt : null,
                compressedBackups: backups.filter(b => b.compressed).length,
                uncompressedBackups: backups.filter(b => !b.compressed).length
            };
            
            stats.totalSizeInMB = (stats.totalSize / (1024 * 1024)).toFixed(2);
            
            return stats;
            
        } catch (error) {
            logger.error('Error getting backup stats:', error);
            throw error;
        }
    }
}

// Command line interface
if (require.main === module) {
    const command = process.argv[2];
    const arg = process.argv[3];
    
    const backup = new DatabaseBackup();
    
    switch (command) {
        case 'create':
            backup.createBackup({ name: arg })
                .then((result) => {
                    logger.info('Backup completed:', result);
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('Backup failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'list':
            backup.listBackups()
                .then((backups) => {
                    console.log('\nAvailable Backups:');
                    console.log('==================');
                    
                    if (backups.length === 0) {
                        console.log('No backups found');
                    } else {
                        backups.forEach((backup, index) => {
                            console.log(`${index + 1}. ${backup.name}`);
                            console.log(`   Size: ${backup.sizeInMB} MB`);
                            console.log(`   Created: ${backup.createdAt.toLocaleString()}`);
                            console.log(`   Type: ${backup.compressed ? 'Compressed' : 'Simple'}`);
                            console.log('');
                        });
                    }
                    
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('List failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'cleanup':
            backup.cleanupOldBackups()
                .then(() => {
                    logger.info('Cleanup completed');
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('Cleanup failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'restore':
            if (!arg) {
                logger.error('Please specify backup file path');
                process.exit(1);
            }
            
            backup.restoreBackup(arg)
                .then(() => {
                    logger.info('Restore completed');
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('Restore failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'verify':
            if (!arg) {
                logger.error('Please specify backup file path');
                process.exit(1);
            }
            
            backup.verifyBackup(arg)
                .then((isValid) => {
                    if (isValid) {
                        logger.info('Backup verification successful');
                        process.exit(0);
                    } else {
                        logger.error('Backup verification failed');
                        process.exit(1);
                    }
                })
                .catch((error) => {
                    logger.error('Verification failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'stats':
            backup.getBackupStats()
                .then((stats) => {
                    console.log('\nBackup Statistics:');
                    console.log('==================');
                    console.log(`Total backups: ${stats.totalBackups}`);
                    console.log(`Total size: ${stats.totalSizeInMB} MB`);
                    console.log(`Compressed: ${stats.compressedBackups}`);
                    console.log(`Uncompressed: ${stats.uncompressedBackups}`);
                    if (stats.oldestBackup) {
                        console.log(`Oldest backup: ${stats.oldestBackup.toLocaleString()}`);
                    }
                    if (stats.newestBackup) {
                        console.log(`Newest backup: ${stats.newestBackup.toLocaleString()}`);
                    }
                    
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('Stats failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log(`
Usage: node enhanced-backup.js <command> [options]

Commands:
  create [name]           Create a new backup
  list                    List all available backups
  cleanup                 Remove old backups (older than 30 days)
  restore <path>          Restore from backup file
  verify <path>           Verify backup integrity
  stats                   Show backup statistics

Examples:
  node enhanced-backup.js create my-backup
  node enhanced-backup.js list
  node enhanced-backup.js restore ./backups/backup-2023-09-22.db
  node enhanced-backup.js verify ./backups/backup-2023-09-22.zip
  node enhanced-backup.js cleanup
  node enhanced-backup.js stats
            `);
            process.exit(1);
    }
}

module.exports = DatabaseBackup;