import { AlertTriangle, Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { UpdateStatus } from "../electron.d.ts";

function UpdateNotifier() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    return window.electronAPI.onUpdateStatus((next) => {
      setDismissed(false);
      setStatus(next);
    });
  }, []);

  if (!status || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg border border-gray-200">
      {status.state === "error" ? (
        <>
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-gray-600">Couldn't check for updates</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-gray-900">Version {status.version} is available</span>
          <button
            type="button"
            onClick={() => window.electronAPI.openReleasePage()}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Download
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default UpdateNotifier;
