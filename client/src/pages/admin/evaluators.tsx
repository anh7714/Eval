import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AdminNav from "@/components/layout/admin-nav";
import ExcelUpload from "@/components/ui/excel-upload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Upload, Users } from "lucide-react";

interface Evaluator {
  id: number;
  name: string;
  email?: string;
  department: string;
  password: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminEvaluators() {
  const { toast } = useToast();
  const [selectedEvaluator, setSelectedEvaluator] = useState<Evaluator | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
    isActive: true,
  });

  const { data: evaluators, isLoading } = useQuery({
    queryKey: ["/api/evaluators"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/evaluators", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluators"] });
      toast({ title: "성공", description: "평가위원이 추가되었습니다." });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/evaluators/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluators"] });
      toast({ title: "성공", description: "평가위원 정보가 수정되었습니다." });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/evaluators/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluators"] });
      toast({ title: "성공", description: "평가위원이 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (evaluators: any[]) => {
      const response = await apiRequest("POST", "/api/evaluators/bulk", { evaluators });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluators"] });
      toast({ 
        title: "성공", 
        description: `${data.length}명의 평가위원이 일괄 등록되었습니다.` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      department: "",
      password: "",
      isActive: true,
    });
    setSelectedEvaluator(null);
  };

  const handleEdit = (evaluator: Evaluator) => {
    setSelectedEvaluator(evaluator);
    setFormData({
      name: evaluator.name,
      email: evaluator.email || "",
      department: evaluator.department,
      password: evaluator.password,
      isActive: evaluator.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.department || !formData.password) {
      toast({
        title: "입력 오류",
        description: "필수 항목을 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (selectedEvaluator) {
      updateMutation.mutate({ id: selectedEvaluator.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleExcelUpload = (data: any[]) => {
    const evaluators = data.map((row: any) => ({
      name: row['이름'] || row['name'],
      email: row['이메일'] || row['email'],
      department: row['부서'] || row['department'],
      password: row['비밀번호'] || row['password'],
      isActive: true,
    })).filter(evaluator => evaluator.name && evaluator.department && evaluator.password);

    if (evaluators.length === 0) {
      toast({
        title: "업로드 오류",
        description: "올바른 형식의 데이터가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    bulkCreateMutation.mutate(evaluators);
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">평가위원 관리</h1>
            <p className="text-slate-600">평가위원을 등록하고 관리합니다.</p>
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
                  평가위원 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {selectedEvaluator ? "평가위원 수정" : "평가위원 추가"}
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
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    <Label htmlFor="password">비밀번호 *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                      {selectedEvaluator ? "수정" : "추가"}
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
              <Users className="w-5 h-5" />
              평가위원 목록 ({evaluators?.length || 0}명)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>이메일</th>
                    <th>부서</th>
                    <th className="text-center">상태</th>
                    <th className="text-center">등록일</th>
                    <th className="text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluators?.map((evaluator: Evaluator) => (
                    <tr key={evaluator.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {evaluator.name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900">{evaluator.name}</span>
                        </div>
                      </td>
                      <td className="text-slate-600">{evaluator.email || "-"}</td>
                      <td className="text-slate-600">{evaluator.department}</td>
                      <td className="text-center">
                        {evaluator.isActive ? (
                          <span className="gov-badge-completed">활성</span>
                        ) : (
                          <span className="gov-badge-pending">비활성</span>
                        )}
                      </td>
                      <td className="text-center text-slate-600">
                        {new Date(evaluator.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(evaluator)}
                            className="p-2"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(evaluator.id)}
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
            {(!evaluators || evaluators.length === 0) && (
              <div className="p-8 text-center text-slate-500">
                등록된 평가위원이 없습니다. 평가위원을 추가해주세요.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
