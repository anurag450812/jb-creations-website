/**
 * Centralized Notification System
 * Replaces native alert() with mobile-optimized toast notifications
 */

class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            document.body.appendChild(this.container);
            this.injectStyles();
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }

            .toast-notification {
                background: white;
                color: #333;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 300px;
                max-width: 400px;
                transform: translateX(120%);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                pointer-events: auto;
                border-left: 4px solid #333;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 14px;
            }

            .toast-notification.show {
                transform: translateX(0);
            }

            .toast-notification.success {
                border-left-color: #2ecc71;
            }
            .toast-notification.success .toast-icon {
                color: #2ecc71;
            }

            .toast-notification.error {
                border-left-color: #e74c3c;
            }
            .toast-notification.error .toast-icon {
                color: #e74c3c;
            }

            .toast-notification.warning {
                border-left-color: #f1c40f;
            }
            .toast-notification.warning .toast-icon {
                color: #f1c40f;
            }

            .toast-notification.info {
                border-left-color: #3498db;
            }
            .toast-notification.info .toast-icon {
                color: #3498db;
            }

            .toast-content {
                flex-grow: 1;
            }

            .toast-title {
                font-weight: 600;
                margin-bottom: 2px;
                display: block;
            }

            .toast-message {
                color: #666;
                line-height: 1.4;
            }

            .toast-close {
                cursor: pointer;
                opacity: 0.5;
                padding: 4px;
            }
            .toast-close:hover {
                opacity: 1;
            }

            @media (max-width: 480px) {
                #notification-container {
                    top: auto;
                    bottom: 20px;
                    left: 20px;
                    right: 20px;
                    width: auto;
                }
                
                .toast-notification {
                    min-width: 0;
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    show(message, type = 'info', title = '') {
        this.init(); // Ensure container exists

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';

        // If no title provided, use capitalized type
        if (!title) {
            title = type.charAt(0).toUpperCase() + type.slice(1);
        }

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <span class="toast-title">${title}</span>
                <div class="toast-message">${message}</div>
            </div>
            <div class="toast-close">✕</div>
        `;

        // Close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.dismiss(toast);
        });

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto dismiss
        setTimeout(() => {
            this.dismiss(toast);
        }, 5000);
    }

    dismiss(toast) {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentElement) {
                toast.remove();
            }
        });
    }

    // Convenience methods
    success(message, title) { this.show(message, 'success', title); }
    error(message, title) { this.show(message, 'error', title); }
    warning(message, title) { this.show(message, 'warning', title); }
    info(message, title) { this.show(message, 'info', title); }
}

// Export singleton instance
const notifications = new NotificationSystem();
window.notifications = notifications; // Make globally available
