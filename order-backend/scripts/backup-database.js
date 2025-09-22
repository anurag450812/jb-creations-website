/**
 * Database Backup Script for JB Creations
 * Creates timestamped backups of the user database
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

function createBackup() {
    console.log('🔄 Starting database backup...');
    
    const sourcePath = process.env.DATABASE_PATH || './users.db';
    const backupDir = process.env.DATABASE_BACKUP_PATH || './backups';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const backupFileName = `users_backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);
    
    try {
        // Create backup directory if it doesn't exist
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            console.log(`📁 Created backup directory: ${backupDir}`);
        }
        
        // Check if source database exists
        if (!fs.existsSync(sourcePath)) {
            console.log('⚠️ Warning: No database found to backup');
            console.log(`   Expected location: ${sourcePath}`);
            return false;
        }
        
        // Create backup
        fs.copyFileSync(sourcePath, backupPath);
        
        const stats = fs.statSync(backupPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log('✅ Database backup completed successfully!');
        console.log(`   Source: ${sourcePath}`);
        console.log(`   Backup: ${backupPath}`);
        console.log(`   Size: ${fileSizeInMB} MB`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        
        // Clean up old backups (keep last 30 days)
        cleanupOldBackups(backupDir);
        
        return true;
        
    } catch (error) {
        console.error('❌ Database backup failed!');
        console.error(`   Error: ${error.message}`);
        return false;
    }
}

function cleanupOldBackups(backupDir) {
    try {
        const files = fs.readdirSync(backupDir);
        const backupFiles = files.filter(file => file.startsWith('users_backup_') && file.endsWith('.db'));
        
        if (backupFiles.length <= 30) {
            console.log(`🗂️ Keeping all ${backupFiles.length} backup files (within 30-day limit)`);
            return;
        }
        
        // Sort by creation time (oldest first)
        const sortedFiles = backupFiles.map(file => ({
            name: file,
            path: path.join(backupDir, file),
            time: fs.statSync(path.join(backupDir, file)).birthtime
        })).sort((a, b) => a.time - b.time);
        
        // Remove oldest files, keeping latest 30
        const filesToDelete = sortedFiles.slice(0, -30);
        
        filesToDelete.forEach(file => {
            fs.unlinkSync(file.path);
            console.log(`🗑️ Removed old backup: ${file.name}`);
        });
        
        console.log(`🧹 Cleaned up ${filesToDelete.length} old backup files`);
        
    } catch (error) {
        console.error('⚠️ Warning: Failed to cleanup old backups:', error.message);
    }
}

function listBackups() {
    const backupDir = process.env.DATABASE_BACKUP_PATH || './backups';
    
    if (!fs.existsSync(backupDir)) {
        console.log('📁 No backup directory found');
        return;
    }
    
    const files = fs.readdirSync(backupDir);
    const backupFiles = files.filter(file => file.startsWith('users_backup_') && file.endsWith('.db'));
    
    if (backupFiles.length === 0) {
        console.log('📝 No backup files found');
        return;
    }
    
    console.log(`📋 Found ${backupFiles.length} backup files:`);
    console.log('');
    
    backupFiles.sort().reverse().forEach((file, index) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        const createdAt = stats.birthtime.toISOString().replace('T', ' ').split('.')[0];
        
        console.log(`${index + 1}. ${file}`);
        console.log(`   Created: ${createdAt}`);
        console.log(`   Size: ${fileSizeInMB} MB`);
        console.log('');
    });
}

// CLI interface
const command = process.argv[2];

switch (command) {
    case 'create':
    case 'backup':
        createBackup();
        break;
        
    case 'list':
    case 'ls':
        listBackups();
        break;
        
    case 'help':
    case '--help':
        console.log('🗄️ JB Creations Database Backup Tool');
        console.log('');
        console.log('Usage:');
        console.log('  node backup-database.js create   - Create a new backup');
        console.log('  node backup-database.js list     - List all backups');
        console.log('  node backup-database.js help     - Show this help');
        console.log('');
        console.log('Environment Variables:');
        console.log('  DATABASE_PATH         - Path to source database (default: ./users.db)');
        console.log('  DATABASE_BACKUP_PATH  - Path to backup directory (default: ./backups)');
        break;
        
    default:
        console.log('🗄️ Creating database backup...');
        console.log('Use "node backup-database.js help" for more options');
        console.log('');
        createBackup();
        break;
}

module.exports = { createBackup, listBackups };