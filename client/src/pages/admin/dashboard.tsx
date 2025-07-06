import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, FileText, TrendingUp, Database, Download, Search, Filter, ArrowUpDown, AlertCircle, UserX, Clock } from "lucide-react";

export default function AdminDashboard() {
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  
  // 모달 내 테이블 관련 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("candidates");
  const itemsPerPage = 10;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/statistics"],
  });

  const { data: adminProfile } = useQuery({
    queryKey: ["/api/admin/profile"],
  });

  // 통계 데이터 로깅
  React.useEffect(() => {
    if (stats) {
      console.log('📊 대시보드 통계 데이터:', stats);
    }
  }, [stats]);

  const { data: incompleteDetails, isLoading: incompleteLoading } = useQuery({
    queryKey: ["/api/admin/incomplete-details"],
    enabled: showIncompleteModal,
  });

  // 필터링 및 정렬 로직
  const filterIncompleteData = (data: any[], type: string) => {
    if (!data) return [];
    
    return data
      .filter((item: any) => {
        const matchesSearch = 
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (type === "evaluators" && item.evaluatorName?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = statusFilter === "all" || 
          (statusFilter === "notStarted" && item.status === "notStarted") ||
          (statusFilter === "inProgress" && item.status === "inProgress");
        
        return matchesSearch && matchesStatus;
      })
      .sort((a: any, b: any) => {
        // 상태별 정렬: 미시작 > 진행중 > 완료
        const statusOrder = { notStarted: 0, inProgress: 1, completed: 2 };
        const aStatus = statusOrder[a.status as keyof typeof statusOrder] ?? 2;
        const bStatus = statusOrder[b.status as keyof typeof statusOrder] ?? 2;
        
        if (aStatus !== bStatus) {
          return aStatus - bStatus;
        }
        
        // 이름으로 정렬
        return (a.name || "").localeCompare(b.name || "");
      });
  };

  const filteredIncompleteCandidates = filterIncompleteData(incompleteDetails?.candidates || [], "candidates");
  const filteredIncompleteEvaluators = filterIncompleteData(incompleteDetails?.evaluators || [], "evaluators");

  // 페이지네이션 로직
  const getPaginatedData = (data: any[]) => {
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const paginatedData = data.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    return { paginatedData, totalPages };
  };

  const { paginatedData: paginatedCandidates, totalPages: candidatePages } = getPaginatedData(filteredIncompleteCandidates);
  const { paginatedData: paginatedEvaluators, totalPages: evaluatorPages } = getPaginatedData(filteredIncompleteEvaluators);

  // 검색/필터 리셋
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  // 미완료 카드 클릭 핸들러
  const handleIncompleteCardClick = () => {
    setShowIncompleteModal(true);
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
    setActiveTab("candidates");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="text-lg text-slate-600 dark:text-slate-300">시스템 데이터를 불러오는 중입니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            관리자 대시보드
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
            {adminProfile?.name || "관리자"}님! 환영합니다.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            평가 시스템의 전체 현황을 확인하고 관리합니다.
          </p>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {(stats as any)?.completionRate || 0}%
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-1">완료율</p>
              <Badge variant="secondary" className="text-xs">
                {(stats as any)?.completed || 0}/{(stats as any)?.totalCandidates || 0} 완료
              </Badge>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {(stats as any)?.inProgress || 0}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-1">진행중</p>
              <Badge variant="secondary" className="text-xs">
                임시저장 중
              </Badge>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
            onClick={handleIncompleteCardClick}
          >
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {(stats as any)?.totalCandidates || 0}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-1">미완료</p>
              <Badge variant="secondary" className="text-xs">
                총 평가대상
              </Badge>
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                클릭하여 상세보기
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {(stats as any)?.completed || 0}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-1">완료</p>
              <Badge variant="secondary" className="text-xs">
                평가 완료
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* 미완료 상세 모달 */}
        <Dialog open={showIncompleteModal} onOpenChange={setShowIncompleteModal}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-2xl">
            <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                미완료 평가 상세 현황
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto py-4">
              {incompleteLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600"></div>
                  <p className="ml-3 text-gray-600">데이터를 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 검색 및 필터 영역 */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* 검색 */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="이름, 부서, 구분으로 검색..."
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
                        <SelectItem value="notStarted">미시작</SelectItem>
                        <SelectItem value="inProgress">진행중</SelectItem>
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

                  {/* 탭 */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="candidates" className="flex items-center gap-2">
                        <UserX className="h-4 w-4" />
                        미완료 평가대상 ({filteredIncompleteCandidates.length}명)
                      </TabsTrigger>
                      <TabsTrigger value="evaluators" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        미평가 평가위원 ({filteredIncompleteEvaluators.length}명)
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="candidates" className="space-y-4">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>평가대상</TableHead>
                              <TableHead>소속/부서</TableHead>
                              <TableHead>구분</TableHead>
                              <TableHead>상태</TableHead>
                              <TableHead>미평가 평가위원</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedCandidates.map((candidate: any) => (
                              <TableRow key={candidate.id}>
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="font-semibold">{candidate.name}</div>
                                    {candidate.position && (
                                      <div className="text-sm text-gray-500">{candidate.position}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{candidate.department || "정보 없음"}</TableCell>
                                <TableCell>{candidate.category || "정보 없음"}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={candidate.status === "notStarted" ? "destructive" : "secondary"}
                                    className="px-2 py-1"
                                  >
                                    {candidate.status === "notStarted" ? "미시작" : "진행중"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {candidate.pendingEvaluators?.length > 0 ? (
                                      <div className="space-y-1">
                                        {candidate.pendingEvaluators.slice(0, 2).map((evaluator: any) => (
                                          <div key={evaluator.id} className="text-gray-600">
                                            {evaluator.name}
                                          </div>
                                        ))}
                                        {candidate.pendingEvaluators.length > 2 && (
                                          <div className="text-xs text-gray-500">
                                            외 {candidate.pendingEvaluators.length - 2}명
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* 페이지네이션 */}
                      {candidatePages > 1 && (
                        <div className="flex justify-center">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>
                              
                              {Array.from({ length: candidatePages }, (_, i) => i + 1).map((page) => (
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
                                  onClick={() => setCurrentPage(Math.min(candidatePages, currentPage + 1))}
                                  className={currentPage === candidatePages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}

                      {/* 빈 상태 */}
                      {paginatedCandidates.length === 0 && (
                        <div className="text-center py-12">
                          <UserX className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {filteredIncompleteCandidates.length === 0 ? "검색 결과가 없습니다" : "미완료 평가대상이 없습니다"}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {filteredIncompleteCandidates.length === 0 
                              ? "다른 검색어나 필터를 시도해보세요."
                              : "모든 평가가 완료되었습니다."
                            }
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="evaluators" className="space-y-4">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>평가위원</TableHead>
                              <TableHead>소속/부서</TableHead>
                              <TableHead>미평가 대상</TableHead>
                              <TableHead>진행률</TableHead>
                              <TableHead>상태</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedEvaluators.map((evaluator: any) => (
                              <TableRow key={evaluator.id}>
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="font-semibold">{evaluator.evaluatorName}</div>
                                    {evaluator.position && (
                                      <div className="text-sm text-gray-500">{evaluator.position}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{evaluator.department || "정보 없음"}</TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {evaluator.pendingCandidates?.length > 0 ? (
                                      <div className="space-y-1">
                                        {evaluator.pendingCandidates.slice(0, 2).map((candidate: any) => (
                                          <div key={candidate.id} className="text-gray-600">
                                            {candidate.name}
                                          </div>
                                        ))}
                                        {evaluator.pendingCandidates.length > 2 && (
                                          <div className="text-xs text-gray-500">
                                            외 {evaluator.pendingCandidates.length - 2}명
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div className="font-medium">{evaluator.progress || 0}%</div>
                                    <div className="text-xs text-gray-500">
                                      {evaluator.completedCount || 0}/{evaluator.totalCount || 0} 완료
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={evaluator.status === "notStarted" ? "destructive" : "secondary"}
                                    className="px-2 py-1"
                                  >
                                    {evaluator.status === "notStarted" ? "미시작" : "진행중"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* 페이지네이션 */}
                      {evaluatorPages > 1 && (
                        <div className="flex justify-center">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>
                              
                              {Array.from({ length: evaluatorPages }, (_, i) => i + 1).map((page) => (
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
                                  onClick={() => setCurrentPage(Math.min(evaluatorPages, currentPage + 1))}
                                  className={currentPage === evaluatorPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}

                      {/* 빈 상태 */}
                      {paginatedEvaluators.length === 0 && (
                        <div className="text-center py-12">
                          <Clock className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {filteredIncompleteEvaluators.length === 0 ? "검색 결과가 없습니다" : "미평가 평가위원이 없습니다"}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {filteredIncompleteEvaluators.length === 0 
                              ? "다른 검색어나 필터를 시도해보세요."
                              : "모든 평가위원이 평가를 완료했습니다."
                            }
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}