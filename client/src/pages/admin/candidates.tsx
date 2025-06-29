import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AdminNav from "@/components/layout/admin-nav";
import ExcelUpload from "@/components/ui/excel-upload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Upload, GraduationCap } from "lucide-react";

interface Candidate {
  id: number;
  name: string;
  department: string;
  position: string;
  category?: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminCandidates() {
  const { toast } = useToast();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    position: "",
    category: "",
    description: "",
    order: 0,
    isActive: true,
  });

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["/api/candidates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/candidates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({ title: "성공", description: "평가 대상자가 추가되었습니다." });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/candidates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({ title: "성공", description: "평가 대상자 정보가 수정되었습니다." });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/candidates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({ title: "성공", description: "평가 대상자가 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (candidates: any[]) => {
      const response = await apiRequest("POST", "/api/candidates/bulk", { candidates });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({ 
        title: "성공", 
        description: `${data.length}명의 평가 대상자가 일괄 등록되었습니다.` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      department: "",
      position: "",
      category: "",
      description: "",
      order: 0,
      isActive: true,
    });
    setSelectedCandidate(null);
  };

  const handleEdit = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setFormData({
      name: candidate.name,
      department: candidate.department,
      position: candidate.position,
      category: candidate.category || "",
      description: candidate.description || "",
      order: candidate.order,
      isActive: candidate.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.department || !formData.position) {
      toast({
        title: "입력 오류",
        description: "필수 항목을 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (selectedCandidate) {
      updateMutation.mutate({ id: selectedCandidate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleExcelUpload = (data: any[]) => {
    const candidates = data.map((row: any, index: number) => ({
      name: row['이름'] || row['name'],
      department: row['부서'] || row['department'],
      position: row['직책'] || row['position'],
      category: row['카테고리'] || row['category'],
      description: row['설명'] || row['description'],
      order: row['순서'] || row['order'] || index + 1,
      isActive: true,
    })).filter(candidate => candidate.name && candidate.department && candidate.position);

    if (candidates.length === 0) {
      toast({
        title: "업로드 오류",
        description: "올바른 형식의 데이터가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    bulkCreateMutation.mutate(candidates);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminNav />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="loading-spinner w-8 h-8"></div>
            <span className="ml-3 text-slate-600">데이터를 불러오는 중...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">평가 대상자 관리</h1>
            <p className="text-slate-600">평가 대상자를 등록하고 관리합니다.</p>
          </div>
          <div className="flex gap-2">
            <ExcelUpload
              onUpload={handleExcelUpload}
              className="gov-btn-secondary"
              disabled={bulkCreateMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              엑셀 업로드
            </ExcelUpload>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gov-btn-primary" onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  대상자 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {selectedCandidate ? "대상자 수정" : "대상자 추가"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="gov-input"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">부서 *</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="gov-input"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">직책 *</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="gov-input"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">카테고리</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="gov-input"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">설명</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="gov-input"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">표시 순서</Label>
                    <Input
                      id="order"
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      className="gov-input"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                    <Label htmlFor="isActive">활성 상태</Label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1"
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 gov-btn-primary"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {selectedCandidate ? "수정" : "추가"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="gov-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              평가 대상자 목록 ({candidates?.length || 0}명)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>순서</th>
                    <th>이름</th>
                    <th>부서</th>
                    <th>직책</th>
                    <th>카테고리</th>
                    <th className="text-center">상태</th>
                    <th className="text-center">등록일</th>
                    <th className="text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates?.map((candidate: Candidate) => (
                    <tr key={candidate.id}>
                      <td className="text-center font-medium">{candidate.order}</td>
                      <td>
                        <div className="font-medium text-slate-900">{candidate.name}</div>
                        {candidate.description && (
                          <div className="text-xs text-slate-500 mt-1">{candidate.description}</div>
                        )}
                      </td>
                      <td className="text-slate-600">{candidate.department}</td>
                      <td className="text-slate-600">{candidate.position}</td>
                      <td className="text-slate-600">{candidate.category || "-"}</td>
                      <td className="text-center">
                        {candidate.isActive ? (
                          <span className="gov-badge-completed">활성</span>
                        ) : (
                          <span className="gov-badge-pending">비활성</span>
                        )}
                      </td>
                      <td className="text-center text-slate-600">
                        {new Date(candidate.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(candidate)}
                            className="p-2"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(candidate.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!candidates || candidates.length === 0) && (
              <div className="p-8 text-center text-slate-500">
                등록된 평가 대상자가 없습니다. 대상자를 추가해주세요.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
