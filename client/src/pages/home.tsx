import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, BarChart3, ClipboardList, Award, Calendar, TrendingUp, Clock, CheckCircle } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Award className="h-6 w-6 text-primary" />
              <span className="hidden font-bold sm:inline-block">평가시스템</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-6">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/evaluator/login")}
              >
                평가위원
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/admin/login")}
              >
                관리자
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation("/results")}
              >
                결과 조회
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-10">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <Badge variant="secondary" className="px-3 py-1">
            정부 평가 시스템
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {config?.systemName || "2025년 상반기 적극행정 우수공무원 선발"}
          </h1>
          <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
            공정하고 투명한 평가 프로세스를 통한 우수 인재 발굴
          </p>
          
          {config && config.evaluationDeadline && (
            <Card className="w-full max-w-md">
              <CardContent className="flex items-center justify-center p-4">
                <Calendar className="mr-2 h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  평가 마감일: {new Date(config.evaluationDeadline).toLocaleDateString('ko-KR')}
                </span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Statistics Grid */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-12">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 평가자</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvaluators || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +0% 전월 대비
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 후보자</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCandidates || 0}</div>
                <p className="text-xs text-muted-foreground">
                  등록된 후보자 수
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">평가 항목</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvaluationItems || 0}</div>
                <p className="text-xs text-muted-foreground">
                  평가 기준 항목
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">완료율</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  평가 진행률
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Features */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>평가위원</CardTitle>
                  <CardDescription>할당된 후보자 평가</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                할당된 후보자들을 공정하고 체계적으로 평가합니다.
              </p>
              <Link href="/evaluator/login">
                <Button className="w-full">
                  시작하기
                  <Clock className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>관리자</CardTitle>
                  <CardDescription>시스템 전체 관리</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                시스템 전체를 관리하고 평가 환경을 설정합니다.
              </p>
              <Link href="/admin/login">
                <Button variant="secondary" className="w-full">
                  관리하기
                  <Users className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>결과 조회</CardTitle>
                  <CardDescription>평가 결과 및 통계</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                전체 평가 결과와 상세 통계를 확인할 수 있습니다.
              </p>
              <Link href="/results">
                <Button variant="outline" className="w-full">
                  조회하기
                  <BarChart3 className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* System Features */}
        <div className="grid gap-8 md:grid-cols-3 mb-16">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">체계적 평가</h3>
            <p className="text-sm text-muted-foreground">
              다양한 평가 기준과 가중치를 통한 정확한 평가
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold">실시간 모니터링</h3>
            <p className="text-sm text-muted-foreground">
              평가 진행 상황을 실시간으로 확인하고 관리
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold">데이터 관리</h3>
            <p className="text-sm text-muted-foreground">
              Excel 파일을 통한 효율적인 데이터 입출력
            </p>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>평가 시스템을 시작해보세요</CardTitle>
              <CardDescription>
                공정하고 투명한 평가 프로세스로 우수한 인재를 발굴하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
              <Link href="/evaluator/login" className="flex-1">
                <Button className="w-full">평가위원으로 시작</Button>
              </Link>
              <Link href="/admin/login" className="flex-1">
                <Button variant="outline" className="w-full">관리자로 시작</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}