/**
 * Support Chat Widget for JB Creations
 * Floating chat button that connects users to admin support
 */

class SupportChat {
    constructor(options = {}) {
        this.chatId = null;
        this.messages = [];
        this.unsubscribe = null;
        this.isOpen = false;
        this.currentUser = null;
        this.orderContext = options.orderNumber || null;
        
        this.init();
    }

    init() {
        // Get current user
        const sessionData = localStorage.getItem('jb_current_user');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            this.currentUser = session.user || session;
        }

        // Create chat widget elements
        this.createChatWidget();
        this.attachEventListeners();
    }

    createChatWidget() {
        // Create chat container
        const chatHTML = `
            <div id="support-chat-widget" class="support-chat-widget">
                <!-- Floating Button -->
                <button id="chat-toggle-btn" class="chat-toggle-btn" title="Chat with Support">
                    <i class="fas fa-comments"></i>
                    <span class="chat-badge" id="chat-badge" style="display: none;">0</span>
                </button>

                <!-- Chat Window -->
                <div id="chat-window" class="chat-window">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <div class="chat-avatar">
                                <i class="fas fa-headset"></i>
                            </div>
                            <div class="chat-title">
                                <h4>JB Creations Support</h4>
                                <span class="chat-status">We typically reply within a few hours</span>
                            </div>
                        </div>
                        <button class="chat-close-btn" id="chat-close-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="chat-body" id="chat-body">
                        <!-- Welcome Message -->
                        <div class="chat-welcome">
                            <div class="welcome-icon">
                                <i class="fas fa-hand-wave"></i>
                            </div>
                            <h3>Hi there! 👋</h3>
                            <p>How can we help you today?</p>
                        </div>

                        <!-- Login Prompt (if not logged in) -->
                        <div id="chat-login-prompt" style="display: none;">
                            <div class="login-prompt-card">
                                <i class="fas fa-sign-in-alt"></i>
                                <p>Please log in to start a conversation with our support team.</p>
                                <a href="otp-login.html?redirect=${encodeURIComponent(window.location.href)}" class="login-btn">
                                    <i class="fas fa-phone"></i> Login with Phone
                                </a>
                            </div>
                        </div>

                        <!-- Messages Container -->
                        <div id="chat-messages" class="chat-messages"></div>
                    </div>

                    <div class="chat-footer" id="chat-footer">
                        <form id="chat-form" class="chat-form">
                            <input type="text" id="chat-input" placeholder="Type your message..." autocomplete="off">
                            <button type="submit" class="chat-send-btn" id="chat-send-btn">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        this.injectStyles();

        // Append to body
        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }

    injectStyles() {
        if (document.getElementById('support-chat-styles')) return;

        const styles = `
            <style id="support-chat-styles">
                .support-chat-widget {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 10000;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }

                .chat-toggle-btn {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #16697A 0%, #489FB5 100%);
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(22, 105, 122, 0.4);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                .chat-toggle-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 30px rgba(22, 105, 122, 0.5);
                }

                .chat-toggle-btn.active i {
                    transform: rotate(90deg);
                }

                .chat-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #dc3545;
                    color: white;
                    font-size: 12px;
                    font-weight: 600;
                    min-width: 22px;
                    height: 22px;
                    border-radius: 11px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 6px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }

                .chat-window {
                    position: absolute;
                    bottom: 80px;
                    right: 0;
                    width: 380px;
                    max-width: calc(100vw - 40px);
                    height: 520px;
                    max-height: calc(100vh - 120px);
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 50px rgba(0,0,0,0.2);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    animation: slideUp 0.3s ease;
                }

                .chat-window.active {
                    display: flex;
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .chat-header {
                    background: linear-gradient(135deg, #16697A 0%, #489FB5 100%);
                    color: white;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .chat-header-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .chat-avatar {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }

                .chat-title h4 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }

                .chat-status {
                    font-size: 12px;
                    opacity: 0.9;
                }

                .chat-close-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.3s;
                }

                .chat-close-btn:hover {
                    background: rgba(255,255,255,0.3);
                }

                .chat-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background: #f8f9fa;
                }

                .chat-welcome {
                    text-align: center;
                    padding: 30px 20px;
                }

                .welcome-icon {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #16697A 0%, #489FB5 100%);
                    color: white;
                    font-size: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 15px;
                }

                .chat-welcome h3 {
                    margin: 0 0 8px;
                    font-size: 20px;
                    color: #333;
                }

                .chat-welcome p {
                    margin: 0;
                    color: #6c757d;
                }

                .login-prompt-card {
                    background: white;
                    padding: 25px;
                    border-radius: 12px;
                    text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                    margin-top: 20px;
                }

                .login-prompt-card i {
                    font-size: 36px;
                    color: #16697A;
                    margin-bottom: 15px;
                }

                .login-prompt-card p {
                    color: #6c757d;
                    margin-bottom: 20px;
                }

                .login-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 24px;
                    background: #16697A;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 500;
                    transition: background 0.3s;
                }

                .login-btn:hover {
                    background: #489FB5;
                }

                .chat-messages {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .chat-message {
                    max-width: 80%;
                    padding: 12px 16px;
                    border-radius: 16px;
                    font-size: 14px;
                    line-height: 1.5;
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .chat-message.user {
                    background: linear-gradient(135deg, #16697A 0%, #489FB5 100%);
                    color: white;
                    align-self: flex-end;
                    border-bottom-right-radius: 4px;
                }

                .chat-message.admin {
                    background: white;
                    color: #333;
                    align-self: flex-start;
                    border-bottom-left-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }

                .message-meta {
                    font-size: 11px;
                    margin-top: 6px;
                    opacity: 0.7;
                }

                .chat-footer {
                    padding: 15px;
                    background: white;
                    border-top: 1px solid #e9ecef;
                }

                .chat-form {
                    display: flex;
                    gap: 10px;
                }

                #chat-input {
                    flex: 1;
                    padding: 12px 16px;
                    border: 2px solid #e9ecef;
                    border-radius: 24px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.3s;
                }

                #chat-input:focus {
                    border-color: #16697A;
                }

                .chat-send-btn {
                    width: 46px;
                    height: 46px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #16697A 0%, #489FB5 100%);
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.3s;
                }

                .chat-send-btn:hover {
                    transform: scale(1.1);
                }

                .chat-send-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                /* Mobile optimizations */
                @media (max-width: 480px) {
                    .support-chat-widget {
                        bottom: 15px;
                        right: 15px;
                    }

                    .chat-toggle-btn {
                        width: 55px;
                        height: 55px;
                        font-size: 22px;
                    }

                    .chat-window {
                        bottom: 75px;
                        width: calc(100vw - 30px);
                        height: calc(100vh - 100px);
                        max-height: none;
                        border-radius: 12px;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    attachEventListeners() {
        // Toggle button
        document.getElementById('chat-toggle-btn').addEventListener('click', () => {
            this.toggleChat();
        });

        // Close button
        document.getElementById('chat-close-btn').addEventListener('click', () => {
            this.closeChat();
        });

        // Form submit
        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
    }

    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    async openChat() {
        this.isOpen = true;
        document.getElementById('chat-window').classList.add('active');
        document.getElementById('chat-toggle-btn').classList.add('active');

        // Check if user is logged in
        if (!this.currentUser) {
            document.getElementById('chat-login-prompt').style.display = 'block';
            document.getElementById('chat-footer').style.display = 'none';
            return;
        }

        document.getElementById('chat-login-prompt').style.display = 'none';
        document.getElementById('chat-footer').style.display = 'block';

        // Get or create chat
        await this.initializeChat();
    }

    closeChat() {
        this.isOpen = false;
        document.getElementById('chat-window').classList.remove('active');
        document.getElementById('chat-toggle-btn').classList.remove('active');
    }

    async initializeChat() {
        if (!window.jbAPI) {
            console.error('Firebase API not available');
            return;
        }

        try {
            const result = await window.jbAPI.getOrCreateSupportChat(
                this.currentUser.phone,
                this.currentUser.name,
                this.currentUser.email
            );

            if (result.success) {
                this.chatId = result.chatId;
                
                // If new chat and there's an order context, send initial message
                if (result.isNew && this.orderContext) {
                    await this.sendMessage(`Hi, I need help with Order #${this.orderContext}`);
                }

                // Load and listen for messages
                this.loadMessages();
            }
        } catch (error) {
            console.error('Error initializing chat:', error);
        }
    }

    async loadMessages() {
        if (!this.chatId) return;

        try {
            // Set up real-time listener
            this.unsubscribe = await window.jbAPI.getChatMessages(this.chatId, (messages) => {
                this.messages = messages;
                this.renderMessages();
            });

            // Mark as read
            await window.jbAPI.markChatAsRead(this.chatId, 'user');
            this.updateBadge(0);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages() {
        const container = document.getElementById('chat-messages');
        
        if (!this.messages || this.messages.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Hide welcome message if there are messages
        document.querySelector('.chat-welcome').style.display = 'none';

        container.innerHTML = this.messages.map(msg => `
            <div class="chat-message ${msg.senderType}">
                <div class="message-text">${this.escapeHtml(msg.text)}</div>
                <div class="message-meta">
                    ${msg.senderType === 'admin' ? `<strong>${msg.senderName}</strong> • ` : ''}
                    ${this.formatTime(msg.createdAt)}
                </div>
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
        document.getElementById('chat-body').scrollTop = document.getElementById('chat-body').scrollHeight;
    }

    async sendMessage(text = null) {
        const input = document.getElementById('chat-input');
        const message = text || input.value.trim();
        
        if (!message || !this.chatId) return;

        const sendBtn = document.getElementById('chat-send-btn');
        sendBtn.disabled = true;
        input.value = '';

        try {
            await window.jbAPI.sendChatMessage(
                this.chatId,
                message,
                'user',
                this.currentUser.name || 'Customer'
            );
        } catch (error) {
            console.error('Error sending message:', error);
            input.value = message; // Restore message on error
        } finally {
            sendBtn.disabled = false;
            input.focus();
        }
    }

    updateBadge(count) {
        const badge = document.getElementById('chat-badge');
        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        const widget = document.getElementById('support-chat-widget');
        if (widget) {
            widget.remove();
        }
    }
}

// Auto-initialize on pages that need it
// Can be initialized manually with: new SupportChat({ orderNumber: 'JB12345' })
window.SupportChat = SupportChat;

// Initialize on pages with "Need Help" functionality
document.addEventListener('DOMContentLoaded', function() {
    // Auto-init on certain pages
    const autoInitPages = ['my-orders.html', 'order-details.html', 'cart.html', 'checkout.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (autoInitPages.includes(currentPage)) {
        // Wait for Firebase to be ready
        if (window.jbAPI) {
            window.supportChat = new SupportChat();
        } else {
            window.addEventListener('firebaseReady', () => {
                window.supportChat = new SupportChat();
            });
        }
    }
});

// Helper function to open chat with order context
function openSupportChat(orderNumber = null) {
    if (window.supportChat) {
        window.supportChat.orderContext = orderNumber;
        window.supportChat.openChat();
    } else {
        window.supportChat = new SupportChat({ orderNumber });
        window.supportChat.openChat();
    }
}
