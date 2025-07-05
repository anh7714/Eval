import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, Users, FileText, BarChart3, Award, Trophy, Target, Scale, X, CheckCircle } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<string>("ranking");
  
  // 보고서 출력용 상태 변수들
  const [selectedEvaluator, setSelectedEvaluator] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState({
    title: "제공기관 선정 심의회 평가표",
    totalScore: 100,
    sections: [
      {
        id: 'A',
        title: '기관수행능력',
        totalPoints: 35,
        items: [
          { id: 1, text: '통계SOS 사업 운영 체계화 2단 완료', type: '정성', points: 20, score: 0 },
          { id: 2, text: '심의 및 승인 목적 확인', type: '정량', points: 5, score: 0 },
          { id: 3, text: '기관 운영 기간', type: '정성', points: 5, score: 0 },
          { id: 4, text: '조직구성', type: '정량', points: 5, score: 0 }
        ]
      },
      {
        id: 'B',
        title: '인력운영',
        totalPoints: 20,
        items: [
          { id: 1, text: '사업 운영 총괄자 및 담당자의 전문성', type: '정성', points: 5, score: 0 },
          { id: 2, text: '통계SOS 사업 운영 체계화부 담당자', type: '정량', points: 5, score: 0 },
          { id: 3, text: 'SOS서비스 수행 인력의 확보', type: '정량', points: 10, score: 0 }
        ]
      }
    ]
  });

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

  // 보고서 출력용 데이터
  const { data: evaluators = [] } = useQuery({
    queryKey: ["/api/admin/evaluators"],
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["/api/admin/candidates"],
  });

  if (resultsLoading || categoriesLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const filteredResults = selectedCategory === "all" 
    ? results 
    : results.filter((result: CandidateResult) => result.candidate.category === selectedCategory);

  const completedCandidates = results.filter((result: CandidateResult) => 
    result.completedEvaluations > 0
  ).length;

  const totalCandidates = results.length;
  const averageScore = results.reduce((sum: number, result: CandidateResult) => 
    sum + result.percentage, 0) / results.length || 0;

  // 보고서 출력용 함수들
  const printTemplate = () => {
    const printContents = document.getElementById('print-area')?.innerHTML;
    if (!printContents) return;

    const originalContents = document.body.innerHTML;
    const printStyles = `
      <style>
        @page { 
          size: A4; 
          margin: 25mm 20mm 15mm 20mm; 
        }
        body { 
          font-family: 'PT Sans', sans-serif; 
          font-size: 12px; 
          line-height: 1.4;
          color: #000;
        }
        .template-container { 
          width: 100% !important; 
        }
        table { 
          width: 100% !important; 
          border-collapse: collapse !important;
          margin-bottom: 20px !important;
        }
        th, td { 
          border: 1px solid #000 !important; 
          padding: 8px !important; 
          text-align: left !important;
          vertical-align: middle !important;
        }
        .text-center { 
          text-align: center !important; 
        }
        .bg-gray-50 { 
          background-color: #f9f9f9 !important; 
        }
        .font-bold { 
          font-weight: bold !important; 
        }
        .text-lg { 
          font-size: 14px !important; 
        }
        .text-sm { 
          font-size: 11px !important; 
        }
        .mb-4 { 
          margin-bottom: 16px !important; 
        }
        .text-right { 
          text-align: right !important; 
        }
        @media print {
          body { margin: 0; }
          .template-container { width: 100% !important; }
        }
      </style>
    `;

    document.body.innerHTML = printStyles + printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const calculateTotalPoints = () => {
    return currentTemplate.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + (item.points || 0), 0), 0
    );
  };

  const calculateTotalScore = () => {
    return currentTemplate.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + (item.score || 0), 0), 0
    );
  };

  const selectedCandidateInfo = candidates.find((c: any) => c.id === selectedCandidate);
  const selectedEvaluatorInfo = evaluators.find((e: any) => e.id === selectedEvaluator);

  const getDynamicTitle = () => {
    if (selectedCandidateInfo) {
      return `${selectedCandidateInfo.name} 심사표`;
    }
    return currentTemplate.title;
  };

  const handleExportResults = () => {
    const exportData = filteredResults.map((result: CandidateResult) => ({
      순위: result.rank,
      "기관명(성명)": result.candidate.name,
      "소속(부서)": result.candidate.department,
      "직책(직급)": result.candidate.position,
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

  // 순위 관련 데이터 처리
  const passThreshold = 70; // 기준점수 70%
  const topPerformers = results.slice(0, 10); // 상위 10명
  const failedCandidates = results.filter((result: CandidateResult) => result.percentage < passThreshold);
  const passedCandidates = results.filter((result: CandidateResult) => result.percentage >= passThreshold);
  
  // 동점자 처리
  const tieGroups = results.reduce((groups: any, result: CandidateResult) => {
    const key = result.percentage.toFixed(1);
    if (!groups[key]) groups[key] = [];
    groups[key].push(result);
    return groups;
  }, {});
  
  const tiedCandidates = Object.values(tieGroups).filter((group: any) => group.length > 1);

  // 🏆 순위 섹션
  const renderRankingSection = () => (
    <div className="space-y-6">
      <Tabs defaultValue="overall" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overall" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            종합순위
          </TabsTrigger>
          <TabsTrigger value="category" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            항목별순위
          </TabsTrigger>
          <TabsTrigger value="ties" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            동점자처리
          </TabsTrigger>
          <TabsTrigger value="failed" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            탈락현황
          </TabsTrigger>
          <TabsTrigger value="final" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            최종선정
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                전체 최종 순위표
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-center">순위</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">이름</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">소속</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">구분</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">득점률</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">총점</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((result: CandidateResult, index: number) => (
                      <tr key={result.candidate.id} className={`hover:bg-gray-50 ${index < 3 ? 'bg-yellow-50' : ''}`}>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <div className="flex items-center justify-center">
                            {index < 3 && <Trophy className="h-4 w-4 text-yellow-500 mr-1" />}
                            <span className="font-semibold">{result.rank}</span>
                          </div>
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
                          <Badge variant={result.percentage >= passThreshold ? "default" : "destructive"}>
                            {result.percentage >= passThreshold ? "합격" : "불합격"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                평가영역별 세부순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48 input-professional h-12 border-2 border-gray-200 dark:border-gray-600 hover:border-amber-300 dark:hover:border-amber-500 transition-colors duration-200 shadow-sm hover:shadow-md">
                      <SelectValue placeholder="구분 선택" />
                    </SelectTrigger>
                    <SelectContent 
                      className="z-[100] border-2 border-gray-200 dark:border-gray-600 shadow-2xl bg-white dark:bg-gray-800 rounded-xl overflow-hidden"
                      position="popper"
                      sideOffset={4}
                    >
                      <SelectItem 
                        value="all"
                        className="hover:bg-amber-50 dark:hover:bg-amber-900/30 cursor-pointer py-3 px-4 transition-colors duration-150"
                      >
                        전체
                      </SelectItem>
                      {categories.map((category: any) => (
                        <SelectItem 
                          key={category.id} 
                          value={category.categoryName}
                          className="hover:bg-amber-50 dark:hover:bg-amber-900/30 cursor-pointer py-3 px-4 transition-colors duration-150"
                        >
                          {category.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category: any) => {
                  const categoryResults = results.filter((r: CandidateResult) => r.candidate.category === category.categoryName);
                  const topInCategory = categoryResults.slice(0, 3);
                  
                  return (
                    <Card key={category.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{category.categoryName}</CardTitle>
                        <p className="text-sm text-gray-600">총 {categoryResults.length}명</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {topInCategory.map((result: CandidateResult, index: number) => (
                            <div key={result.candidate.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{index + 1}.</span>
                                <span className="text-sm">{result.candidate.name}</span>
                              </div>
                              <span className="text-sm font-medium text-blue-600">
                                {result.percentage.toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-orange-500" />
                동점자 발생 및 처리현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tiedCandidates.length > 0 ? (
                <div className="space-y-4">
                  {tiedCandidates.map((group: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-orange-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                          동점 그룹 {index + 1}: {group[0].percentage.toFixed(1)}%
                        </CardTitle>
                        <p className="text-sm text-gray-600">{group.length}명 동점</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {group.map((result: CandidateResult) => (
                            <div key={result.candidate.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                              <div>
                                <span className="font-medium">{result.candidate.name}</span>
                                <span className="text-sm text-gray-600 ml-2">
                                  {result.candidate.department}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{result.percentage.toFixed(1)}%</div>
                                <div className="text-xs text-gray-500">
                                  {result.totalScore}/{result.maxPossibleScore}점
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">동점자가 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <X className="h-5 w-5 text-red-500" />
                기준점수 미달 현황
              </CardTitle>
              <CardDescription>
                기준점수 {passThreshold}% 미달자: {failedCandidates.length}명
              </CardDescription>
            </CardHeader>
            <CardContent>
              {failedCandidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-red-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">이름</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">소속</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">구분</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">득점률</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">부족점수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedCandidates.map((result: CandidateResult) => (
                        <tr key={result.candidate.id} className="hover:bg-red-50">
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
                            <span className="font-semibold text-red-600">
                              {result.percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <span className="text-red-600">
                              -{(passThreshold - result.percentage).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-500">모든 평가대상이 기준점수를 충족했습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="final" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                최종 선정결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{passedCandidates.length}</div>
                      <div className="text-sm text-gray-600">합격자</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{failedCandidates.length}</div>
                      <div className="text-sm text-gray-600">불합격자</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {passedCandidates.length > 0 ? ((passedCandidates.length / totalCandidates) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-sm text-gray-600">합격률</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">최종 합격자 명단</h4>
                {passedCandidates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {passedCandidates.map((result: CandidateResult) => (
                      <Card key={result.candidate.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{result.candidate.name}</div>
                              <div className="text-sm text-gray-600">
                                {result.candidate.department} · {result.candidate.position}
                              </div>
                              <div className="text-sm text-gray-600">
                                {result.candidate.category}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                {result.percentage.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-500">
                                {result.rank}위
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <X className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">합격자가 없습니다</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  // 📋 상세결과 섹션
  const renderDetailedResults = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>상세 평가 결과</span>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 input-professional h-12 border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors duration-200 shadow-sm hover:shadow-md">
                  <SelectValue placeholder="전체 카테고리" />
                </SelectTrigger>
                <SelectContent 
                  className="z-[100] border-2 border-gray-200 dark:border-gray-600 shadow-2xl bg-white dark:bg-gray-800 rounded-xl overflow-hidden"
                  position="popper"
                  sideOffset={4}
                >
                  <SelectItem 
                    value="all"
                    className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer py-3 px-4 transition-colors duration-150"
                  >
                    전체 카테고리
                  </SelectItem>
                  {categories.map((category: any) => (
                    <SelectItem 
                      key={category.id} 
                      value={category.categoryName}
                      className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer py-3 px-4 transition-colors duration-150"
                    >
                      {category.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExportResults} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>엑셀 다운로드</span>
            </Button>
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
  );

  // 📊 통계 섹션
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

  // 📄 보고서 출력 섹션
  const renderReportSection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>평가표 보고서 출력</CardTitle>
              <CardDescription>평가표를 인쇄하거나 PDF로 저장할 수 있습니다.</CardDescription>
            </div>
            <Button onClick={printTemplate} variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              인쇄
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 평가위원 및 평가대상 선택 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-bold mb-3 text-blue-800">평가위원 및 평가대상 선택</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700">평가위원 선택</label>
                <div className="relative">
                  <select
                    value={selectedEvaluator || ''}
                    onChange={(e) => setSelectedEvaluator(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full text-sm border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">평가위원을 선택하세요</option>
                    {(evaluators as any[]).map((evaluator: any) => (
                      <option key={evaluator.id} value={evaluator.id}>
                        {evaluator.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700">평가대상 선택</label>
                <div className="relative">
                  <select
                    value={selectedCandidate || ''}
                    onChange={(e) => setSelectedCandidate(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full text-sm border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">평가대상을 선택하세요</option>
                    {(candidates as any[]).map((candidate: any) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 평가표 미리보기 */}
          <div id="print-area" className="template-container">
            <div className="mb-6">
              <div className="text-right mb-2">
                <span className="text-sm text-gray-600">
                  구분: {selectedCandidateInfo?.category || selectedCandidateInfo?.department || ''}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-center mb-6">{getDynamicTitle()}</h1>
            </div>

            {/* 제목 및 구분 정보 테이블 */}
            <table className="w-full border-collapse border border-gray-300 mb-4">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-center font-bold">
                    구분 ({calculateTotalPoints()}점)
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-bold">세부 항목</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-bold">유형</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-bold">배점</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-bold">평가점수</th>
                </tr>
              </thead>
              <tbody>
                {currentTemplate.sections.map((section, sectionIndex) => (
                  section.items.map((item, itemIndex) => (
                    <tr key={`${section.id}-${item.id}`}>
                      {itemIndex === 0 && (
                        <td 
                          className="border border-gray-300 px-4 py-2 text-center font-medium bg-blue-50"
                          rowSpan={section.items.length}
                        >
                          {section.title}
                          <br />
                          <span className="text-sm text-gray-600">
                            ({section.items.reduce((sum, i) => sum + (i.points || 0), 0)}점)
                          </span>
                        </td>
                      )}
                      <td className="border border-gray-300 px-4 py-2">{item.text}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">{item.type}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">{item.points}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <input 
                          type="number" 
                          min="0" 
                          max={item.points}
                          value={item.score}
                          onChange={(e) => {
                            const newScore = parseInt(e.target.value) || 0;
                            setCurrentTemplate(prev => ({
                              ...prev,
                              sections: prev.sections.map(s => 
                                s.id === section.id 
                                  ? {
                                      ...s,
                                      items: s.items.map(i => 
                                        i.id === item.id ? { ...i, score: Math.min(newScore, item.points) } : i
                                      )
                                    }
                                  : s
                              )
                            }));
                          }}
                          className="w-16 text-center border rounded px-2 py-1"
                        />
                      </td>
                    </tr>
                  ))
                ))}
                <tr className="bg-yellow-50 font-bold">
                  <td className="border border-gray-300 px-4 py-2 text-center">합계</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{calculateTotalPoints()}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{calculateTotalScore()}</td>
                </tr>
              </tbody>
            </table>

            {/* 평가위원 정보 */}
            <div className="mt-8 text-right">
              <p className="text-sm">
                평가위원: {selectedEvaluatorInfo?.name || '_______________'}
              </p>
              <p className="text-sm mt-2">
                날짜: {new Date().toLocaleDateString('ko-KR')}
              </p>
            </div>
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
          {activeTab === "ranking" && renderRankingSection()}
          {activeTab === "detailed" && renderDetailedResults()}
          {activeTab === "statistics" && renderStatistics()}
          {activeTab === "report" && renderReportSection()}
        </div>
      </div>
    </div>
  );
}