import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Target, BarChart3, ClipboardList, Calendar } from "lucide-react";
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
    <div className="min-h-screen bg-white">
      {/* 상단 네비게이션 탭 */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setLocation("/evaluator/login")}
              className="px-6 py-4 text-sm font-medium text-gray-600 hover:text-blue-600 hover:border-b-2 hover:border-blue-600 transition-all"
            >
              평가위원
            </button>
            <button
              onClick={() => setLocation("/admin/login")}
              className="px-6 py-4 text-sm font-medium text-gray-600 hover:text-blue-600 hover:border-b-2 hover:border-blue-600 transition-all"
            >
              관리자
            </button>
            <button
              onClick={() => setLocation("/results")}
              className="px-6 py-4 text-sm font-medium text-gray-600 hover:text-blue-600 hover:border-b-2 hover:border-blue-600 transition-all"
            >
              결과 조회
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 헤더 섹션 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-gray-900 mb-4">
            {config?.systemName || "종합평가시스템"}
          </h1>
          {config?.evaluationDeadline && (
            <div className="mt-4">
              <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm">
                <Calendar className="h-4 w-4 mr-2" />
                평가 마감일: {new Date(config.evaluationDeadline).toLocaleDateString('ko-KR')}
              </div>
            </div>
          )}
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">전체 평가자</p>
                    <p className="text-2xl font-light text-gray-900">{stats.totalEvaluators || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">전체 후보자</p>
                    <p className="text-2xl font-light text-gray-900">{stats.totalCandidates || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">평가 항목</p>
                    <p className="text-2xl font-light text-gray-900">{stats.totalEvaluationItems || 0}</p>
                  </div>
                  <ClipboardList className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">완료율</p>
                    <p className="text-2xl font-light text-gray-900">{stats.completionRate || 0}%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 주요 기능 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 평가위원 */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">평가위원</h3>
                <p className="text-gray-600 text-sm mb-6">
                  할당된 후보자에 대한 평가를 진행합니다.
                </p>
                <Link href="/evaluator/login">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
                    평가 시작
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 관리자 */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">관리자</h3>
                <p className="text-gray-600 text-sm mb-6">
                  시스템 관리 및 설정을 진행합니다.
                </p>
                <Link href="/admin/login">
                  <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                    관리자 로그인
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 결과 조회 */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">결과 조회</h3>
                <p className="text-gray-600 text-sm mb-6">
                  전체 평가 결과와 통계를 확인합니다.
                </p>
                <Link href="/results">
                  <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50">
                    결과 확인
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}