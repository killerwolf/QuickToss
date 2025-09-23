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
  const [actionFeedback, setActionFeedback] = useState<{
    show: boolean;
    type: "delete" | "keep";
  }>({ show: false, type: "delete" });

  const playActionSound = useCallback((action: "delete" | "keep") => {
    // Create audio context for sound feedback
    try {
      const audioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();

      if (action === "delete") {
        // Delete sound: Descending "whoosh" effect (like something being thrown away)
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        // Connect: oscillators -> filter -> gain -> destination
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Two oscillators for richer sound
        oscillator1.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
        oscillator1.type = "sawtooth";

        oscillator2.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.3);
        oscillator2.type = "triangle";

        // Low-pass filter for "whoosh" effect
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);

        // Volume envelope
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.3);
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.3);
      } else {
        // Keep sound: Ascending "chime" effect (like a positive confirmation)
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const oscillator3 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        // Connect: oscillators -> filter -> gain -> destination
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        oscillator3.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Three oscillators for a pleasant chord
        oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator1.frequency.exponentialRampToValueAtTime(659.25, audioContext.currentTime + 0.2); // E5
        oscillator1.type = "sine";

        oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
        oscillator2.frequency.exponentialRampToValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        oscillator2.type = "sine";

        oscillator3.frequency.setValueAtTime(783.99, audioContext.currentTime); // G5
        oscillator3.frequency.exponentialRampToValueAtTime(1046.5, audioContext.currentTime + 0.2); // C6
        oscillator3.type = "sine";

        // High-pass filter for bright, clear sound
        filter.type = "highpass";
        filter.frequency.setValueAtTime(400, audioContext.currentTime);

        // Volume envelope with quick attack and decay
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);

        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.25);
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.25);
        oscillator3.start(audioContext.currentTime);
        oscillator3.stop(audioContext.currentTime + 0.25);
      }
    } catch (_error) {
      // Silently fail if audio context is not available
      console.log("Audio feedback not available");
    }
  }, []);

  const performAction = useCallback(
    (action: "delete" | "keep") => {
      // Show visual feedback
      setActionFeedback({ show: true, type: action });

      // Play audio feedback
      playActionSound(action);

      // Trigger action after brief delay for feedback
      setTimeout(() => {
        onFileAction(action, currentIndex);
        setActionFeedback({ show: false, type: action });
      }, 200);
    },
    [onFileAction, currentIndex, playActionSound]
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
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
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        <FilePreview file={currentFile} className="max-w-6xl w-full h-full" />

        {/* Action Feedback Overlay */}
        {actionFeedback.show && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div
              className={`action-feedback ${actionFeedback.type} px-8 py-4 rounded-lg text-white font-bold text-2xl shadow-lg ${
                actionFeedback.type === "delete"
                  ? "bg-red-500 border-2 border-red-300"
                  : "bg-green-500 border-2 border-green-300"
              }`}
            >
              {actionFeedback.type === "delete" ? (
                <div className="flex items-center space-x-2">
                  <span className="text-3xl">🗑️</span>
                  <span>DELETED</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-3xl">✅</span>
                  <span>KEPT</span>
                </div>
              )}
            </div>
          </div>
        )}
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
          className="flex items-center justify-center w-14 h-14 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transform hover:scale-105 transition-all active:scale-90 active:bg-red-700"
        >
          <XCircle className="w-7 h-7" />
        </button>

        <button
          type="button"
          onClick={() => performAction("keep")}
          className="flex items-center justify-center w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transform hover:scale-105 transition-all active:scale-90 active:bg-green-700"
        >
          <CheckCircle className="w-7 h-7" />
        </button>
      </div>

      {/* Instructions */}
      <div className="text-center px-4 py-2 bg-gray-50 text-xs text-gray-500 shrink-0">
        ← Delete • → Keep • I Details
      </div>
    </div>
  );
};

export default FileViewer;
