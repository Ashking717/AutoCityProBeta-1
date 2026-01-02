# How to Add an App Icon

Your application needs an icon file for the Windows build. Here's how to create and add it:

## Quick Solution - Use an Existing Image

If you have a logo or image (PNG, JPG, etc.):

1. Go to https://convertio.co/png-ico/ or https://icoconvert.com/
2. Upload your image
3. Choose size: **256x256** or **512x512** (recommended)
4. Download the `.ico` file
5. Rename it to `icon.ico`
6. Place it in the `assets` folder

## Professional Icons

For best results, your icon should be:
- **Square** (same width and height)
- **High resolution** (at least 256x256 pixels)
- **Simple design** (clear at small sizes)
- **PNG or ICO format**

## Folder Structure

After adding the icon, your project should look like:

```
AutoCityApp/
├── assets/
│   └── icon.ico          ← Your app icon here
├── frontend/
├── backend/
├── main.js
├── package.json
└── build.bat
```

## If You Don't Have an Icon

The build will still work without an icon. It will use:
- Electron's default icon (temporary)
- You can add a custom icon later and rebuild

## For macOS Builds (Optional)

If building for macOS, you also need:
- `assets/icon.icns` (macOS icon format)
- Use https://cloudconvert.com/png-to-icns to convert

## Testing Your Icon

1. Add the icon to `assets/icon.ico`
2. Run `build.bat`
3. After building, check:
   - The installer icon
   - The installed app icon
   - Desktop shortcut icon

## Icon Sizes for Windows

Your `.ico` file should ideally contain multiple sizes:
- 16x16 (taskbar)
- 32x32 (small icons)
- 48x48 (medium icons)
- 64x64 (large icons)
- 128x128 (extra large)
- 256x256 (high DPI displays)

Most online converters will create all these sizes automatically.

## Troubleshooting

**Problem**: "Icon not found" during build
**Solution**: 
- Check the file is named exactly `icon.ico`
- Check it's in the `assets` folder
- Or remove the icon reference from package.json temporarily

**Problem**: Icon looks blurry
**Solution**:
- Use a higher resolution source image
- Use a vector image (SVG) if possible
- Make sure the source is square

**Problem**: Wrong icon showing after install
**Solution**:
- Windows caches icons
- Restart Windows Explorer (Task Manager → Windows Explorer → Restart)
- Or restart your computer

## Example Icon Services

Free icon creation:
- https://www.canva.com/ (create, then convert to ICO)
- https://www.figma.com/ (design, export PNG, convert to ICO)

Free icon libraries:
- https://www.flaticon.com/
- https://icons8.com/
- https://fontawesome.com/

Remember to check licensing if using downloaded icons!
