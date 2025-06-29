import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, AlertCircle } from "lucide-react";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/admin/login", credentials);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "로그인 성공",
        description: "관리자 대시보드로 이동합니다.",
      });
      navigate("/admin/dashboard");
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
    if (!username || !password) {
      toast({
        title: "입력 오류",
        description: "사용자명과 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">관리자 로그인</CardTitle>
          <p className="text-slate-600">시스템 관리를 위해 로그인하세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">사용자명</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="관리자 사용자명을 입력하세요"
                className="gov-input"
                disabled={loginMutation.isPending}
              />
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
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">기본 관리자 계정</p>
                <p>사용자명: admin</p>
                <p>비밀번호: admin123</p>
                <p className="text-xs mt-2 text-blue-600">운영 환경에서는 반드시 비밀번호를 변경하세요.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
