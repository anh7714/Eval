import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, User, ArrowRight, Eye, Edit3, X } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";

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
  isCompleted: boolean;
  progress: number;
}

export default function EvaluatorEvaluationPage() {
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  // 평가 모달 상태
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const queryClient = useQueryClient();

  // 필터 초기화 함수
  const resetFilters = () => {
    setSelectedMainCategory("all");
    setSelectedSubCategory("all");
    setSelectedStatus("all");
  };

  // 평가대상 데이터 가져오기
  const { data: candidates = [] } = useQuery({
    queryKey: ["/api/evaluator/candidates"],
    refetchOnWindowFocus: true,
    refetchInterval: 3000, // 3초마다 자동 갱신
    staleTime: 1000,
  });

  // 진행 상황 데이터 가져오기
  const { data: progressData = {} } = useQuery({
    queryKey: ["/api/evaluator/progress"],
    refetchOnWindowFocus: true,
    refetchInterval: 3000, // 3초마다 자동 갱신
    staleTime: 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/evaluator/categories"],
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // 5초마다 자동 갱신
    staleTime: 2000,
  });

  // 평가 항목 데이터 가져오기
  const { data: evaluationItems = [] } = useQuery({
    queryKey: ["/api/evaluator/evaluation-items"],
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    staleTime: 2000,
  });

  // 필터링 로직
  const getFilteredCandidates = () => {
    if (!Array.isArray(candidates)) return [];
    
    return candidates.filter((candidate: any) => {
      // 주요 카테고리 필터
      if (selectedMainCategory !== "all" && candidate.mainCategory !== selectedMainCategory) {
        return false;
      }
      
      // 하위 카테고리 필터  
      if (selectedSubCategory !== "all" && candidate.subCategory !== selectedSubCategory) {
        return false;
      }
      
      return true;
    });
  };

  // 고유한 카테고리 값들 추출
  const getUniqueValues = (field: string) => {
    if (!Array.isArray(candidates)) return [];
    return [...new Set(candidates.map((candidate: any) => candidate[field]).filter(Boolean))];
  };

  const uniqueMainCategories = getUniqueValues('category');
  const uniqueSubCategories = getUniqueValues('category');

  const filteredCandidates = getFilteredCandidates();

  // 평가 시작 함수
  const startEvaluation = (candidate: any) => {
    setSelectedCandidate(candidate);
    setIsEvaluationModalOpen(true);
  };

  // 평가 상태 표시 함수
  const getEvaluationStatus = (candidate: any) => {
    // 실제 평가 상태 로직 구현 필요
    return "평가대기";
  };

  // 상태별 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case "완료": return "bg-green-100 text-green-800";
      case "진행중": return "bg-blue-100 text-blue-800";
      case "평가대기": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">평가 진행</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            평가위원
          </Badge>
        </div>
      </div>

      {/* 실시간 연결 상태 */}
      <div className="flex items-center space-x-2 text-sm">
        <div className={`h-2 w-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-600">
          {isRealtimeConnected ? '실시간 연결됨' : '연결 중...'}
        </span>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 평가대상</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(candidates) ? candidates.length : 0}명</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료된 평가</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData.completed || 0}명</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 진행률</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((progressData.completed || 0) / Math.max((progressData.total || 1), 1) * 100)}%</div>
            <Progress 
              value={(progressData.completed || 0) / Math.max((progressData.total || 1), 1) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">나의 평가</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0명</div>
            <p className="text-xs text-muted-foreground">평가 완료</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>평가대상 목록</CardTitle>
          <CardDescription>평가를 진행할 대상을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">카테고리</label>
              <select
                value={selectedMainCategory}
                onChange={(e) => setSelectedMainCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm min-w-[150px]"
              >
                <option value="all">전체</option>
                {uniqueMainCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">상태</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm min-w-[150px]"
              >
                <option value="all">전체</option>
                <option value="평가대기">평가대기</option>
                <option value="진행중">진행중</option>
                <option value="완료">완료</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <Button 
                variant="outline" 
                onClick={resetFilters}
                className="px-4 py-2"
              >
                필터 초기화
              </Button>
            </div>
          </div>

          {/* 평가대상 테이블 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>기관명(성명)</TableHead>
                  <TableHead>소속(부서)</TableHead>
                  <TableHead>직책(직급)</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>평가상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      평가대상이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((candidate: any) => {
                    const status = getEvaluationStatus(candidate);
                    return (
                      <TableRow key={candidate.id}>
                        <TableCell className="font-medium">{candidate.name}</TableCell>
                        <TableCell>{candidate.department}</TableCell>
                        <TableCell>{candidate.position}</TableCell>
                        <TableCell>{candidate.category}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEvaluation(candidate)}
                              className="gap-1"
                            >
                              <Edit3 className="h-3 w-3" />
                              평가
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 평가 모달 */}
      {selectedCandidate && isEvaluationModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden border border-gray-300">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 rounded-lg p-2">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedCandidate.name} 심사표
                  </h2>
                  <p className="text-blue-100 text-sm">평가 진행 중</p>
                </div>
              </div>
              <Button
                onClick={() => setIsEvaluationModalOpen(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* 모달 컨텐츠 */}
            <div className="p-6 bg-gray-50 overflow-y-auto max-h-[calc(95vh-80px)]">
              {categories.length > 0 && evaluationItems.length > 0 && (
                <div className="space-y-4">
                  {/* 심사표 테이블 */}
                  <div className="bg-white border border-gray-400 rounded-lg overflow-hidden shadow-sm">
                    {/* 테이블 제목과 구분 정보 */}
                    <div className="border-b-2 border-black p-4 text-center bg-white">
                      <h2 className="text-xl font-bold mb-2">{selectedCandidate.name} 심사표</h2>
                      <div className="text-right text-sm text-gray-600">
                        구분 · 재활약 · 돌봄SOS 서비스 재공기관 선정 심사
                      </div>
                    </div>

                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-400 px-4 py-3 text-center font-bold">
                            구분 (100점)
                          </th>
                          <th className="border border-gray-400 px-4 py-3 text-center font-bold">
                            세부 항목
                          </th>
                          <th className="border border-gray-400 px-4 py-3 text-center font-bold">
                            유형
                          </th>
                          <th className="border border-gray-400 px-4 py-3 text-center font-bold">
                            배점
                          </th>
                          <th className="border border-gray-400 px-4 py-3 text-center font-bold">
                            평가점수
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // 카테고리별로 평가 항목을 그룹화
                          const categoryGroups: { [key: string]: any[] } = {};
                          
                          evaluationItems.forEach((item: any) => {
                            const category = categories.find((cat: any) => cat.id === item.categoryId);
                            const categoryName = category?.name || '기타';
                            
                            if (!categoryGroups[categoryName]) {
                              categoryGroups[categoryName] = [];
                            }
                            categoryGroups[categoryName].push(item);
                          });

                          const totalPoints = evaluationItems.reduce((sum: number, item: any) => sum + (item.points || 0), 0);

                          return Object.entries(categoryGroups).map(([categoryName, items]) => {
                            const categoryTotal = items.reduce((sum: number, item: any) => sum + (item.points || 0), 0);
                            
                            return items.map((item: any, itemIndex: number) => (
                              <tr key={`${categoryName}-${itemIndex}`}>
                                {itemIndex === 0 && (
                                  <td 
                                    className="border border-gray-400 px-2 py-3 text-center font-bold bg-gray-50 align-middle"
                                    rowSpan={items.length}
                                  >
                                    <div className="text-sm font-bold">{categoryName}</div>
                                    <div className="text-xs text-gray-600 mt-1">({categoryTotal}점)</div>
                                  </td>
                                )}
                                <td className="border border-gray-400 px-3 py-2 text-sm">
                                  {itemIndex + 1}. {item.text}
                                </td>
                                <td className="border border-gray-400 px-2 py-2 text-center text-sm">
                                  {item.type}
                                </td>
                                <td className="border border-gray-400 px-2 py-2 text-center text-sm">
                                  {item.points}점
                                </td>
                                <td className="border border-gray-400 px-2 py-2 text-center bg-blue-50">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.points}
                                    placeholder="0"
                                    className="w-16 text-center text-sm mx-auto bg-blue-50 focus:bg-white"
                                    defaultValue={item.score || 0}
                                  />
                                </td>
                              </tr>
                            ));
                          }).flat().concat([
                            // 합계 행
                            <tr key="total" className="bg-yellow-50 font-bold">
                              <td className="border border-gray-400 px-4 py-3 text-center" colSpan={2}>합계</td>
                              <td className="border border-gray-400 px-2 py-3 text-center"></td>
                              <td className="border border-gray-400 px-2 py-3 text-center">{totalPoints}점</td>
                              <td className="border border-gray-400 px-2 py-3 text-center bg-blue-50">
                                <span className="text-lg font-bold">0점</span>
                              </td>
                            </tr>
                          ]);
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* 하단 버튼들 */}
                  <div className="flex justify-end space-x-4 pt-6">
                    <Button
                      variant="outline"
                      className="px-6"
                    >
                      임시 저장
                    </Button>
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700 px-6"
                    >
                      평가 완료
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}