import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, FileText, BarChart3, ClipboardList, Award, Calendar } from "lucide-react";
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
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Award className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-slate-800">평가시스템</span>
            </div>
            <div className="flex space-x-6">
              <button
                onClick={() => setLocation("/evaluator/login")}
                className="nav-tab"
              >
                평가위원
              </button>
              <button
                onClick={() => setLocation("/admin/login")}
                className="nav-tab"
              >
                관리자
              </button>
              <button
                onClick={() => setLocation("/results")}
                className="nav-tab"
              >
                결과 조회
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {/* 헤더 섹션 */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="heading-primary mb-4 animate-float">
            {config?.systemName || "2025년 상반기 적극행정 우수공무원 선발"}
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            공정하고 투명한 평가 프로세스를 통한 우수 인재 발굴
          </p>
          
          {/* 시스템 정보 */}
          {config && config.evaluationDeadline && (
            <div className="max-w-md mx-auto mt-8 animate-slide-up">
              <div className="modern-card-primary p-4">
                <div className="flex items-center justify-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <p className="text-blue-800 font-medium">
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
            <div className="stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted mb-1">전체 평가자</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.totalEvaluators || 0}</p>
                </div>
                <div className="icon-bg-blue">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted mb-1">전체 후보자</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.totalCandidates || 0}</p>
                </div>
                <div className="icon-bg-emerald">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>
            
            <div className="stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted mb-1">평가 항목</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.totalEvaluationItems || 0}</p>
                </div>
                <div className="icon-bg-purple">
                  <ClipboardList className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted mb-1">완료율</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.completionRate || 0}%</p>
                </div>
                <div className="icon-bg-orange">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 주요 기능 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up">
          {/* 평가위원 */}
          <div className="modern-card p-8 text-center group">
            <div className="icon-bg-blue w-16 h-16 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <ClipboardList className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="heading-secondary mb-4">평가위원</h3>
            <p className="text-muted text-base mb-8 leading-relaxed">
              할당된 후보자들을 공정하고 체계적으로 평가합니다.
            </p>
            <Link href="/evaluator/login">
              <Button className="btn-primary w-full">
                이용하기 →
              </Button>
            </Link>
          </div>

          {/* 관리자 */}
          <div className="modern-card p-8 text-center group">
            <div className="icon-bg-emerald w-16 h-16 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="heading-secondary mb-4">관리자</h3>
            <p className="text-muted text-base mb-8 leading-relaxed">
              시스템 전체를 관리하고 평가 환경을 설정합니다.
            </p>
            <Link href="/admin/login">
              <Button className="btn-secondary w-full">
                이용하기 →
              </Button>
            </Link>
          </div>

          {/* 결과 조회 */}
          <div className="modern-card p-8 text-center group">
            <div className="icon-bg-purple w-16 h-16 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="heading-secondary mb-4">결과 조회</h3>
            <p className="text-muted text-base mb-8 leading-relaxed">
              전체 평가 결과와 상세 통계를 확인할 수 있습니다.
            </p>
            <Link href="/results">
              <Button className="btn-outline w-full">
                이용하기 →
              </Button>
            </Link>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="text-center mt-20 animate-fade-in">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">체계적 평가</h4>
                <p className="text-muted text-sm leading-relaxed">
                  다양한 평가 기준과 가중치를 통한 정확한 평가
                </p>
              </div>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">실시간 모니터링</h4>
                <p className="text-muted text-sm leading-relaxed">
                  평가 진행 상황을 실시간으로 확인하고 관리
                </p>
              </div>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">데이터 관리</h4>
                <p className="text-muted text-sm leading-relaxed">
                  Excel 파일을 통한 효율적인 데이터 입출력
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}