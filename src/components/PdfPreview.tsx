import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfPreviewProps {
  buffer: ArrayBuffer;
  onLoadSuccess: (numPages: number) => void;
  onLoadError: (error: Error) => void;
}

// Kept in its own module so react-pdf (which bundles pdfjs-dist) is only
// downloaded when a PDF is actually previewed — see the lazy import in
// FilePreview.
function PdfPreview({ buffer, onLoadSuccess, onLoadError }: PdfPreviewProps) {
  const [pageCount, setPageCount] = useState(0);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPageCount(numPages);
    onLoadSuccess(numPages);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-white rounded-lg shadow-lg"
        style={{
          maxHeight: "calc(100vh - 300px)",
          scrollbarWidth: "thin",
          scrollbarColor: "#cbd5e0 #f7fafc",
        }}
      >
        <Document
          file={buffer}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={onLoadError}
          className="flex flex-col items-center space-y-4"
        >
          {Array.from(new Array(pageCount), (_el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={Math.min(600, window.innerWidth - 100)}
              className="shadow-lg"
            />
          ))}
        </Document>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center p-2 bg-gray-100 rounded-lg">
          <span className="text-sm text-gray-600">{pageCount} pages - Scroll to navigate</span>
        </div>
      )}
    </div>
  );
}

export default PdfPreview;
