import heic2any from "heic2any";
import { useEffect, useState } from "react";

interface HeicPreviewProps {
  buffer: ArrayBuffer;
  name: string;
  onError: () => void;
}

const HeicPreview = ({ buffer, name, onError }: HeicPreviewProps) => {
  const [src, setSrc] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;
    heic2any({ blob: new Blob([buffer]), toType: "image/jpeg", quality: 0.85 })
      .then((converted) => {
        const blob = Array.isArray(converted) ? converted[0] : converted;
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      })
      .catch((conversionError) => {
        console.error("Error converting HEIC file:", conversionError);
        if (!cancelled) {
          setError(true);
          onError();
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [buffer, onError]);

  if (error) return null;
  if (!src) {
    return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />;
  }
  return (
    <img
      src={src}
      alt={name}
      className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
      draggable={false}
    />
  );
};

export default HeicPreview;
