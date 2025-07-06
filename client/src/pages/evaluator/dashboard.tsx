import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, User, FileText, ClipboardList, ArrowRight, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function EvaluatorDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/evaluator/progress"],
  });

  const { data: evaluator } = useQuery({
    queryKey: ["/api/evaluator/profile"],
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["/api/evaluator/candidates"],
  });

  const handleLogout = () => {
    localStorage.removeItem("evaluator");
    toast({
      title: "로그아웃 완료",
      description: "평가자 로그인 화면으로 이동합니다.",
    });
    setLocation("/evaluator/login");
  };

  if (progressLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="text-lg text-gray-600">평가 데이터를 불러오는 중입니다</p>
        </div>
      </div>
    );
  }

  // 실제 후보자 수 기반으로 통계 계산
  const actualTotalCount = candidates?.length || 0;
  const completedCount = progress?.completed || 0;
  const totalCount = progress?.total || actualTotalCount;
  const remainingCount = actualTotalCount - completedCount;
  
  const progressPercentage = actualTotalCount > 0 
    ? Math.round((completedCount / actualTotalCount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 환영 메시지 */}
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            평가위원 대시보드
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            {evaluator?.name ? `${evaluator.name} 위원님! 환영합니다.` : '평가위원님! 환영합니다.'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            현재 진행률을 확인하고 평가를 진행하세요.
          </p>
        </div>

        {/* 진행률 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">전체 진행률</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {progressPercentage}%
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">총 평가대상</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-700">
                {actualTotalCount}
              </div>
              <p className="text-sm text-gray-500">건</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">남은 평가</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {remainingCount}
              </div>
              <p className="text-sm text-gray-500">건</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">완료된 평가</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {completedCount}
              </div>
              <p className="text-sm text-gray-500">건</p>
            </CardContent>
          </Card>
        </div>

        {/* 평가 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>평가 관리</span>
              <Link href="/evaluator/evaluation">
                <Button>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  평가하기
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              평가 진행 상황을 확인하고 평가를 수행하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">평가 진행</h3>
                    <p className="text-sm text-gray-600">
                      {totalCount > 0 ? `총 ${totalCount}건 중 ${completedCount}건 완료` : '평가 대상이 없습니다'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {progressPercentage === 100 ? (
                    <Badge className="bg-green-100 text-green-800">완료</Badge>
                  ) : progressPercentage > 0 ? (
                    <Badge className="bg-yellow-100 text-yellow-800">진행중</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">시작전</Badge>
                  )}
                  <Link href="/evaluator/evaluation">
                    <Button variant="outline" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {remainingCount > 0 && (
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-orange-900">평가 대기 중</h3>
                      <p className="text-sm text-orange-700">
                        {remainingCount}건의 평가가 대기 중입니다
                      </p>
                    </div>
                  </div>
                  <Link href="/evaluator/evaluation">
                    <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-50">
                      평가 시작
                    </Button>
                  </Link>
                </div>
              )}

              {completedCount > 0 && (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-green-900">완료된 평가</h3>
                      <p className="text-sm text-green-700">
                        {completedCount}건의 평가를 완료했습니다
                      </p>
                    </div>
                  </div>
                  <Link href="/evaluator/evaluation">
                    <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
                      결과 확인
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 평가위원 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>평가위원 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">성명:</span>
                  <span className="text-sm">{evaluator?.name || '정보 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">소속:</span>
                  <span className="text-sm">{evaluator?.department || '정보 없음'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">상태:</span>
                  <Badge variant="outline" className="text-xs">활성</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>시스템 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">평가 시스템:</span>
                  <span className="text-sm">종합평가시스템</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">평가 유형:</span>
                  <span className="text-sm">종합 평가</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">상태:</span>
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800">운영 중</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 로그아웃 */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">시스템 종료</CardTitle>
            <CardDescription className="text-red-600">
              평가가 완료되었거나 시스템을 종료하려면 로그아웃하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}