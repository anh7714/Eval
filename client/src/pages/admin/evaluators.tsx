import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EvaluatorManagement() {
  const [isAddingEvaluator, setIsAddingEvaluator] = useState(false);
  const [editingEvaluator, setEditingEvaluator] = useState<any>(null);
  const [newEvaluator, setNewEvaluator] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: evaluators = [], isLoading } = useQuery({
    queryKey: ["/api/admin/evaluators"],
  });

  const createMutation = useMutation({
    mutationFn: async (evaluator: typeof newEvaluator) => {
      const response = await fetch("/api/admin/evaluators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(evaluator),
      });
      if (!response.ok) throw new Error("Failed to create evaluator");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluators"] });
      toast({ title: "성공", description: "평가자가 추가되었습니다." });
      setIsAddingEvaluator(false);
      setNewEvaluator({ name: "", email: "", department: "", password: "" });
    },
    onError: () => {
      toast({ title: "오류", description: "평가자 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/admin/evaluators/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!response.ok) throw new Error("Failed to update evaluator");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluators"] });
      toast({ title: "성공", description: "평가자 상태가 변경되었습니다." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/admin/evaluators/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update evaluator");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluators"] });
      toast({ title: "성공", description: "평가자 정보가 수정되었습니다." });
      setEditingEvaluator(null);
    },
    onError: () => {
      toast({ title: "오류", description: "평가자 수정에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/evaluators/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete evaluator");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluators"] });
      toast({ title: "성공", description: "평가자가 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "평가자 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvaluator) {
      // 수정 시 비밀번호가 비어있으면 제외
      const updateData: any = { ...newEvaluator };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateMutation.mutate({ id: editingEvaluator.id, data: updateData });
    } else {
      createMutation.mutate(newEvaluator);
    }
  };

  const handleEdit = (evaluator: any) => {
    setEditingEvaluator(evaluator);
    setNewEvaluator({
      name: evaluator.name,
      email: evaluator.email || "",
      department: evaluator.department,
      password: "", // 비밀번호는 빈 문자열로 시작
    });
    setIsAddingEvaluator(true);
  };

  const handleDelete = (evaluator: any) => {
    if (confirm(`정말로 "${evaluator.name}" 평가자를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(evaluator.id);
    }
  };

  const handleCancel = () => {
    setIsAddingEvaluator(false);
    setEditingEvaluator(null);
    setNewEvaluator({ name: "", email: "", department: "", password: "" });
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">평가자 관리</h1>
            <p className="text-lg text-gray-600">평가자를 추가, 수정, 삭제할 수 있습니다.</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              엑셀 업로드
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              엑셀 다운로드
            </Button>
            <Button onClick={() => setIsAddingEvaluator(true)}>
              <Plus className="h-4 w-4 mr-2" />
              평가자 추가
            </Button>
          </div>
        </div>

        {isAddingEvaluator && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingEvaluator ? "평가자 수정" : "새 평가자 추가"}</CardTitle>
              <CardDescription>평가자 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">이름</label>
                    <Input
                      value={newEvaluator.name}
                      onChange={(e) => setNewEvaluator({ ...newEvaluator, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">이메일</label>
                    <Input
                      type="email"
                      value={newEvaluator.email}
                      onChange={(e) => setNewEvaluator({ ...newEvaluator, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">부서</label>
                    <Input
                      value={newEvaluator.department}
                      onChange={(e) => setNewEvaluator({ ...newEvaluator, department: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">비밀번호</label>
                    <Input
                      type="password"
                      value={newEvaluator.password}
                      onChange={(e) => setNewEvaluator({ ...newEvaluator, password: e.target.value })}
                      required={!editingEvaluator}
                      placeholder={editingEvaluator ? "변경하지 않으려면 비워두세요" : ""}
                    />
                    {editingEvaluator && (
                      <p className="text-xs text-gray-500 mt-1">
                        비워두면 기존 비밀번호가 유지됩니다.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingEvaluator ? 
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
            <CardTitle>평가자 목록</CardTitle>
            <CardDescription>총 {evaluators.length}명의 평가자가 등록되어 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {evaluators.map((evaluator: any) => (
                <div
                  key={evaluator.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="font-semibold">{evaluator.name}</h3>
                      <p className="text-sm text-gray-600">
                        {evaluator.email} · {evaluator.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={evaluator.isActive ? "default" : "secondary"}>
                      {evaluator.isActive ? "활성" : "비활성"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActiveMutation.mutate({
                        id: evaluator.id,
                        isActive: evaluator.isActive
                      })}
                    >
                      {evaluator.isActive ? "비활성화" : "활성화"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(evaluator)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(evaluator)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {evaluators.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  등록된 평가자가 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}