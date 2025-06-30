import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, BarChart3, ClipboardList, Sparkles, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function HomePage() {
  const [location, setLocation] = useLocation();

  const { data: config } = useQuery({
    queryKey: ["/api/system/config"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/system/stats"],
  });

  return (
    <div className="min-h-screen">
      {/* 상단 네비게이션 */}
      <div className="glass border-b border-white/10">
        <div className="container mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setLocation("/evaluator/login")}
              className="px-8 py-6 text-sm font-medium text-white/80 hover:text-emerald-400 hover:border-b-2 hover:border-emerald-400 transition-all duration-300"
            >
              평가위원
            </button>
            <button
              onClick={() => setLocation("/admin/login")}
              className="px-8 py-6 text-sm font-medium text-white/80 hover:text-blue-400 hover:border-b-2 hover:border-blue-400 transition-all duration-300"
            >
              관리자
            </button>
            <button
              onClick={() => setLocation("/results")}
              className="px-8 py-6 text-sm font-medium text-white/80 hover:text-purple-400 hover:border-b-2 hover:border-purple-400 transition-all duration-300"
            >
              결과 조회
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {/* 헤더 섹션 */}
        <div className="text-center mb-20 animate-fade-in">
          <div className="relative">
            <Sparkles className="absolute -top-6 -left-6 h-8 w-8 text-emerald-400 animate-pulse-slow" />
            <h1 className="text-6xl font-light gradient-text-primary mb-6 animate-float">
              {config?.systemName || "종합평가시스템"}
            </h1>
            <Sparkles className="absolute -bottom-6 -right-6 h-8 w-8 text-blue-400 animate-pulse-slow" />
          </div>
          <p className="text-xl text-white/70 font-light max-w-3xl mx-auto leading-relaxed">
            차세대 평가 관리 플랫폼으로 정확하고 투명한 평가 프로세스를 경험하세요
          </p>
          
          {/* 시스템 정보 */}
          {config && config.evaluationDeadline && (
            <div className="max-w-md mx-auto mt-8 animate-slide-up">
              <div className="glass p-6 glow-primary">
                <div className="flex items-center justify-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <p className="text-emerald-400 font-medium text-lg">
                    평가 마감일: {new Date(config.evaluationDeadline).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16 animate-slide-up">
            <div className="glass-stats p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60 mb-1">전체 평가자</p>
                  <p className="text-3xl font-light text-white">{stats.totalEvaluators || 0}</p>
                </div>
                <div className="icon-bg-blue rounded-full p-3">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>
            
            <div className="glass-stats p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60 mb-1">전체 후보자</p>
                  <p className="text-3xl font-light text-white">{stats.totalCandidates || 0}</p>
                </div>
                <div className="icon-bg-primary rounded-full p-3">
                  <FileText className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </div>
            
            <div className="glass-stats p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60 mb-1">평가 항목</p>
                  <p className="text-3xl font-light text-white">{stats.totalEvaluationItems || 0}</p>
                </div>
                <div className="icon-bg-purple rounded-full p-3">
                  <ClipboardList className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </div>
            
            <div className="glass-stats p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60 mb-1">완료율</p>
                  <p className="text-3xl font-light text-white">{stats.completionRate || 0}%</p>
                </div>
                <div className="icon-bg-orange rounded-full p-3">
                  <BarChart3 className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 주요 기능 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up">
          {/* 평가위원 */}
          <div className="glass-card p-8 group">
            <div className="text-center">
              <div className="w-20 h-20 icon-bg-primary rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <ClipboardList className="h-10 w-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-medium text-white mb-4">평가위원</h3>
              <p className="text-white/70 text-base mb-8 leading-relaxed">
                할당된 후보자에 대한 체계적이고 공정한 평가를 진행하세요.
              </p>
              <Link href="/evaluator/login">
                <Button className="glass-button w-full py-4 text-white font-medium border-0 rounded-xl">
                  평가 시작하기
                </Button>
              </Link>
            </div>
          </div>

          {/* 관리자 */}
          <div className="glass-card p-8 group">
            <div className="text-center">
              <div className="w-20 h-20 icon-bg-blue rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="text-2xl font-medium text-white mb-4">관리자</h3>
              <p className="text-white/70 text-base mb-8 leading-relaxed">
                시스템 전체를 관리하고 평가 프로세스를 설정하세요.
              </p>
              <Link href="/admin/login">
                <Button className="glass-button-secondary w-full py-4 text-white font-medium border-0 rounded-xl">
                  관리자 로그인
                </Button>
              </Link>
            </div>
          </div>

          {/* 결과 조회 */}
          <div className="glass-card p-8 group">
            <div className="text-center">
              <div className="w-20 h-20 icon-bg-purple rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-10 w-10 text-purple-400" />
              </div>
              <h3 className="text-2xl font-medium text-white mb-4">결과 조회</h3>
              <p className="text-white/70 text-base mb-8 leading-relaxed">
                전체 평가 결과와 상세 통계를 확인하고 분석하세요.
              </p>
              <Link href="/results">
                <Button className="glass-button-secondary w-full py-4 text-white font-medium border-0 rounded-xl">
                  결과 확인하기
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 하단 장식 요소 */}
        <div className="text-center mt-20 animate-fade-in">
          <div className="flex items-center justify-center space-x-4 text-white/40">
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
            <Sparkles className="h-4 w-4 animate-pulse-slow" />
            <span className="text-sm font-light">Premium Evaluation System</span>
            <Sparkles className="h-4 w-4 animate-pulse-slow" />
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
          </div>
        </div>
      </div>
    </div>
  );
}