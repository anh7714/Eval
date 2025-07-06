import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, User, FileText, ClipboardList, ArrowRight, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface CandidateResult {
  candidate: {
    id: number;
    name: string;
    department: string;
    position: string;
    category: string;
  };
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  evaluatorCount: number;
  completedEvaluations: number;
  averageScore: number;
  rank: number;
}

export default function EvaluatorDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/evaluator/progress"],
  });

  const { data: evaluator } = useQuery({
    queryKey: ["/api/evaluator/profile"],
  });

  // 평가위원 프로필 데이터 로깅
  React.useEffect(() => {
    if (evaluator) {
      console.log('👤 평가위원 프로필 데이터:', evaluator);
    }
  }, [evaluator]);

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/results"],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/admin/categories"],
  });

  const handleLogout = () => {
    localStorage.removeItem("evaluator");
    toast({
      title: "로그아웃 완료",
      description: "평가자 로그인 화면으로 이동합니다.",
    });
    setLocation("/evaluator/login");
  };

  if (progressLoading || resultsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="text-lg text-gray-600">평가 데이터를 불러오는 중입니다</p>
        </div>
      </div>
    );
  }

  const filteredResults = selectedCategory === "all" 
    ? results 
    : results.filter((result: CandidateResult) => result.candidate.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">평가위원 대시보드</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
              {(evaluator as any)?.name || "평가자"} 위원님! 환영합니다.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              평가 현황을 확인하고 평가를 진행하세요.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="evaluation" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="evaluation">평가하기</TabsTrigger>
            <TabsTrigger value="details">상세결과</TabsTrigger>
          </TabsList>

          <TabsContent value="evaluation">
            {/* Progress Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">접수 분류</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <p className="text-xs text-muted-foreground">
                    평가자가 참여할 수 있는 현황
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">카테고리별 평가</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">90% 이상 (우수)</span>
                      <span className="text-sm font-medium text-green-600">0명</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">80-89% (양호)</span>
                      <span className="text-sm font-medium text-blue-600">0명</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">70-79% (보통)</span>
                      <span className="text-sm font-medium text-yellow-600">0명</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">70% 미만 (개선요)</span>
                      <span className="text-sm font-medium text-gray-600">0명</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">카테고리별 평가</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">카테고리를 등록 후 보실</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">통계 (기본)</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">전체 평가대상</span>
                      <span className="text-sm font-medium">0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">평가 완료</span>
                      <span className="text-sm font-medium">0.0%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">합격률</span>
                      <span className="text-sm font-medium">0%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">최고 점수</span>
                      <span className="text-sm font-medium">0%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Candidates List for Evaluation */}
            <Card>
              <CardHeader>
                <CardTitle>평가대상</CardTitle>
                <CardDescription>각 평가대상을 클릭하여 평가를 시작하거나 결과를 확인하세요</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(progress as any)?.candidates?.map((candidate: any) => (
                    <Card key={candidate.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{candidate.name}</h3>
                              <p className="text-sm text-gray-600">
                                {candidate.department} · {candidate.position}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={candidate.isCompleted ? "default" : "secondary"}>
                              {candidate.isCompleted ? "완료" : "미완료"}
                            </Badge>
                            <Link href={`/evaluator/evaluate/${candidate.id}`}>
                              <Button size="sm" className="flex items-center space-x-1">
                                <span>{candidate.isCompleted ? "수정" : "평가"}</span>
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {!((progress as any)?.candidates?.length) && (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">평가할 대상이 없습니다.</p>
                    <p className="text-sm text-gray-400 mt-2">관리자가 평가대상을 등록하면 여기에 표시됩니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            {/* Category Filter */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>상세 평가 결과</span>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="text-sm border rounded px-3 py-1"
                    >
                      <option value="all">전체 카테고리</option>
                      {categories.map((category: any) => (
                        <option key={category.id} value={category.categoryName}>
                          {category.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardTitle>
                <CardDescription>
                  평가대상별 상세 점수와 순위를 확인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>순위</TableHead>
                        <TableHead>기관명(성명)</TableHead>
                        <TableHead>소속(부서)</TableHead>
                        <TableHead>직책(직급)</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead className="text-right">총점</TableHead>
                        <TableHead className="text-right">백분율</TableHead>
                        <TableHead className="text-center">평가자수</TableHead>
                        <TableHead className="text-center">완료평가</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.length > 0 ? (
                        filteredResults.map((result: CandidateResult, index: number) => (
                          <TableRow key={result.candidate.id}>
                            <TableCell className="font-medium">{result.rank || index + 1}</TableCell>
                            <TableCell>{result.candidate.name}</TableCell>
                            <TableCell>{result.candidate.department}</TableCell>
                            <TableCell>{result.candidate.position}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{result.candidate.category}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {result.totalScore.toFixed(1)} / {result.maxPossibleScore.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                variant={
                                  result.percentage >= 90 ? "default" : 
                                  result.percentage >= 80 ? "secondary" : 
                                  result.percentage >= 70 ? "outline" : "destructive"
                                }
                              >
                                {result.percentage.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{result.evaluatorCount}</TableCell>
                            <TableCell className="text-center">{result.completedEvaluations}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            평가 결과가 없습니다.
                            <p className="text-sm mt-1">평가를 완료하면 여기에 결과가 표시됩니다.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}