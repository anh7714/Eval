import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, User, FileText, ClipboardList, ArrowRight, Calendar, BarChart3, Users, Trophy, Download, TrendingUp } from "lucide-react";
import { Link } from "wouter";
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
  const { toast } = useToast();

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/evaluator/progress"],
  });

  const { data: evaluator } = useQuery({
    queryKey: ["/api/evaluator/profile"],
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/results"],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/admin/categories"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/system/stats"],
  });

  const handleExportResults = () => {
    const filteredResults = selectedCategory === "all" 
      ? results 
      : results.filter((result: CandidateResult) => result.candidate.category === selectedCategory);

    const exportData = filteredResults.map((result: CandidateResult) => ({
      순위: result.rank,
      "기관명(성명)": result.candidate.name,
      "소속(부서)": result.candidate.department,
      "직책(직급)": result.candidate.position,
      카테고리: result.candidate.category,
      총점: result.totalScore.toFixed(1),
      최대점수: result.maxPossibleScore.toFixed(1),
      백분율: `${result.percentage.toFixed(1)}%`,
      평가자수: result.evaluatorCount,
      완료평가: result.completedEvaluations,
      평균점수: result.averageScore.toFixed(1),
    }));

    const csv = [
      Object.keys(exportData[0]).join(","),
      ...exportData.map((row: any) => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `evaluation_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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

  const totalCandidates = results.length;
  const completedCandidates = results.filter((result: CandidateResult) => 
    result.completedEvaluations > 0
  ).length;

  const topPerformers = results.slice(0, 3);
  const averageScore = results.reduce((sum: number, result: CandidateResult) => 
    sum + result.percentage, 0) / results.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더와 탭 */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-8">
            <h1 className="text-4xl font-bold text-gray-900">평가관리시스템</h1>
          </div>
          
          <Button onClick={handleExportResults} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>결과 내보내기</span>
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full mb-6">
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="evaluations">평가하기</TabsTrigger>
            <TabsTrigger value="ranking">순위</TabsTrigger>
            <TabsTrigger value="detailed">상세 결과</TabsTrigger>
            <TabsTrigger value="statistics">통계</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {/* Progress Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 진행률</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(progress as any)?.progress || 0}%</div>
                  <Progress value={(progress as any)?.progress || 0} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    평가자: {(evaluator as any)?.name || "평가자"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">완료된 평가</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(progress as any)?.completed || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    전체 {(progress as any)?.total || 0}개 중
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">남은 평가</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((progress as any)?.total || 0) - ((progress as any)?.completed || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">평가 대기 중</p>
                </CardContent>
              </Card>
            </div>

            {/* Candidates List */}
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
                            <Badge variant={candidate.is_submitted ? "default" : "secondary"}>
                              {candidate.is_submitted ? "완료" : "대기"}
                            </Badge>
                            <Link href={`/evaluator/evaluation/${candidate.id}`}>
                              <Button size="sm" variant={candidate.is_submitted ? "outline" : "default"}>
                                {candidate.is_submitted ? "결과 보기" : "평가하기"}
                                <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <div className="col-span-2 text-center py-8">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">평가할 평가대상이 없습니다</p>
                      <p className="text-sm text-gray-400">관리자가 평가 대상자를 배정할 때까지 기다려주세요</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evaluations">
            <Card>
              <CardHeader>
                <CardTitle>평가 진행</CardTitle>
                <CardDescription>평가대상별 평가 현황을 확인하고 평가를 진행하세요</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(progress as any)?.candidates?.map((candidate: any) => (
                    <div key={candidate.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{candidate.name}</h3>
                          <p className="text-gray-600">{candidate.department} · {candidate.position}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge variant={candidate.is_submitted ? "default" : "outline"}>
                            {candidate.is_submitted ? "평가 완료" : "평가 필요"}
                          </Badge>
                          <Link href={`/evaluator/evaluation/${candidate.id}`}>
                            <Button variant={candidate.is_submitted ? "outline" : "default"}>
                              {candidate.is_submitted ? "수정하기" : "평가하기"}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">평가할 항목이 없습니다</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ranking">
            {/* 상위 성과자 */}
            {topPerformers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span>상위 성과자</span>
                  </CardTitle>
                  <CardDescription>최고 점수를 받은 평가대상들</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topPerformers.map((result: CandidateResult, index: number) => (
                      <Card key={result.candidate.id} className="relative">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={index === 0 ? "default" : "secondary"}>
                              {index + 1}등
                            </Badge>
                            <div className="text-2xl font-bold text-blue-600">
                              {result.percentage.toFixed(1)}%
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <h3 className="font-semibold text-lg">{result.candidate.name}</h3>
                          <p className="text-sm text-gray-600">
                            {result.candidate.department} · {result.candidate.position}
                          </p>
                          <div className="mt-2">
                            <Progress value={result.percentage} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="detailed">
            {/* 결과 테이블 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>상세 결과</CardTitle>
                    <CardDescription>모든 평가대상의 평가 결과</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">전체 카테고리</option>
                      {categories.map((category: any) => (
                        <option key={category.id} value={category.categoryName}>
                          {category.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">순위</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead>직급</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead className="text-right">총점</TableHead>
                        <TableHead className="text-right">백분율</TableHead>
                        <TableHead className="text-right">평가자 수</TableHead>
                        <TableHead className="w-32">진행률</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((result: CandidateResult) => (
                        <TableRow key={result.candidate.id}>
                          <TableCell className="font-medium">
                            <Badge variant={result.rank <= 3 ? "default" : "outline"}>
                              {result.rank}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {result.candidate.name}
                          </TableCell>
                          <TableCell>{result.candidate.department}</TableCell>
                          <TableCell>{result.candidate.position}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {result.candidate.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {result.totalScore.toFixed(1)} / {result.maxPossibleScore.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <span className={
                              result.percentage >= 90 ? "text-green-600" :
                              result.percentage >= 80 ? "text-blue-600" :
                              result.percentage >= 70 ? "text-yellow-600" :
                              "text-gray-600"
                            }>
                              {result.percentage.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {result.completedEvaluations} / {result.evaluatorCount}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Progress 
                                value={result.evaluatorCount > 0 ? (result.completedEvaluations / result.evaluatorCount) * 100 : 0} 
                                className="h-2" 
                              />
                              <div className="text-xs text-gray-500">
                                {result.evaluatorCount > 0 ? 
                                  ((result.completedEvaluations / result.evaluatorCount) * 100).toFixed(0) : 0}%
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            {/* 통계 차트와 분석 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>점수 분포</CardTitle>
                  <CardDescription>평가대상별 점수 분포 현황</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700 font-medium">90% 이상 (우수)</span>
                      <span className="text-green-600 font-semibold">
                        {results.filter((r: CandidateResult) => r.percentage >= 90).length}명
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-700 font-medium">80-89% (양호)</span>
                      <span className="text-blue-600 font-semibold">
                        {results.filter((r: CandidateResult) => r.percentage >= 80 && r.percentage < 90).length}명
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-yellow-700 font-medium">70-79% (보통)</span>
                      <span className="text-yellow-600 font-semibold">
                        {results.filter((r: CandidateResult) => r.percentage >= 70 && r.percentage < 80).length}명
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 font-medium">70% 미만 (개선필요)</span>
                      <span className="text-gray-600 font-semibold">
                        {results.filter((r: CandidateResult) => r.percentage < 70).length}명
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>카테고리별 평균</CardTitle>
                  <CardDescription>카테고리별 평가 결과 요약</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.map((category: any) => {
                      const categoryResults = results.filter((r: CandidateResult) => r.candidate.category === category.categoryName);
                      const categoryAverage = categoryResults.length > 0 ? 
                        categoryResults.reduce((sum: number, r: CandidateResult) => sum + r.percentage, 0) / categoryResults.length : 0;
                      
                      return (
                        <div key={category.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{category.categoryName}</span>
                          <div className="text-right">
                            <div className="font-semibold">{categoryAverage.toFixed(1)}%</div>
                            <div className="text-xs text-gray-500">{categoryResults.length}명</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 전체 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 평가대상</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCandidates}</div>
                  <p className="text-xs text-muted-foreground">
                    평가 완료: {completedCandidates}명
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageScore.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">전체 평균</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">완료율</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalCandidates > 0 ? ((completedCandidates / totalCandidates) * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">평가 진행률</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">최고 점수</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {results.length > 0 ? Math.max(...results.map((r: CandidateResult) => r.percentage)).toFixed(1) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">최우수 성과</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}