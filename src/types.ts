export interface FileItem {
  name: string;
  path: string;
  size: number;
  modified: Date;
  extension: string;
  type: "image" | "document" | "video" | "other";
}

export interface UndoAction {
  action: "delete" | "keep";
  fileIndex: number;
  file: FileItem;
}

export interface SessionState {
  files: FileItem[];
  currentIndex: number;
  deletedFiles: FileItem[];
  keptFiles: FileItem[];
  folderPath: string;
  undoStack: UndoAction[];
}

export interface SwipeAction {
  direction: "left" | "right";
  distance: number;
  velocity: number;
}

export interface PreviewProps {
  file: FileItem;
  className?: string;
  settings?: {
    videoAutoplay: boolean;
  };
}

export const formatFileSize = (bytes: number): string => {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export interface AppSettings {
  soundEffects: boolean;
  videoAutoplay: boolean;
  confirmDelete: boolean;
}
