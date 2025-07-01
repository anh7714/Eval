import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CandidateManagement() {
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    department: "",
    position: "",
    category: "",
    description: "",
    sortOrder: 0,
  });

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
      toast({ title: "성공", description: "후보자가 추가되었습니다." });
      setIsAddingCandidate(false);
      setNewCandidate({ name: "", department: "", position: "", category: "", description: "", sortOrder: 0 });
    },
    onError: () => {
      toast({ title: "오류", description: "후보자 추가에 실패했습니다.", variant: "destructive" });
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
      toast({ title: "성공", description: "후보자 상태가 변경되었습니다." });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newCandidate);
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">후보자 관리</h1>
            <p className="text-lg text-gray-600">평가 대상 후보자를 관리할 수 있습니다.</p>
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
            <Button onClick={() => setIsAddingCandidate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              후보자 추가
            </Button>
          </div>
        </div>

        {isAddingCandidate && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>새 후보자 추가</CardTitle>
              <CardDescription>후보자 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">이름</label>
                    <Input
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">부서</label>
                    <Input
                      value={newCandidate.department}
                      onChange={(e) => setNewCandidate({ ...newCandidate, department: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">직책</label>
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
                      placeholder="후보자에 대한 간단한 설명"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "추가 중..." : "추가"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddingCandidate(false)}>
                    취소
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>후보자 목록</CardTitle>
            <CardDescription>총 {candidates.length}명의 후보자가 등록되어 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidates.map((candidate: any) => (
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
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {candidates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  등록된 후보자가 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}