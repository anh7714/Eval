import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, exportToExcel } from "@/lib/excel";

export default function CandidateManagement() {
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    department: "",
    position: "",
    category: "",
    description: "",
    sortOrder: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["/api/admin/candidates"],
  });

  const createMutation = useMutation({
    mutationFn: async (candidate: typeof newCandidate) => {
      const response = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidate),
      });
      if (!response.ok) throw new Error("Failed to create candidate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/candidates"] });
      toast({ title: "성공", description: "평가대상이 추가되었습니다." });
      setIsAddingCandidate(false);
      setNewCandidate({ name: "", department: "", position: "", category: "", description: "", sortOrder: 0 });
    },
    onError: () => {
      toast({ title: "오류", description: "평가대상 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (candidates: any[]) => {
      const response = await fetch("/api/admin/candidates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates }),
      });
      if (!response.ok) throw new Error("Failed to create candidates");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/candidates"] });
      toast({ title: "성공", description: `${data.length}명의 평가대상이 추가되었습니다.` });
    },
    onError: () => {
      toast({ title: "오류", description: "평가대상 일괄 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/admin/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update candidate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/candidates"] });
      toast({ title: "성공", description: "평가대상이 수정되었습니다." });
      setEditingCandidate(null);
      setIsAddingCandidate(false);
      setNewCandidate({ name: "", department: "", position: "", category: "", description: "", sortOrder: 0 });
    },
    onError: () => {
      toast({ title: "오류", description: "평가대상 수정에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/candidates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete candidate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/candidates"] });
      toast({ title: "성공", description: "평가대상이 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "평가대상 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/admin/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!response.ok) throw new Error("Failed to update candidate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/candidates"] });
      toast({ title: "성공", description: "평가대상 상태가 변경되었습니다." });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCandidate) {
      updateMutation.mutate({ id: editingCandidate.id, data: newCandidate });
    } else {
      createMutation.mutate(newCandidate);
    }
  };

  const handleEdit = (candidate: any) => {
    setEditingCandidate(candidate);
    setNewCandidate({
      name: candidate.name,
      department: candidate.department,
      position: candidate.position,
      category: candidate.category,
      description: candidate.description || "",
      sortOrder: candidate.sortOrder || 0,
    });
    setIsAddingCandidate(true);
  };

  const handleDelete = (candidate: any) => {
    if (window.confirm(`정말로 "${candidate.name}" 평가대상을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(candidate.id);
    }
  };

  const handleCancel = () => {
    setEditingCandidate(null);
    setIsAddingCandidate(false);
    setNewCandidate({ name: "", department: "", position: "", category: "", description: "", sortOrder: 0 });
  };

  const handleExcelUpload = async (file: File) => {
    try {
      const data = await parseExcelFile(file);
      const validCandidates = data.map((row: any, index: number) => ({
        name: row['기관명(성명)'] || row['이름'] || row['name'] || '',
        department: row['소속(부서)'] || row['부서'] || row['department'] || '',
        position: row['직책(직급)'] || row['직책'] || row['position'] || '',
        category: row['구분'] || row['category'] || '',
        description: row['설명'] || row['description'] || '',
        sortOrder: index,
      })).filter(candidate => candidate.name && candidate.department);

      if (validCandidates.length === 0) {
        toast({ title: "오류", description: "유효한 평가대상 데이터가 없습니다.", variant: "destructive" });
        return;
      }

      bulkCreateMutation.mutate(validCandidates);
    } catch (error) {
      toast({ title: "오류", description: "엑셀 파일 처리 중 오류가 발생했습니다.", variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleExcelUpload(file);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "기관명(성명)": "홍길동",
        "소속(부서)": "기획팀",
        "직책(직급)": "과장",
        구분: "정규직",
        설명: "기획업무 담당"
      },
      {
        "기관명(성명)": "김영희",
        "소속(부서)": "마케팅팀",
        "직책(직급)": "대리",
        구분: "정규직",
        설명: "마케팅 전략 수립"
      },
      {
        "기관명(성명)": "박철수",
        "소속(부서)": "개발팀",
        "직책(직급)": "팀장",
        구분: "정규직",
        설명: "시스템 개발 총괄"
      }
    ];

    exportToExcel(templateData, `평가대상_업로드_템플릿.xlsx`);
    toast({ title: "성공", description: "업로드 템플릿 파일이 다운로드되었습니다." });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">평가대상 관리</h1>
            <p className="text-lg text-gray-600">평가 대상을 관리할 수 있습니다.</p>
            <p className="text-sm text-gray-500 mt-2">
              💡 엑셀 업로드 형식: 기관명(성명), 소속(부서), 직책(직급), 구분, 설명 컬럼을 포함해주세요.
            </p>
          </div>
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkCreateMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {bulkCreateMutation.isPending ? "업로드 중..." : "엑셀 업로드"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              예시파일 다운
            </Button>
            <Button onClick={() => setIsAddingCandidate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              평가대상 추가
            </Button>
          </div>
        </div>

        {isAddingCandidate && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingCandidate ? "평가대상 수정" : "새 평가대상 추가"}</CardTitle>
              <CardDescription>평가대상 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">기관명(성명)</label>
                    <Input
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">소속(부서)</label>
                    <Input
                      value={newCandidate.department}
                      onChange={(e) => setNewCandidate({ ...newCandidate, department: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">직책(직급)</label>
                    <Input
                      value={newCandidate.position}
                      onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">구분</label>
                    <Input
                      value={newCandidate.category}
                      onChange={(e) => setNewCandidate({ ...newCandidate, category: e.target.value })}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">설명</label>
                    <Input
                      value={newCandidate.description}
                      onChange={(e) => setNewCandidate({ ...newCandidate, description: e.target.value })}
                      placeholder="평가대상에 대한 간단한 설명"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingCandidate ? 
                      (updateMutation.isPending ? "수정 중..." : "수정") : 
                      (createMutation.isPending ? "추가 중..." : "추가")
                    }
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    취소
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>평가대상 목록</CardTitle>
            <CardDescription>총 {(candidates as any[])?.length || 0}명의 평가대상이 등록되어 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(candidates as any[])?.map((candidate: any) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="font-semibold">{candidate.name}</h3>
                      <p className="text-sm text-gray-600">
                        {candidate.department} · {candidate.position} · {candidate.category}
                      </p>
                      {candidate.description && (
                        <p className="text-xs text-gray-500 mt-1">{candidate.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={candidate.isActive ? "default" : "secondary"}>
                      {candidate.isActive ? "활성" : "비활성"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActiveMutation.mutate({
                        id: candidate.id,
                        isActive: candidate.isActive
                      })}
                    >
                      {candidate.isActive ? "비활성화" : "활성화"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(candidate)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(candidate)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(candidates as any[])?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  등록된 평가대상이 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}