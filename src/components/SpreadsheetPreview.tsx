import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface SpreadsheetPreviewProps {
  buffer: ArrayBuffer;
  isCsv: boolean;
  onError: () => void;
}

const MAX_ROWS = 100;
const MAX_COLUMNS = 20;

const SpreadsheetPreview = ({ buffer, isCsv, onError }: SpreadsheetPreviewProps) => {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const nextWorkbook = XLSX.read(buffer, { type: "array", cellDates: true });
      setWorkbook(nextWorkbook);
      setSheetName(nextWorkbook.SheetNames[0] ?? "");
    } catch (parseError) {
      console.error(`Error parsing ${isCsv ? "CSV" : "XLSX"} file:`, parseError);
      setError(true);
      onError();
    }
  }, [buffer, isCsv, onError]);

  if (error || !workbook || !sheetName) return null;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
  }) as unknown[][];
  const visibleRows = rows.slice(0, MAX_ROWS).map((row) => row.slice(0, MAX_COLUMNS));
  const columnCount = Math.max(0, ...visibleRows.map((row) => row.length));

  return (
    <div className="w-full h-full flex flex-col rounded-lg bg-white shadow-lg overflow-hidden">
      {!isCsv && workbook.SheetNames.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b bg-gray-50 p-2">
          {workbook.SheetNames.map((name) => (
            <button
              type="button"
              key={name}
              onClick={() => setSheetName(name)}
              className={`rounded px-3 py-1 text-xs ${
                name === sheetName ? "bg-blue-500 text-white" : "bg-white text-gray-600"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex === 0 ? "bg-gray-50 font-medium" : ""}>
                {Array.from({ length: columnCount }, (_, columnIndex) => (
                  <td key={columnIndex} className="border border-gray-200 px-3 py-2 align-top">
                    {String(row[columnIndex] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {(rows.length > MAX_ROWS || columnCount >= MAX_COLUMNS) && (
          <p className="p-2 text-xs text-gray-500">
            Preview limited to {MAX_ROWS} rows and {MAX_COLUMNS} columns.
          </p>
        )}
      </div>
    </div>
  );
};

export default SpreadsheetPreview;
