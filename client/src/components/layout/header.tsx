import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Gavel } from "lucide-react";

export default function Header() {
  const { data: config } = useQuery({
    queryKey: ["/api/system/config"],
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/">
          <a className="flex items-center gap-3" aria-label="홈으로 이동">
            <Gavel className="w-6 h-6 text-blue-800" />
            <span className="text-xl font-bold tracking-tight text-blue-800">
              {config?.evaluationTitle || "종합평가시스템"}
            </span>
          </a>
        </Link>
        <nav className="ml-auto hidden md:flex items-center space-x-6">
          <Link href="/evaluator/login">
            <a className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
              평가위원
            </a>
          </Link>
          <Link href="/admin/login">
            <a className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
              관리자
            </a>
          </Link>
          <Link href="/results">
            <a className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors">
              결과조회
            </a>
          </Link>
        </nav>
      </div>
    </header>
  );
}
