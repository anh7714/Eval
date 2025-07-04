import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Settings, LogOut, Home } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  
  const { data: config } = useQuery({
    queryKey: ["/api/system/config"],
  });

  const isAdmin = location.startsWith("/admin");
  const isEvaluator = location.startsWith("/evaluator");
  const isResults = location === "/results";
  const isHome = location === "/";

  const handleLogout = async () => {
    if (isAdmin) {
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } else if (isEvaluator) {
      await fetch("/api/evaluator/logout", { method: "POST" });
      window.location.href = "/evaluator/login";
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" className="text-xl font-bold text-blue-900 hover:text-blue-700">
                {config?.evaluationTitle || "종합평가시스템"}
              </Button>
            </Link>
            
            {isAdmin && (
              <nav className="hidden md:flex space-x-1">
                <Link href="/admin/dashboard">
                  <Button variant={location === "/admin/dashboard" ? "default" : "ghost"} size="sm">
                    대시보드
                  </Button>
                </Link>
                <Link href="/admin/evaluators">
                  <Button variant={location === "/admin/evaluators" ? "default" : "ghost"} size="sm">
                    평가자 관리
                  </Button>
                </Link>
                <Link href="/admin/candidates">
                  <Button variant={location === "/admin/candidates" ? "default" : "ghost"} size="sm">
                    후보자 관리
                  </Button>
                </Link>
                <Link href="/admin/evaluation-items">
                  <Button variant={location === "/admin/evaluation-items" ? "default" : "ghost"} size="sm">
                    평가항목 관리
                  </Button>
                </Link>
                <Link href="/admin/results">
                  <Button variant={location === "/admin/results" ? "default" : "ghost"} size="sm">
                    결과 관리
                  </Button>
                </Link>
                <Link href="/admin/settings">
                  <Button variant={location === "/admin/settings" ? "default" : "ghost"} size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    설정
                  </Button>
                </Link>
              </nav>
            )}
            
            {isEvaluator && (
              <nav className="hidden md:flex space-x-1">
                <Link href="/evaluator/dashboard">
                  <Button variant={location === "/evaluator/dashboard" ? "default" : "ghost"} size="sm">
                    평가 대시보드
                  </Button>
                </Link>
              </nav>
            )}
            
            {isResults && (
              <nav className="hidden md:flex space-x-1">
                <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('tabChange', { detail: 'ranking' }))}>
                  🏆 순위
                </Button>
                <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('tabChange', { detail: 'detailed' }))}>
                  📋 상세결과
                </Button>
                <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('tabChange', { detail: 'statistics' }))}>
                  📊 통계
                </Button>
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isHome && (
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-1" />
                  홈
                </Button>
              </Link>
            )}
            
            {(isAdmin || isEvaluator) && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                로그아웃
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}