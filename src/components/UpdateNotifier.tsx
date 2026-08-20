import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { UpdateStatus } from "../electron.d.ts";

function UpdateNotifier() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    return window.electronAPI.onUpdateStatus(setStatus);
  }, []);

  if (!status || status.state === "error") return null;

  const handleRestart = () => {
    window.electronAPI.quitAndInstall();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg border border-gray-200">
      {status.state === "downloaded" ? (
        <>
          <RefreshCw className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-gray-900">
            Update {status.version} ready — restart to install
          </span>
          <button
            type="button"
            onClick={handleRestart}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Restart
          </button>
        </>
      ) : (
        <>
          <Download className="w-4 h-4 text-gray-500 animate-pulse" />
          <span className="text-sm text-gray-600">
            {status.state === "available"
              ? `Downloading update ${status.version}…`
              : `Downloading update… ${Math.round(status.percent)}%`}
          </span>
        </>
      )}
    </div>
  );
}

export default UpdateNotifier;
