# 🚀 Quick Start - OTP Production Setup

## ⚡ 3-Step Setup

### 1️⃣ Install Dependencies (2 minutes)
```powershell
# Run the setup script
.\setup-otp-production.bat

# OR manually:
cd netlify\functions
npm install
cd ..\..
npm install -g netlify-cli
```

### 2️⃣ Configure Environment Variables (5 minutes)
Go to **Netlify Dashboard** → Your Site → **Site settings** → **Environment variables**

Add these:
```
FAST2SMS_API_KEY = 9EgVuLYNlo0skRw46pq3Tvy7SZ5PcWJniz2rGCAmbeUfDBhxXMs80pKcFeEdNLRqkfv34TPa7tjgWiQx
FAST2SMS_TEMPLATE_ID = 200214
FAST2SMS_SENDER_ID = JBCREA
JWT_SECRET = your-super-secret-jwt-key-change-this
```

### 3️⃣ Deploy (2 minutes)
```powershell
# Commit and push
git add .
git commit -m "Add serverless OTP authentication"
git push

# Netlify auto-deploys! ✅
```

---

## 🧪 Test Locally First

```powershell
# Create .env file (already done by setup script)
# Start Netlify Dev
netlify dev

# Open in browser
http://localhost:8888/otp-login.html
```

---

## 📱 Test OTP Flow

1. Open `your-site.netlify.app/otp-login.html`
2. Enter phone: `9876543210`
3. Click "Send OTP"
4. Check phone for SMS
5. Enter OTP and verify
6. Done! ✅

---

## 🔍 Check If Working

### Netlify Dashboard
- Go to **Functions** tab
- See: `send-otp` and `verify-otp`
- Click to view logs

### Browser Console
```javascript
// Check if OTP client loaded
console.log(Fast2SMSOTPClient);

// Check API endpoint
const client = new Fast2SMSOTPClient();
console.log(client.apiBaseURL);
// Should show: /.netlify/functions
```

---

## 📂 Files Created

```
✅ netlify/functions/send-otp.js        (OTP sender)
✅ netlify/functions/verify-otp.js      (OTP verifier)
✅ netlify/functions/package.json       (Updated)
✅ fast2sms-client-production.js        (Frontend client)
✅ setup-otp-production.bat             (Setup script)
✅ OTP-PRODUCTION-SETUP.md             (Full guide)
✅ OTP-ARCHITECTURE.md                  (Architecture docs)
```

---

## 🎯 Update Your Frontend

In `otp-login.html`, change:

**Before:**
```html
<script src="fast2sms-client.js"></script>
<script>
    const otpClient = new Fast2SMSOTPClient('http://localhost:3001');
</script>
```

**After:**
```html
<script src="fast2sms-client-production.js"></script>
<script>
    const otpClient = new Fast2SMSOTPClient();
    // Auto-detects local vs production!
</script>
```

---

## 🐛 Troubleshooting

### OTP not sending?
```powershell
# Check Netlify function logs
netlify functions:list
netlify functions:logs send-otp

# Check Fast2SMS balance
# Visit: https://www.fast2sms.com/dashboard
```

### Demo mode showing?
- Fast2SMS not configured in Netlify
- Add environment variables (Step 2)
- Redeploy

### Function not found?
```powershell
# Verify files exist
ls netlify\functions\

# Should show:
# send-otp.js
# verify-otp.js
# package.json
```

---

## 💡 API Endpoints

Your new serverless endpoints:

```
Production:
POST https://your-site.netlify.app/.netlify/functions/send-otp
POST https://your-site.netlify.app/.netlify/functions/verify-otp

Local (Netlify Dev):
POST http://localhost:8888/.netlify/functions/send-otp
POST http://localhost:8888/.netlify/functions/verify-otp
```

---

## 📊 Cost

**FREE for most usage!**

- Netlify: 125K function calls/month FREE
- Firebase: 50K reads/day FREE
- Fast2SMS: ~₹0.15 per SMS (only cost)

**Estimated: ₹10-50/month** (depends on SMS volume)

---

## ✅ Checklist

- [ ] Run `setup-otp-production.bat`
- [ ] Add environment variables in Netlify
- [ ] Update `otp-login.html` script reference
- [ ] Test locally with `netlify dev`
- [ ] Commit and push to deploy
- [ ] Test on live site
- [ ] Remove old backend (optional)

---

## 🎉 Done!

Your OTP system is now:
- ✅ Running 24/7
- ✅ Serverless (no maintenance)
- ✅ Auto-scaling
- ✅ Production-ready
- ✅ Cost-effective

**Questions? Check:** `OTP-PRODUCTION-SETUP.md`

---

## 📞 Common Commands

```powershell
# Login to Netlify
netlify login

# Link your site
netlify link

# Test locally
netlify dev

# View functions
netlify functions:list

# View logs
netlify functions:logs send-otp

# Deploy manually
netlify deploy --prod

# Open dashboard
netlify open
```

---

## 🔐 Security Notes

✅ Rate limiting: 60s cooldown
✅ OTP expiry: 5 minutes
✅ Max attempts: 3
✅ JWT tokens: 30-day validity
✅ HTTPS: Auto-enabled
✅ CORS: Pre-configured

---

**Ready to go live? Follow the 3-step setup above! 🚀**
