import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Users, Eye, EyeOff } from "lucide-react";

export default function EvaluatorLogin() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 등록된 평가자 목록 불러오기 (공개 엔드포인트 사용)
  const { data: evaluators, isLoading: evaluatorsLoading } = useQuery({
    queryKey: ["/api/evaluators/active"],
    refetchOnWindowFocus: false,
  });

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
        const error = await response.json();
        toast({
          title: "로그인 실패",
          description: error.message || "인증에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "로그인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pt-16 pb-8 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
          <div className="text-center mb-8">
            <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              평가자 로그인
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              평가자 계정으로 로그인하여 평가를 진행합니다
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
                평가자명
              </Label>
              <Select value={name} onValueChange={setName} disabled={isLoading || evaluatorsLoading}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="평가자를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {evaluators && Array.isArray(evaluators) && evaluators.length > 0 ? (
                    evaluators.map((evaluator: any) => (
                      <SelectItem key={evaluator.id} value={evaluator.name}>
                        {evaluator.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-evaluators">
                      등록된 평가자가 없습니다
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                비밀번호
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !name || !password}
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          <div className="text-center mt-6">
            <a href="/" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm">
              ← 홈으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}