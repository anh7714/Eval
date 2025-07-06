import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Select 컴포넌트 제거 - 네이티브 select 사용
import { CheckCircle, Clock, User, ArrowRight, Eye, Edit3, X } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

  const queryClient = useQueryClient();

  // 필터 초기화 함수
  const resetFilters = () => {
    setSelectedMainCategory("all");
    setSelectedSubCategory("all");
    setSelectedStatus("all");
  };

  // 평가 모달 열기 함수
  const openEvaluationModal = (candidate: any) => {
    setSelectedCandidate(candidate);
    
    // 심사표 템플릿 생성
    const template = createEvaluationTemplate(candidate, categories, evaluationItems, systemConfig);
    setEvaluationTemplate(template);
    setIsEvaluationModalOpen(true);
  };

  // 심사표 템플릿 생성 함수
  const createEvaluationTemplate = (candidate: any, categories: any[], items: any[], config: any) => {
    const evaluationTitle = config.evaluationTitle || config.systemName || "종합평가시스템";
    const candidateName = candidate.name || "평가대상";
    const candidateCategory = candidate.category || candidate.mainCategory || "기타";
    
    // 카테고리별로 평가항목 정리
    const categoryGroups = categories.reduce((groups: any, category: any) => {
      if (category.type === 'evaluation') {
        groups[category.name] = {
          name: category.name,
          items: items.filter((item: any) => item.category === category.name)
        };
      }
      return groups;
    }, {});

    return {
      title: `${candidateName} 심사표`,
      subtitle: `구분 · ${candidateCategory} · ${evaluationTitle}`,
      candidate: candidate,
      categories: categoryGroups
    };
  };

  // Supabase 실시간 연결 및 폴링 백업 시스템
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    let supabase: any;

    const initializeRealtime = async () => {
      try {
        // Supabase 클라이언트 초기화
        supabase = createClient(
          'https://bqgbppdppkhsqkekqrui.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZ2JwcGRwcGtoc3FrZWtxcnVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTU3MjUxNiwiZXhwIjoyMDM1MTQ4NTE2fQ.RNYUJsHqQO_ZbmjPKQGqCcF1lKfGrLqOFWHs_R8yg8Q'
        );

        // 실시간 구독 설정
        const candidatesChannel = supabase
          .channel('evaluator-candidates-changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'candidates'
          }, (payload: any) => {
            console.log('🔄 평가자 - 평가대상 데이터 변경 감지:', payload);
            queryClient.invalidateQueries({ queryKey: ["/api/evaluator/candidates"] });
            queryClient.invalidateQueries({ queryKey: ["/api/evaluator/progress"] });
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'evaluation_submissions'
          }, (payload: any) => {
            console.log('🔄 평가자 - 평가 제출 데이터 변경 감지:', payload);
            queryClient.invalidateQueries({ queryKey: ["/api/evaluator/progress"] });
          })
          .subscribe((status: string) => {
            console.log('📡 평가자 실시간 연결 상태:', status);
            setIsRealtimeConnected(status === 'SUBSCRIBED');
          });

        // 폴링 백업 시스템 시작
        const startPolling = () => {
          if (!pollingInterval) {
            pollingInterval = setInterval(() => {
              if (!isRealtimeConnected) {
                console.log('🔄 평가자 페이지 폴링으로 데이터 동기화');
                queryClient.invalidateQueries({ queryKey: ["/api/evaluator/candidates"] });
                queryClient.invalidateQueries({ queryKey: ["/api/evaluator/progress"] });
              }
            }, 2000); // 2초마다 빠른 폴링
          }
        };

        startPolling();

        // 창 포커스 시 데이터 새로고침
        const handleFocus = () => {
          console.log('🔄 평가자 페이지 포커스 - 데이터 새로고침');
          queryClient.invalidateQueries({ queryKey: ["/api/evaluator/candidates"] });
          queryClient.invalidateQueries({ queryKey: ["/api/evaluator/progress"] });
        };

        window.addEventListener('focus', handleFocus);

        return () => {
          if (candidatesChannel) {
            candidatesChannel.unsubscribe();
          }
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          window.removeEventListener('focus', handleFocus);
        };
      } catch (error) {
        console.error('❌ 평가자 실시간 연결 오류:', error);
        setIsRealtimeConnected(false);
      }
    };

    const cleanup = initializeRealtime();
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [queryClient, isRealtimeConnected]);

  const { data: progress } = useQuery({
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

  // 시스템 설정 가져오기
  const { data: systemConfig = {} } = useQuery({
    queryKey: ["/api/system/config"],
  });

  // 평가위원에게 할당된 후보자 목록을 가져오기
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ["/api/evaluator/candidates"],
    refetchOnWindowFocus: true,
    refetchInterval: 3000, // 3초마다 자동 갱신
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
        
      // 임시로 모든 상태를 "미시작"으로 설정
      const statusMatch = selectedStatus === "all" || selectedStatus === "incomplete";
      
      return matchesMainCategory && matchesSubCategory && statusMatch && candidate.isActive;
    }).map((candidate: any, index: number) => {
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
        isCompleted: false, // 임시로 모두 미완료로 설정
        progress: 0, // 임시로 모두 0%로 설정
        totalScore: 0,
        maxPossibleScore: 100,
        percentage: 0,
        evaluatorCount: 1,
        completedEvaluations: 0,
        averageScore: 0
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

        {/* 필터 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>평가 관리</span>
              <div className="flex items-center space-x-4">
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
                    <TableHead className="text-center">결과확인</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.length > 0 ? (
                    filteredResults.map((result: CandidateResult, index: number) => (
                      <TableRow key={result.candidate.id}>
                        <TableCell className="text-center font-medium">
                          {result.rank || index + 1}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{result.candidate.mainCategory || '미분류'}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm text-gray-600">{result.candidate.subCategory || '미분류'}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{result.candidate.name}</div>
                            <div className="text-sm text-gray-600">{result.candidate.department}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(result)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="w-24 mx-auto">
                            {getProgressBar(result)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {result.isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex items-center space-x-1"
                            onClick={() => openEvaluationModal(result.candidate)}
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>{result.isCompleted ? "수정" : "평가"}</span>
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="ghost" className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>결과확인</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">평가 대상이 없습니다.</p>
                        <p className="text-sm text-gray-400 mt-2">관리자가 평가대상을 등록하면 여기에 표시됩니다.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 평가 모달 */}
        <Dialog open={isEvaluationModalOpen} onOpenChange={setIsEvaluationModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {evaluationTemplate && (
              <div className="space-y-6">
                {/* 모달 헤더 */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <DialogTitle className="text-xl font-bold text-center">
                      {evaluationTemplate.title}
                    </DialogTitle>
                    <p className="text-sm text-gray-600 mt-1 text-center">
                      {evaluationTemplate.subtitle}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEvaluationModalOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* 심사표 테이블 - 관리자 화면과 동일한 스타일 */}
                <div className="bg-white border border-gray-400 rounded-lg overflow-hidden">
                  {/* 테이블 제목과 구분 정보 */}
                  <div className="border-b-2 border-black p-4 text-center">
                    <h2 className="text-xl font-bold mb-2">{evaluationTemplate.title}</h2>
                    <div className="text-right text-sm text-gray-600">
                      {evaluationTemplate.subtitle}
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
                        
                        (evaluationItems as any[]).forEach((item: any) => {
                          const category = (categories as any[]).find((cat: any) => cat.id === item.categoryId);
                          const categoryName = category?.name || '기타';
                          
                          if (!categoryGroups[categoryName]) {
                            categoryGroups[categoryName] = [];
                          }
                          categoryGroups[categoryName].push(item);
                        });

                        const totalPoints = (evaluationItems as any[]).reduce((sum: number, item: any) => sum + (item.maxScore || 0), 0);

                        return Object.entries(categoryGroups).map(([categoryName, items]) => {
                          const categoryTotal = items.reduce((sum: number, item: any) => sum + (item.maxScore || 0), 0);
                          
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
                                {itemIndex + 1}. {item.itemName}
                              </td>
                              <td className="border border-gray-400 px-2 py-2 text-center text-sm">
                                정성
                              </td>
                              <td className="border border-gray-400 px-2 py-2 text-center text-sm">
                                {item.maxScore}점
                              </td>
                              <td className="border border-gray-400 px-2 py-2 text-center bg-blue-50">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.maxScore}
                                  placeholder="0"
                                  className="w-16 text-center text-sm mx-auto bg-blue-50 focus:bg-white"
                                  defaultValue={0}
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

                {/* 모달 하단 버튼 */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsEvaluationModalOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-gray-500 text-white hover:bg-gray-600"
                  >
                    임시 저장
                  </Button>
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    평가 완료
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}