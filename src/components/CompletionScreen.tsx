import { CheckCircle2, FolderOpen, RotateCcw } from "lucide-react";
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
  const { deletedFiles, keptFiles, undoStack } = sessionState;

  const getCompletionMessage = () => {
    if (deletedFiles.length > keptFiles.length) {
      return "Great cleanup! You freed up some space! 🧹";
    } else if (keptFiles.length > deletedFiles.length) {
      return "You kept most files - selective organizing! 📚";
    } else {
      return "Perfect balance of keeping and cleaning! ⚖️";
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-lg mx-auto text-center space-y-8">
        {/* Success Animation */}
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>

        {/* Title and Message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">All Done!</h1>
          <p className="text-lg text-gray-600">{getCompletionMessage()}</p>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{deletedFiles.length}</div>
              <div className="text-sm text-gray-600">Deleted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{keptFiles.length}</div>
              <div className="text-sm text-gray-600">Kept</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={onStartOver}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            Organize Another Folder
          </button>
          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={onUndo}
              className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl shadow-lg hover:bg-gray-200 transform hover:scale-105 transition-all duration-200"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Undo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompletionScreen;
