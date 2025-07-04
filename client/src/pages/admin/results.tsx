import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, BarChart3, Users, Trophy, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResultsManagement() {
  const { toast } = useToast();

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/admin/results"],
  });

  const { data: progress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["/api/admin/evaluator-progress"],
  });

  const handleExportResults = async () => {
    try {
      const response = await fetch("/api/admin/export-results", {
        method: "GET",
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `평가결과_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({ title: "성공", description: "결과가 다운로드되었습니다." });
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      toast({ title: "오류", description: "결과 내보내기에 실패했습니다.", variant: "destructive" });
    }
  };

  if (resultsLoading || progressLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">결과 관리</h1>
            <p className="text-lg text-gray-600">평가 결과를 조회하고 분석할 수 있습니다.</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleExportResults} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              결과 내보내기
            </Button>
          </div>
        </div>

        <Tabs defaultValue="results" className="space-y-6">
          <TabsList>
            <TabsTrigger value="results">최종 결과</TabsTrigger>
            <TabsTrigger value="progress">진행 현황</TabsTrigger>
            <TabsTrigger value="templates">평가표 템플릿</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span>후보자별 최종 결과</span>
                </CardTitle>
                <CardDescription>
                  모든 평가가 완료된 후보자들의 최종 점수입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.map((result: any, index: number) => (
                    <div
                      key={result.candidate.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{result.candidate.name}</h3>
                          <p className="text-sm text-gray-600">
                            {result.candidate.department} · {result.candidate.position}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {result.totalScore.toFixed(1)}점
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.percentage.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>평가자 {result.evaluatorCount}명</div>
                          <div>완료 {result.completedEvaluations}건</div>
                        </div>
                        <Badge variant={result.completedEvaluations === result.evaluatorCount ? "default" : "secondary"}>
                          {result.completedEvaluations === result.evaluatorCount ? "완료" : "진행중"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {results.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      아직 완료된 평가 결과가 없습니다.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>평가자별 진행 현황</span>
                  </CardTitle>
                  <CardDescription>
                    각 평가자의 평가 완료 현황입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {progress.map((evaluator: any) => (
                      <div key={evaluator.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{evaluator.name}</h4>
                            <p className="text-sm text-gray-600">{evaluator.department}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {evaluator.completed}/{evaluator.total}
                            </div>
                            <div className="text-xs text-gray-500">
                              {evaluator.progress.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <Progress value={evaluator.progress} className="h-2" />
                      </div>
                    ))}
                    {progress.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        등록된 평가자가 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>전체 진행률</span>
                  </CardTitle>
                  <CardDescription>
                    시스템 전체의 평가 진행 현황을 확인할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {progress.length > 0 ? 
                          (progress.reduce((sum: number, p: any) => sum + p.progress, 0) / progress.length).toFixed(1)
                          : 0
                        }%
                      </div>
                      <p className="text-gray-600">전체 평균 완료율</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-semibold text-green-600">
                          {progress.filter((p: any) => p.progress === 100).length}
                        </div>
                        <p className="text-sm text-gray-600">완료된 평가자</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-semibold text-orange-600">
                          {progress.filter((p: any) => p.progress > 0 && p.progress < 100).length}
                        </div>
                        <p className="text-sm text-gray-600">진행중인 평가자</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clipboard className="h-5 w-5" />
                  <span>평가표 템플릿 관리</span>
                </CardTitle>
                <CardDescription>
                  평가표 템플릿을 설정하고 관리할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clipboard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">평가표 템플릿</h3>
                  <p className="text-gray-600 mb-4">
                    평가 항목 관리 페이지에서 평가표 템플릿을 설정할 수 있습니다.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/admin/evaluation-items'}
                    className="inline-flex items-center"
                  >
                    <Clipboard className="h-4 w-4 mr-2" />
                    평가 항목 관리로 이동
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}