# 🎨 Image Assets

Place your Word Bomb image assets in this directory.

## 📁 Required Files

### **Primary Logo**
- `logo.png` - Main logo for header (recommended: 200x80px)
- Used in: Game room header

### **Wordmark**
- `wordmark.png` - Wordmark + spark logo (recommended: 300x60px)
- Used in: Landing page header

### **Favicons**
- `favicon.ico` - Browser tab icon (32x32px)
- `apple-touch-icon.png` - iOS home screen icon (180x180px)

### **Social Media**
- `og-image.png` - Open Graph image for social previews (1200x630px)
- Used in: Twitter/Facebook/LinkedIn link previews

### **Game Assets**
- `bomb-pixel.png` - Pixel art bomb icon (recommended: 64x64px)
- Used in: Loading screen, 404 page

### **Backgrounds (Optional)**
- `dark-textured-bg.png` - Dark textured background pattern
- Used with: `.bg-dark-textured` CSS class

## ✅ Implementation Status

All image implementations include fallbacks to existing UI elements if images are not present.

### Currently Implemented:

✅ **Layout (app/layout.tsx)**
- Favicon and app icon metadata
- Open Graph and Twitter card images

✅ **Game Room Header (components/GameRoom.tsx)**
- Logo display with text fallback

✅ **Landing Page (components/LandingPage.tsx)**
- Wordmark display with text fallback

✅ **Loading State (components/GameRoom.tsx)**
- Pixel bomb with emoji fallback

✅ **404 Page (app/not-found.tsx)**
- Pixel bomb with emoji fallback

✅ **Background Classes (app/globals.css)**
- `.bg-dark-textured` - For dark textured backgrounds
- `.splash-screen` - For splash screen with OG image

## 🎯 Usage Examples

### Using in Components:
```tsx
<img src="/logo.png" alt="Word Bomb" className="h-12 w-auto" />
```

### Using with Next.js Image:
```tsx
import Image from 'next/image';

<Image 
  src="/logo.png" 
  alt="Word Bomb" 
  width={200} 
  height={80}
/>
```

### Using as Background:
```tsx
<div className="bg-dark-textured min-h-screen">
  {/* Your content */}
</div>
```

## 📝 Notes

- All paths start with `/` (e.g., `/logo.png`, not `logo.png`)
- Fallbacks ensure the app works even without images
- Supported formats: PNG, SVG, JPG, WebP, ICO
- Optimize images for web (compress before uploading)
