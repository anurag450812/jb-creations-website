/**
 * Database Migration Script for JB Creations
 * Handles database schema updates and data migrations
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
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

class DatabaseMigrator {
    constructor(dbPath = './users.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.migrations = [];
        this.setupMigrations();
    }

    setupMigrations() {
        // Migration 1: Initial schema
        this.migrations.push({
            version: 1,
            description: 'Create initial database schema',
            up: `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone TEXT UNIQUE NOT NULL,
                    email TEXT,
                    name TEXT,
                    password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_verified BOOLEAN DEFAULT FALSE,
                    verification_token TEXT,
                    reset_token TEXT,
                    reset_token_expires DATETIME,
                    login_attempts INTEGER DEFAULT 0,
                    locked_until DATETIME
                );

                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id TEXT UNIQUE NOT NULL,
                    user_id INTEGER,
                    customer_info TEXT NOT NULL,
                    order_details TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    total_amount DECIMAL(10,2),
                    payment_status TEXT DEFAULT 'pending',
                    payment_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    estimated_delivery DATE,
                    tracking_number TEXT,
                    notes TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                );

                CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id TEXT NOT NULL,
                    item_data TEXT NOT NULL,
                    image_path TEXT,
                    processed_image_path TEXT,
                    frame_size TEXT,
                    frame_style TEXT,
                    price DECIMAL(10,2),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES orders (order_id)
                );

                CREATE TABLE IF NOT EXISTS migration_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version INTEGER UNIQUE NOT NULL,
                    description TEXT,
                    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `,
            down: `
                DROP TABLE IF EXISTS order_items;
                DROP TABLE IF EXISTS orders;
                DROP TABLE IF EXISTS users;
                DROP TABLE IF EXISTS migration_history;
            `
        });

        // Migration 2: Add indexes for performance
        this.migrations.push({
            version: 2,
            description: 'Add database indexes for performance',
            up: `
                CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
                CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
                CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
                CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
            `,
            down: `
                DROP INDEX IF EXISTS idx_users_phone;
                DROP INDEX IF EXISTS idx_users_email;
                DROP INDEX IF EXISTS idx_orders_user_id;
                DROP INDEX IF EXISTS idx_orders_status;
                DROP INDEX IF EXISTS idx_orders_created_at;
                DROP INDEX IF EXISTS idx_order_items_order_id;
            `
        });

        // Migration 3: Add admin users and settings
        this.migrations.push({
            version: 3,
            description: 'Add admin users and application settings',
            up: `
                CREATE TABLE IF NOT EXISTS admin_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER UNIQUE NOT NULL,
                    role TEXT DEFAULT 'admin',
                    permissions TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                );

                CREATE TABLE IF NOT EXISTS app_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT,
                    type TEXT DEFAULT 'string',
                    description TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Insert default settings
                INSERT OR IGNORE INTO app_settings (key, value, type, description) VALUES
                ('maintenance_mode', 'false', 'boolean', 'Enable/disable maintenance mode'),
                ('max_order_items', '10', 'number', 'Maximum items per order'),
                ('order_processing_time', '3-5', 'string', 'Estimated processing time in days'),
                ('contact_email', 'support@jbcreations.com', 'string', 'Support contact email'),
                ('contact_phone', '+91-XXXXXXXXXX', 'string', 'Support contact phone');
            `,
            down: `
                DROP TABLE IF EXISTS admin_users;
                DROP TABLE IF EXISTS app_settings;
            `
        });
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    logger.error('Error connecting to database:', err);
                    reject(err);
                } else {
                    logger.info(`Connected to database: ${this.dbPath}`);
                    resolve();
                }
            });
        });
    }

    async disconnect() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        logger.error('Error closing database:', err);
                    } else {
                        logger.info('Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async getCurrentVersion() {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT MAX(version) as version FROM migration_history',
                (err, row) => {
                    if (err) {
                        // Migration history table doesn't exist yet
                        resolve(0);
                    } else {
                        resolve(row ? (row.version || 0) : 0);
                    }
                }
            );
        });
    }

    async executeMigration(migration) {
        return new Promise((resolve, reject) => {
            logger.info(`Executing migration ${migration.version}: ${migration.description}`);
            
            this.db.exec(migration.up, (err) => {
                if (err) {
                    logger.error(`Migration ${migration.version} failed:`, err);
                    reject(err);
                } else {
                    // Record migration in history
                    this.db.run(
                        'INSERT INTO migration_history (version, description) VALUES (?, ?)',
                        [migration.version, migration.description],
                        (err) => {
                            if (err) {
                                logger.error('Error recording migration:', err);
                                reject(err);
                            } else {
                                logger.info(`Migration ${migration.version} completed successfully`);
                                resolve();
                            }
                        }
                    );
                }
            });
        });
    }

    async runMigrations() {
        try {
            await this.connect();
            
            const currentVersion = await this.getCurrentVersion();
            logger.info(`Current database version: ${currentVersion}`);
            
            const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);
            
            if (pendingMigrations.length === 0) {
                logger.info('Database is up to date. No migrations needed.');
                return;
            }
            
            logger.info(`Found ${pendingMigrations.length} pending migrations`);
            
            for (const migration of pendingMigrations) {
                await this.executeMigration(migration);
            }
            
            logger.info('All migrations completed successfully');
            
        } catch (error) {
            logger.error('Migration failed:', error);
            throw error;
        } finally {
            await this.disconnect();
        }
    }

    async createBackup(backupPath = null) {
        if (!backupPath) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            backupPath = `./backups/backup-${timestamp}.db`;
        }
        
        await fs.ensureDir(path.dirname(backupPath));
        await fs.copy(this.dbPath, backupPath);
        
        logger.info(`Database backup created: ${backupPath}`);
        return backupPath;
    }

    async rollback(targetVersion) {
        try {
            await this.connect();
            
            const currentVersion = await this.getCurrentVersion();
            
            if (targetVersion >= currentVersion) {
                logger.info('Target version is same or higher than current version');
                return;
            }
            
            // Create backup before rollback
            await this.createBackup();
            
            const migrationsToRollback = this.migrations
                .filter(m => m.version > targetVersion && m.version <= currentVersion)
                .reverse(); // Rollback in reverse order
            
            for (const migration of migrationsToRollback) {
                logger.info(`Rolling back migration ${migration.version}: ${migration.description}`);
                
                await new Promise((resolve, reject) => {
                    this.db.exec(migration.down, (err) => {
                        if (err) {
                            logger.error(`Rollback of migration ${migration.version} failed:`, err);
                            reject(err);
                        } else {
                            // Remove from migration history
                            this.db.run(
                                'DELETE FROM migration_history WHERE version = ?',
                                [migration.version],
                                (err) => {
                                    if (err) {
                                        logger.error('Error updating migration history:', err);
                                        reject(err);
                                    } else {
                                        logger.info(`Migration ${migration.version} rolled back successfully`);
                                        resolve();
                                    }
                                }
                            );
                        }
                    });
                });
            }
            
            logger.info(`Rollback to version ${targetVersion} completed`);
            
        } catch (error) {
            logger.error('Rollback failed:', error);
            throw error;
        } finally {
            await this.disconnect();
        }
    }
}

// Command line interface
if (require.main === module) {
    const command = process.argv[2];
    const arg = process.argv[3];
    
    const migrator = new DatabaseMigrator();
    
    switch (command) {
        case 'migrate':
            migrator.runMigrations()
                .then(() => {
                    logger.info('Migration process completed');
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('Migration process failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'rollback':
            const targetVersion = parseInt(arg) || 0;
            migrator.rollback(targetVersion)
                .then(() => {
                    logger.info('Rollback process completed');
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('Rollback process failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'backup':
            migrator.createBackup(arg)
                .then((backupPath) => {
                    logger.info(`Backup created: ${backupPath}`);
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('Backup failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log(`
Usage: node migrate-database.js <command> [options]

Commands:
  migrate                 Run all pending migrations
  rollback <version>      Rollback to specified version
  backup [path]           Create database backup

Examples:
  node migrate-database.js migrate
  node migrate-database.js rollback 1
  node migrate-database.js backup ./my-backup.db
            `);
            process.exit(1);
    }
}

module.exports = DatabaseMigrator;