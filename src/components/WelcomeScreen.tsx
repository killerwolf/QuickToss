import { FolderOpen, Zap } from "lucide-react";
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
      <div className="max-w-lg mx-auto space-y-12">
        {/* Logo and Title */}
        <div className="space-y-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">QuickToss</h1>
          <p className="text-lg text-gray-600">
            Organize your files quickly with keyboard shortcuts and buttons.
          </p>
        </div>

        {/* Call to Action */}
        <div>
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
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
