import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Download, Trophy, TrendingUp, Users, FileText } from "lucide-react";

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

export default function ResultsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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
    // Excel 내보내기 구현
    const exportData = filteredResults.map((result: CandidateResult) => ({
      순위: result.rank,
      이름: result.candidate.name,
      부서: result.candidate.department,
      직급: result.candidate.position,
      카테고리: result.candidate.category,
      총점: result.totalScore.toFixed(1),
      최대점수: result.maxPossibleScore.toFixed(1),
      백분율: `${result.percentage.toFixed(1)}%`,
      평가자수: result.evaluatorCount,
      완료평가: result.completedEvaluations,
      평균점수: result.averageScore.toFixed(1),
    }));

    // CSV 생성 및 다운로드
    const csv = [
      Object.keys(exportData[0]).join(","),
      ...exportData.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `evaluation_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (resultsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">결과를 불러오는 중...</p>
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
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">평가 결과</h1>
            <p className="text-lg text-gray-600 mt-2">
              종합 평가 결과 및 통계
            </p>
          </div>
          <Button onClick={handleExportResults} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>결과 내보내기</span>
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 후보자</CardTitle>
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

        {/* 상위 성과자 */}
        {topPerformers.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>상위 성과자</span>
              </CardTitle>
              <CardDescription>최고 점수를 받은 후보자들</CardDescription>
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

        {/* 결과 테이블 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>상세 결과</CardTitle>
                <CardDescription>모든 후보자의 평가 결과</CardDescription>
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

        {/* 평가 안내 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>평가 기준</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-green-600 font-semibold text-lg">90% 이상</div>
                <div className="text-sm text-green-700">우수</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-blue-600 font-semibold text-lg">80-89%</div>
                <div className="text-sm text-blue-700">양호</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-yellow-600 font-semibold text-lg">70-79%</div>
                <div className="text-sm text-yellow-700">보통</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-gray-600 font-semibold text-lg">70% 미만</div>
                <div className="text-sm text-gray-700">개선필요</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}