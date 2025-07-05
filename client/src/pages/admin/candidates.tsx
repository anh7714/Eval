import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Upload, Download, Settings, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, exportToExcel } from "@/lib/excel";

export default function CandidateManagement() {
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    department: "",
    position: "",
    category: "",
    mainCategory: "",
    subCategory: "",
    description: "",
    sortOrder: 0,
  });

  // 카테고리 관리 상태
  const [managedCategories, setManagedCategories] = useState({
    main: ["신규", "재협약"],
    sub: ["일시동행", "주거편의", "식사배달", "단기시설"]
  });
  const [newCategoryInput, setNewCategoryInput] = useState({ main: "", sub: "" });

  // 카테고리 관리 함수들
  const addMainCategory = () => {
    if (newCategoryInput.main.trim() && !managedCategories.main.includes(newCategoryInput.main.trim())) {
      setManagedCategories(prev => ({
        ...prev,
        main: [...prev.main, newCategoryInput.main.trim()]
      }));
      setNewCategoryInput(prev => ({ ...prev, main: "" }));
      toast({ title: "성공", description: "구분이 추가되었습니다." });
    }
  };

  const addSubCategory = () => {
    if (newCategoryInput.sub.trim() && !managedCategories.sub.includes(newCategoryInput.sub.trim())) {
      setManagedCategories(prev => ({
        ...prev,
        sub: [...prev.sub, newCategoryInput.sub.trim()]
      }));
      setNewCategoryInput(prev => ({ ...prev, sub: "" }));
      toast({ title: "성공", description: "세부구분이 추가되었습니다." });
    }
  };

  const removeMainCategory = (category: string) => {
    setManagedCategories(prev => ({
      ...prev,
      main: prev.main.filter(c => c !== category)
    }));
    toast({ title: "성공", description: "구분이 삭제되었습니다." });
  };

  const removeSubCategory = (category: string) => {
    setManagedCategories(prev => ({
      ...prev,
      sub: prev.sub.filter(c => c !== category)
    }));
    toast({ title: "성공", description: "세부구분이 삭제되었습니다." });
  };

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
      setNewCandidate({ name: "", department: "", position: "", category: "", mainCategory: "", subCategory: "", description: "", sortOrder: 0 });
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
      setNewCandidate({ name: "", department: "", position: "", category: "", mainCategory: "", subCategory: "", description: "", sortOrder: 0 });
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
    
    // 2단계 카테고리를 기존 category 필드에 통합 저장
    const combinedCategory = newCandidate.mainCategory && newCandidate.subCategory 
      ? `${newCandidate.mainCategory} > ${newCandidate.subCategory}` 
      : newCandidate.category;
    
    const candidateData = {
      ...newCandidate,
      category: combinedCategory
    };

    if (editingCandidate) {
      updateMutation.mutate({ id: editingCandidate.id, data: candidateData });
    } else {
      createMutation.mutate(candidateData);
    }
  };

  const handleEdit = (candidate: any) => {
    setEditingCandidate(candidate);
    
    // 기존 카테고리에서 2단계 카테고리 분리
    let mainCategory = "";
    let subCategory = "";
    
    if (candidate.category && candidate.category.includes(" > ")) {
      const parts = candidate.category.split(" > ");
      mainCategory = parts[0] || "";
      subCategory = parts[1] || "";
    }
    
    setNewCandidate({
      name: candidate.name,
      department: candidate.department,
      position: candidate.position,
      category: candidate.category,
      mainCategory: mainCategory,
      subCategory: subCategory,
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
    setNewCandidate({ name: "", department: "", position: "", category: "", mainCategory: "", subCategory: "", description: "", sortOrder: 0 });
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
          <Card className="mb-6 card-professional">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-xl">
              <CardTitle className="text-xl text-gray-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {editingCandidate ? "평가대상 수정" : "새 평가대상 추가"}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">평가대상 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">기관명(성명) *</label>
                    <Input
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      required
                      className="input-professional h-12"
                      placeholder="기관명 또는 성명을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">소속(부서)</label>
                    <Input
                      value={newCandidate.department}
                      onChange={(e) => setNewCandidate({ ...newCandidate, department: e.target.value })}
                      className="input-professional h-12"
                      placeholder="소속 또는 부서를 입력하세요 (선택사항)"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">직책(직급)</label>
                    <Input
                      value={newCandidate.position}
                      onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                      className="input-professional h-12"
                      placeholder="직책 또는 직급을 입력하세요 (선택사항)"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center justify-between">
                      구분 (기존)
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCategoryManager(true)}
                        className="h-6 px-2 text-xs"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        관리
                      </Button>
                    </label>
                    <Select 
                      value={newCandidate.mainCategory}
                      onValueChange={(value) => setNewCandidate({ ...newCandidate, mainCategory: value })}
                    >
                      <SelectTrigger className="input-professional h-12">
                        <SelectValue placeholder="구분 선택" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        {managedCategories.main.map((category: string) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">세부 구분</label>
                    <Select 
                      value={newCandidate.subCategory}
                      onValueChange={(value) => setNewCandidate({ ...newCandidate, subCategory: value })}
                    >
                      <SelectTrigger className="input-professional h-12">
                        <SelectValue placeholder="세부 구분 선택" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        {managedCategories.sub.map((category: string) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">설명</label>
                    <Input
                      value={newCandidate.description}
                      onChange={(e) => setNewCandidate({ ...newCandidate, description: e.target.value })}
                      className="input-professional h-12"
                      placeholder="평가대상에 대한 간단한 설명을 입력하세요 (선택사항)"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn-gradient-primary px-8 py-3 h-12"
                  >
                    {editingCandidate ? 
                      (updateMutation.isPending ? "수정 중..." : "수정") : 
                      (createMutation.isPending ? "추가 중..." : "추가")
                    }
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                    className="px-8 py-3 h-12 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    취소
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="card-professional">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-t-xl">
            <CardTitle className="text-xl text-gray-800 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              평가대상 목록
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">총 {(candidates as any[])?.length || 0}명의 평가대상이 등록되어 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(candidates as any[])?.map((candidate: any) => (
                <div
                  key={candidate.id}
                  className="item-card-professional group"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800 dark:text-white">{candidate.name}</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-600 dark:text-blue-400">소속:</span>
                          <span>{candidate.department || "정보 없음"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-600 dark:text-blue-400">직책:</span>
                          <span>{candidate.position || "정보 없음"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-600 dark:text-blue-400">구분:</span>
                          <span>{candidate.category || "정보 없음"}</span>
                        </div>
                      </div>
                      {candidate.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">{candidate.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                    <Badge 
                      variant={candidate.isActive ? "default" : "secondary"}
                      className="px-3 py-1"
                    >
                      {candidate.isActive ? "활성" : "비활성"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActiveMutation.mutate({
                        id: candidate.id,
                        isActive: candidate.isActive
                      })}
                      className="h-9 px-3 text-xs hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20"
                    >
                      {candidate.isActive ? "비활성화" : "활성화"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEdit(candidate)}
                      className="h-9 w-9 p-0 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20"
                    >
                      <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(candidate)}
                      className="h-9 w-9 p-0 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
              {(candidates as any[])?.length === 0 && (
                <div className="text-center py-16">
                  <Users className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">등록된 평가대상이 없습니다</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">상단의 "새 평가대상 추가" 버튼을 사용하여 첫 평가대상을 추가해보세요.</p>
                  <Button 
                    onClick={() => setIsAddingCandidate(true)}
                    className="btn-gradient-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    평가대상 추가하기
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 카테고리 관리 다이얼로그 - 고급스러운 디자인 */}
        <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
          <DialogContent className="max-w-4xl h-[85vh] overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-2xl">
            <DialogHeader className="pb-6 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                구분/세부구분 관리
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto py-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 구분 관리 */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      구분 관리
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <Input
                            placeholder="새 구분 입력"
                            value={newCategoryInput.main}
                            onChange={(e) => setNewCategoryInput(prev => ({ ...prev, main: e.target.value }))}
                            onKeyPress={(e) => e.key === 'Enter' && addMainCategory()}
                            className="pl-4 pr-12 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                          />
                        </div>
                        <Button 
                          onClick={addMainCategory} 
                          disabled={!newCategoryInput.main.trim()}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          추가
                        </Button>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[120px]">
                        <div className="flex flex-wrap gap-2">
                          {managedCategories.main.map((category: string) => (
                            <Badge 
                              key={category} 
                              variant="secondary" 
                              className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors group"
                            >
                              {category}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-4 w-4 p-0 ml-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-full group-hover:opacity-100 opacity-60"
                                onClick={() => removeMainCategory(category)}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </Badge>
                          ))}
                          {managedCategories.main.length === 0 && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                              아직 등록된 구분이 없습니다
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 세부구분 관리 */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      세부구분 관리
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <Input
                            placeholder="새 세부구분 입력"
                            value={newCategoryInput.sub}
                            onChange={(e) => setNewCategoryInput(prev => ({ ...prev, sub: e.target.value }))}
                            onKeyPress={(e) => e.key === 'Enter' && addSubCategory()}
                            className="pl-4 pr-12 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all"
                          />
                        </div>
                        <Button 
                          onClick={addSubCategory} 
                          disabled={!newCategoryInput.sub.trim()}
                          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          추가
                        </Button>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[120px]">
                        <div className="flex flex-wrap gap-2">
                          {managedCategories.sub.map((category: string) => (
                            <Badge 
                              key={category} 
                              variant="secondary" 
                              className="px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors group"
                            >
                              {category}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-4 w-4 p-0 ml-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-full group-hover:opacity-100 opacity-60"
                                onClick={() => removeSubCategory(category)}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </Badge>
                          ))}
                          {managedCategories.sub.length === 0 && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                              아직 등록된 세부구분이 없습니다
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button 
                onClick={() => setShowCategoryManager(false)}
                className="px-8 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                완료
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}