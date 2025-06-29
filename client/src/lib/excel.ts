import * as XLSX from "xlsx";

export async function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Convert array format to object format with headers
        if (jsonData.length === 0) {
          resolve([]);
          return;
        }
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        const objects = rows.map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || "";
          });
          return obj;
        }).filter(obj => {
          // Filter out empty rows
          return Object.values(obj).some(value => value && value.toString().trim() !== "");
        });
        
        resolve(objects);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
