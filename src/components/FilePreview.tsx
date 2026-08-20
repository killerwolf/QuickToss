import { AlertCircle, File, FileText, Film, Image as ImageIcon } from "lucide-react";
import type React from "react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { PreviewProps } from "../types";

// react-pdf bundles pdfjs-dist, which dominates the bundle. Loading it lazily
// keeps it out of the initial download for the majority of files, which aren't
// PDFs.
const PdfPreview = lazy(() => import("./PdfPreview"));

const FilePreview: React.FC<PreviewProps> = ({ file, settings }) => {
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [textContent, setTextContent] = useState<string>("");
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);

  const loadTextFile = useCallback(async () => {
    try {
      const response = await fetch(`file://${file.path}`);
      const text = await response.text();
      setTextContent(text);
      setLoading(false);
    } catch (err) {
      console.error("Error loading text file:", err);
      setError(true);
      setLoading(false);
    }
  }, [file.path]);

  const loadPdfFile = useCallback(async () => {
    try {
      console.log("Loading PDF file:", file.path);
      const buffer = await window.electronAPI.readFileAsBuffer(file.path);
      console.log("PDF buffer loaded, size:", buffer.byteLength);
      setPdfBuffer(buffer);
      setLoading(false);
    } catch (err) {
      console.error("Error loading PDF file:", err);
      setError(true);
      setLoading(false);
    }
  }, [file.path]);

  useEffect(() => {
    console.log(
      "FilePreview useEffect triggered for file:",
      file.name,
      "type:",
      file.type,
      "extension:",
      file.extension
    );
    setLoading(true);
    setError(false);
    setTextContent("");
    setPdfBuffer(null);

    // Handle different file types
    if (file.type === "image") {
      console.log("Loading image file:", file.path);
      // For images, we can directly use the file path as src
      setPreviewSrc(`file://${file.path}`);
      setLoading(false);
    } else if (file.type === "document") {
      const textExtensions = [".txt", ".md", ".log", ".json", ".xml", ".csv", ".yaml", ".yml"];
      if (textExtensions.includes(file.extension)) {
        console.log("Loading text file:", file.path);
        // For text files, read and display content
        loadTextFile();
      } else if (file.extension === ".pdf") {
        console.log("Loading PDF file:", file.path);
        // For PDF files, load as buffer
        loadPdfFile();
      } else {
        console.log("Unsupported document type:", file.extension);
        // For other document types, show file icon
        setPreviewSrc("");
        setLoading(false);
      }
    } else if (file.type === "video") {
      console.log("Loading video file:", file.path);
      // For video files, set up video preview
      setPreviewSrc(`file://${file.path}`);
      setLoading(false);
    } else {
      console.log("Unsupported file type:", file.type);
      // For other file types, show appropriate icon
      setPreviewSrc("");
      setLoading(false);
    }
  }, [file, loadTextFile, loadPdfFile]);

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  const onPdfLoadSuccess = (numPages: number) => {
    console.log("PDF loaded successfully, pages:", numPages);
    setLoading(false);
    setError(false);
  };

  const onPdfLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
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
    console.log(
      "renderPreview called - loading:",
      loading,
      "error:",
      error,
      "file type:",
      file.type,
      "extension:",
      file.extension
    );

    if (loading) {
      console.log("Showing loading spinner");
      return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>;
    }

    if (error) {
      console.log("Showing error state");
      return (
        <div className="flex flex-col items-center space-y-4 p-8">
          <AlertCircle className="w-16 h-16 text-red-400" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">Preview not available</p>
            <p className="text-sm text-gray-500 mt-1">{file.extension.toUpperCase()} file</p>
          </div>
        </div>
      );
    }

    // Text file preview
    const textExtensions = [".txt", ".md", ".log", ".json", ".xml", ".csv", ".yaml", ".yml"];
    if (file.type === "document" && textExtensions.includes(file.extension) && textContent) {
      // Format JSON content for better readability
      let displayContent = textContent;
      if (file.extension === ".json") {
        try {
          const parsed = JSON.parse(textContent);
          displayContent = JSON.stringify(parsed, null, 2);
        } catch {
          // If JSON parsing fails, display original content
          displayContent = textContent;
        }
      }

      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 overflow-auto p-4 bg-white rounded-lg shadow-lg">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
              {displayContent}
            </pre>
          </div>
        </div>
      );
    }

    // PDF preview
    if (file.type === "document" && file.extension === ".pdf") {
      console.log(
        "PDF preview section - pdfBuffer exists:",
        !!pdfBuffer,
        "pdfBuffer size:",
        pdfBuffer?.byteLength
      );
      if (pdfBuffer) {
        console.log("Rendering PDF with buffer");
        return (
          <Suspense
            fallback={
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            }
          >
            <PdfPreview
              buffer={pdfBuffer}
              onLoadSuccess={onPdfLoadSuccess}
              onLoadError={onPdfLoadError}
            />
          </Suspense>
        );
      } else {
        console.log("PDF buffer not loaded yet, showing loading state");
        return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>;
      }
    }

    // Video preview
    if (file.type === "video" && previewSrc) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <video
            src={previewSrc}
            controls
            autoPlay={settings?.videoAutoplay || false}
            className="max-h-full max-w-full rounded-lg shadow-lg"
            style={{
              maxHeight: "calc(100vh - 400px)",
              maxWidth: "100%",
            }}
            onLoadedData={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          >
            <track kind="captions" src="" srcLang="en" label="English" />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Image preview
    if (file.type === "image" && previewSrc) {
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

    // Fallback for unsupported file types
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
