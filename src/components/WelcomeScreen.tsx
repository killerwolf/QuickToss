import { ArrowRight, FolderOpen, Zap } from "lucide-react";
import type React from "react";
import { useState } from "react";
import "../electron.d.ts";

interface WelcomeScreenProps {
  onFolderSelected: (folderPath: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onFolderSelected }) => {
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectFolder = async () => {
    setIsSelecting(true);

    try {
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        onFolderSelected(folderPath);
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
      alert("Error selecting folder. Please try again.");
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Logo and Title */}
        <div className="space-y-4">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900">QuickToss</h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Organize your files with a swipe! A Tinder-like experience for cleaning up cluttered
            folders.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <ArrowRight className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Swipe to Organize</h3>
            <p className="text-gray-600 text-sm">
              Swipe left to delete, right to keep. It's that simple!
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <FolderOpen className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Any Folder</h3>
            <p className="text-gray-600 text-sm">
              Select any folder on your system to start organizing.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600 text-sm">
              Process hundreds of files in minutes, not hours.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12">
          <button
            type="button"
            onClick={handleSelectFolder}
            disabled={isSelecting}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
          >
            {isSelecting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Selecting Folder...
              </>
            ) : (
              <>
                <FolderOpen className="w-5 h-5 mr-3" />
                Select Folder to Organize
              </>
            )}
          </button>

          <p className="text-gray-500 text-sm mt-4">
            Supports images, documents, and more. Your files stay on your computer.
          </p>
        </div>

        {/* Quick Tips */}
        <div className="mt-8 p-4 bg-blue-50 rounded-xl">
          <h4 className="font-medium text-blue-900 mb-2">💡 Quick Tips</h4>
          <ul className="text-blue-800 text-sm space-y-1 text-left">
            <li>• Start with your Downloads folder - it's usually the most cluttered</li>
            <li>• You can undo any action with Cmd+Z</li>
            <li>• Files are moved to Trash, not permanently deleted</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
