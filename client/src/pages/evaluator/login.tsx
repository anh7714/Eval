import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, Eye, EyeOff } from "lucide-react";

export default function EvaluatorLogin() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="page" style={{ backgroundColor: 'var(--tblr-body-bg)', minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8rem', padding: '8rem 1rem 3rem' }}>
      <div className="tblr-login-card">
        <div className="tblr-login-header">
          <div className="tblr-d-flex justify-center tblr-mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(32, 201, 151, 0.1)', border: '2px solid rgba(32, 201, 151, 0.2)' }}>
              <Users className="h-8 w-8" style={{ color: 'var(--tblr-success)' }} />
            </div>
          </div>
          <h1 className="tblr-login-title">평가자 로그인</h1>
          <p className="tblr-login-subtitle">평가자 계정으로 로그인하세요</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="tblr-form-label required">성명</Label>
            <div className="tblr-form-floating-icon icon-user">
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="성명을 입력하세요"
                className="tblr-form-control"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="tblr-form-label required">비밀번호</Label>
            <div className="tblr-form-floating-icon icon-lock">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="tblr-form-control"
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
          </div>

          <Button
            type="submit"
            className="tblr-btn tblr-btn-primary tblr-w-100"
            style={{ height: '48px' }}
            disabled={isLoading}
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </div>
    </div>
  );
}