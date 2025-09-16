import { ArrowLeft, CheckCircle, Eye, RotateCcw, XCircle } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { formatDate, formatFileSize, type SessionState } from "../types";
import FilePreview from "./FilePreview";

interface FileViewerProps {
  sessionState: SessionState;
  onFileAction: (action: "delete" | "keep", fileIndex: number) => void;
  onUndo: () => void;
  onBack: () => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ sessionState, onFileAction, onUndo, onBack }) => {
  const { files, currentIndex, undoStack } = sessionState;
  const currentFile = files[currentIndex];

  const [showMetadata, setShowMetadata] = useState(false);

  const performAction = useCallback(
    (action: "delete" | "keep") => {
      onFileAction(action, currentIndex);
    },
    [onFileAction, currentIndex]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "Backspace") {
        performAction("delete");
      } else if (e.key === "ArrowRight" || e.key === " ") {
        performAction("keep");
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        onUndo();
      } else if (e.key === "i" || e.key === "I") {
        setShowMetadata(!showMetadata);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [performAction, onUndo, showMetadata]);

  if (!currentFile) {
    return <div>Loading...</div>;
  }

  const progress = ((currentIndex + 1) / files.length) * 100;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white shadow-sm shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <div className="flex-1 mx-6 min-w-0">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-gray-600 mt-1 text-center">
            {currentIndex + 1} of {files.length} files
          </p>
        </div>

        <button
          type="button"
          onClick={onUndo}
          disabled={undoStack.length === 0}
          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-600 shrink-0"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Undo
        </button>
      </div>

      {/* File Preview */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <FilePreview file={currentFile} className="max-w-6xl w-full h-full" />
      </div>

      {/* File Info */}
      <div className="bg-white border-t p-4">
        <div className="flex items-start justify-between max-w-4xl mx-auto">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{currentFile.name}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              <span>{formatFileSize(currentFile.size)}</span>
              <span>•</span>
              <span>{formatDate(currentFile.modified)}</span>
            </div>

            {showMetadata && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                <div className="truncate">
                  <strong>Path:</strong> {currentFile.path}
                </div>
                <div>
                  <strong>Type:</strong> {currentFile.type}
                </div>
                <div>
                  <strong>Extension:</strong> {currentFile.extension}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMetadata(!showMetadata)}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-8 p-4 bg-white border-t shrink-0">
        <button
          type="button"
          onClick={() => performAction("delete")}
          className="flex items-center justify-center w-14 h-14 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transform hover:scale-105 transition-all active:scale-95"
        >
          <XCircle className="w-7 h-7" />
        </button>

        <button
          type="button"
          onClick={() => performAction("keep")}
          className="flex items-center justify-center w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transform hover:scale-105 transition-all active:scale-95"
        >
          <CheckCircle className="w-7 h-7" />
        </button>
      </div>

      {/* Instructions */}
      <div className="text-center px-4 py-3 bg-gray-50 text-sm text-gray-600 shrink-0">
        Swipe left to delete • Swipe right to keep • Press ← or → keys • Press I for details
      </div>
    </div>
  );
};

export default FileViewer;
