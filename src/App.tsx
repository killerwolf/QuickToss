import { useState } from "react";
import CompletionScreen from "./components/CompletionScreen";
import FileViewer from "./components/FileViewer";
import WelcomeScreen from "./components/WelcomeScreen";
import type { SessionState } from "./types";
import "./electron.d.ts";

type AppState = "welcome" | "viewing" | "completed";

function App() {
  const [appState, setAppState] = useState<AppState>("welcome");
  const [sessionState, setSessionState] = useState<SessionState>({
    files: [],
    currentIndex: 0,
    deletedFiles: [],
    keptFiles: [],
    folderPath: "",
    undoStack: [],
  });

  const handleFolderSelected = async (folderPath: string) => {
    try {
      const files = await window.electronAPI.scanFolder(folderPath);

      if (files.length === 0) {
        alert("No supported files found in the selected folder.");
        return;
      }

      setSessionState({
        files,
        currentIndex: 0,
        deletedFiles: [],
        keptFiles: [],
        folderPath,
        undoStack: [],
      });
      setAppState("viewing");
    } catch (error) {
      console.error("Error scanning folder:", error);
      alert("Error scanning folder. Please try again.");
    }
  };

  const handleFileAction = (action: "delete" | "keep", fileIndex: number) => {
    const file = sessionState.files[fileIndex];

    setSessionState((prev) => {
      const newState = { ...prev };

      // Add to undo stack
      newState.undoStack.push({
        action,
        fileIndex,
        file,
      });

      // Update appropriate array
      if (action === "delete") {
        newState.deletedFiles.push(file);
        // Actually move file to trash
        window.electronAPI.moveToTrash(file.path).catch(console.error);
      } else {
        newState.keptFiles.push(file);
      }

      // Move to next file
      newState.currentIndex = fileIndex + 1;

      return newState;
    });

    // Check if we've processed all files
    if (fileIndex + 1 >= sessionState.files.length) {
      setAppState("completed");
    }
  };

  const handleUndo = async () => {
    if (sessionState.undoStack.length === 0) return;

    const lastAction = sessionState.undoStack[sessionState.undoStack.length - 1];

    setSessionState((prev) => {
      const newState = { ...prev };

      // Remove from undo stack
      newState.undoStack.pop();

      // Reverse the action
      if (lastAction.action === "delete") {
        newState.deletedFiles = newState.deletedFiles.filter(
          (f) => f.path !== lastAction.file.path
        );
        // Note: We can't restore from trash automatically, but we remove from deleted list
      } else {
        newState.keptFiles = newState.keptFiles.filter((f) => f.path !== lastAction.file.path);
      }

      // Go back to previous file
      newState.currentIndex = lastAction.fileIndex;

      return newState;
    });

    // If we undid from completion screen, go back to viewing
    if (appState === "completed") {
      setAppState("viewing");
    }
  };

  const handleStartOver = () => {
    setSessionState({
      files: [],
      currentIndex: 0,
      deletedFiles: [],
      keptFiles: [],
      folderPath: "",
      undoStack: [],
    });
    setAppState("welcome");
  };

  const renderContent = () => {
    switch (appState) {
      case "welcome":
        return <WelcomeScreen onFolderSelected={handleFolderSelected} />;

      case "viewing":
        return (
          <FileViewer
            sessionState={sessionState}
            onFileAction={handleFileAction}
            onUndo={handleUndo}
            onBack={handleStartOver}
          />
        );

      case "completed":
        return (
          <CompletionScreen
            sessionState={sessionState}
            onStartOver={handleStartOver}
            onUndo={handleUndo}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100"
      style={{
        // Ensure no overlap on any platform
        WebkitAppRegion: "no-drag" as React.CSSProperties["WebkitAppRegion"],
      }}
    >
      {renderContent()}
    </div>
  );
}

export default App;
