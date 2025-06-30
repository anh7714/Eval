import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, User, FileText, ClipboardList, ArrowRight, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function EvaluatorDashboard() {
  const { data: progress, isLoading } = useQuery({
    queryKey: ["/api/evaluator/progress"],
  });

  const { data: evaluator } = useQuery({
    queryKey: ["/api/evaluator/profile"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="body-large text-gray-600">평가 데이터를 불러오는 중입니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
              <ClipboardList className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="display-medium text-gray-900">
                평가자 대시보드
              </h1>
              <p className="body-large text-gray-600 mt-2">
                안녕하세요, <span className="font-medium text-gray-900">{evaluator?.name || "평가자"}</span>님
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="krds-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <Badge className="krds-badge-info">
                  전체 진행률
                </Badge>
              </div>
              <div className="space-y-3">
                <h3 className="h3 text-gray-900">{progress?.progress || 0}%</h3>
                <Progress value={progress?.progress || 0} className="h-2" />
                <p className="label-medium text-gray-600">평가 완성도</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="krds-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 border border-green-100">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <Badge className="krds-badge-success">
                  완료됨
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="h3 text-gray-900">{progress?.completed || 0}</h3>
                <p className="label-medium text-gray-600">
                  / {progress?.total || 0} 총 평가
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="krds-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 border border-orange-100">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <Badge className="krds-badge-warning">
                  대기 중
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="h3 text-gray-900">
                  {(progress?.total || 0) - (progress?.completed || 0)}
                </h3>
                <p className="label-medium text-gray-600">남은 평가</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Candidates List */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h2 className="h3 text-gray-900">평가 대상 후보자</h2>
          </div>

          <Card className="krds-card">
            <CardContent className="p-8">
              <div className="mb-6">
                <p className="body-large text-gray-600">
                  각 후보자를 클릭하여 평가를 시작하거나 결과를 확인하세요
                </p>
              </div>
              
              <div className="space-y-4">
                {progress?.candidates?.map((candidate: any) => (
                  <Card
                    key={candidate.id}
                    className="krds-card krds-card-interactive group cursor-pointer"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 border border-gray-100 group-hover:bg-gray-100 transition-colors duration-200">
                            <User className="h-6 w-6 text-gray-600" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="h4 text-gray-900">{candidate.name}</h3>
                            <p className="body-medium text-gray-600">
                              {candidate.department} · {candidate.position}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <Badge 
                            className={candidate.is_submitted ? "krds-badge-success" : "krds-badge-warning"}
                          >
                            {candidate.is_submitted ? "평가 완료" : "평가 필요"}
                          </Badge>
                          <Link href={`/evaluator/evaluation/${candidate.id}`}>
                            <Button className={candidate.is_submitted ? "krds-button-secondary" : "krds-button-primary"}>
                              {candidate.is_submitted ? "결과 보기" : "평가하기"}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) || (
                  <div className="text-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mx-auto mb-4">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="h4 text-gray-900 mb-2">평가할 후보자가 없습니다</h3>
                    <p className="body-medium text-gray-500">
                      관리자가 평가 대상자를 배정할 때까지 기다려주세요
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}