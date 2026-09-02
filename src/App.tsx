import { useEffect, useState } from "react";
import CompletionScreen from "./components/CompletionScreen";
import FileViewer from "./components/FileViewer";
import UpdateNotifier from "./components/UpdateNotifier";
import WelcomeScreen from "./components/WelcomeScreen";
import { useFileSession } from "./hooks/useFileSession";
import type { FileAction } from "./types";
import "./electron.d.ts";

type AppState = "welcome" | "viewing" | "completed";

function App() {
  const [appState, setAppState] = useState<AppState>("welcome");
  const { sessionState, isComplete, startSession, keep, deleteFile, undo, reset } =
    useFileSession();

  // Moves to the completion screen once the session actually reports itself
  // done, rather than the caller re-deriving that from currentIndex/files.
  useEffect(() => {
    if (isComplete && appState === "viewing") {
      setAppState("completed");
    }
  }, [isComplete, appState]);

  const handleFolderSelected = async (folderPath: string) => {
    try {
      const files = await window.electronAPI.scanFolder(folderPath);

      if (files.length === 0) {
        alert("No supported files found in the selected folder.");
        return;
      }

      startSession(files, folderPath);
      setAppState("viewing");
    } catch (error) {
      console.error("Error scanning folder:", error);
      alert("Error scanning folder. Please try again.");
    }
  };

  const handleFileAction = async (action: FileAction) => {
    if (action === "delete") {
      await deleteFile();
    } else {
      keep();
    }
  };

  const handleUndo = () => {
    undo();

    // If we undid from completion screen, go back to viewing
    if (appState === "completed") {
      setAppState("viewing");
    }
  };

  const handleStartOver = () => {
    reset();
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
        WebkitAppRegion: "no-drag",
      }}
    >
      {renderContent()}
      <UpdateNotifier />
    </div>
  );
}

export default App;
