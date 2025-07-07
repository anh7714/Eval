import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, User, ArrowRight, Eye, Edit3, X, FileText } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface CandidateResult {
  candidate: {
    id: number;
    name: string;
    department: string;
    position: string;
    category: string;
    mainCategory: string;
    subCategory: string;
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
  const [evaluationTemplate, setEvaluationTemplate] = useState<any>(null);
  const [evaluationScores, setEvaluationScores] = useState<{ [key: string]: number }>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 필터 초기화 함수
  const resetFilters = () => {
    setSelectedMainCategory("all");
    setSelectedSubCategory("all");
    setSelectedStatus("all");
  };

  // 데이터 쿼리들
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/evaluator/categories"],
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const { data: evaluationItems = [] } = useQuery({
    queryKey: ["/api/evaluator/evaluation-items"],
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const { data: systemConfig = {} } = useQuery({
    queryKey: ["/api/system/config"],
  });

  const { data: progressData = {} } = useQuery({
    queryKey: ["/api/evaluator/progress"],
    refetchOnWindowFocus: true,
    refetchInterval: 3000,
    staleTime: 1000,
  });

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ["/api/evaluator/candidates"],
    refetchOnWindowFocus: true,
    refetchInterval: 3000,
    staleTime: 1000,
  });

  // 필터링된 결과 계산
  const filteredResults = React.useMemo(() => {
    if (!candidates || !Array.isArray(candidates)) return [];
    
    return (candidates as any[]).filter((candidate: any) => {
      const matchesMainCategory = selectedMainCategory === "all" || 
        candidate.mainCategory === selectedMainCategory;
        
      const matchesSubCategory = selectedSubCategory === "all" || 
        candidate.subCategory === selectedSubCategory;
        
      // 평가 상태 확인
      const evaluationStatus = candidate.evaluationStatus || { isCompleted: false, hasTemporarySave: false };
      let currentStatus = "incomplete";
      
      if (evaluationStatus.isCompleted) {
        currentStatus = "completed";
      } else if (evaluationStatus.hasTemporarySave) {
        currentStatus = "in_progress";
      }
      
      const statusMatch = selectedStatus === "all" || selectedStatus === currentStatus;
      
      return matchesMainCategory && matchesSubCategory && statusMatch && candidate.isActive;
    }).map((candidate: any, index: number) => {
      // 평가 상태 확인
      const evaluationStatus = candidate.evaluationStatus || { isCompleted: false, hasTemporarySave: false, totalScore: 0 };
      
      return {
        candidate: {
          id: candidate.id,
          name: candidate.name,
          department: candidate.department || '미분류',
          position: candidate.position || '미설정',
          category: candidate.mainCategory || '미분류',
          mainCategory: candidate.mainCategory || '미분류',
          subCategory: candidate.subCategory || '미분류'
        },
        rank: index + 1,
        isCompleted: evaluationStatus.isCompleted,
        progress: evaluationStatus.isCompleted ? 100 : (evaluationStatus.hasTemporarySave ? 50 : 0),
        totalScore: evaluationStatus.totalScore || 0,
        maxPossibleScore: 100,
        percentage: evaluationStatus.totalScore ? Math.round((evaluationStatus.totalScore / 100) * 100) : 0,
        evaluatorCount: 1,
        completedEvaluations: evaluationStatus.isCompleted ? 1 : 0,
        averageScore: evaluationStatus.totalScore || 0
      };
    });
  }, [candidates, selectedMainCategory, selectedSubCategory, selectedStatus]);

  const getStatusBadge = (result: CandidateResult) => {
    if (result.isCompleted) {
      return <Badge variant="default" className="bg-green-100 text-green-800">완료</Badge>;
    } else if (result.progress > 0) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">진행중</Badge>;
    } else {
      return <Badge variant="outline" className="bg-orange-100 text-orange-600">평가대기</Badge>;
    }
  };

  const getProgressBar = (result: CandidateResult) => {
    const progressValue = result.progress || 0;
    let colorClass = "bg-gray-200";
    
    if (progressValue === 100) {
      colorClass = "bg-green-500";
    } else if (progressValue > 0) {
      colorClass = "bg-yellow-500";
    }
    
    return (
      <div className="w-full">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>{progressValue}%</span>
        </div>
        <Progress value={progressValue} className={`h-2 ${colorClass}`} />
      </div>
    );
  };

  // 평가 모달 열기 함수
  const openEvaluationModal = async (candidate: any) => {
    setSelectedCandidate(candidate);
    
    // 기존 평가 데이터 불러오기
    try {
      const response = await fetch(`/api/evaluator/evaluation/${candidate.id}`);
      if (response.ok) {
        const existingData = await response.json();
        
        // 기존 점수가 있으면 설정
        if (existingData.scores && Object.keys(existingData.scores).length > 0) {
          setEvaluationScores(existingData.scores);
        } else {
          setEvaluationScores({});
        }
      } else {
        setEvaluationScores({});
      }
    } catch (error) {
      console.error('❌ 기존 평가 데이터 로드 오류:', error);
      setEvaluationScores({});
    }
    
    setIsEvaluationModalOpen(true);
  };

  // 임시 저장 뮤테이션
  const saveTemporaryMutation = useMutation({
    mutationFn: async (data: { candidateId: number; scores: { [key: string]: number } }) => {
      const response = await fetch('/api/evaluator/evaluation/save-temporary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('임시 저장에 실패했습니다');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "평가 내용이 임시 저장되었습니다.",
      });
      // 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/progress"] });
      // 모달 닫기
      setIsEvaluationModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "임시 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 평가 완료 뮤테이션
  const completeEvaluationMutation = useMutation({
    mutationFn: async (data: { candidateId: number; scores: { [key: string]: number } }) => {
      const response = await fetch('/api/evaluator/evaluation/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('평가 완료에 실패했습니다');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "평가 완료",
        description: "평가가 성공적으로 완료되었습니다.",
      });
      // 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/progress"] });
      // 모달 닫기
      setIsEvaluationModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "평가 완료에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 점수 변경 핸들러
  const handleScoreChange = (itemId: string, value: number, maxScore: number) => {
    if (value > maxScore) {
      toast({
        title: "입력 오류",
        description: `점수는 최대 ${maxScore}점까지 입력 가능합니다.`,
        variant: "destructive",
      });
      return;
    }
    
    setEvaluationScores(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  // 임시 저장 핸들러
  const handleTemporarySave = () => {
    if (!selectedCandidate) return;

    saveTemporaryMutation.mutate({
      candidateId: selectedCandidate.id,
      scores: evaluationScores
    });
  };

  // 평가 완료 핸들러
  const handleCompleteEvaluation = () => {
    if (!selectedCandidate) return;

    completeEvaluationMutation.mutate({
      candidateId: selectedCandidate.id,
      scores: evaluationScores
    });
  };

  if (candidatesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">평가 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 페이지 헤더 */}
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">평가하기</h1>
          <p className="text-lg text-gray-600 mt-2">
            평가대상별 상세 점수와 평가 진행 상황을 확인하고 평가를 수행하세요.
          </p>
        </div>

        {/* 평가 목록 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>평가 대상 목록</span>
              
              {/* 필터 섹션 */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">구분:</label>
                  <select 
                    value={selectedMainCategory} 
                    onChange={(e) => setSelectedMainCategory(e.target.value)}
                    className="w-[140px] border-2 border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 transition-colors duration-200 shadow-sm hover:shadow-md rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="all">전체 구분</option>
                    {Array.from(new Set((candidates as any[]).map((c: any) => c.mainCategory).filter(Boolean))).map((category: any) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">세부구분:</label>
                  <select 
                    value={selectedSubCategory} 
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    className="w-[140px] border-2 border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 transition-colors duration-200 shadow-sm hover:shadow-md rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="all">전체 세부구분</option>
                    {Array.from(new Set((candidates as any[]).map((c: any) => c.subCategory).filter(Boolean))).map((category: any) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">상태:</label>
                  <select 
                    value={selectedStatus} 
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-[140px] border-2 border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 transition-colors duration-200 shadow-sm hover:shadow-md rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="all">전체 상태</option>
                    <option value="incomplete">평가대기</option>
                    <option value="completed">완료</option>
                  </select>
                </div>
                <button 
                  onClick={resetFilters}
                  className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 transition-colors duration-200 shadow-sm hover:shadow-md rounded-md bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  필터 초기화
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">순서</TableHead>
                    <TableHead className="text-center">구분</TableHead>
                    <TableHead className="text-center">세부구분</TableHead>
                    <TableHead>기관명(성명)</TableHead>
                    <TableHead className="text-center">진행상태</TableHead>
                    <TableHead className="text-center">진행상황</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                    <TableHead className="text-center">평가</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result, index) => (
                    <TableRow key={result.candidate.id}>
                      <TableCell className="text-center font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {result.candidate.mainCategory}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          {result.candidate.subCategory}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{result.candidate.name}</div>
                          <div className="text-sm text-gray-500">
                            {result.candidate.department} · {result.candidate.position}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(result)}
                      </TableCell>
                      <TableCell>
                        {getProgressBar(result)}
                      </TableCell>
                      <TableCell className="text-center">
                        {result.isCompleted && (
                          <div className="text-sm">
                            <div className="text-green-600 font-medium">{result.totalScore}점</div>
                            <div className="text-gray-500">({result.percentage}%)</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3"
                          onClick={() => openEvaluationModal(result.candidate)}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          평가하기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 빈 상태 */}
              {filteredResults.length === 0 && (
                <div className="text-center py-12">
                  <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">평가 대상이 없습니다</h3>
                  <p className="text-sm text-gray-500">
                    필터 조건을 확인하거나 관리자에게 문의하세요.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 평가 모달 - 자동 크기 조절 */}
        {selectedCandidate && isEvaluationModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full h-[90vh] overflow-hidden border-2 border-gray-300 flex flex-col"
                 style={{ maxWidth: '90vw' }}>
              {/* 모달 헤더 */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-white bg-opacity-20 rounded-lg p-2">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {selectedCandidate.name} 심사표
                    </h2>
                    <p className="text-slate-200 text-sm">평가 진행 중</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* 상단 액션 버튼들 */}
                  <Button
                    onClick={() => setIsEvaluationModalOpen(false)}
                    variant="outline"
                    size="sm"
                    className="bg-white bg-opacity-10 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-20 rounded-md px-4 py-2 text-sm font-medium"
                  >
                    목록으로
                  </Button>
                  <Button
                    onClick={handleTemporarySave}
                    variant="outline"
                    size="sm"
                    className="bg-slate-600 bg-opacity-90 border-slate-500 text-white hover:bg-slate-500 rounded-md px-4 py-2 text-sm font-medium"
                    disabled={saveTemporaryMutation.isPending}
                  >
                    {saveTemporaryMutation.isPending ? "저장 중..." : "임시저장"}
                  </Button>
                  <Button
                    onClick={handleCompleteEvaluation}
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-medium"
                    disabled={completeEvaluationMutation.isPending}
                  >
                    {completeEvaluationMutation.isPending ? "완료 중..." : "평가완료"}
                  </Button>
                </div>
              </div>

              {/* 모달 컨텐츠 - 자동 크기 조절 */}
              <div className="flex-1 overflow-hidden p-6">
                {Array.isArray(categories) && categories.length > 0 && Array.isArray(evaluationItems) && evaluationItems.length > 0 && (
                  <div className="bg-white border-2 border-black rounded-lg overflow-hidden shadow-lg h-full">
                    <div className="w-full h-full overflow-auto">
                      <div className="transform scale-95 origin-top-left" style={{ width: '105.26%', height: '105.26%' }}>
                        <table className="w-full border-collapse" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.85rem)' }}>
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-black px-2 py-2 text-center font-bold text-gray-900">
                                구분 (100점)
                              </th>
                              <th className="border border-black px-2 py-2 text-center font-bold text-gray-900">
                                세부 항목
                              </th>
                              <th className="border border-black px-2 py-2 text-center font-bold text-gray-900">
                                유형
                              </th>
                              <th className="border border-black px-2 py-2 text-center font-bold text-gray-900">
                                배점
                              </th>
                              <th className="border border-black px-2 py-2 text-center font-bold text-gray-900">
                                평가점수
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // 카테고리별로 평가항목 그룹화
                              const categoryGroups = categories.reduce((groups: any, category: any) => {
                                if (category.type === 'evaluation') {
                                  groups[category.name] = {
                                    name: category.name,
                                    items: evaluationItems.filter((item: any) => item.categoryId === category.id)
                                  };
                                }
                                return groups;
                              }, {});

                              // 총점 계산
                              const totalPoints = Object.values(categoryGroups).reduce((sum: number, group: any) => {
                                return sum + group.items.reduce((itemSum: number, item: any) => itemSum + (item.maxScore || 0), 0);
                              }, 0);

                              return Object.entries(categoryGroups).map(([categoryName, group]: [string, any]) => {
                                const items = group.items;
                                const categoryTotal = items.reduce((sum: number, item: any) => sum + (item.maxScore || 0), 0);
                                
                                return items.map((item: any, itemIndex: number) => (
                                  <tr key={`${categoryName}-${itemIndex}`} className="hover:bg-gray-50">
                                    {itemIndex === 0 && (
                                      <td 
                                        className="border border-black px-2 py-2 text-center font-bold bg-gray-50 align-middle"
                                        rowSpan={items.length}
                                      >
                                        <div className="text-sm font-bold text-gray-900">{categoryName}</div>
                                        <div className="text-xs text-gray-600 mt-1 font-normal">({categoryTotal}점)</div>
                                      </td>
                                    )}
                                    <td className="border border-black px-2 py-2 text-sm text-gray-900">
                                      {itemIndex + 1}. {item.itemName || item.description}
                                    </td>
                                    <td className="border border-black px-2 py-2 text-center text-sm text-gray-900">
                                      정성
                                    </td>
                                    <td className="border border-black px-2 py-2 text-center text-sm font-medium text-gray-900">
                                      {item.maxScore}점
                                    </td>
                                    <td className="border border-black px-2 py-2 text-center bg-blue-50">
                                      <Input
                                        type="number"
                                        min="0"
                                        max={item.maxScore}
                                        placeholder=""
                                        value={evaluationScores[item.id] !== undefined ? evaluationScores[item.id] : ""}
                                        onChange={(e) => {
                                          const value = e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
                                          handleScoreChange(item.id, value, item.maxScore);
                                        }}
                                        onFocus={(e) => {
                                          if (e.target.value === "0") {
                                            e.target.value = "";
                                          }
                                        }}
                                        className="w-16 h-8 text-center text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:bg-white focus:border-blue-500 focus:outline-none"
                                        style={{
                                          MozAppearance: 'textfield',
                                          WebkitAppearance: 'none'
                                        }}
                                      />
                                    </td>
                                  </tr>
                                ));
                              }).flat().concat([
                                // 합계 행
                                <tr key="total" className="bg-yellow-100 font-bold">
                                  <td className="border border-black px-2 py-2 text-center font-bold text-gray-900" colSpan={2}>
                                    합계
                                  </td>
                                  <td className="border border-black px-2 py-2 text-center"></td>
                                  <td className="border border-black px-2 py-2 text-center font-bold text-gray-900">
                                    {totalPoints}점
                                  </td>
                                  <td className="border border-black px-2 py-2 text-center bg-blue-50">
                                    <span className="text-lg font-bold text-blue-800">
                                      {Object.values(evaluationScores).reduce((sum, score) => sum + score, 0)}점
                                    </span>
                                  </td>
                                </tr>
                              ]);
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}