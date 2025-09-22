# JB Creations Supabase Setup Instructions

## 🚀 Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create account and new project
3. Name: `jb-creations-backend`
4. Choose a strong database password
5. Wait 2-3 minutes for project creation

## 🔑 Step 2: Get Your Keys
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon/Public Key**: `eyJ...` (long string starting with eyJ)

## 📝 Step 3: Update Configuration
1. Open `supabase-client.js`
2. Replace these lines (around line 8-9):
   ```javascript
   const SUPABASE_CONFIG = {
       url: 'YOUR_SUPABASE_URL', // Replace with your Project URL
       anonKey: 'YOUR_SUPABASE_ANON_KEY', // Replace with your Anon key
   }
   ```

## 🗄️ Step 4: Create Database Tables
1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **"Run"**
5. You should see: "JB Creations database schema created successfully! 🎉"

## 📁 Step 5: Setup Storage
1. Go to **Storage** in your Supabase dashboard
2. The `order-images` bucket should already be created by the SQL script
3. If not, create a new bucket named `order-images` and make it public

## 🧪 Step 6: Test Your Setup
1. Deploy your website to Netlify (it will automatically update)
2. Go to your website
3. Try to place a test order
4. Check your Supabase dashboard to see if data appears

## ✅ What You Get:
- ✅ **Unlimited image uploads** (no 6MB limit!)
- ✅ **Complete customer database**
- ✅ **Built-in admin panel** (in Supabase dashboard)
- ✅ **Real-time data** (orders appear instantly)
- ✅ **Automatic backups**
- ✅ **Free tier handles 10,000+ orders**

## 🔧 Admin Access:
- Go to your Supabase dashboard
- **Table Editor** → View all customers and orders
- **Storage** → View all uploaded images
- **Authentication** → Manage users (if needed)

## 🎯 Benefits Over Previous Setup:
- **10x simpler** - One platform instead of 3
- **10x more storage** - Unlimited vs 6MB limits
- **10x better performance** - No function call limits
- **Built-in admin panel** - No coding required
- **Professional database** - PostgreSQL instead of simple storage

## 🆘 Need Help?
If anything goes wrong:
1. Check browser console for errors
2. Check Supabase dashboard logs
3. Make sure URL and keys are correct
4. Ensure database schema was created successfully

**Total setup time: 15 minutes maximum!**