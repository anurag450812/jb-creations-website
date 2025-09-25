# Cloudinary Direct Upload Setup

## Step 1: Create Upload Preset in Cloudinary Dashboard

1. Go to your Cloudinary dashboard: https://cloudinary.com/console
2. Navigate to **Settings** → **Upload**
3. Click **Add upload preset**
4. Configure the preset:
   - **Preset name**: `jb-creations-orders`
   - **Signing Mode**: **Unsigned** (allows browser uploads)
   - **Folder**: `jb-creations-orders` (optional, for organization)
   - **Access Mode**: **Public** (images need to be accessible)
   - **Auto-create folder**: **Enabled**

## Step 2: Update HTML Files

Add the direct upload script to your HTML files:

```html
<!-- Add before closing </body> tag in checkout.html -->
<script src="cloudinary-direct.js"></script>
<script src="checkout-direct.js"></script>
```

## Step 3: Implementation Options

### Option A: Replace Current System (Recommended)
Update your `checkout.js` to use the direct upload functions from `checkout-direct.js`.

### Option B: Hybrid Approach
Keep both systems and use direct uploads as a fallback when the server isn't available.

## Benefits of Direct Upload

✅ **No server required** - Works entirely in the browser
✅ **Always available** - No manual server startup needed
✅ **Better performance** - Direct connection to Cloudinary
✅ **Reduced costs** - No server hosting required
✅ **Automatic scaling** - Cloudinary handles all the infrastructure

## Security Notes

- Upload preset is unsigned (required for browser uploads)
- Images are public (necessary for display in admin panel)
- Consider adding client-side validation for image size/type
- Monitor your Cloudinary usage to prevent abuse

## Testing

1. Create the upload preset in Cloudinary dashboard
2. Update your HTML files to include the new scripts
3. Test order placement - images should upload directly to Cloudinary
4. Check admin panel to verify images display correctly

## Fallback Strategy

If direct uploads fail, you can still fall back to the minimal server approach for debugging.