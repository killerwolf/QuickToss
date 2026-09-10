import JSZip from "jszip";
import { useEffect, useState } from "react";

interface PptxPreviewProps {
  buffer: ArrayBuffer;
  path: string;
  onError: () => void;
}

interface Slide {
  name: string;
  text: string[];
}

const PptxPreview = ({ buffer, path, onError }: PptxPreviewProps) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    window.electronAPI
      .getQuickLookThumbnail(path)
      .then((thumbnail) => {
        if (!thumbnail || cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([thumbnail], { type: "image/png" }));
        setThumbnailUrl(objectUrl);
      })
      .catch((thumbnailError) => {
        console.warn("Quick Look PPTX preview unavailable:", thumbnailError);
      });
    const loadSlides = async () => {
      try {
        const archive = await JSZip.loadAsync(buffer);
        const slideNames = Object.keys(archive.files)
          .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
        if (slideNames.length === 0) {
          throw new Error("PPTX contains no slides");
        }
        const parsedSlides = await Promise.all(
          slideNames.map(async (name, index) => {
            const xml = await archive.files[name].async("text");
            const document = new DOMParser().parseFromString(xml, "application/xml");
            return {
              name: `Slide ${index + 1}`,
              text: Array.from(document.getElementsByTagName("a:t"))
                .map((node) => node.textContent ?? "")
                .filter(Boolean),
            };
          })
        );
        if (!cancelled) setSlides(parsedSlides);
      } catch (parseError) {
        console.error("Error parsing PPTX file:", parseError);
        if (!cancelled) {
          setError(true);
          onError();
        }
      }
    };
    loadSlides();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [buffer, onError, path]);

  if (error) return null;
  if (!slides.length && !thumbnailUrl) {
    return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />;
  }

  return (
    <div className="w-full h-full overflow-auto rounded-lg bg-white p-4 shadow-lg">
      <div className="mx-auto max-w-3xl space-y-3">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt="First slide preview"
            className="w-full rounded border border-gray-200 object-contain"
            draggable={false}
          />
        )}
        {slides.map((slide) => (
          <section key={slide.name} className="rounded border border-gray-200 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-500">{slide.name}</h3>
            <p className="whitespace-pre-wrap text-sm text-gray-800">
              {slide.text.join(" ") || "No text on this slide"}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
};

export default PptxPreview;
