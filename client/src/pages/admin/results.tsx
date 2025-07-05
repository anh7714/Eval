import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, BarChart3, Users, Trophy, Clipboard, Search, Filter, ArrowUpDown, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResultsManagement() {
  const { toast } = useToast();
  
  // 테이블 관련 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("totalScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/admin/results"],
  });

  const { data: progress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["/api/admin/evaluator-progress"],
  });

  // 필터링 및 정렬 로직
  const filterAndSortResults = (data: any[]) => {
    return data
      .filter((result: any) => {
        const matchesSearch = 
          result.candidate?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.candidate?.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.candidate?.category?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || 
          (statusFilter === "completed" && result.completedEvaluations === result.evaluatorCount) ||
          (statusFilter === "inProgress" && result.completedEvaluations > 0 && result.completedEvaluations < result.evaluatorCount) ||
          (statusFilter === "notStarted" && result.completedEvaluations === 0);
        
        return matchesSearch && matchesStatus;
      })
      .sort((a: any, b: any) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        if (sortField === "totalScore" || sortField === "percentage") {
          aValue = aValue || 0;
          bValue = bValue || 0;
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }
        
        if (sortField === "candidateName") {
          aValue = a.candidate?.name || "";
          bValue = b.candidate?.name || "";
          return sortDirection === "asc" 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (sortField === "completionStatus") {
          const aCompleted = a.completedEvaluations === a.evaluatorCount;
          const bCompleted = b.completedEvaluations === b.evaluatorCount;
          return sortDirection === "asc" 
            ? (aCompleted ? 1 : -1)
            : (aCompleted ? -1 : 1);
        }
        
        return 0;
      });
  };

  const filteredAndSortedResults = filterAndSortResults(results);

  // 페이지네이션 로직
  const totalPages = Math.ceil(filteredAndSortedResults.length / itemsPerPage);
  const paginatedResults = filteredAndSortedResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 정렬 핸들러
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // 검색/필터 리셋
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

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
                  {filteredAndSortedResults.length !== results.length && 
                    ` (검색 결과: ${filteredAndSortedResults.length}명)`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 검색 및 필터 영역 */}
                <div className="mb-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* 검색 */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="후보자명, 부서, 구분으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* 상태 필터 */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="상태" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 상태</SelectItem>
                        <SelectItem value="completed">완료</SelectItem>
                        <SelectItem value="inProgress">진행중</SelectItem>
                        <SelectItem value="notStarted">미시작</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* 필터 리셋 */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={resetFilters}
                      className="px-4"
                    >
                      필터 초기화
                    </Button>
                  </div>
                </div>

                {/* 테이블 */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("candidateName")}
                        >
                          <div className="flex items-center gap-2">
                            후보자
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>소속/부서</TableHead>
                        <TableHead>구분</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("totalScore")}
                        >
                          <div className="flex items-center gap-2">
                            최종 점수
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("percentage")}
                        >
                          <div className="flex items-center gap-2">
                            완료율
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>평가 현황</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("completionStatus")}
                        >
                          <div className="flex items-center gap-2">
                            상태
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedResults.map((result: any) => (
                        <TableRow key={result.candidate.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold">{result.candidate.name}</div>
                              {result.candidate.position && (
                                <div className="text-sm text-gray-500">{result.candidate.position}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{result.candidate.department || "정보 없음"}</TableCell>
                          <TableCell>{result.candidate.category || "정보 없음"}</TableCell>
                          <TableCell>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {result.totalScore.toFixed(1)}점
                              </div>
                              <div className="text-sm text-gray-500">
                                {result.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {result.completedEvaluations}/{result.evaluatorCount}
                              </div>
                              <div className="text-xs text-gray-500">
                                평가자 {result.evaluatorCount}명 중
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={(result.completedEvaluations / result.evaluatorCount) * 100} 
                                className="h-2 flex-1"
                              />
                              <span className="text-xs text-gray-500">
                                {Math.round((result.completedEvaluations / result.evaluatorCount) * 100)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={result.completedEvaluations === result.evaluatorCount ? "default" : 
                                result.completedEvaluations > 0 ? "secondary" : "destructive"}
                              className="px-2 py-1"
                            >
                              {result.completedEvaluations === result.evaluatorCount ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  완료
                                </div>
                              ) : result.completedEvaluations > 0 ? (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  진행중
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  미시작
                                </div>
                              )}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                {/* 빈 상태 */}
                {paginatedResults.length === 0 && (
                  <div className="text-center py-12">
                    <Trophy className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {filteredAndSortedResults.length === 0 ? "검색 결과가 없습니다" : "아직 완료된 평가 결과가 없습니다"}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {filteredAndSortedResults.length === 0 
                        ? "다른 검색어나 필터를 시도해보세요."
                        : "평가가 진행되면 결과가 여기에 표시됩니다."
                      }
                    </p>
                  </div>
                )}
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
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>진행률</span>
                          <Badge 
                            variant={evaluator.progress === 100 ? "default" : 
                              evaluator.progress > 0 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {evaluator.progress === 100 ? "완료" : 
                              evaluator.progress > 0 ? "진행중" : "미시작"}
                          </Badge>
                        </div>
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
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-semibold text-green-600">
                          {progress.filter((p: any) => p.progress === 100).length}
                        </div>
                        <p className="text-sm text-gray-600">완료된 평가자</p>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-2xl font-semibold text-orange-600">
                          {progress.filter((p: any) => p.progress > 0 && p.progress < 100).length}
                        </div>
                        <p className="text-sm text-gray-600">진행중인 평가자</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">평가 진행 현황</span>
                        <span className="text-sm text-gray-500">
                          {progress.filter((p: any) => p.progress > 0).length}/{progress.length}명
                        </span>
                      </div>
                      <Progress 
                        value={progress.length > 0 ? 
                          (progress.filter((p: any) => p.progress > 0).length / progress.length) * 100 : 0
                        } 
                        className="h-3"
                      />
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