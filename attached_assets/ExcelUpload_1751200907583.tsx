import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";

interface ExcelUploadProps {
  onUpload: (data: any[]) => void;
  accept?: string;
  className?: string;
  children?: React.ReactNode;
}

const ExcelUpload: React.FC<ExcelUploadProps> = ({
  onUpload,
  accept = ".xlsx,.xls,.csv",
  className = "",
  children = "엑셀 파일 업로드"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    try {
      const data = await parseExcelFile(file);
      onUpload(data);
    } catch (error) {
      console.error("엑셀 파일 파싱 실패:", error);
      alert("엑셀 파일을 읽을 수 없습니다. 파일 형식을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error("파일 읽기 실패"));
      reader.readAsArrayBuffer(file);
    });
  };

  return (
    <div className="inline-block">
      <input
        type="file"
        accept={accept}
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={loading}
        className={`px-4 py-2 rounded transition ${className} ${
          loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {loading ? "처리 중..." : children}
      </button>
      {fileName && !loading && (
        <div className="text-xs text-gray-600 mt-1">선택된 파일: {fileName}</div>
      )}
    </div>
  );
};

export default ExcelUpload; 