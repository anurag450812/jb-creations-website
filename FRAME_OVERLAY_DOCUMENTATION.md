# Live Preview Frame Overlay Feature

## Overview

This feature captures the exact live preview frame (including image, adjustments, zoom, position, and frame border) and displays it overlaid on every room preview image. This allows customers to see how their customized frame will look in various room settings.

## How It Works

### 1. Frame Capture (`captureFramePreview()`)

The system captures the live preview frame by:

- **Canvas Rendering**: Creates a canvas element matching the frame preview dimensions
- **Frame Border**: Draws the selected frame color as the border
- **Image Processing**: Applies all current adjustments (brightness, contrast, highlights, shadows, vibrance)
- **Positioning**: Includes current zoom level and pan position
- **Texture Effects**: Adds frame texture effects (rough, smooth) if applicable

### 2. Room Image Overlay (`overlayFrameOnRoomImages()`)

For each room preview image:

- **Background Preservation**: Keeps the original room image intact
- **Frame Positioning**: Places the captured frame at realistic wall positions
- **Scaling**: Dynamically scales the frame to appropriate size (30% of room width)
- **Shadow Effects**: Adds realistic drop shadows for depth
- **Variety**: Uses different positions for different room images (center-left, center-right, center)

### 3. Automatic Updates

The overlay updates automatically when:

- **Image Changes**: New image uploaded
- **Adjustments**: Brightness, contrast, or other filters modified
- **Positioning**: Image zoom or pan position changes
- **Frame Properties**: Frame color or texture selection changes

### 4. Manual Updates

Users can also manually trigger updates using the "Update Room Previews" button.

## Technical Implementation

### Key Functions

1. **`captureFramePreview()`**
   - Returns: Promise resolving to base64 image data
   - Captures: Complete frame with border, image, and adjustments
   - Quality: High resolution for clear room display

2. **`overlayFrameOnRoomImages()`**
   - Processes: All room slider images
   - Applies: Frame overlay with shadows and positioning
   - Updates: Room images in real-time

3. **Auto-trigger Functions**
   - `updateImageTransform()`: Triggers on zoom/pan changes
   - `updateImageFilters()`: Triggers on adjustment changes
   - `updateFrameColor()`: Triggers on frame color changes

### Canvas Processing

- **High DPI Support**: Uses device pixel ratio for crisp rendering
- **Filter Application**: Applies CSS filters directly to canvas context
- **Clipping**: Properly clips image to frame boundaries
- **Shadow Rendering**: Creates realistic drop shadows

### Performance Optimization

- **Debouncing**: Limits update frequency during rapid changes (150-200ms delays)
- **Conditional Updates**: Only processes when room slider is active
- **Error Handling**: Graceful fallback if capture fails
- **Memory Management**: Proper canvas cleanup

## Usage Instructions

### For Users

1. **Upload Image**: Select your photo
2. **Choose Frame**: Select frame size and color
3. **Adjust Image**: Use zoom, pan, and filter controls
4. **View Rooms**: Navigate to room preview section
5. **Auto-Update**: Changes automatically appear in room previews
6. **Manual Update**: Click "Update Room Previews" if needed

### For Developers

#### Adding New Room Images

```javascript
// Room images are automatically processed when:
// 1. Added to room-preview-images/ folder structure
// 2. Room slider is initialized
// 3. Frame overlay function is called
```

#### Customizing Frame Positioning

```javascript
// Modify frame position in overlayFrameOnRoomImages():
switch (index % 3) {
    case 0: // Center-right
        frameX = canvas.width * 0.55;
        frameY = canvas.height * 0.25;
        break;
    // Add more cases for different positions
}
```

#### Adjusting Frame Scale

```javascript
// Modify frame scale calculation:
const frameScale = Math.min(0.3, 350 / Math.min(canvas.width, canvas.height));
// 0.3 = 30% of room width maximum
// 350 = minimum pixel size constraint
```

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile**: Optimized for touch devices

## File Structure

```
photo framing website/
├── script.js (main overlay functions)
├── customize.html (UI with update button)
├── style.css (frame styling)
├── test-frame-overlay.html (test page)
└── room-preview-images/ (room backgrounds)
```

## Troubleshooting

### Common Issues

1. **Overlay Not Appearing**
   - Check if image is uploaded
   - Verify frame size is selected
   - Ensure room slider is active

2. **Poor Quality Overlay**
   - Check device pixel ratio handling
   - Verify canvas dimensions
   - Ensure high-quality JPEG export

3. **Performance Issues**
   - Reduce update frequency
   - Optimize canvas operations
   - Check for memory leaks

### Debug Features

- Console logging for overlay process
- Error handling with detailed messages
- Visual feedback on manual update button

## Future Enhancements

1. **Multiple Frame Positions**: Allow users to choose frame placement
2. **Room Lighting Effects**: Adjust frame appearance based on room lighting
3. **Perspective Correction**: Add realistic viewing angles
4. **Size Variations**: Multiple frame sizes in same room
5. **Custom Room Upload**: Allow users to upload their own room photos

## API Reference

### Main Functions

```javascript
// Capture current frame preview
captureFramePreview(): Promise<string>

// Apply overlay to all room images
overlayFrameOnRoomImages(): void

// Manual trigger (called by button)
updateRoomPreviews(): void
```

### State Dependencies

- `state.image`: Current uploaded image
- `state.frameSize`: Selected frame dimensions
- `state.frameColor`: Selected frame color
- `state.zoom`: Current zoom level
- `state.position`: Current pan position
- `state.adjustments`: Image filter settings
- `state.roomSlider`: Room slider status
```

This feature significantly enhances the user experience by providing realistic visualization of how their customized frames will look in actual room settings.
