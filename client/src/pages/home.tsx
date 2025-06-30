import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  FileText, 
  BarChart3, 
  ClipboardList, 
  Award, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Activity,
  Target,
  Zap
} from "lucide-react";
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
    <div className="min-h-screen gradient-bg">
      {/* Modern Navigation */}
      <header className="sticky top-0 z-50 w-full glass-nav">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900">평가시스템</span>
              <span className="text-xs text-slate-500">Government Evaluation</span>
            </div>
          </div>
          
          <nav className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/evaluator/login")}
              className="text-slate-600 hover:text-slate-900"
            >
              평가위원
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/admin/login")}
              className="text-slate-600 hover:text-slate-900"
            >
              관리자
            </Button>
            <Button 
              onClick={() => setLocation("/results")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              결과 조회
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section with Statistics */}
        <div className="mb-12">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Column - Hero Content */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-4">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                  2025년 상반기 평가
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
                  {(config as any)?.systemName || "적극행정 우수공무원 선발"}
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed">
                  체계적이고 공정한 평가 프로세스를 통해 우수한 공직자를 발굴하고 포상하는 종합 평가 시스템입니다.
                </p>
              </div>

              {(config as any)?.evaluationDeadline && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="flex items-center p-4">
                    <Calendar className="mr-3 h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-900">평가 마감일</p>
                      <p className="text-sm text-orange-700">
                        {new Date((config as any).evaluationDeadline).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/evaluator/login" className="flex-1">
                  <Button size="lg" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                    <ClipboardList className="mr-2 h-5 w-5" />
                    평가 시작하기
                  </Button>
                </Link>
                <Link href="/admin/login" className="flex-1">
                  <Button size="lg" variant="outline" className="w-full border-slate-300 hover:bg-slate-50">
                    <Users className="mr-2 h-5 w-5" />
                    관리자 로그인
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column - Statistics Dashboard */}
            <div className="lg:col-span-7">
              <div className="stats-dashboard h-full">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center">
                    <Activity className="mr-2 h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-slate-900">실시간 현황</h3>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    평가 진행 상황을 실시간으로 모니터링합니다
                  </p>
                </div>
                <div className="p-6">
                  {stats && (
                    <div className="space-y-6">
                      {/* Main Stats Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="metric-label">전체 평가자</span>
                            <Users className="h-4 w-4 text-slate-400" />
                          </div>
                          <div className="metric-large">{(stats as any).totalEvaluators || 0}</div>
                          <div className="metric-change-positive">+12.5% 전월 대비</div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="metric-label">전체 후보자</span>
                            <FileText className="h-4 w-4 text-slate-400" />
                          </div>
                          <div className="metric-large">{(stats as any).totalCandidates || 0}</div>
                          <div className="text-xs text-slate-500">등록 완료</div>
                        </div>
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="metric-label">평가 진행률</span>
                          <span className="text-sm font-bold text-blue-600">{(stats as any).completionRate || 0}%</span>
                        </div>
                        <Progress value={(stats as any).completionRate || 0} className="h-2" />
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>진행중</span>
                          <span>완료 목표</span>
                        </div>
                      </div>

                      {/* Additional Metrics */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-indigo-600">{(stats as any).totalEvaluationItems || 0}</div>
                          <div className="text-xs text-slate-600">평가 항목</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-emerald-600">{(stats as any).totalCategories || 0}</div>
                          <div className="text-xs text-slate-600">평가 카테고리</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Showcase */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">주요 기능</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              효율적이고 투명한 평가를 위한 핵심 기능들을 제공합니다
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Feature 1 - Evaluator */}
            <Card className="feature-card-blue hover:shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white group-hover:scale-110 transition-transform">
                    <Target className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">평가위원</Badge>
                </div>
                <CardTitle className="text-xl">정확한 평가</CardTitle>
                <CardDescription className="text-slate-600">
                  구조화된 평가 기준으로 공정하고 객관적인 평가를 진행합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/evaluator/login">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 group-hover:shadow-lg transition-all">
                    평가 시작
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Feature 2 - Admin */}
            <Card className="feature-card-emerald hover:shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white group-hover:scale-110 transition-transform">
                    <Zap className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">관리자</Badge>
                </div>
                <CardTitle className="text-xl">통합 관리</CardTitle>
                <CardDescription className="text-slate-600">
                  평가자, 후보자, 평가 기준을 한곳에서 효율적으로 관리합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/login">
                  <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 group-hover:shadow-lg transition-all">
                    관리 시작
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Feature 3 - Results */}
            <Card className="feature-card-purple hover:shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">분석</Badge>
                </div>
                <CardTitle className="text-xl">상세 분석</CardTitle>
                <CardDescription className="text-slate-600">
                  다양한 시각화와 통계로 평가 결과를 종합 분석합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/results">
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 group-hover:shadow-lg transition-all">
                    결과 확인
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Access Panel */}
        <Card className="cta-section">
          <CardContent className="p-8">
            <div className="grid gap-8 md:grid-cols-2 items-center">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">평가를 시작하세요</h3>
                <p className="text-slate-300 leading-relaxed">
                  간편한 로그인으로 평가 업무를 시작하거나, 
                  실시간으로 진행 상황을 확인할 수 있습니다.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    안전한 인증
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                    <Clock className="mr-1 h-3 w-3" />
                    실시간 동기화
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                    <BarChart3 className="mr-1 h-3 w-3" />
                    상세 분석
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <Link href="/evaluator/login">
                  <Button size="lg" className="w-full bg-white text-slate-900 hover:bg-slate-100">
                    <ClipboardList className="mr-2 h-5 w-5" />
                    평가위원으로 시작
                  </Button>
                </Link>
                <Link href="/admin/login">
                  <Button size="lg" variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                    <Users className="mr-2 h-5 w-5" />
                    관리자로 시작
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}