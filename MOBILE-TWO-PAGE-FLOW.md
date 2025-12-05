# Mobile Two-Page Customization Flow

## Overview
The mobile customization page has been restructured into two separate views for a better user experience:

### Page 1: Edit View (Customization)
- Upload and preview image
- Adjust all frame settings (size, color, texture)
- Apply image adjustments (brightness, contrast, etc.)
- Zoom and position the image
- **"See Room Preview" button** - Takes user to Page 2

### Page 2: Room Preview View
- Back button to return to editing
- Selected specifications card showing:
  - Frame size and orientation
  - Frame color
  - Frame texture
  - Total price
- Room preview images in a vertical list
- Fixed "Add to Cart" button at bottom with price

## Implementation Details

### HTML Changes (customize.html)

1. **Added Mobile See Room Preview Button**
   - Location: Below the live preview section
   - Only visible on mobile (≤768px)
   - Enabled when image is uploaded and frame size is selected

2. **Created Mobile Room Preview Page**
   - Fixed full-screen overlay (z-index: 9999)
   - Sticky header with back button
   - Specs card showing selected options
   - Scrollable room images list
   - Fixed footer with add to cart button

3. **Removed Old Mobile Elements**
   - Removed `mobile-room-add` section (old mobile add to cart)
   - Desktop right section hidden on mobile

### CSS Changes (style.css)

1. **Mobile Room Preview Page Styles**
   - `.mobile-room-preview-page` - Full-screen overlay
   - `.mobile-room-header` - Sticky header with back button
   - `.mobile-specs-card` - Specs display card
   - `.mobile-room-images-list` - Vertical room images layout
   - `.mobile-room-footer` - Fixed bottom cart button

2. **Mobile See Room Preview Button**
   - `.mobile-see-room-preview-btn` - Gradient button style
   - Hidden on desktop, shown on mobile

3. **Media Queries (≤768px)**
   - Hide desktop right section (`.right-section`)
   - Hide desktop add to cart (`.total-price-bar`)
   - Show mobile see room preview button

### JavaScript Changes (script.js)

1. **New Function: `initMobileRoomPreview()`**
   - Initializes mobile room preview page functionality
   - Sets up event listeners for:
     - See Room Preview button
     - Back to Edit button
     - Mobile Add to Cart button

2. **New Function: `loadMobileRoomImages()`**
   - Loads room slider images into mobile vertical list
   - Creates image items with captions
   - Skips 5th image (as per original logic)

3. **New Function: `updateMobileSpecs()`**
   - Updates specs card with current selections
   - Updates price displays
   - Enables/disables add to cart button

4. **New Global Function: `updateMobileSeeRoomPreviewBtn()`**
   - Updates button enabled/disabled state
   - Called when image is uploaded or frame size changes

## User Flow

### Desktop (No Changes)
1. Upload image
2. Customize in middle section
3. See room preview on right
4. Add to cart at bottom

### Mobile (New Two-Page Flow)
1. **Page 1: Edit View**
   - Upload image
   - Customize using bottom drawer
   - Tap "See Room Preview" button

2. **Page 2: Room Preview View**
   - View selected specifications
   - Scroll through room preview images
   - Tap "Add to Cart" or "Back to Edit"

## Features

### Mobile Edit View
✅ Live preview with zoom/pan
✅ Bottom customization drawer
✅ All adjustment options
✅ See Room Preview button (disabled until image uploaded)

### Mobile Room Preview View
✅ Clean specifications card
✅ Vertical scrolling room images
✅ Each image shows room style number
✅ Fixed add to cart button with price
✅ Back button to return to editing
✅ Automatically generates room overlays before showing

## Technical Benefits

1. **Better Mobile UX**
   - Focused one-task-at-a-time flow
   - Larger, easier-to-tap buttons
   - Better use of mobile screen space

2. **Cleaner Layout**
   - No competing elements
   - Clear call-to-action
   - Logical progression

3. **Performance**
   - Room images only generated when requested
   - Lazy loading of room images
   - Smooth page transitions

4. **Maintainability**
   - Separate mobile and desktop flows
   - Clear function responsibilities
   - Easy to update independently

## Responsive Breakpoints

- **Desktop (>768px)**: Original three-column layout
- **Tablet/Mobile (≤768px)**: Two-page flow
- **Small Mobile (≤480px)**: Optimized spacing and fonts

## Files Modified

1. `customize.html` - Added mobile room preview page structure
2. `style.css` - Added mobile-specific styles (~250 lines)
3. `script.js` - Added mobile room preview functionality (~200 lines)

## Testing Checklist

- [ ] Upload image on mobile - See Room Preview button enables
- [ ] Tap See Room Preview - Room images display correctly
- [ ] Specs card shows correct selections
- [ ] Room images are properly overlaid with frame
- [ ] Back button returns to edit view
- [ ] Add to Cart works from room preview page
- [ ] Desktop layout unchanged
- [ ] Transitions are smooth
- [ ] Images load properly
- [ ] Price updates correctly
