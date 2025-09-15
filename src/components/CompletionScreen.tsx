import { CheckCircle2, FolderOpen, Heart, RotateCcw, Trash2, Trophy } from "lucide-react";
import type React from "react";
import type { SessionState } from "../types";

interface CompletionScreenProps {
  sessionState: SessionState;
  onStartOver: () => void;
  onUndo: () => void;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({
  sessionState,
  onStartOver,
  onUndo,
}) => {
  const { files, deletedFiles, keptFiles, folderPath, undoStack } = sessionState;
  const totalProcessed = deletedFiles.length + keptFiles.length;
  const completionRate = Math.round((totalProcessed / files.length) * 100);

  const getCompletionMessage = () => {
    if (completionRate === 100) {
      if (deletedFiles.length > keptFiles.length) {
        return "Wow! You really cleaned house! 🧹";
      } else if (keptFiles.length > deletedFiles.length) {
        return "Looks like you're a file collector! 📚";
      } else {
        return "Perfect balance! You're a file organization master! ⚖️";
      }
    }
    return "Great progress! You're on your way to a cleaner file system! 🚀";
  };

  const getEncouragementMessage = () => {
    const deletionRate = Math.round((deletedFiles.length / totalProcessed) * 100);

    if (deletionRate > 70) {
      return "You freed up significant space!";
    } else if (deletionRate > 30) {
      return "A good balance of keeping and cleaning!";
    } else {
      return "You're selective with your files!";
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Success Animation */}
        <div className="relative">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center animate-bounce-in">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce-in animation-delay-200">
            <CheckCircle2 className="w-5 h-5 text-yellow-800" />
          </div>
        </div>

        {/* Title and Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            {completionRate === 100 ? "Folder Organized!" : "Session Complete!"}
          </h1>
          <p className="text-xl text-gray-600">{getCompletionMessage()}</p>
          <p className="text-lg text-gray-500">{getEncouragementMessage()}</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalProcessed}</div>
            <div className="text-sm text-gray-600">Files Processed</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{deletedFiles.length}</div>
            <div className="text-sm text-gray-600">Files Deleted</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
              <Heart className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{keptFiles.length}</div>
            <div className="text-sm text-gray-600">Files Kept</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">Completion Progress</span>
            <span className="text-sm text-gray-600">{completionRate}%</span>
          </div>
          <div className="progress-bar h-3">
            <div className="progress-fill h-full" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* Folder Path */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Organized Folder:</p>
          <p className="text-sm font-mono text-gray-800 truncate">{folderPath}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button
            type="button"
            onClick={onStartOver}
            className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            Organize Another Folder
          </button>

          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={onUndo}
              className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Undo Last Action
            </button>
          )}
        </div>

        {/* Tips for Next Time */}
        <div className="mt-8 p-4 bg-blue-50 rounded-xl">
          <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips</h4>
          <ul className="text-blue-800 text-sm space-y-1 text-left">
            <li>• Check your Trash to restore any accidentally deleted files</li>
            <li>• Consider organizing by file type or date for better results</li>
            <li>• Regular cleanups keep your system running smoothly</li>
          </ul>
        </div>

        {/* File Lists (Optional - could be expanded) */}
        {(deletedFiles.length > 0 || keptFiles.length > 0) && (
          <details className="bg-white rounded-xl shadow-lg overflow-hidden">
            <summary className="p-4 cursor-pointer hover:bg-gray-50 font-medium">
              View File Details
            </summary>
            <div className="p-4 border-t space-y-4">
              {deletedFiles.length > 0 && (
                <div>
                  <h5 className="font-medium text-red-700 mb-2 flex items-center">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deleted Files ({deletedFiles.length})
                  </h5>
                  <div className="max-h-32 overflow-y-auto text-sm text-gray-600 space-y-1">
                    {deletedFiles.slice(0, 10).map((file, index) => (
                      <div key={index} className="truncate">
                        {file.name}
                      </div>
                    ))}
                    {deletedFiles.length > 10 && (
                      <div className="text-gray-500 italic">
                        ...and {deletedFiles.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {keptFiles.length > 0 && (
                <div>
                  <h5 className="font-medium text-green-700 mb-2 flex items-center">
                    <Heart className="w-4 h-4 mr-2" />
                    Kept Files ({keptFiles.length})
                  </h5>
                  <div className="max-h-32 overflow-y-auto text-sm text-gray-600 space-y-1">
                    {keptFiles.slice(0, 10).map((file, index) => (
                      <div key={index} className="truncate">
                        {file.name}
                      </div>
                    ))}
                    {keptFiles.length > 10 && (
                      <div className="text-gray-500 italic">
                        ...and {keptFiles.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default CompletionScreen;
