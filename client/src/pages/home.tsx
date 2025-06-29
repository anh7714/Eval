import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Target, BarChart3 } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  const { data: config } = useQuery({
    queryKey: ["/api/system/config"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/system/stats"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        {/* 헤더 섹션 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {config?.systemName || "종합평가시스템"}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {config?.description || "전문적이고 체계적인 평가 관리 시스템입니다."}
          </p>
          {config?.evaluationDeadline && (
            <div className="mt-6">
              <Badge variant="outline" className="text-sm">
                평가 마감일: {new Date(config.evaluationDeadline).toLocaleDateString()}
              </Badge>
            </div>
          )}
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 평가자</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvaluators || 0}</div>
                <p className="text-xs text-muted-foreground">
                  활성: {stats.activeEvaluators || 0}명
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 후보자</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCandidates || 0}</div>
                <p className="text-xs text-muted-foreground">평가 대상자</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">평가 항목</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvaluationItems || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalCategories || 0}개 카테고리
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">완료율</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate || 0}%</div>
                <p className="text-xs text-muted-foreground">전체 평가 진행률</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 접근 포털 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <span>관리자 포털</span>
              </CardTitle>
              <CardDescription>
                시스템 관리, 평가자/후보자 관리, 결과 분석
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/login">
                <Button className="w-full">
                  관리자 로그인
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <span>평가자 포털</span>
              </CardTitle>
              <CardDescription>
                후보자 평가, 진행 상황 확인, 결과 제출
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/evaluator/login">
                <Button className="w-full" variant="outline">
                  평가자 로그인
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <span>결과 조회</span>
              </CardTitle>
              <CardDescription>
                평가 결과 및 통계 정보 확인
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/results">
                <Button className="w-full" variant="outline">
                  결과 보기
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* 추가 정보 */}
        <div className="mt-16 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-semibold text-gray-900 mb-6">
              전문적인 평가 관리 시스템
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div>
                <h3 className="text-lg font-semibold mb-2">체계적 평가</h3>
                <p className="text-gray-600 text-sm">
                  카테고리별 평가 항목 관리와 가중치 적용을 통한 정확한 평가가 가능합니다.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">실시간 모니터링</h3>
                <p className="text-gray-600 text-sm">
                  평가 진행 상황을 실시간으로 확인하고 관리할 수 있습니다.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">데이터 관리</h3>
                <p className="text-gray-600 text-sm">
                  Excel 파일을 통한 대량 데이터 업로드와 결과 내보내기가 지원됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}