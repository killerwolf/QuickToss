# QuickToss - Project Brief & Specifications

## 📋 Project Overview

**QuickToss** is a Tinder-like file organization tool built with Electron, React, and TypeScript. It allows users to quickly organize their files by swiping left to delete or right to keep, making file cleanup efficient and enjoyable.

## 🎯 Core Features Implemented

### ✅ File Preview System
- **Image Preview**: Full support for JPG, PNG, GIF, WebP, HEIC, BMP, TIFF
- **Text File Preview**: Support for TXT, MD, LOG, JSON, XML, CSV, YAML, YML with syntax highlighting
- **PDF Preview**: Multi-page PDF viewing with vertical scrolling navigation
- **Video Preview**: MP4, MOV, AVI support with HTML5 video player

### ✅ User Interface
- **Space-Efficient Design**: Compact header and footer for maximum preview area
- **Responsive Layout**: Adapts to different screen sizes
- **Modern UI**: Clean, minimalist design with Tailwind CSS
- **Keyboard Shortcuts**: Arrow keys, spacebar, and custom shortcuts

### ✅ Settings System
- **Sound Effects**: Toggle audio feedback for actions
- **Video Autoplay**: Control automatic video playback
- **Delete Confirmation**: Optional confirmation dialog before file deletion
- **Persistent Storage**: Settings saved automatically and restored on app restart

### ✅ File Management
- **Folder Scanning**: Recursive folder scanning with file type detection
- **Undo Functionality**: Reverse last action with undo stack
- **Progress Tracking**: Visual progress bar and file counter
- **Trash Integration**: Files moved to system trash (recoverable)

## 🛠 Technical Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React PDF** for PDF rendering
- **Vite** for build tooling

### Backend
- **Electron 27** for desktop app framework
- **Node.js** for file system operations
- **IPC Communication** between main and renderer processes

### Development Tools
- **Biome** for linting and formatting
- **Concurrently** for parallel development
- **Electron Builder** for packaging

## 📁 Project Structure

```
QuickToss/
├── src/
│   ├── components/
│   │   ├── CompletionScreen.tsx
│   │   ├── FilePreview.tsx
│   │   ├── FileViewer.tsx
│   │   ├── Settings.tsx
│   │   └── WelcomeScreen.tsx
│   ├── App.tsx
│   ├── main.tsx
│   ├── types.ts
│   └── index.css
├── electron/
│   ├── main.ts
│   └── preload.ts
├── dist/ (compiled Electron)
├── dist-react/ (compiled React)
└── package.json
```

## 🎨 Logo Specifications

### Creative Brief
Create a modern, minimalist logo for "QuickToss" - a Tinder-like file organization app.

**Design Concept**: Combine the idea of quick file management with a playful "swipe" gesture. The logo should convey speed, efficiency, and the action of organizing files.

