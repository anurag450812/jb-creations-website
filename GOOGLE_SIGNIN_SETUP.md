# 🔑 Google Sign-In Setup Guide

## 🚀 **Google OAuth Configuration**

To enable Google Sign-In for your JB Creations website, follow these steps:

### **Step 1: Create Google Cloud Project**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create New Project**:
   - Click "Select a project" → "New Project"
   - Project Name: `JB Creations Website`
   - Click "Create"

### **Step 2: Enable Google Sign-In API**

1. **Go to APIs & Services** → **Library**
2. **Search for "Google+ API"** or **"Google Identity"**
3. **Click "Enable"**

### **Step 3: Create OAuth 2.0 Credentials**

1. **Go to APIs & Services** → **Credentials**
2. **Click "Create Credentials"** → **OAuth 2.0 Client IDs**
3. **Application Type**: Web application
4. **Name**: JB Creations Website
5. **Authorized JavaScript origins**:
   - `http://localhost:3001` (for testing)
   - `https://yourdomain.com` (for live site)
6. **Authorized redirect URIs**:
   - `http://localhost:3001/auth.html`
   - `https://yourdomain.com/auth.html`
7. **Click "Create"**

### **Step 4: Get Your Client ID**

1. **Copy the Client ID** (looks like: `123456789-abc123def456.apps.googleusercontent.com`)
2. **Keep the Client Secret safe** (you might need it later)

### **Step 5: Update Your Website**

1. **Open**: `auth.html`
2. **Find this line**:
   ```html
   <meta name="google-signin-client_id" content="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com">
   ```
3. **Replace** `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID

4. **Open**: `auth.js`
5. **Find this line**:
   ```javascript
   client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
   ```
6. **Replace** `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID

### **Step 6: Test Google Sign-In**

1. **Start your server**: `npm start` in order-backend folder
2. **Go to**: http://localhost:3001/auth.html
3. **Click "Sign in with Google"**
4. **Should open Google sign-in popup**

## ✅ **What You'll Get:**

### **User Information Stored:**
- User ID (Google ID)
- Full Name
- Email Address
- Profile Picture
- Sign-in timestamp
- Provider: 'google'

### **Where Data is Saved:**
- **Frontend**: Browser localStorage/sessionStorage
- **Backend**: `order-backend/users/[user-id].json`

### **User Experience:**
- **One-click sign-in** with Google account
- **Auto-fill** customer details in checkout
- **Persistent login** (remember me option)
- **Profile integration** across the site

## 🔧 **Current Status:**

✅ **Google SDK**: Added to auth.html  
✅ **Sign-In Logic**: Implemented in auth.js  
✅ **Backend API**: Ready to save user data  
❌ **Client ID**: Needs to be configured (YOUR_GOOGLE_CLIENT_ID)  

## 🎯 **Next Steps:**

1. **Get Google Client ID** (follow steps above)
2. **Update auth.html and auth.js** with your Client ID
3. **Test the sign-in flow**
4. **Deploy and update URLs** for production

Once configured, users can sign in with Google and their information will be automatically saved for future orders! 🎉

## 🛠️ **Troubleshooting:**

- **"Sign-In blocked"**: Check authorized origins in Google Console
- **"Invalid Client ID"**: Verify Client ID is correct in both files
- **"Popup blocked"**: Enable popups for localhost:3001
- **"CORS errors"**: Add your domain to authorized origins
