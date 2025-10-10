# Fast2SMS DLT OTP Integration Guide

## 🚀 Complete Setup Guide for JB Creations Website

This guide will help you integrate Fast2SMS DLT OTP service into your website for secure phone authentication.

---

## 📋 Prerequisites

1. ✅ Completed DLT registration on Jio True Connect
2. ✅ Active Fast2SMS account
3. ✅ DLT approved template
4. ✅ Node.js installed on your system

---

## 🔧 Step 1: Fast2SMS Account Setup

### 1.1 Get Your API Key
1. Login to [Fast2SMS Dashboard](https://www.fast2sms.com/dashboard)
2. Navigate to **API & Integrations** section
3. Copy your **API Key** (looks like: `xxxxxxxxxxx`)

### 1.2 Create DLT Template
1. Go to **DLT Templates** section
2. Click **Add New Template**
3. Use this template format:
   ```
   Your OTP for JB Creations is {#var#}. Valid for 5 minutes. Do not share with anyone.
   ```
4. Submit for approval
5. Once approved, note your **Template ID**

### 1.3 Register Sender ID
1. Register your sender ID (e.g., `JBCREA`)
2. Get it approved through DLT process
3. Note down your approved **Sender ID**

---

## 🛠️ Step 2: Configure Your Application

### 2.1 Update Fast2SMS Configuration

Open `fast2sms-config.js` and update the following:

```javascript
const fast2smsConfig = {
    // Replace with your actual Fast2SMS API Key
    apiKey: 'YOUR_FAST2SMS_API_KEY',
    
    // Replace with your DLT Template ID
    templateId: 'YOUR_DLT_TEMPLATE_ID',
    
    // Replace with your registered Sender ID
    senderId: 'JBCREA',  // Your sender ID
    
    // ... rest of config
};
```

### 2.2 Install Dependencies

Navigate to the `order-backend` folder and install required packages:

```bash
cd order-backend
npm install axios express cors sqlite3 bcrypt jsonwebtoken dotenv
```

---

## 🚀 Step 3: Start the Backend Server

### 3.1 Start Auth Server

From the project root directory:

```bash
# Windows
cd order-backend
node auth-server.js

# Or use the batch file
start-auth-server.bat
```

You should see:
```
✅ Connected to SQLite database
✅ Users table ready
🚀 JB Creations Auth Server running on http://localhost:3001
```

---

## 🧪 Step 4: Test the Integration

### 4.1 Open Test Page

1. Open `test-fast2sms-otp.html` in your browser
2. The page will show if Fast2SMS is configured correctly

### 4.2 Test Flow

#### Test Send OTP:
1. Enter a 10-digit phone number (e.g., `9876543210`)
2. Select type: `register` for new users, `login` for existing users
3. Click **Send OTP**
4. You should receive OTP on your phone within seconds

#### Test Verify OTP:
1. Enter the phone number
2. Enter the 6-digit OTP received
3. Click **Verify OTP**
4. Should show success message if OTP is correct

#### Test Registration:
1. Click **Send OTP** first (type: register)
2. Enter name, phone, email (optional)
3. Enter the OTP received
4. Click **Register**
5. User account will be created

#### Test Login:
1. Click **Send OTP** first (type: login)
2. Enter phone number
3. Enter OTP received
4. Click **Login**
5. JWT token will be stored

---

## 📱 Step 5: Integrate with Your Website

### 5.1 Include Fast2SMS Client

Add to your HTML pages:

```html
<script src="fast2sms-client.js"></script>
```

### 5.2 Initialize Client

```javascript
const otpClient = new Fast2SMSOTPClient('http://localhost:3001');
```

### 5.3 Use in Your Forms

**Send OTP:**
```javascript
async function sendOTP() {
    try {
        const result = await otpClient.sendOTP('9876543210', 'register');
        console.log('OTP sent:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}
```

**Verify OTP:**
```javascript
async function verifyOTP() {
    try {
        const result = await otpClient.verifyOTP('9876543210', '123456');
        console.log('OTP verified:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}
```

**Register User:**
```javascript
async function register() {
    try {
        const result = await otpClient.register({
            name: 'John Doe',
            phone: '9876543210',
            email: 'john@example.com',
            otp: '123456'
        });
        console.log('Registered:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}
```

**Login User:**
```javascript
async function login() {
    try {
        const result = await otpClient.login('9876543210', '123456');
        console.log('Logged in:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}
```

---

## 🔄 Step 6: Update Existing OTP Login Page (Optional)

If you want to update your existing `otp-login.html` to use Fast2SMS:

1. Replace the script tag:
   ```html
   <!-- Old -->
   <script src="otp-auth.js"></script>
   
   <!-- New -->
   <script src="fast2sms-client.js"></script>
   ```

2. Update the JavaScript code to use `Fast2SMSOTPClient` instead of `OTPAuth`

---

## 📊 API Endpoints

Your backend now provides these endpoints:

### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
    "phone": "9876543210",
    "type": "login" // or "register"
}
```

### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
    "phone": "9876543210",
    "otp": "123456"
}
```

### Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
    "phone": "9876543210"
}
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
    "name": "John Doe",
    "phone": "9876543210",
    "email": "john@example.com",
    "otp": "123456"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
    "phone": "9876543210",
    "otp": "123456"
}
```

---

## 🔒 Security Features

- ✅ OTP expires after 5 minutes
- ✅ Maximum 3 verification attempts per OTP
- ✅ 60-second cooldown before resending OTP
- ✅ Phone number validation
- ✅ JWT token-based authentication
- ✅ DLT compliant messaging

---

## 🐛 Troubleshooting

### Issue: "Fast2SMS not configured properly"
**Solution:** Check `fast2sms-config.js` and ensure API key and Template ID are set

### Issue: "Invalid Indian mobile number"
**Solution:** Ensure phone number is 10 digits starting with 6, 7, 8, or 9

### Issue: "OTP not received"
**Solution:** 
- Check Fast2SMS dashboard for credits
- Verify DLT template is approved
- Check sender ID is registered

### Issue: "Failed to send OTP"
**Solution:**
- Verify API key is correct
- Check template ID matches approved template
- Ensure backend server is running

### Issue: "Database error"
**Solution:** 
- Check if `users.db` file exists in `order-backend` folder
- Restart the auth server

---

## 📝 Important Notes

1. **Development Mode:** In development, OTP is shown in console and alert. Remove this in production.

2. **Environment Variables:** For production, use environment variables:
   ```bash
   # Create .env file in order-backend folder
   FAST2SMS_API_KEY=your_api_key
   FAST2SMS_TEMPLATE_ID=your_template_id
   FAST2SMS_SENDER_ID=JBCREA
   JWT_SECRET=your_secret_key
   AUTH_PORT=3001
   NODE_ENV=production
   ```

3. **Database:** Current setup uses SQLite. For production, consider PostgreSQL or MySQL.

4. **Rate Limiting:** Implement rate limiting to prevent abuse

5. **HTTPS:** Use HTTPS in production for secure communication

---

## 🎉 Success!

You have successfully integrated Fast2SMS DLT OTP into your website! 

For any issues or questions, refer to:
- [Fast2SMS Documentation](https://docs.fast2sms.com/)
- [Fast2SMS Support](https://www.fast2sms.com/support)

---

## 📁 Files Created

- ✅ `fast2sms-config.js` - Configuration file
- ✅ `order-backend/services/fast2sms-service.js` - Backend OTP service
- ✅ `fast2sms-client.js` - Frontend client library
- ✅ `test-fast2sms-otp.html` - Testing page
- ✅ `FAST2SMS-SETUP.md` - This setup guide
- ✅ Updated `order-backend/auth-server.js` - Backend integration

---

**Happy Coding! 🚀**
