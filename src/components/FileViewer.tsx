import { animated, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
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

const SWIPE_THRESHOLD = 150;
const VELOCITY_THRESHOLD = 0.5;

const FileViewer: React.FC<FileViewerProps> = ({ sessionState, onFileAction, onUndo, onBack }) => {
  const { files, currentIndex, undoStack } = sessionState;
  const currentFile = files[currentIndex];

  const [showMetadata, setShowMetadata] = useState(false);

  // Spring animation for card position and rotation
  const [{ x, y, rotate, scale, opacity }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    opacity: 1,
  }));

  // Overlay opacity for swipe feedback
  const [overlayState, setOverlayState] = useState<{
    show: boolean;
    type: "delete" | "keep";
    opacity: number;
  }>({
    show: false,
    type: "delete",
    opacity: 0,
  });

  const resetCard = useCallback(() => {
    api.start({
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      opacity: 1,
      config: { tension: 200, friction: 25 },
    });
    setOverlayState({ show: false, type: "delete", opacity: 0 });
  }, [api]);

  const performAction = useCallback(
    (action: "delete" | "keep") => {
      // Animate card out
      const direction = action === "delete" ? -1 : 1;
      api.start({
        x: direction * window.innerWidth,
        rotate: direction * 30,
        opacity: 0,
        config: { tension: 200, friction: 25 },
      });

      // Trigger action after animation
      setTimeout(() => {
        onFileAction(action, currentIndex);
        resetCard();
      }, 300);
    },
    [api, onFileAction, currentIndex, resetCard]
  );

  // Drag gesture handling
  const bind = useDrag(
    ({ active, movement: [mx, my], direction: [_xDir], velocity: [vx] }) => {
      const trigger = Math.abs(mx) > SWIPE_THRESHOLD || Math.abs(vx) > VELOCITY_THRESHOLD;

      if (active) {
        // Update card position during drag
        const rotation = mx / 10;
        api.start({
          x: mx,
          y: my / 3, // Subtle vertical movement
          rotate: rotation,
          scale: 1.1,
          immediate: true,
        });

        // Show overlay feedback
        if (Math.abs(mx) > 50) {
          const opacity = Math.min(Math.abs(mx) / SWIPE_THRESHOLD, 1);
          setOverlayState({
            show: true,
            type: mx < 0 ? "delete" : "keep",
            opacity,
          });
        } else {
          setOverlayState({ show: false, type: "delete", opacity: 0 });
        }
      } else {
        // Handle release
        if (trigger && Math.abs(mx) > 50) {
          performAction(mx < 0 ? "delete" : "keep");
        } else {
          resetCard();
        }
      }
    },
    {
      axis: "x",
      bounds: { left: -window.innerWidth, right: window.innerWidth },
      rubberband: true,
    }
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

      {/* Main Card Area */}
      <div className="flex-1 flex items-center justify-center p-6 relative max-h-[calc(100vh-200px)]">
        <animated.div
          {...bind()}
          style={{
            x,
            y,
            rotate,
            scale,
            opacity,
            touchAction: "none",
          }}
          className="swipe-card w-full max-w-2xl max-h-full cursor-grab active:cursor-grabbing relative shadow-2xl"
        >
          {/* Swipe Overlay */}
          {overlayState.show && (
            <div
              className={`swipe-overlay ${
                overlayState.type === "keep" ? "keep-overlay" : "delete-overlay"
              }`}
              style={{ opacity: overlayState.opacity }}
            >
              {overlayState.type === "keep" ? "KEEP" : "DELETE"}
            </div>
          )}

          {/* File Preview */}
          <div className="h-full flex flex-col min-h-0">
            <div className="flex-1 overflow-hidden rounded-t-xl min-h-0">
              <FilePreview file={currentFile} className="h-full w-full object-cover" />
            </div>

            {/* File Info */}
            <div className="p-4 bg-white rounded-b-xl border-t shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {currentFile.name}
                  </h3>
                  <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                    <span>{formatFileSize(currentFile.size)}</span>
                    <span>•</span>
                    <span>{formatDate(currentFile.modified)}</span>
                  </div>

                  {showMetadata && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
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
          </div>
        </animated.div>
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
