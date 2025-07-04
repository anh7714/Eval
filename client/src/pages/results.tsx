import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Download, TrendingUp, Users, FileText, BarChart3, Award } from "lucide-react";
import * as XLSX from "xlsx";

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
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [rankingSubTab, setRankingSubTab] = useState<string>("overall");

  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('tabChange', handleTabChange as EventListener);
    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
    };
  }, []);

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/results"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/admin/categories"],
  });

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/system/stats"],
  });

  if (resultsLoading || categoriesLoading) {
    return <div className="flex justify-center items-center min-h-screen">로딩 중...</div>;
  }

  const handleExportResults = () => {
    const exportData = filteredResults.map((result: CandidateResult) => ({
      순위: result.rank,
      이름: result.candidate.name,
      소속: result.candidate.department,
      직급: result.candidate.position,
      구분: result.candidate.category,
      총점: result.totalScore,
      만점: result.maxPossibleScore,
      득점률: `${result.percentage.toFixed(1)}%`,
      평가완료수: result.completedEvaluations,
      총평가자수: result.evaluatorCount
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "평가결과");

    const fileName = selectedCategory === "all" 
      ? "전체_평가결과.xlsx" 
      : `${selectedCategory}_평가결과.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  const filteredResults = selectedCategory === "all" 
    ? results 
    : results.filter((result: CandidateResult) => result.candidate.category === selectedCategory);
  
  const completedCandidates = results.filter((result: CandidateResult) => 
    result.completedEvaluations > 0
  ).length;
  
  const totalCandidates = results.length;
  const topPerformers = results.slice(0, 3);
  const averageScore = results.reduce((sum: number, result: CandidateResult) => 
    sum + result.percentage, 0) / results.length || 0;

  const renderDashboard = () => (
    <div>
      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 진행률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCandidates > 0 ? ((completedCandidates / totalCandidates) * 100).toFixed(1) : 0}%
            </div>
            <Progress value={totalCandidates > 0 ? (completedCandidates / totalCandidates) * 100 : 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              전체 평가 진행률
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료된 평가</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCandidates}</div>
            <p className="text-xs text-muted-foreground">
              전체 {totalCandidates}개 중
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">전체 평균</p>
          </CardContent>
        </Card>
      </div>

      {/* 평가 기준 */}
      <Card>
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
  );

  const renderEvaluations = () => (
    <Card>
      <CardHeader>
        <CardTitle>평가 진행 현황</CardTitle>
        <CardDescription>후보자별 평가 현황을 확인할 수 있습니다</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredResults.length > 0 ? (
            filteredResults.map((result: CandidateResult) => (
              <div key={result.candidate.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{result.candidate.name}</h3>
                      <p className="text-gray-600">{result.candidate.department} · {result.candidate.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={result.completedEvaluations > 0 ? "default" : "outline"}>
                      {result.completedEvaluations > 0 ? "평가 완료" : "평가 대기"}
                    </Badge>
                    <div className="text-right">
                      <div className="font-semibold">{result.percentage.toFixed(1)}%</div>
                      <div className="text-sm text-gray-500">
                        {result.completedEvaluations}/{result.evaluatorCount} 완료
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">평가 데이터가 없습니다</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderRanking = () => (
    <div>
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 후보자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCandidates}</div>
            <p className="text-xs text-muted-foreground">명</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평가 완료</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCandidates}</div>
            <p className="text-xs text-muted-foreground">명</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">최고 점수</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.length > 0 ? Math.max(...results.map((r: CandidateResult) => r.percentage)).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">최고 득점률</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">전체 평균</p>
          </CardContent>
        </Card>
      </div>

      {/* 상위 성과자 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>상위 성과자</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.length > 0 ? (
              topPerformers.map((result: CandidateResult, index: number) => (
                <div key={result.candidate.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{result.candidate.name}</h3>
                      <p className="text-sm text-gray-600">
                        {result.candidate.department} · {result.candidate.position}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.percentage.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-500">{result.totalScore}점</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">평가 데이터가 없습니다</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDetailed = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>상세 결과</CardTitle>
          <CardDescription>모든 후보자의 평가 결과를 확인할 수 있습니다</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="구분 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {categories.map((category: any) => (
                <SelectItem key={category.id} value={category.categoryName}>
                  {category.categoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportResults} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>엑셀 다운로드</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">순위</th>
                <th className="border border-gray-300 px-4 py-2 text-left">이름</th>
                <th className="border border-gray-300 px-4 py-2 text-left">소속</th>
                <th className="border border-gray-300 px-4 py-2 text-left">구분</th>
                <th className="border border-gray-300 px-4 py-2 text-center">득점률</th>
                <th className="border border-gray-300 px-4 py-2 text-center">총점</th>
                <th className="border border-gray-300 px-4 py-2 text-center">진행률</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result: CandidateResult) => (
                <tr key={result.candidate.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    {result.rank}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    {result.candidate.name}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {result.candidate.department}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {result.candidate.category}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <span className={`font-semibold ${
                      result.percentage >= 90 ? 'text-green-600' :
                      result.percentage >= 80 ? 'text-blue-600' :
                      result.percentage >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {result.percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {result.totalScore}/{result.maxPossibleScore}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {result.completedEvaluations}/{result.evaluatorCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const renderStatistics = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 점수 분포 */}
      <Card>
        <CardHeader>
          <CardTitle>점수 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-medium">우수 (90% 이상)</span>
              <span className="font-bold text-green-600">
                {results.filter((r: CandidateResult) => r.percentage >= 90).length}명
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="font-medium">양호 (80-89%)</span>
              <span className="font-bold text-blue-600">
                {results.filter((r: CandidateResult) => r.percentage >= 80 && r.percentage < 90).length}명
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
              <span className="font-medium">보통 (70-79%)</span>
              <span className="font-bold text-yellow-600">
                {results.filter((r: CandidateResult) => r.percentage >= 70 && r.percentage < 80).length}명
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">개선필요 (70% 미만)</span>
              <span className="font-bold text-gray-600">
                {results.filter((r: CandidateResult) => r.percentage < 70).length}명
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 카테고리별 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>카테고리별 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category: any) => {
              const categoryResults = results.filter((r: CandidateResult) => r.candidate.category === category.categoryName);
              const avgScore = categoryResults.length > 0 ? 
                categoryResults.reduce((sum: number, r: CandidateResult) => sum + r.percentage, 0) / categoryResults.length : 0;
              
              return (
                <div key={category.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{category.categoryName}</h3>
                    <Badge variant="outline">{categoryResults.length}명</Badge>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>평균 점수</span>
                    <span className="font-medium">{avgScore.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">

        {/* 콘텐츠 영역 */}
        <div className="space-y-6">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "evaluations" && renderEvaluations()}
          {activeTab === "ranking" && renderRanking()}
          {activeTab === "detailed" && renderDetailed()}
          {activeTab === "statistics" && renderStatistics()}
        </div>
      </div>
    </div>
  );
}