**Visual Elements**:
- Stylized file icon or document being "tossed" or "swiped"
- Clean, modern typography for "QuickToss"
- Playful arrow or motion lines suggesting quick action
- Color scheme: Blue (#3B82F6) and green (#10B981) gradients
- Style: Flat design, modern, tech-forward but friendly

### Technical Requirements

#### Formats Required
- **SVG** (vector, scalable) - < 50KB
- **PNG** (transparent background) - < 100KB per size
- **ICO** (multi-size app icon) - < 200KB

#### Image Sizes
- **Main Logo**: 512x512px minimum
- **App Icon**: 256x256px, 128x128px, 64x64px, 32x32px, 16x16px
- **Favicon**: 32x32px, 16x16px
- **Banner/Header**: 1200x300px (landscape format)

#### Color Palette
- **Primary**: #3B82F6 (Blue-500)
- **Secondary**: #10B981 (Emerald-500)
- **Accent**: #F59E0B (Amber-500)
- **Text**: #1F2937 (Gray-800)
- **Background**: Transparent or white

#### Typography
- **Font**: Modern sans-serif (Inter, Roboto, or similar)
- **Weight**: Medium to Bold
- **Readability**: Must be readable at 16px minimum

## 🚀 Development Commands

```bash
# Development
npm run dev              # Start both Vite and Electron
npm run dev:vite         # Start Vite dev server only
npm run dev:electron      # Start Electron only

# Building
npm run build            # Build both React and Electron
npm run build:vite       # Build React app
npm run build:electron   # Build Electron main process

# Packaging
npm run pack             # Package app for distribution
npm run dist             # Build and package (no publish)

# Code Quality
npm run lint             # Run Biome linter
npm run lint:fix         # Fix linting issues
npm run format           # Format code
npm run check            # Run all checks
```

## 📱 Supported File Types

### Images
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.heic`, `.bmp`, `.tiff`

### Documents
- `.pdf` - Multi-page preview with scrolling
- `.txt`, `.md`, `.log` - Text preview with monospace font
- `.json` - Formatted JSON with syntax highlighting
- `.xml`, `.csv`, `.yaml`, `.yml` - Text preview
- `.doc`, `.docx` - File icon (preview not implemented)

### Videos
- `.mp4`, `.mov`, `.avi` - HTML5 video player with controls

## ⚙️ Settings Configuration

### Available Settings
1. **Sound Effects** (default: ON)
   - Plays audio feedback for delete/keep actions
   - Uses Web Audio API for synthetic sounds

2. **Video Autoplay** (default: OFF)
   - Automatically starts video playback when opened
   - Respects browser autoplay policies

3. **Confirm Delete** (default: ON)
   - Shows confirmation dialog before deleting files
   - Prevents accidental deletions

### Settings Storage
- **Location**: `userData/settings.json`
- **Format**: JSON with boolean values
- **Persistence**: Automatic save on change, load on app start
- **Fallback**: Default values if file doesn't exist or is corrupted

## 🎮 User Interactions

### Keyboard Shortcuts
- **← / Backspace**: Delete file
- **→ / Space**: Keep file
- **Cmd/Ctrl + Z**: Undo last action
- **I**: Toggle file metadata display

### Mouse/Touch
- **Click Delete Button**: Delete file (with optional confirmation)
- **Click Keep Button**: Keep file
- **Click Undo Button**: Undo last action
- **Click Settings Icon**: Open settings modal
- **Click Back Button**: Return to folder selection

## 🔧 Technical Implementation Details

### PDF Rendering
- Uses `react-pdf` with `pdfjs-dist` for PDF.js integration
- Loads PDFs as ArrayBuffer via Electron IPC for security
- Vertical scrolling for multi-page documents
- Responsive sizing based on window dimensions

### File System Integration
- Secure file access through Electron IPC
- Cross-platform path handling
- File metadata extraction (size, modification date)
- System trash integration for file deletion

### Audio Feedback
- Web Audio API for synthetic sound generation
- Different sounds for delete (descending whoosh) and keep (ascending chime)
- Respects user's sound settings preference

### State Management
- React hooks for local state
- Session state for file processing workflow
- Undo stack for action reversal
- Settings state with persistence

## 🐛 Known Issues & Solutions

### PDF Loading Error
**Issue**: `Promise.withResolvers is not a function`
**Solution**: Use compatible versions of react-pdf (6.2.2) and pdfjs-dist (3.11.174)

### Port Conflicts
**Issue**: Port 3000 already in use
**Solution**: Kill existing processes or use different port

### Electron Import Error
**Issue**: `Cannot read properties of undefined (reading 'whenReady')`
**Solution**: Ensure proper Electron installation and rebuild

## 📦 Distribution

### Build Configuration
- **App ID**: `com.quicktoss.app`
- **Product Name**: QuickToss
- **Target Platforms**: macOS (DMG), Windows (NSIS), Linux (AppImage)

### Packaging Requirements
- Electron Builder for cross-platform packaging
- Code signing for macOS/Windows (optional)
- Auto-updater integration (future enhancement)

## 🔮 Future Enhancements

### Planned Features
- **Batch Operations**: Select multiple files for bulk actions
- **File Filters**: Filter by type, size, date, etc.
- **Smart Suggestions**: AI-powered file organization suggestions
- **Cloud Integration**: Sync with cloud storage services
- **Custom Themes**: Dark mode and color customization
- **Keyboard Navigation**: Full keyboard-only operation
- **File Search**: Search within file contents
- **Export Reports**: Generate organization reports

### Technical Improvements
- **Performance**: Lazy loading for large folders
- **Memory**: Optimize PDF rendering for large files
- **Accessibility**: Screen reader support
- **Internationalization**: Multi-language support
- **Auto-updates**: Seamless app updates

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request with detailed description

---

*This document serves as the complete specification and reference for the QuickToss project.*
