# QuickToss

A Tinder-like file organization tool that gamifies the process of cleaning up cluttered folders. Swipe through your files quickly and efficiently - left to delete, right to keep!

## Features

✅ **Core Features:**
- **Folder Selection**: Choose any folder on your system to organize
- **File Previews**: See images, documents, and more before deciding
- **Swipe Interface**: Familiar gesture-based interaction with smooth animations
- **Keyboard Shortcuts**: Full keyboard support for power users
- **Move to Trash**: Files are moved to system trash (reversible, not permanently deleted)
- **Undo System**: Reverse any action with Cmd+Z and full history tracking
- **Progress Tracking**: Visual progress through your file collection with statistics
- **Session Summary**: Detailed completion statistics with encouragement
- **Cross-Platform**: Works on Windows, macOS, and Linux

✅ **User Experience:**
- **Beautiful UI**: Modern design with Tailwind CSS
- **Responsive Design**: Adapts to different screen sizes
- **Touch & Mouse Support**: Works with both gesture and click interactions
- **File Metadata**: Display file details, size, and modification dates
- **Visual Feedback**: Clear animations and confirmations for all actions
- **Accessibility**: Designed with accessibility best practices

## Supported File Types

- **Images**: JPEG, PNG, GIF, HEIC, WebP, BMP, TIFF
- **Documents**: PDF, TXT, RTF, MD
- **Future**: Videos, Office documents, and more

## Installation

### Prerequisites
- Node.js 16 or higher
- npm or yarn

### Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd quicktoss
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Production

1. Build the application:
   ```bash
   npm run build
   ```

2. Package the application:
   ```bash
   npm run pack
   ```

3. Create distribution packages:
   ```bash
   npm run dist
   ```

## Usage

### Getting Started
1. **Launch QuickToss** and you'll see a welcome screen with instructions
2. **Click "Select Folder to Organize"** to choose any folder on your system
3. **Review files** one by one using these controls:
   - **Swipe Left** or **← key** or **Red button**: Delete file (moves to trash)
   - **Swipe Right** or **→ key** or **Green button**: Keep file (skip)
   - **Press I**: Toggle file details view
   - **Cmd+Z/Ctrl+Z**: Undo last action
4. **Complete the session** and view your cleanup statistics with encouragement!

### Tips for Best Results
- Start with your Downloads folder - it's usually the most cluttered
- You can undo any action, so don't worry about mistakes
- Files are moved to Trash, not permanently deleted
- Use keyboard shortcuts for faster organization
- Take breaks on long sessions - you can always resume later

## Keyboard Shortcuts

- `←` / `Backspace`: Delete current file
- `→` / `Space`: Keep current file  
- `I`: Toggle file metadata display
- `Cmd+Z` / `Ctrl+Z`: Undo last action

## Technology Stack

- **Electron**: Cross-platform desktop app framework
- **React**: User interface library
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **React Spring**: Smooth animations and gestures

## Architecture

```
├── electron/           # Electron main process
│   ├── main.ts        # Main application logic
│   └── preload.ts     # Secure renderer bridge
├── src/               # React renderer process
│   ├── components/    # UI components
│   ├── types.ts       # TypeScript definitions
│   └── App.tsx        # Main application component
├── docs/              # Project documentation
└── dist/              # Built application files
```

## Security

QuickToss is designed with security in mind:
- **Sandboxed environment**: Uses Electron's security best practices
- **No network access**: Your files never leave your computer
- **System trash**: Files are moved to system trash, not permanently deleted
- **Minimal permissions**: Only accesses user-selected folders

## Troubleshooting

### Common Issues

1. **"No supported files found"**: Make sure your folder contains images, PDFs, or text files
2. **App won't start**: Check that all dependencies are installed (`npm install`)
3. **Build errors**: Try deleting `node_modules` and `package-lock.json`, then run `npm install` again

### Development Tips

- Use `npm run dev` for live development with hot reload
- Check the browser dev tools (Cmd+Option+I) for debugging
- The Electron main process logs appear in your terminal
- React component issues can be debugged in the Electron dev tools

## Future Enhancements

🚀 **Ready to enhance your app?** Consider adding:
- Video file preview support
- Batch file operations (select multiple files)
- Smart file suggestions with AI
- Cloud storage integration (iCloud, Dropbox, etc.)
- Custom file organization rules and filters
- Advanced file metadata analysis
- Duplicate file detection and removal

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and commit: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue on the GitHub repository or contact the development team.

---

**Made with ❤️ for cleaner file systems**
