import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, User, Lock } from "lucide-react";

export default function EvaluatorLogin() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/evaluator/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      if (response.ok) {
        toast({
          title: "로그인 성공",
          description: "평가자 대시보드로 이동합니다.",
        });
        setLocation("/evaluator/dashboard");
      } else {
        toast({
          title: "로그인 실패",
          description: "이름이나 비밀번호를 확인해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "서버 연결에 문제가 있습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 pt-16 pb-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
              <ClipboardList className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="display-small text-gray-900">
              평가자 로그인
            </h1>
            <p className="body-large text-gray-600">
              평가자 계정으로 로그인하여 평가를 시작하세요
            </p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="krds-card">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="label-large text-gray-700">
                    평가자 이름
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="krds-input pl-10"
                      placeholder="평가자 이름을 입력하세요"
                      aria-describedby="name-description"
                    />
                  </div>
                  <p id="name-description" className="body-small text-gray-500">
                    등록된 평가자 이름을 정확히 입력해주세요
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="label-large text-gray-700">
                    비밀번호
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="krds-input pl-10"
                      placeholder="비밀번호를 입력하세요"
                      aria-describedby="password-description"
                    />
                  </div>
                  <p id="password-description" className="body-small text-gray-500">
                    관리자가 제공한 비밀번호를 입력하세요
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="krds-button-primary w-full"
                aria-describedby="login-button-description"
              >
                {isLoading ? "로그인 중..." : "평가 시작하기"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-3">
          <p className="body-small text-gray-500">
            로그인에 문제가 있으시면 관리자에게 문의하세요
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
            <span>보안 접속</span>
            <span>•</span>
            <span>세션 관리</span>
            <span>•</span>
            <span>접근성 지원</span>
          </div>
        </div>
      </div>
    </div>
  );
}