import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseExcelFile } from "@/lib/excel";

interface ExcelUploadProps {
  onUpload: (data: any[]) => void;
  accept?: string;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export default function ExcelUpload({
  onUpload,
  accept = ".xlsx,.xls,.csv",
  className = "",
  children = "엑셀 파일 업로드",
  disabled = false,
}: ExcelUploadProps) {
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

  return (
    <div className="inline-block">
      <input
        type="file"
        accept={accept}
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || loading}
      />
      <Button
        type="button"
        disabled={disabled || loading}
        className={className}
        onClick={() => fileInputRef.current?.click()}
      >
        {loading ? "처리 중..." : children}
      </Button>
      {fileName && !loading && (
        <div className="text-xs text-slate-600 mt-1">선택된 파일: {fileName}</div>
      )}
    </div>
  );
}
