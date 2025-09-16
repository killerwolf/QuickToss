import { AlertCircle, File, FileText, Film, Image as ImageIcon } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { PreviewProps } from "../types";

const FilePreview: React.FC<PreviewProps> = ({ file }) => {
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    // Create file URL for preview
    if (file.type === "image") {
      // For images, we can directly use the file path as src
      setPreviewSrc(`file://${file.path}`);
      setLoading(false);
    } else if (file.type === "document" && file.extension === ".txt") {
      // For text files, we could read and display content
      // For now, show file icon
      setPreviewSrc("");
      setLoading(false);
    } else {
      // For other file types, show appropriate icon
      setPreviewSrc("");
      setLoading(false);
    }
  }, [file]);

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  const getFileIcon = () => {
    const iconSize = "w-16 h-16";
    const iconColor = "text-gray-400";

    switch (file.type) {
      case "image":
        return <ImageIcon className={`${iconSize} ${iconColor}`} />;
      case "document":
        return <FileText className={`${iconSize} ${iconColor}`} />;
      case "video":
        return <Film className={`${iconSize} ${iconColor}`} />;
      default:
        return <File className={`${iconSize} ${iconColor}`} />;
    }
  };

  const renderPreview = () => {
    if (loading) {
      return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>;
    }

    if (error || !previewSrc) {
      return (
        <div className="flex flex-col items-center space-y-4 p-8">
          {error ? <AlertCircle className="w-16 h-16 text-red-400" /> : getFileIcon()}
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">
              {error ? "Preview not available" : "File Preview"}
            </p>
            <p className="text-sm text-gray-500 mt-1">{file.extension.toUpperCase()} file</p>
          </div>
        </div>
      );
    }

    if (file.type === "image") {
      return (
        <img
          src={previewSrc}
          alt={file.name}
          className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
          style={{
            maxHeight: "calc(100vh - 400px)",
            maxWidth: "100%",
            width: "auto",
            height: "auto",
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
        />
      );
    }

    // For other file types, show icon with file info
    return (
      <div className="flex flex-col items-center space-y-4 p-8">
        {getFileIcon()}
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">
            {file.type === "document" ? "Document" : "File"}
          </p>
          <p className="text-sm text-gray-500 mt-1">{file.extension.toUpperCase()} file</p>
        </div>
      </div>
    );
  };

  return renderPreview();
};

export default FilePreview;
