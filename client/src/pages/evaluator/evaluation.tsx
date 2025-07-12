import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Select 컴포넌트 제거 - 네이티브 select 사용
import { CheckCircle, Clock, User, ArrowRight, Eye, Edit3, X } from "lucide-react";
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
  const [presetScoresMap, setPresetScoresMap] = useState<{ [key: string]: boolean }>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // 미리보기 모달 상태
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewCandidate, setPreviewCandidate] = useState<any>(null);
  const [previewScores, setPreviewScores] = useState<{ [key: string]: number }>({});

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 컴포넌트 마운트 해제 시 화면 비율 복원
  React.useEffect(() => {
    return () => {
      document.body.style.zoom = '1';
    };
  }, []);

  // 필터 초기화 함수
  const resetFilters = () => {
    setSelectedMainCategory("all");
    setSelectedSubCategory("all");
    setSelectedStatus("all");
  };

  // 🔧 수정: 평가 모달 열기 함수 (평가자 전용 API 사용)
  const openEvaluationModal = async (candidate: any) => {
    setSelectedCandidate(candidate);
    
    try {
      console.log('🚀 평가 모달 열기 시작:', candidate);
      
      // 🎯 평가자 전용 API 사용 (실시간 업데이트)
      const [existingDataResponse, presetScoresResponse, categoriesResponse, evaluationItemsResponse, systemConfigResponse] = await Promise.all([
        fetch(`/api/evaluator/evaluation/${candidate.id}`, { credentials: 'include' }),
        fetch(`/api/admin/candidate-preset-scores/${candidate.id}`, { credentials: 'include' }),
        fetch('/api/evaluator/categories', { credentials: 'include' }), // 🔧 수정
        fetch('/api/evaluator/evaluation-items', { credentials: 'include' }), // 🔧 수정 
        fetch('/api/system/config', { credentials: 'include' })
      ]);

      // 1. 카테고리와 평가항목 데이터 가져오기
      let categories: any[] = [];
      let evaluationItems: any[] = [];
      let systemConfig: any = {};
      
      if (categoriesResponse.ok) {
        categories = await categoriesResponse.json();
        console.log('📋 카테고리 데이터:', categories);
      }
      
      if (evaluationItemsResponse.ok) {
        evaluationItems = await evaluationItemsResponse.json();
        console.log('📝 평가항목 데이터:', evaluationItems);
      }
      
      if (systemConfigResponse.ok) {
        systemConfig = await systemConfigResponse.json();
        console.log('⚙️ 시스템 설정:', systemConfig);
      }

      // 2. 기존 평가 데이터 처리 (평가결과 조회와 동일한 방식)
      let initialScores: any = {};
      if (existingDataResponse.ok) {
        const existingData = await existingDataResponse.json();
        console.log('📖 기존 평가 데이터:', existingData);
        
        // evaluation_submissions 테이블의 scores 필드는 JSONB 형태
        if (existingData && existingData.scores && typeof existingData.scores === 'object') {
          initialScores = existingData.scores;
          console.log('✅ 기존 평가점수:', Object.keys(initialScores).length, '개');
        }
      }

      // 3. 사전점수 데이터 처리 (기존 점수보다 우선 적용)
      let presetMap: { [key: string]: boolean } = {};
      if (presetScoresResponse.ok) {
        const presetScores = await presetScoresResponse.json();
        console.log('🎯 사전점수 데이터:', presetScores?.length || 0, '개');
        
        if (Array.isArray(presetScores) && presetScores.length > 0) {
          presetScores.forEach((preset: any) => {
            const itemId = preset.evaluation_item_id;
            const score = preset.preset_score;
            
            if (itemId && score !== null && score !== undefined) {
              const stringItemId = itemId.toString();
              initialScores[stringItemId] = score;
              presetMap[stringItemId] = true;
              console.log(`✅ 사전점수: ID ${stringItemId} = ${score}점`);
            }
          });
        }
      }

      // 4. 평가결과 조회와 동일한 템플릿 생성 방식 적용
      console.log('🔍 convertDataToTemplate 입력 데이터:');
      console.log('  📋 categories:', categories);
      console.log('  📝 evaluationItems:', evaluationItems);
      console.log('  ⚙️ systemConfig:', systemConfig);
      
      const convertedTemplate = convertDataToTemplate(categories, evaluationItems, systemConfig);
      console.log('🎯 변환된 템플릿:', convertedTemplate);
      console.log('🎯 템플릿 섹션 수:', convertedTemplate?.sections?.length || 0);
      
      if (convertedTemplate?.sections) {
        convertedTemplate.sections.forEach((section: any, index: number) => {
          console.log(`🎯 섹션 ${index + 1}: "${section.title}" (${section.items?.length || 0}개 항목)`);
          section.items?.forEach((item: any, itemIndex: number) => {
            console.log(`   - 항목 ${itemIndex + 1}: "${item.text}" (ID: ${item.evaluationItemId}, 유형: ${item.type})`);
          });
        });
      }

      // 5. 초기 점수 상태 설정
      setEvaluationScores(initialScores);
      setPresetScoresMap(presetMap);
      
      // 6. 심사표 템플릿 생성
      const template = createEvaluationTemplate(candidate, convertedTemplate, systemConfig);
      setEvaluationTemplate(template);
      setIsEvaluationModalOpen(true);
      
      console.log('✅ 평가 모달 열기 완료');

    } catch (error) {
      console.error('❌ 평가 모달 열기 중 오류:', error);
      
      // 오류가 있어도 기본 템플릿으로 진행
      const fallbackTemplate = convertDataToTemplate([], [], {});
      const template = createEvaluationTemplate(candidate, fallbackTemplate, {});
      setEvaluationTemplate(template);
      setIsEvaluationModalOpen(true);
    }
  };

  // 🎯 평가결과 조회와 동일한 템플릿 변환 함수
  const convertDataToTemplate = (categories: any[], evaluationItems: any[], systemConfig: any) => {
    if (!Array.isArray(categories) || !Array.isArray(evaluationItems)) {
      console.log('❌ 데이터가 배열이 아님. 기본 템플릿 반환.');
      return { title: "심사표", totalScore: 100, sections: [] };
    }
    
    if (categories.length === 0 || evaluationItems.length === 0) {
      console.log('⚠️ 데이터가 비어있음. 기본 템플릿 반환.');
      return { title: "심사표", totalScore: 100, sections: [] };
    }

    console.log('🔧 평가위원 심사표 템플릿 변환 중...', { categoriesLength: categories.length, itemsLength: evaluationItems.length });

    const sections = categories.map((category: any, categoryIndex: number) => ({
      id: String.fromCharCode(65 + categoryIndex), // A, B, C...
      title: category.name,
      totalPoints: evaluationItems
        .filter((item: any) => item.categoryId === category.id)
        .reduce((sum: number, item: any) => sum + (item.maxScore || 0), 0),
      items: evaluationItems
        .filter((item: any) => item.categoryId === category.id)
        .map((item: any, index: number) => ({
          id: index + 1, // 템플릿 내 순서 ID
          evaluationItemId: item.id, // 실제 evaluation_item.id 추가
          code: item.code, // evaluation_item.code 추가
          text: item.name,
          type: item.isQuantitative ? '정량' : '정성', // 데이터베이스 값 기반 매핑
          points: item.maxScore || 0,
          score: 0
        }))
    }));

    return {
      title: systemConfig?.evaluationTitle || "심사표",
      totalScore: sections.reduce((sum: number, section: any) => sum + section.totalPoints, 0),
      sections
    };
  };

  // 🎯 평가결과 조회와 동일한 방식의 심사표 템플릿 생성 함수
  const createEvaluationTemplate = (candidate: any, templateData: any, config: any = {}) => {
    const candidateName = candidate?.name || "평가대상";
    const candidateCategory = candidate?.category || candidate?.mainCategory || "기타";
    const evaluationTitle = config?.evaluationTitle || "종합평가시스템";
    
    console.log('🎨 평가위원 심사표 템플릿 생성:', {
      candidateName,
      candidateCategory,
      sectionsCount: templateData?.sections?.length || 0,
      totalScore: templateData?.totalScore || 0
    });

    return {
      title: `${candidateName} 심사표`,
      subtitle: `구분 · ${candidateCategory} · ${evaluationTitle}`,
      candidate: candidate,
      sections: templateData?.sections || [],
      totalScore: templateData?.totalScore || 100,
      isDataTemplate: true // 데이터베이스 기반 템플릿임을 표시
    };
  };

  // 평가 점수 변경 함수
  const handleScoreChange = (itemId: string, score: number, maxScore: number) => {
    if (score > maxScore) {
      toast({
        title: "점수 초과",
        description: `최대 ${maxScore}점까지 입력 가능합니다.`,
        variant: "destructive",
      });
      return;
    }
    setEvaluationScores(prev => ({
      ...prev,
      [itemId]: score
    }));
  };

  // 평가 점수 저장 (CODE 기반)
  const handleScoreSubmit = async (candidateId: number, scores: Record<string, number>) => {
    try {
      // 🎯 CODE 기반 점수 저장을 위한 변환
      const codeBasedScores: Record<string, number> = {};
      
      // 현재 템플릿에서 ID->CODE 매핑 생성
      const idToCodeMap = new Map<string, string>();
      if (evaluationTemplate?.sections) {
        evaluationTemplate.sections.forEach(section => {
          section.items.forEach(item => {
            idToCodeMap.set(item.evaluationItemId?.toString() || '', item.code);
          });
        });
      }
      
      // 점수를 CODE 기반으로 변환
      for (const [itemId, score] of Object.entries(scores)) {
        const itemCode = idToCodeMap.get(itemId);
        if (itemCode) {
          codeBasedScores[itemCode] = score;
          console.log(`🔄 점수 변환: ID(${itemId}) -> CODE(${itemCode}) = ${score}`);
        } else {
          console.warn(`⚠️ 평가항목 ID ${itemId}에 대한 코드를 찾을 수 없습니다.`);
          // 호환성을 위해 ID도 유지
          codeBasedScores[itemId] = score;
        }
      }
      
      console.log('💾 CODE 기반 점수 저장:', { candidateId, codeBasedScores });
      
      const totalScore = Object.values(codeBasedScores).reduce((sum, score) => sum + score, 0);
      
      const response = await fetch('/api/evaluator/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          candidateId,
          scores: codeBasedScores, // 🎯 CODE 기반 점수 전송
          totalScore,
          isCompleted: true
        })
      });
      
      if (response.ok) {
        console.log('✅ CODE 기반 점수 저장 성공');
        await loadEvaluationData();
        setIsEvaluationModalOpen(false);
      } else {
        console.error('❌ CODE 기반 점수 저장 실패');
      }
    } catch (error) {
      console.error('❌ CODE 기반 점수 저장 오류:', error);
    }
  };

  // 임시 저장 뮤테이션
  const saveTemporaryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/evaluator/evaluation/save-temporary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('임시 저장 실패');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "임시 저장 완료",
        description: "평가 내용이 임시 저장되었습니다.",
        variant: "success" as any,
      });
      // 모달 닫기
      setIsEvaluationModalOpen(false);
      setEvaluationScores({});
      setPresetScoresMap({});
      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/progress"] });
      // 알림 후 즉시 사라지도록 타이머 설정
      setTimeout(() => {
        // 이미 toast가 자동으로 사라지므로 추가 작업 불필요
      }, 1000);
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "임시 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // 평가 완료 뮤테이션
  const completeEvaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🚀 평가완료 API 호출 시작:', data);
      const response = await fetch('/api/evaluator/evaluation/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      console.log('📥 평가완료 API 응답 상태:', response.status);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ 평가완료 API 오류:', errorData);
        throw new Error(`평가 완료 실패: ${response.status} - ${errorData}`);
      }
      const result = await response.json();
      console.log('✅ 평가완료 API 성공:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('🎉 평가완료 성공 콜백:', data);
      toast({
        title: "평가 완료",
        description: "평가가 성공적으로 완료되었습니다.",
        variant: "success" as any,
      });
      setIsEvaluationModalOpen(false);
      setShowConfirmDialog(false);
      setEvaluationScores({});
      setPresetScoresMap({});
      // 화면 비율을 100%로 복원
      document.body.style.zoom = '1';
      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/progress"] });
    },
    onError: (error) => {
      console.error('💥 평가완료 에러 콜백:', error);
      toast({
        title: "평가 실패",
        description: `평가 완료 중 오류가 발생했습니다: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // 임시 저장 함수
  const handleTemporarySave = () => {
    const totalScore = Object.values(evaluationScores).reduce((sum, score) => sum + score, 0);
    const data = {
      candidateId: selectedCandidate.id,
      scores: evaluationScores,
      totalScore,
      isCompleted: false
    };
    saveTemporaryMutation.mutate(data);
  };

  // 평가 완료 함수
  const handleCompleteEvaluation = () => {
    console.log('🎯 평가완료 버튼 클릭');
    console.log('📊 현재 평가 점수:', evaluationScores);
    console.log('👤 선택된 평가대상:', selectedCandidate);
    setShowConfirmDialog(true);
  };

  // 평가 완료 확인 함수
  const confirmCompleteEvaluation = () => {
    console.log('✅ 평가완료 확인 버튼 클릭');
    const totalScore = Object.values(evaluationScores).reduce((sum, score) => sum + score, 0);
    const data = {
      candidateId: selectedCandidate.id,
      scores: evaluationScores,
      totalScore,
      isCompleted: true
    };
    console.log('📤 평가완료 데이터 전송:', data);
    completeEvaluationMutation.mutate(data);
  };

  // Supabase 실시간 연결 및 폴링 백업 시스템
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    let supabase: any;

    const initializeRealtime = async () => {
      try {
        // Supabase 클라이언트 초기화
        supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL || 'https://bqgbppdppkhsqkekqrui.supabase.co',
          import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZ2JwcGRwcGtoc3FrZWtxcnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTY5MDAsImV4cCI6MjA2NjkzMjkwMH0.dRlTpr_LuIofkxWuW5mv8m0rUNzztgEpzwkGbIHQQTc'
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

  // 진행률 데이터 가져오기
  const { data: progress = {} } = useQuery({
    queryKey: ["/api/evaluator/progress"],
    refetchOnWindowFocus: true,
    refetchInterval: 3000, // 3초마다 자동 갱신
    staleTime: 1000,
  });

  // 카테고리 데이터 가져오기 (현재 미사용이지만 향후 확장용)
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/evaluator/categories"],
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // 5초마다 자동 갱신
    staleTime: 2000,
  });

  // 평가 항목 데이터 가져오기 (현재 미사용이지만 향후 확장용)
  const { data: evaluationItems = [] } = useQuery({
    queryKey: ["/api/evaluator/evaluation-items"],
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    staleTime: 2000,
  });

  // 시스템 설정 가져오기 (현재 미사용이지만 향후 확장용)
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

  // 🔧 수정: 미리보기 모달 점수 매칭 로직 (정확한 ID 매칭)
  const openPreviewModal = async (candidate: any) => {
    try {
      console.log('🔍 미리보기 모달 열기:', candidate);
      
      // 데이터 가져오기
      const [evaluationResponse, categoriesResponse, evaluationItemsResponse, systemConfigResponse] = await Promise.all([
        fetch(`/api/evaluator/evaluation/${candidate.id}`, { credentials: 'include' }),
        fetch('/api/evaluator/categories', { credentials: 'include' }),
        fetch('/api/evaluator/evaluation-items', { credentials: 'include' }),
        fetch('/api/system/config', { credentials: 'include' })
      ]);
      
      // 평가 점수 데이터
      let previewScores: any = {};
      if (evaluationResponse.ok) {
        const data = await evaluationResponse.json();
        console.log('📊 미리보기 점수 데이터:', data.scores);
        previewScores = data.scores || {};
      }

      // 관리자 심사표 데이터
      let categories: any[] = [];
      let evaluationItems: any[] = [];
      let systemConfig: any = {};
      
      if (categoriesResponse.ok) categories = await categoriesResponse.json();
      if (evaluationItemsResponse.ok) evaluationItems = await evaluationItemsResponse.json();
      if (systemConfigResponse.ok) systemConfig = await systemConfigResponse.json();

      // 템플릿 변환
      const convertedTemplate = convertDataToTemplate(categories, evaluationItems, systemConfig);
      
      // 🎯 간단한 정확한 점수 매칭 (evaluation_item_id 기반)
      if (convertedTemplate?.sections) {
        convertedTemplate.sections.forEach((section: any) => {
          section.items.forEach((item: any) => {
            // 🎯 정확한 ID 매칭 (Supabase 구조에 맞춤)
            const itemId = item.evaluationItemId;
            const actualScore = previewScores[itemId?.toString()] || 0;
            
            console.log(`🔍 미리보기 점수 매칭: "${item.text}"`);
            console.log(`   📝 평가항목 ID: ${itemId}`);
            console.log(`   📊 찾은 점수: ${actualScore}`);
            console.log(`   ---`);
            
            // 점수 설정
            item.score = actualScore;
          });
        });
      }

      console.log('🎯 미리보기 모달 최종 템플릿 (점수 반영 후):', convertedTemplate);

      // 모달 상태 설정
      setPreviewCandidate(candidate);
      setPreviewScores(previewScores);
      setEvaluationTemplate(convertedTemplate);
      setIsPreviewModalOpen(true);
      
      console.log('✅ 미리보기 모달 열기 완료');

    } catch (error) {
      console.error('❌ 미리보기 모달 열기 실패:', error);
      alert('결과 확인 중 오류가 발생했습니다.');
    }
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
                          {result.isCompleted ? (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex items-center space-x-1 bg-green-50 text-green-700 border-green-200 cursor-not-allowed"
                              disabled
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>평가완료</span>
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex items-center space-x-1"
                              onClick={() => openEvaluationModal(result.candidate)}
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>평가</span>
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {result.isCompleted ? (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => openPreviewModal(result.candidate)}
                            >
                              <Eye className="h-3 w-3" />
                              <span>결과확인</span>
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="flex items-center space-x-1 text-gray-400 cursor-not-allowed"
                              disabled
                            >
                              <Eye className="h-3 w-3" />
                              <span>결과확인</span>
                            </Button>
                          )}
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

        {/* 평가 모달 - 완전히 새로운 전문적인 디자인 */}
        {selectedCandidate && isEvaluationModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-2 border-gray-300">
              {/* 모달 헤더 */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-white bg-opacity-20 rounded-lg p-2">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedCandidate.name} 심사표
                    </h2>
                    <p className="text-slate-200 text-base">평가 진행 중</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* 상단 액션 버튼들 */}
                  <Button
                    onClick={() => {
                      setIsEvaluationModalOpen(false);
                      // 화면 비율을 100%로 복원
                      document.body.style.zoom = '1';
                    }}
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
                  >
                    임시저장
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

              {/* 모달 컨텐츠 */}
              <div className="bg-gray-50 overflow-y-auto max-h-[calc(90vh-80px)]">
                {evaluationTemplate && (
                  <div className="p-6">


                    {/* 평가 항목 테이블 */}
                    <div className="bg-white border-2 border-black rounded-lg overflow-hidden shadow-lg">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black px-2 py-2 text-center font-bold text-gray-900 text-base">
                              구분 ({evaluationTemplate.totalScore || 100}점)
                            </th>
                            <th className="border border-black px-2 py-2 text-center font-bold text-gray-900 text-base">
                              세부 항목
                            </th>
                            <th className="border border-black px-2 py-2 text-center font-bold text-gray-900 text-base">
                              유형
                            </th>
                            <th className="border border-black px-2 py-2 text-center font-bold text-gray-900 text-base">
                              배점
                            </th>
                            <th className="border border-black px-2 py-2 text-center font-bold text-gray-900 text-base">
                              평가점수
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            // 데이터베이스 템플릿 사용 여부에 따라 다른 로직 적용
                            if (evaluationTemplate.isDataTemplate && evaluationTemplate.sections) {
                              // 데이터베이스 기반 템플릿 사용
                              console.log('🎨 데이터베이스 템플릿으로 렌더링:', evaluationTemplate.sections);
                              
                              let totalPoints = 0;
                              return evaluationTemplate.sections.map((section: any) => {
                                if (!section?.items || !Array.isArray(section.items)) {
                                  return null;
                                }
                                
                                const sectionTotal = section.items.reduce((sum: number, item: any) => sum + (item.points || item.maxScore || 0), 0);
                                totalPoints += sectionTotal;
                                
                                return section.items.map((item: any, itemIndex: number) => (
                                  <tr key={`${section.title}-${itemIndex}`} className="hover:bg-gray-50">
                                    {itemIndex === 0 && (
                                      <td 
                                        className="border border-black px-2 py-2 text-center font-bold bg-gray-50 align-middle"
                                        rowSpan={section.items.length}
                                      >
                                        <div className="text-base font-bold text-gray-900">{section.title}</div>
                                        <div className="text-sm text-gray-600 mt-1 font-normal">({sectionTotal}점)</div>
                                      </td>
                                    )}
                                    <td className="border border-black px-2 py-2 text-base text-gray-900">
                                      {itemIndex + 1}. {item.text || item.name}
                                    </td>
                                    <td className="border border-black px-2 py-2 text-center text-base text-gray-900">
                                      <span className={`font-medium ${item.type === '정량' ? 'text-blue-600' : 'text-green-600'}`}>
                                        {item.type}
                                      </span>
                                    </td>
                                    <td className="border border-black px-2 py-2 text-center text-base font-medium text-gray-900">
                                      {item.points}점
                                    </td>
                                    <td className={`border border-black px-2 py-2 text-center ${
                                      // 사전점수가 있으면 빨간 배경, 없으면 파란 배경
                                      (presetScoresMap[item.evaluationItemId?.toString()] || presetScoresMap[item.evaluationItemId]) ? 'bg-red-50' : 'bg-blue-50'
                                    }`}>
                                      {(() => {
                                        // 실제 evaluation_item.id 기준으로 확인
                                        const itemKey = item.evaluationItemId?.toString() || item.id?.toString();
                                        const hasPresetScore = presetScoresMap[itemKey]; 
                                        const currentScore = evaluationScores[itemKey];
                                        
                                        console.log(`🎯 평가항목 ${item.id} 점수 확인:`, {
                                          itemId: item.id,
                                          itemKey,
                                          hasPresetScore,
                                          currentScore,
                                          presetMap: presetScoresMap,
                                          allScores: evaluationScores
                                        });
                                        
                                        if (hasPresetScore) {
                                          // 사전점수가 있는 경우 - 읽기 전용 (최우선)
                                          return (
                                            <div className="relative bg-red-50">
                                              <span className="text-lg font-bold text-red-700">
                                                {currentScore !== undefined ? currentScore : 0}점
                                              </span>
                                            </div>
                                          );
                                        } else {
                                          // 일반 입력 (기존 평가점수 포함)
                                          return (
                                            <Input
                                              type="number"
                                              min="0"
                                              max={item.points}
                                              placeholder=""
                                              value={currentScore !== undefined ? currentScore : ""}
                                              onChange={(e) => {
                                                const value = e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
                                                handleScoreChange(itemKey, value, item.points);
                                              }}
                                              onFocus={(e) => {
                                                if (e.target.value === "0") {
                                                  e.target.value = "";
                                                }
                                              }}
                                              onBlur={(e) => {
                                                if (e.target.value === "") {
                                                  const value = 0;
                                                  handleScoreChange(itemKey, value, item.points);
                                                }
                                              }}
                                              className="w-20 text-center text-base mx-auto bg-white border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              style={{ 
                                                MozAppearance: 'textfield',
                                                WebkitAppearance: 'none'
                                              }}
                                            />
                                          );
                                        }
                                      })()}
                                    </td>
                                  </tr>
                                ));
                              }).flat().filter(Boolean).concat([
                                // 합계 행
                                <tr key="total" className="bg-yellow-100 font-bold">
                                  <td className="border border-black px-2 py-2 text-center font-bold text-gray-900 text-base" colSpan={2}>
                                    합계
                                  </td>
                                  <td className="border border-black px-2 py-2 text-center"></td>
                                  <td className="border border-black px-2 py-2 text-center font-bold text-gray-900 text-base">
                                    {totalPoints}점
                                  </td>
                                  <td className="border border-black px-2 py-2 text-center bg-blue-50">
                                    <span className="text-xl font-bold text-blue-800">
                                      {(() => {
                                        // 현재 템플릿에 표시되는 항목들의 점수만 합산
                                        const templateItemIds = (evaluationTemplate.sections || []).flatMap((section: any) => 
                                          section.items?.map((item: any) => item.evaluationItemId?.toString() || item.id?.toString()) || []
                                        );
                                        const currentTotal = templateItemIds.reduce((sum: number, itemId: string) => {
                                          const score = evaluationScores[itemId] || 0;
                                          return sum + score;
                                        }, 0);
                                        return currentTotal;
                                      })()}점
                                    </span>
                                  </td>
                                </tr>
                              ]);
                            } else {
                              // 기존 로직 (categories와 evaluationItems 사용)
                              if (!Array.isArray(categories) || !Array.isArray(evaluationItems)) {
                                return null;
                              }
                              
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
                                <tr key={`${categoryName}-${itemIndex}`} className="hover:bg-gray-50">
                                  {itemIndex === 0 && (
                                    <td 
                                      className="border border-black px-2 py-2 text-center font-bold bg-gray-50 align-middle"
                                      rowSpan={items.length}
                                    >
                                      <div className="text-base font-bold text-gray-900">{categoryName}</div>
                                      <div className="text-sm text-gray-600 mt-1 font-normal">({categoryTotal}점)</div>
                                    </td>
                                  )}
                                  <td className="border border-black px-2 py-2 text-base text-gray-900">
                                    {itemIndex + 1}. {item.itemName || item.description}
                                  </td>
                                  <td className="border border-black px-2 py-2 text-center text-base text-gray-900">
                                    <span className={`font-medium ${item.isQuantitative ? 'text-blue-600' : 'text-green-600'}`}>
                                      {item.isQuantitative ? '정량' : '정성'}
                                    </span>
                                  </td>
                                  <td className="border border-black px-2 py-2 text-center text-base font-medium text-gray-900">
                                    {item.maxScore}점
                                  </td>
                                  <td className={`border border-black px-2 py-2 text-center ${
                                    // 사전점수가 있으면 빨간 배경, 없으면 파란 배경
                                    (presetScoresMap[item.id.toString()] || presetScoresMap[item.id]) ? 'bg-red-50' : 'bg-blue-50'
                                  }`}>
                                    {(() => {
                                      // 평가 항목 ID 기준으로 확인
                                      const itemKey = item.id.toString();
                                      const hasPresetScore = presetScoresMap[itemKey] || presetScoresMap[item.id]; // candidate_preset_scores에서 가져온 사전점수
                                      const currentScore = evaluationScores[itemKey] !== undefined ? evaluationScores[itemKey] : evaluationScores[item.id];
                                      
                                      if (hasPresetScore) {
                                        // 사전점수가 있는 경우 - 읽기 전용 (최우선)
                                        return (
                                          <div className="relative bg-red-50">
                                            <span className="text-lg font-bold text-red-700">
                                              {currentScore !== undefined ? currentScore : 0}점
                                            </span>
                                          </div>
                                        );
                                      } else {
                                        // 일반 입력 (기존 평가점수 포함)
                                        return (
                                          <Input
                                            type="number"
                                            min="0"
                                            max={item.maxScore}
                                            placeholder=""
                                            value={currentScore !== undefined ? currentScore : ""}
                                            onChange={(e) => {
                                              const value = e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
                                              handleScoreChange(itemKey, value, item.maxScore);
                                            }}
                                            onFocus={(e) => {
                                              if (e.target.value === "0") {
                                                e.target.value = "";
                                              }
                                            }}
                                            onBlur={(e) => {
                                              if (e.target.value === "") {
                                                const value = 0;
                                                handleScoreChange(itemKey, value, item.maxScore);
                                              }
                                            }}
                                            className="w-20 text-center text-base mx-auto bg-white border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            style={{ 
                                              MozAppearance: 'textfield',
                                              WebkitAppearance: 'none'
                                            }}
                                          />
                                        );
                                      }
                                    })()}
                                  </td>
                                </tr>
                              ));
                            }).flat().concat([
                              // 합계 행
                              <tr key="total" className="bg-yellow-100 font-bold">
                                <td className="border border-black px-2 py-2 text-center font-bold text-gray-900 text-base" colSpan={2}>
                                  합계
                                </td>
                                <td className="border border-black px-2 py-2 text-center"></td>
                                <td className="border border-black px-2 py-2 text-center font-bold text-gray-900 text-base">
                                  {totalPoints}점
                                </td>
                                <td className="border border-black px-2 py-2 text-center bg-blue-50">
                                  <span className="text-xl font-bold text-blue-800">
                                    {(() => {
                                      // 현재 템플릿에 표시되는 항목들의 점수만 합산
                                                                                                                      const templateItemIds = (evaluationTemplate.sections || []).flatMap((section: any) => 
                                          section.items?.map((item: any) => item.evaluationItemId?.toString() || item.id?.toString()) || []
                                        );
                                      const currentTotal = templateItemIds.reduce((sum: number, itemId: string) => {
                                        const score = evaluationScores[itemId] || 0;
                                        return sum + score;
                                      }, 0);
                                      return currentTotal;
                                    })()}점
                                  </span>
                                </td>
                              </tr>
                            ]);
                            }
                          })()}
                        </tbody>
                      </table>
                    </div>




                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 평가 완료 확인 다이얼로그 - 커스텀 모달 */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border-2 border-slate-300">
              {/* 헤더 */}
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6 rounded-t-xl">
                <h2 className="text-2xl font-bold text-center">
                  🔒 평가 완료 확인
                </h2>
              </div>
              
              {/* 내용 */}
              <div className="p-6">
                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-slate-800 font-medium text-xl mb-3 text-center">
                    평가를 완료하시겠습니까?
                  </p>
                  <p className="text-red-700 font-bold text-base text-center bg-red-50 p-3 rounded border-2 border-red-200">
                    ⚠️ '평가 완료'를 누르면 더 이상 수정할 수 없습니다.<br/>
                    제출하시겠습니까?
                  </p>
                </div>
                
                {/* 버튼들 */}
                <div className="flex justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('🔄 평가완료 취소 버튼 클릭');
                      setShowConfirmDialog(false);
                    }}
                    className="px-6 py-3 font-medium border-2 border-slate-400 text-slate-700 hover:bg-slate-100 shadow-md"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🎯 평가완료 확인 버튼 직접 클릭됨');
                      confirmCompleteEvaluation();
                    }}
                    disabled={completeEvaluationMutation.isPending}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 font-bold shadow-lg border-2 border-blue-600"
                  >
                    {completeEvaluationMutation.isPending ? "완료 처리 중..." : "평가 완료"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 미리보기 모달 - 완전한 구조 */}
        {isPreviewModalOpen && previewCandidate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex-1 text-center">
                    <h2 className="text-3xl font-bold text-gray-800">
                      {previewCandidate.name} 심사표
                    </h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-black">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black px-3 py-3 text-center font-bold text-sm">구분</th>
                            <th className="border border-black px-4 py-3 text-center font-bold text-sm">세부 항목</th>
                            <th className="border border-black px-3 py-3 text-center font-bold text-sm">유형</th>
                            <th className="border border-black px-3 py-3 text-center font-bold text-sm">배점</th>
                            <th className="border border-black px-3 py-3 text-center font-bold text-sm">평가점수</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            if (!evaluationTemplate || !evaluationTemplate.sections) {
                              return (
                                <tr>
                                  <td colSpan={5} className="text-center py-4 text-gray-500">
                                    심사표 데이터를 불러오는 중...
                                  </td>
                                </tr>
                              );
                            }

                            return evaluationTemplate.sections.map((section: any) => {
                              return section.items.map((item: any, itemIndex: number) => (
                                <tr key={`${section.id}-${itemIndex}`} className="hover:bg-gray-50">
                                  {itemIndex === 0 && (
                                    <td 
                                      className="border border-black px-3 py-4 text-center font-bold bg-gray-50 align-middle"
                                      rowSpan={section.items.length}
                                    >
                                      <div className="text-sm font-bold text-gray-900">{section.title}</div>
                                      <div className="text-xs text-gray-600 mt-1 font-normal">({section.totalPoints}점)</div>
                                    </td>
                                  )}
                                  <td className="border border-black px-4 py-3 text-sm text-gray-900">
                                    {itemIndex + 1}. {item.text}
                                  </td>
                                  <td className="border border-black px-3 py-3 text-center text-sm text-gray-900">
                                    {item.type}
                                  </td>
                                  <td className="border border-black px-3 py-3 text-center text-sm font-medium text-gray-900">
                                    {item.points}점
                                  </td>
                                  <td className="border border-black px-3 py-3 text-center text-sm font-medium text-blue-600">
                                    {/* 🔧 수정: 실제 저장된 점수 표시 */}
                                    <strong>{item.score || 0}점</strong>
                                  </td>
                                </tr>
                              ));
                            }).flat().concat([
                              // 합계 행
                              <tr key="total" className="bg-yellow-100 font-bold">
                                <td className="border border-black px-3 py-3 text-center text-sm">합계</td>
                                <td className="border border-black px-4 py-3 text-center text-sm"></td>
                                <td className="border border-black px-3 py-3 text-center text-sm"></td>
                                <td className="border border-black px-3 py-3 text-center text-sm font-medium">
                                  {evaluationTemplate.totalScore}점
                                </td>
                                <td className="border border-black px-3 py-3 text-center text-sm font-bold text-blue-600">
                                  {/* 🔧 수정: 실제 점수 합계 표시 */}
                                  <strong>
                                    {evaluationTemplate.sections.reduce((total: number, section: any) => 
                                      total + section.items.reduce((sectionTotal: number, item: any) => 
                                        sectionTotal + (item.score || 0), 0), 0)}점
                                  </strong>
                                </td>
                              </tr>
                            ]);
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="px-6 py-2 bg-gray-600 text-white hover:bg-gray-700"
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


