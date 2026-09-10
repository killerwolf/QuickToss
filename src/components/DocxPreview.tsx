import { useEffect, useState } from "react";
import mammoth from "mammoth";

interface DocxPreviewProps {
  buffer: ArrayBuffer;
  onError: () => void;
}

const DocxPreview = ({ buffer, onError }: DocxPreviewProps) => {
  const [html, setHtml] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    mammoth
      .convertToHtml({ arrayBuffer: buffer })
      .then(({ value }) => {
        if (!cancelled) setHtml(value);
      })
      .catch((conversionError) => {
        console.error("Error converting DOCX file:", conversionError);
        if (!cancelled) {
          setError(true);
          onError();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [buffer, onError]);

  if (error) return null;
  if (!html) {
    return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />;
  }

  return (
    <iframe
      title="DOCX preview"
      sandbox=""
      srcDoc={`<!doctype html><html><head><style>
        body { font: 14px system-ui, sans-serif; line-height: 1.6; color: #1f2937; margin: 2rem; }
        img { max-width: 100%; height: auto; }
        table { border-collapse: collapse; max-width: 100%; }
        td, th { border: 1px solid #d1d5db; padding: .35rem .5rem; }
      </style></head><body>${html}</body></html>`}
      className="w-full h-full rounded-lg bg-white shadow-lg"
    />
  );
};

export default DocxPreview;
