import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, AlertCircle } from "lucide-react";

interface Evaluator {
  id: number;
  name: string;
  department: string;
  email?: string;
}

export default function EvaluatorLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedEvaluator, setSelectedEvaluator] = useState("");
  const [password, setPassword] = useState("");

  const { data: evaluators, isLoading } = useQuery({
    queryKey: ["/api/evaluators/active"],
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { name: string; password: string }) => {
      const response = await apiRequest("POST", "/api/evaluator/login", credentials);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "로그인 성공",
        description: "평가위원 대시보드로 이동합니다.",
      });
      navigate("/evaluator/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvaluator || !password) {
      toast({
        title: "입력 오류",
        description: "평가위원과 비밀번호를 모두 선택/입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ name: selectedEvaluator, password });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="flex items-center">
          <div className="loading-spinner w-8 h-8"></div>
          <span className="ml-3 text-slate-600">평가위원 목록을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">평가위원 로그인</CardTitle>
          <p className="text-slate-600">평가 참여를 위해 로그인하세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="evaluator">평가위원 선택</Label>
              <Select value={selectedEvaluator} onValueChange={setSelectedEvaluator} disabled={loginMutation.isPending}>
                <SelectTrigger className="gov-input">
                  <SelectValue placeholder="평가위원을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {evaluators?.map((evaluator: Evaluator) => (
                    <SelectItem key={evaluator.id} value={evaluator.name}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{evaluator.name}</span>
                        <span className="text-sm text-slate-500">({evaluator.department})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="gov-input"
                disabled={loginMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-full gov-btn-primary"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <div className="flex items-center">
                  <div className="loading-spinner w-4 h-4 mr-2"></div>
                  로그인 중...
                </div>
              ) : (
                "로그인"
              )}
            </Button>
          </form>
          
          {(!evaluators || evaluators.length === 0) && (
            <div className="mt-6 p-4 bg-amber-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">평가위원이 등록되지 않았습니다</p>
                  <p>관리자에게 문의하여 평가위원으로 등록을 요청하세요.</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">평가 안내</p>
                <p>• 모든 평가 항목을 빠짐없이 작성해주세요.</p>
                <p>• 평가 중 임시저장이 가능합니다.</p>
                <p>• 최종 제출 후에는 수정이 불가능합니다.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
