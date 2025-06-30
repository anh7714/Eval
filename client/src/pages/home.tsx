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
  Building2,
  Shield
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
    <div className="min-h-screen bg-slate-50">
      {/* Government Standard Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-600">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-slate-900">평가관리시스템</span>
                <span className="text-xs text-slate-500">Government Evaluation System</span>
              </div>
            </div>
            
            <nav className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/evaluator/login")}
                className="text-slate-700 hover:text-blue-600 hover:bg-blue-50"
              >
                평가위원 로그인
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/admin/login")}
                className="text-slate-700 hover:text-blue-600 hover:bg-blue-50"
              >
                관리자 로그인
              </Button>
              <Button 
                onClick={() => setLocation("/results")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                결과 조회
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page Title Section */}
        <div className="mb-8">
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
              2025년 상반기 평가
            </Badge>
            <h1 className="text-3xl font-bold text-slate-900">
              {(config as any)?.systemName || "적극행정 우수공무원 선발"}
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
              체계적이고 공정한 평가 프로세스를 통해 우수한 공직자를 발굴하고 포상하는 종합 평가 시스템입니다.
            </p>
          </div>

          {(config as any)?.evaluationDeadline && (
            <div className="mt-6 max-w-md mx-auto">
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
            </div>
          )}
        </div>

        {/* Statistics Overview */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">진행 현황</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="bg-white border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">전체 평가자</span>
                  <Users className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{(stats as any)?.totalEvaluators || 0}</div>
                <div className="text-xs text-slate-500 mt-1">명</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">전체 후보자</span>
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{(stats as any)?.totalCandidates || 0}</div>
                <div className="text-xs text-slate-500 mt-1">명</div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">평가 항목</span>
                  <ClipboardList className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{(stats as any)?.totalEvaluationItems || 0}</div>
                <div className="text-xs text-slate-500 mt-1">개</div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">진행률</span>
                  <Activity className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{(stats as any)?.completionRate || 0}%</div>
                <Progress value={(stats as any)?.completionRate || 0} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Actions */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">주요 기능</h2>
          
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {/* Evaluator Section */}
            <Card className="bg-white border border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <ClipboardList className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-lg text-slate-900">평가 실시</CardTitle>
                <CardDescription className="text-slate-600">
                  구조화된 평가 기준으로 공정하고 객관적인 평가를 실시합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href="/evaluator/login" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    평가 시작하기
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Admin Section */}
            <Card className="bg-white border border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Shield className="h-8 w-8 text-emerald-600" />
                </div>
                <CardTitle className="text-lg text-slate-900">시스템 관리</CardTitle>
                <CardDescription className="text-slate-600">
                  평가자, 후보자, 평가 기준을 체계적으로 관리합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href="/admin/login" className="block">
                  <Button variant="outline" className="w-full border-slate-300 hover:bg-slate-50">
                    관리자 로그인
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card className="bg-white border border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <BarChart3 className="h-8 w-8 text-slate-600" />
                </div>
                <CardTitle className="text-lg text-slate-900">결과 분석</CardTitle>
                <CardDescription className="text-slate-600">
                  상세한 통계와 분석으로 평가 결과를 확인합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href="/results" className="block">
                  <Button variant="outline" className="w-full border-slate-300 hover:bg-slate-50">
                    결과 확인하기
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Access */}
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-900 text-white border-0">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">평가를 시작하세요</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                간편한 로그인으로 평가 업무를 시작하거나, 실시간으로 진행 상황을 확인할 수 있습니다.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/evaluator/login">
                  <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                    <ClipboardList className="mr-2 h-5 w-5" />
                    평가위원으로 시작
                  </Button>
                </Link>
                <Link href="/admin/login">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-slate-900">
                    <Shield className="mr-2 h-5 w-5" />
                    관리자로 시작
                  </Button>
                </Link>
              </div>
              
              <div className="flex justify-center space-x-6 mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-center text-sm text-slate-400">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  안전한 인증
                </div>
                <div className="flex items-center text-sm text-slate-400">
                  <Clock className="mr-2 h-4 w-4" />
                  실시간 동기화
                </div>
                <div className="flex items-center text-sm text-slate-400">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  상세 분석
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}