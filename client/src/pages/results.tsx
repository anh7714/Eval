import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, Users, FileText, BarChart3, Award, Trophy, Target, Scale, X, CheckCircle, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정 (평가항목관리와 동일)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://bqgbppdppkhsqkekqrui.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZ2JwcGRwcGtoc3FrZWtxcnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTY5MDAsImV4cCI6MjA2NjkzMjkwMH0.dRlTpr_LuIofkxWuW5mv8m0rUNzztgEpzwkGbIHQQTc'
);

interface CandidateResult {
  candidate: {
    id: number;
    name: string;
    department: string;
    position: string;
    category: string;
    mainCategory?: string;  // 메인 카테고리 (구분)
    subCategory?: string;   // 서브 카테고리 (세부구분)
  };
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  evaluatorCount: number;
  completedEvaluations: number;
  averageScore: number;
  rank: number;
}

// Editor.js blocks -> HTML 변환 함수
function renderEditorBlocks(blocks: Array<{ type: string; data: any }>): string {
  let html = '';
  for (const block of blocks) {
    switch (block.type) {
      case 'header':
        html += `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
        break;
      case 'paragraph':
        html += `<p>${block.data.text}</p>`;
        break;
      case 'table':
        if (block.data.content) {
          html += '<table style="border-collapse:collapse;width:100%;margin:16px 0;">';
          for (const row of block.data.content) {
            html += '<tr>';
            for (const cell of row) {
              html += `<td style="border:1px solid #333;padding:8px;">${cell}</td>`;
            }
            html += '</tr>';
          }
          html += '</table>';
        }
        break;
      case 'list':
        if (block.data.style === 'ordered') {
          html += '<ol>';
          for (const item of block.data.items) {
            html += `<li>${item}</li>`;
          }
          html += '</ol>';
        } else {
          html += '<ul>';
          for (const item of block.data.items) {
            html += `<li>${item}</li>`;
          }
          html += '</ul>';
        }
        break;
      default:
        // 기타 블록은 무시 또는 필요시 추가 구현
        break;
    }
  }
  return html;
}

export default function ResultsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("all"); // 메인 카테고리 (구분)
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");   // 서브 카테고리 (세부구분)
  const [activeTab, setActiveTab] = useState<string>("ranking");
  const [rankingActiveTab, setRankingActiveTab] = useState<string>("overall"); // 순위결과 섹션 전용 탭 상태
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  // 보고서 출력용 상태 변수들
  const [selectedEvaluator, setSelectedEvaluator] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);

  
  // 🎯 평가항목관리와 동일한 컬럼 설정
  const [columnConfig] = useState([
    { id: 'section', title: '구분', type: 'section', visible: true, required: true, width: 'w-32' },
    { id: 'item', title: '세부 항목', type: 'text', visible: true, required: true, width: 'flex-1' },
    { id: 'type', title: '유형', type: 'select', visible: true, required: false, width: 'w-16', options: ['정량', '정성'] },
    { id: 'points', title: '배점', type: 'number', visible: true, required: true, width: 'w-16' },
    { id: 'score', title: '평가점수', type: 'number', visible: true, required: true, width: 'w-20' },
  ]);



  // 🔧 평가항목관리와 동일한 방식: 평가 결과 실시간 구독
  useEffect(() => {
    let resultsChannel: any;
    let resultsPollingInterval: NodeJS.Timeout;
    let isResultsRealtimeConnected = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupResultsSubscription = () => {
      console.log(`🔄 평가결과 실시간 구독 시도 ${retryCount + 1}/${maxRetries}`);
      
      resultsChannel = supabase
        .channel(`results-${Date.now()}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'evaluation_sessions' 
          }, 
          (payload) => {
            console.log('📡 평가결과 실시간 변경:', payload.eventType);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/results"] });
            queryClient.invalidateQueries({ queryKey: ["/api/system/stats"] });
          }
        )
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'evaluation_item_scores' 
          }, 
          (payload) => {
            console.log('📡 평가점수 실시간 변경:', payload.eventType);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/results"] });
            queryClient.invalidateQueries({ queryKey: ["/api/system/stats"] });
          }
        )
        .subscribe((status) => {
          console.log('📡 평가결과 구독 상태:', status);
          
          if (status === 'SUBSCRIBED') {
            isResultsRealtimeConnected = true;
            setIsRealtimeConnected(true);
            retryCount = 0;
            if (resultsPollingInterval) {
              clearInterval(resultsPollingInterval);
            }
            console.log('✅ 평가결과 실시간 구독 성공');
          } else if (status === 'CHANNEL_ERROR') {
            isResultsRealtimeConnected = false;
            setIsRealtimeConnected(false);
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(() => {
                console.log('🔄 평가결과 재연결 시도...');
                supabase.removeChannel(resultsChannel);
                setupResultsSubscription();
              }, 2000 * retryCount);
            } else {
              console.log('⚠️ 평가결과 실시간 연결 실패, 폴링으로 전환');
              startResultsPolling();
            }
          }
        });
    };

    const startResultsPolling = () => {
      if (!resultsPollingInterval) {
        resultsPollingInterval = setInterval(() => {
          if (!isResultsRealtimeConnected) {
            console.log('🔄 평가결과 폴링으로 데이터 동기화');
            queryClient.invalidateQueries({ queryKey: ["/api/admin/results"] });
            queryClient.invalidateQueries({ queryKey: ["/api/system/stats"] });
          }
        }, 8000); // 8초마다 폴링 (평가항목관리와 동일)
      }
    };

    setupResultsSubscription();

    return () => {
      if (resultsChannel) {
        supabase.removeChannel(resultsChannel);
      }
      if (resultsPollingInterval) {
        clearInterval(resultsPollingInterval);
      }
    };
  }, [queryClient]);

    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

  useEffect(() => {
    window.addEventListener('tabChange', handleTabChange as EventListener);
    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
    };
  }, []);

  // 🔧 수정: 실시간 연동 최적화된 데이터 쿼리들 (과도한 로딩 방지)
  const { data: results = [], isLoading: resultsLoading, error: resultsError } = useQuery({
    queryKey: ["/api/admin/results"],
    refetchInterval: false, // 자동 새로고침 비활성화 (실시간 구독만 사용)
    staleTime: 30000, // 30초
    refetchOnWindowFocus: false, // 창 포커스 시 새로고침 비활성화
    refetchOnMount: true,
  });

  // 🔧 기존 카테고리 시스템 제거됨

  // 계층적 카테고리 옵션 데이터 가져오기
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/system/stats"],
    refetchInterval: 60000, // 60초만 유지 (통계는 덜 중요)
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: evaluators = [] } = useQuery({
    queryKey: ["/api/admin/evaluators"],
    refetchInterval: false, // 자동 새로고침 비활성화
    staleTime: 60000, // 60초
    refetchOnWindowFocus: false,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["/api/admin/candidates"],
    refetchInterval: false, // 자동 새로고침 비활성화
    staleTime: 60000, // 60초
    refetchOnWindowFocus: false,
  });

  const { data: evaluationItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/admin/evaluation-items"],
    refetchInterval: false, // 자동 새로고침 비활성화
    staleTime: 30000, // 30초
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system/config"],
    refetchInterval: false, // 자동 새로고침 비활성화
    staleTime: 120000, // 2분
    refetchOnWindowFocus: false,
  });

  // 타입 안전한 결과 데이터
  const resultsData = results as CandidateResult[];
  const candidatesData = candidates as any[];
  const evaluatorsData = evaluators as any[];

  // 로딩 상태 체크 (조건부 return 대신 조건부 렌더링 사용)
  const isLoading = resultsLoading || itemsLoading;
  
  // 메인 카테고리 목록 (type: "main")
  const mainCategories = useMemo(() => {
    return Array.from(new Set(candidatesData.map((c: any) => c.mainCategory).filter(Boolean)));
  }, [candidatesData]);

  // 선택된 메인 카테고리의 서브 카테고리 목록
  const subCategories = useMemo(() => {
    if (selectedMainCategory === "all") {
      return Array.from(new Set(candidatesData.map((c: any) => c.subCategory).filter(Boolean)));
    }
    return Array.from(new Set(
      candidatesData
        .filter((c: any) => c.mainCategory === selectedMainCategory)
        .map((c: any) => c.subCategory)
        .filter(Boolean)
    ));
  }, [candidatesData, selectedMainCategory]);

  // 서브 카테고리 변경 시 자동으로 첫 번째 서브 카테고리 선택
  useEffect(() => {
    if (selectedMainCategory === "all") {
      setSelectedSubCategory("all");
    } else if (subCategories.length > 0 && selectedSubCategory === "all") {
      setSelectedSubCategory("all"); // 기본값 유지
    }
  }, [selectedMainCategory, subCategories]);

  // 🎯 순위 관련 데이터 처리 (useMemo로 메모이제이션)
  const passThreshold = 70;
  
  // 🔧 계층적 카테고리 필터링된 결과 데이터
  const filteredData = useMemo(() => {
    let data = [...resultsData];
    
    // 1. 메인 카테고리 필터링 (구분)
    if (selectedMainCategory !== "all") {
      data = data.filter((result: CandidateResult) => 
        result.candidate.mainCategory === selectedMainCategory
      );
    }
    
    // 2. 서브 카테고리 필터링 (세부구분)
    if (selectedSubCategory !== "all") {
      data = data.filter((result: CandidateResult) => 
        result.candidate.subCategory === selectedSubCategory
      );
    }
    
    return data;
  }, [selectedMainCategory, selectedSubCategory, resultsData]);
  
  const topPerformers = useMemo(() => filteredData.slice(0, 10), [filteredData]);
  const failedCandidates = useMemo(() => filteredData.filter((result: CandidateResult) => result.percentage < passThreshold), [filteredData]);
  const passedCandidates = useMemo(() => filteredData.filter((result: CandidateResult) => result.percentage >= passThreshold), [filteredData]);
  const totalCandidatesCount = useMemo(() => filteredData.length, [filteredData]);
  
  // 동점자 처리
  const tieGroups = useMemo(() => {
    return filteredData.reduce((groups: any, result: CandidateResult) => {
      const key = result.percentage.toFixed(1);
      if (!groups[key]) groups[key] = [];
      groups[key].push(result);
      return groups;
    }, {});
  }, [filteredData]);
  
  const tiedCandidates = useMemo(() => Object.values(tieGroups).filter((group: any) => group.length > 1), [tieGroups]);
  
  // 통계 데이터 계산
  const averageScoreValue = useMemo(() => {
    return filteredData.length > 0 
      ? filteredData.reduce((sum: number, result: CandidateResult) => sum + result.percentage, 0) / filteredData.length
      : 0;
  }, [filteredData]);

  // 🔧 기존 카테고리 시스템 제거됨

  // 🔧 메인 카테고리별 데이터 계산
  const mainCategoryResults = useMemo(() => {
    if (!filteredData || !mainCategories || filteredData.length === 0 || mainCategories.length === 0) return [];
    
    return mainCategories.map(mainCategory => {
      const mainCategoryData = filteredData.filter(result => 
        result.candidate.mainCategory === mainCategory.name
      );
    return {
        category: mainCategory.name,
        results: mainCategoryData.sort((a, b) => b.percentage - a.percentage),
        count: mainCategoryData.length,
        avgScore: mainCategoryData.length > 0 ? 
          mainCategoryData.reduce((sum, r) => sum + r.percentage, 0) / mainCategoryData.length : 0
      };
    });
  }, [filteredData, mainCategories]);

  // 🔧 서브 카테고리별 데이터 계산
  const subCategoryResults = useMemo(() => {
    if (!filteredData || !subCategories || filteredData.length === 0 || subCategories.length === 0) return [];
    
    return subCategories.map(subCategory => {
      const subCategoryData = filteredData.filter(result => 
        result.candidate.subCategory === subCategory.name
      );
      return {
        category: subCategory.name,
        results: subCategoryData.sort((a, b) => b.percentage - a.percentage),
        count: subCategoryData.length,
        avgScore: subCategoryData.length > 0 ? 
          subCategoryData.reduce((sum, r) => sum + r.percentage, 0) / subCategoryData.length : 0
      };
    });
  }, [filteredData, subCategories]);

  // 🔧 데이터 검증 및 디버깅
  useEffect(() => {
    console.log('📊 결과 페이지 데이터 상태:', {
      resultsLoading,
      itemsLoading,
      resultsCount: resultsData?.length || 0,
      evaluatorsCount: evaluatorsData?.length || 0,
      candidatesCount: candidatesData?.length || 0,
      mainCategoriesCount: mainCategories?.length || 0,
      subCategoriesCount: subCategories?.length || 0,
      filteredDataCount: filteredData?.length || 0,
      results: resultsData,
      mainCategories: mainCategories,
      subCategories: subCategories,
      filteredData: filteredData
    });

    // 🔧 계층적 카테고리 데이터 검증
    if (resultsData?.length > 0) {
      const candidatesWithMainCategory = resultsData.filter((result: CandidateResult) => result.candidate.mainCategory);
      const candidatesWithSubCategory = resultsData.filter((result: CandidateResult) => result.candidate.subCategory);
      
      console.log('📊 계층적 카테고리 사용 현황:', {
        totalCandidates: resultsData.length,
        withMainCategory: candidatesWithMainCategory.length,
        withSubCategory: candidatesWithSubCategory.length,
        mainCategoryValues: Array.from(new Set(candidatesWithMainCategory.map(r => r.candidate.mainCategory))),
        subCategoryValues: Array.from(new Set(candidatesWithSubCategory.map(r => r.candidate.subCategory)))
      });
    }
  }, [resultsLoading, itemsLoading, resultsData, evaluatorsData, candidatesData, mainCategories, subCategories, filteredData]);

  const convertDataToTemplate = (categories: any[], evaluationItems: any[], systemConfig: any) => {
    if (!Array.isArray(categories) || !Array.isArray(evaluationItems)) {
      return { title: "심사표", totalScore: 100, sections: [] };
    }
    
    if (categories.length === 0 || evaluationItems.length === 0) {
      return { title: "심사표", totalScore: 100, sections: [] };
    }

    const sections = categories.map((category: any, categoryIndex: number) => ({
      id: String.fromCharCode(65 + categoryIndex),
      title: category.name,
      totalPoints: evaluationItems
        .filter((item: any) => item.categoryId === category.id)
        .reduce((sum: number, item: any) => sum + (item.maxScore || 0), 0),
      items: evaluationItems
        .filter((item: any) => item.categoryId === category.id)
        .map((item: any, index: number) => ({
          id: index + 1,
          evaluationItemId: item.id,
          code: item.code,
          text: item.name,
          type: item.isQuantitative ? '정량' : '정성',
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



  const handleExportResults = () => {
    try {
      const exportData = filteredData.map((result: CandidateResult, index: number) => ({
        순위: result.rank,
        이름: result.candidate.name,
        소속: result.candidate.department,
        직책: result.candidate.position,
        구분: result.candidate.category,
        총점: result.totalScore,
        만점: result.maxPossibleScore,
        득점률: `${result.percentage.toFixed(1)}%`,
        평가위원수: result.evaluatorCount,
        완료평가수: result.completedEvaluations,
        평균점수: result.averageScore
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "평가결과");
      
      const fileName = `평가결과_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "내보내기 완료",
        description: `${fileName} 파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('Excel 내보내기 오류:', error);
      toast({
        title: "내보내기 실패",
        description: "파일 내보내기 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = (reportType: string) => {
    try {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      const timestamp = today.toLocaleString('ko-KR');
      
      let reportData: any[] = [];
      let sheetName = '';
      let filename = '';

      switch (reportType) {
        case 'ranking':
          reportData = filteredData.map((result: CandidateResult) => ({
            순위: result.rank,
            이름: result.candidate.name,
            소속: result.candidate.department || '',
            직책: result.candidate.position || '',
            구분: result.candidate.mainCategory || result.candidate.category || '',
            세부구분: result.candidate.subCategory || '',
            총점: result.totalScore,
            만점: result.maxPossibleScore,
            득점률: `${result.percentage.toFixed(1)}%`,
            평가위원수: result.evaluatorCount,
            완료평가수: result.completedEvaluations
          }));
          sheetName = '순위결과';
          filename = `순위결과보고서_${dateString}.xlsx`;
          break;

        case 'detailed':
          reportData = filteredData.map((result: CandidateResult) => ({
            순위: result.rank,
            이름: result.candidate.name,
            소속: result.candidate.department || '',
            직책: result.candidate.position || '',
            구분: result.candidate.mainCategory || result.candidate.category || '',
            세부구분: result.candidate.subCategory || '',
            총점: result.totalScore,
            만점: result.maxPossibleScore,
            득점률: `${result.percentage.toFixed(1)}%`,
            평균점수: result.averageScore,
            평가위원수: result.evaluatorCount,
            완료평가수: result.completedEvaluations,
            합격여부: result.percentage >= 70 ? '합격' : '불합격'
          }));
          sheetName = '상세분석';
          filename = `상세분석보고서_${dateString}.xlsx`;
          break;

        case 'custom':
          const customData = filteredData; // 이미 필터링된 데이터 사용
          reportData = customData.map((result: CandidateResult) => ({
            순위: result.rank,
            이름: result.candidate.name,
            소속: result.candidate.department || '',
            직책: result.candidate.position || '',
            구분: result.candidate.mainCategory || result.candidate.category || '',
            세부구분: result.candidate.subCategory || '',
            총점: result.totalScore,
            만점: result.maxPossibleScore,
            득점률: `${result.percentage.toFixed(1)}%`,
            평가위원수: result.evaluatorCount,
            완료평가수: result.completedEvaluations
          }));
          sheetName = '사용자정의';
          filename = `사용자정의보고서_${dateString}.xlsx`;
          break;

        case 'excel':
          handleExportResults();
          return;

        default:
          throw new Error('알 수 없는 보고서 유형');
      }

      // 보고서 헤더 추가
      const headerData = [
        { '보고서 제목': `평가 결과 보고서 (${reportType === 'ranking' ? '순위 결과' : reportType === 'detailed' ? '상세 분석' : '사용자 정의'})` },
        { '보고서 제목': `생성일시: ${timestamp}` },
        { '보고서 제목': `총 평가대상 수: ${reportData.length}명` },
        { '보고서 제목': `구분: ${selectedMainCategory === 'all' ? '전체' : selectedMainCategory}` },
        { '보고서 제목': `세부구분: ${selectedSubCategory === 'all' ? '전체' : selectedSubCategory}` },
        { '보고서 제목': '' }, // 빈 줄
      ];

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(headerData);
      XLSX.utils.sheet_add_json(worksheet, reportData, { skipHeader: false, origin: 'A6' });

      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // 파일 다운로드
      XLSX.writeFile(workbook, filename);

      toast({
        title: "보고서 생성 완료",
        description: `${filename} 파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "보고서 생성 실패",
        description: "보고서 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };





  // 🔧 실제 평가점수 가져오기 함수
  const getActualEvaluationScores = async (evaluatorId: number, candidateId: number) => {
    try {
      // 🎯 이전 코드와 동일한 정확한 API 엔드포인트 사용
      const response = await fetch(`/api/admin/evaluation/${evaluatorId}/${candidateId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('평가점수 조회 실패, 빈 점수 반환');
        return { scores: {}, totalScore: 0 };
      }

      const data = await response.json();
      console.log('📊 실제 평가 데이터:', data);
      console.log('📊 평가 점수 (scores):', data.scores);
      console.log('📊 총점 (totalScore):', data.totalScore);
      
      return data;
    } catch (error) {
      console.error('평가점수 조회 오류:', error);
      return { scores: {}, totalScore: 0 };
    }
  };

  // 🎯 평가위원 결과확인 모달과 동일한 방식으로 심사표 생성
  const generateEvaluationHTML = async (evaluatorInfo: any, candidateInfo: any) => {
    const today = new Date().toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // 🎯 평가위원 결과확인 모달과 동일한 데이터 가져오기
    let actualScores: Record<string, number> = {};
    let actualTotalScore = 0;
    let actualTemplate: any = null;
    
    try {
      // 1. 실제 평가 데이터, 카테고리, 평가항목, 시스템 설정 가져오기
      const [evaluationResponse, categoriesResponse, itemsResponse, configResponse] = await Promise.all([
        fetch(`/api/admin/evaluation/${evaluatorInfo.id}/${candidateInfo.id}`, {
          method: 'GET',
          credentials: 'include'
        }),
        fetch('/api/admin/categories'),
        fetch('/api/admin/evaluation-items'),
        fetch('/api/system/config')
      ]);

      // 2. 실제 평가 점수 데이터
      if (evaluationResponse.ok) {
        const evaluationData = await evaluationResponse.json();
        console.log('📊 결과확인 실제 평가 데이터:', evaluationData);
        console.log('📊 결과확인 평가 점수 (scores):', evaluationData.scores);
        console.log('📊 결과확인 총점 (totalScore):', evaluationData.totalScore);
        
        if (evaluationData.scores) {
          actualScores = evaluationData.scores;
          actualTotalScore = evaluationData.totalScore || 0;
        }
      } else {
        console.error('❌ 평가 데이터 조회 실패:', evaluationResponse.status, evaluationResponse.statusText);
      }

      // 3. 카테고리와 평가항목 데이터
      let categoriesData: any[] = [];
      let itemsData: any[] = [];
      let configData: any = {};

      if (categoriesResponse.ok) {
        categoriesData = await categoriesResponse.json();
      }
      
      if (itemsResponse.ok) {
        itemsData = await itemsResponse.json();
      }
      
      if (configResponse.ok) {
        configData = await configResponse.json();
      }

      // 4. 평가위원 결과확인 모달과 동일한 템플릿 생성
      actualTemplate = convertDataToTemplate(categoriesData, itemsData, configData);
      console.log('🎯 결과확인 생성된 템플릿:', actualTemplate);

    } catch (error) {
      console.error('❌ 심사표 데이터 조회 오류:', error);
      // 오류 시 기본 템플릿 사용
      actualTemplate = {
        title: "심사표",
        totalScore: 100,
        sections: []
      };
    }

    // 5. 템플릿에 실제 점수 반영 (평가위원 결과확인 모달과 동일한 방식)
    const templateWithActualScores = {
      ...actualTemplate,
      sections: actualTemplate.sections.map((section: any) => ({
        ...section,
        items: section.items.map((item: any) => {
          // 🎯 평가위원 결과확인 모달과 동일한 정확한 ID 매칭
          const itemId = item.evaluationItemId;
          const actualScore = actualScores[itemId?.toString()] || 0;
          
          console.log(`🔍 보고서 출력 점수 매핑: "${item.text}"`);
          console.log(`   📝 평가항목 ID: ${itemId}`);
          console.log(`   📊 찾은 점수: ${actualScore}`);
          console.log(`   ---`);
          
          return {
            ...item,
            score: actualScore
          };
        })
      }))
    };

    console.log('🎯 결과확인 최종 템플릿 (점수 반영 후):', templateWithActualScores);

    // 제목 및 카테고리 정보 결정
    const candidateTitle = `${candidateInfo.name} 심사표`;
    const categoryInfo = candidateInfo.category || candidateInfo.department || '';
    const positionText = evaluatorInfo.position ? ` (${evaluatorInfo.position})` : '';

    // 총 배점 계산
    const totalPoints = templateWithActualScores.sections.reduce((sum: number, section: any) => 
      sum + section.items.reduce((itemSum: number, item: any) => itemSum + (item.points || 0), 0), 0
    );

    // 총 점수 계산 (실제 점수 사용)
    const totalScore = actualTotalScore || templateWithActualScores.sections.reduce((sum: number, section: any) => 
      sum + section.items.reduce((itemSum: number, item: any) => itemSum + (item.score || 0), 0), 0
    );

    console.log('📊 최종 점수 정보:', { totalPoints, totalScore, actualTotalScore });

    return `
      <!-- 제목과 구분 정보 표 -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #666;">
        <tr>
          <td colspan="2" style="border: 1px solid #666; padding: 8px; text-align: right; font-size: 12px;">
            <span>구분 : ${categoryInfo}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="border: 1px solid #666; padding: 16px; text-align: center; font-size: 18px; font-weight: bold;">
            ${candidateTitle}
          </td>
        </tr>
      </table>

      <!-- 평가 항목 표 -->
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #666;">
        <thead>
          <tr>
            <th style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; font-weight: bold; font-size: 13px;">구분 (${totalPoints}점)</th>
            <th style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; font-weight: bold; font-size: 13px;">세부 항목</th>
            ${columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => `
              <th style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; font-weight: bold; font-size: 13px;">
                ${column.title}
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${templateWithActualScores.sections.map((section: any) => {
            return section.items.map((item: any, itemIndex: number) => {
              return `
                <tr>
                  ${itemIndex === 0 ? `
                    <td rowspan="${section.items.length}" style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f8f9fa; font-weight: bold; vertical-align: top; font-size: 12px;">
                      ${section.id}. ${section.title}<br>
                      <span style="font-size: 10px; color: #666;">(${section.items.reduce((sum: number, sectionItem: any) => sum + (sectionItem.points || 0), 0)}점)</span>
                    </td>
                  ` : ''}
                  <td style="border: 1px solid #666; padding: 8px; font-size: 12px;">
                    ${itemIndex + 1}. ${item.text}
                  </td>
                  ${columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => `
                    <td style="border: 1px solid #666; padding: 8px; text-align: center; font-size: 12px; vertical-align: middle;" class="${column.id === 'type' ? 'type-cell' : column.id === 'points' ? 'points-cell' : column.id === 'score' ? 'score-cell' : 'custom-cell'}">
                      ${column.id === 'points' ? `${item[column.id] || 0}점` : 
                       column.id === 'score' ? `${item[column.id] || 0}점` :
                       column.id === 'type' ? (item[column.id] || '') :
                       (item[column.id] || '')}
                  </td>
                  `).join('')}
                </tr>
              `;
            }).join('');
          }).join('')}
          <!-- 합계 행 -->
          <tr style="background-color: #e8e8e8; font-weight: bold;">
            <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; vertical-align: middle; font-size: 13px;">합계</td>
            <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f5f5f5; vertical-align: middle;"></td>
            ${columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => `
            <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f5f5f5; font-size: 13px; vertical-align: middle;">
                ${column.id === 'points' ? `${totalPoints}점` : 
                  column.id === 'score' ? `${totalScore}점` : 
                  ''}
            </td>
            `).join('')}
          </tr>
        </tbody>
      </table>
      <div style="margin-top: 30px; font-size: 16px; text-align: center; font-weight: bold;">
        평가일: ${today}
      </div>
      <div style="margin-top: 10px; font-size: 16px; text-align: right; font-weight: bold; text-decoration: underline;">
        평가위원 : ${evaluatorInfo.name}${positionText} (서명)
      </div>
    `;
  };

  // 🔧 통합 인쇄 스타일 (평가항목 관리와 동일)
  const getPrintStyle = () => {
    return `
      <style>
        @media print {
          @page {
            margin: 0 !important;
            size: A4 !important;
          }
          body {
            font-family: "맑은 고딕", "Malgun Gothic", Arial, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .evaluation-page {
            padding: 95px 50px 50px 50px !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            min-height: 100vh !important;
            box-sizing: border-box !important;
          }
          .evaluation-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .title {
            text-align: center !important;
            font-size: 24px !important;
            font-weight: bold !important;
            margin-bottom: 15px !important;
            color: black !important;
          }
          .evaluator-info {
            text-align: right !important;
            font-size: 16px !important;
            font-weight: bold !important;
            margin-top: 20px !important;
            margin-bottom: 20px !important;
            padding: 0 10px;
            text-decoration: underline !important;
          }
          .evaluation-date {
            text-align: center !important;
            font-size: 16px !important;
            font-weight: bold !important;
            margin-top: 20px !important;
            margin-bottom: 20px !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-bottom: 30px !important;
            font-size: 13px !important;
            border: 2px solid #666 !important;
          }
          th, td {
            border: 1px solid #666 !important;
            padding: 12px 10px !important;
            vertical-align: middle !important;
          }
          th {
            background-color: #e8e8e8 !important;
            text-align: center !important;
            font-weight: bold !important;
          }
          .evaluation-page table:nth-of-type(1),
          .evaluation-page table:nth-of-type(2) {
            border-left: none !important;
            border-right: none !important;
          }
          .evaluation-page table:nth-of-type(1) td:first-child,
          .evaluation-page table:nth-of-type(1) th:first-child,
          .evaluation-page table:nth-of-type(2) td:first-child,
          .evaluation-page table:nth-of-type(2) th:first-child {
            border-left: none !important;
          }
          .evaluation-page table:nth-of-type(1) td:last-child,
          .evaluation-page table:nth-of-type(1) th:last-child,
          .evaluation-page table:nth-of-type(2) td:last-child,
          .evaluation-page table:nth-of-type(2) th:last-child {
            border-right: none !important;
          }
          .type-cell,
          .points-cell,
          .score-cell,
          .custom-cell {
            text-align: center !important;
          }
          .section-cell {
            background-color: #f8f9fa !important;
            font-weight: bold !important;
            text-align: center !important;
            vertical-align: top !important;
          }
          .no-print {
            display: none !important;
          }
          input, select {
            border: none !important;
            background: transparent !important;
            font-size: inherit !important;
            text-align: center !important;
            width: 100% !important;
          }
        }
      </style>
    `;
  };

  const handlePrintTemplate = async () => {
    if (!selectedEvaluator || !selectedCandidate) {
      toast({
        title: "선택 필요",
        description: "평가위원과 평가대상을 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const evaluatorInfo = evaluatorsData.find((e: any) => e.id === selectedEvaluator);
    const candidateInfo = candidatesData.find((c: any) => c.id === selectedCandidate);

    if (!evaluatorInfo || !candidateInfo) {
      toast({
        title: "오류 발생",
        description: "선택한 평가위원 또는 평가대상 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    // 실제 평가점수 조회
    const actualScores = await getActualEvaluationScores(selectedEvaluator, selectedCandidate);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
      toast({
        title: "팝업 차단",
        description: "브라우저의 팝업 차단을 해제해주세요.",
        variant: "destructive",
      });
        return;
      }

    const evaluationContent = await generateEvaluationHTML(evaluatorInfo, candidateInfo);

      printWindow.document.write(`
        <html>
          <head>
          <title>평가표 - ${candidateInfo.name} (${evaluatorInfo.name})</title>
            <meta charset="UTF-8">
            ${getPrintStyle()}
          </head>
          <body>
            <div class="evaluation-page">
              ${evaluationContent}
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };

    toast({
      title: "인쇄 준비 완료",
      description: `${candidateInfo.name} 평가표가 인쇄창에서 열렸습니다.`,
    });
  };

  // 🔧 평가위원별 일괄 인쇄
  const handlePrintByEvaluator = async (evaluatorId: number) => {
    if (filteredData.length === 0) {
      toast({
        title: "데이터 없음",
        description: "평가대상 데이터가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const evaluatorInfo = evaluatorsData.find((e: any) => e.id === evaluatorId);
    if (!evaluatorInfo) {
      toast({
        title: "오류 발생",
        description: "선택한 평가위원 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const totalPages = filteredData.length;
    const confirmMessage = `${evaluatorInfo.name} 평가위원의 모든 평가표 ${totalPages}페이지를 인쇄하시겠습니까?`;
    
    if (!confirm(confirmMessage)) {
      return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
      toast({
        title: "팝업 차단",
        description: "브라우저의 팝업 차단을 해제해주세요.",
        variant: "destructive",
      });
        return;
      }

    let allPagesContent = '';
    
    for (let i = 0; i < filteredData.length; i++) {
      const candidate = filteredData[i].candidate;
      const actualScores = await getActualEvaluationScores(evaluatorId, candidate.id);
      const evaluationContent = await generateEvaluationHTML(evaluatorInfo, candidate);
      
      allPagesContent += `
        <div class="evaluation-page">
          ${evaluationContent}
        </div>
      `;
      }

      printWindow.document.write(`
        <html>
          <head>
          <title>${evaluatorInfo.name} 평가위원 전체 평가표 - ${totalPages}페이지</title>
            <meta charset="UTF-8">
            ${getPrintStyle()}
          </head>
          <body>
          ${allPagesContent}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
          </body>
        </html>
      `);

      printWindow.document.close();

    toast({
      title: "인쇄 준비 완료",
      description: `${evaluatorInfo.name} 평가위원의 ${totalPages}페이지가 인쇄창에서 열렸습니다.`,
    });
  };

  // 🔧 평가대상별 일괄 인쇄
  const handlePrintByCandidate = async (candidateId: number) => {
    if (evaluatorsData.length === 0) {
      toast({
        title: "데이터 없음",
        description: "평가위원 데이터가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const candidateInfo = filteredData.find((r: CandidateResult) => r.candidate.id === candidateId)?.candidate;
    if (!candidateInfo) {
      toast({
        title: "오류 발생",
        description: "선택한 평가대상 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const totalPages = evaluatorsData.length;
    const confirmMessage = `${candidateInfo.name} 평가대상의 모든 평가표 ${totalPages}페이지를 인쇄하시겠습니까?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "팝업 차단",
        description: "브라우저의 팝업 차단을 해제해주세요.",
        variant: "destructive",
      });
      return;
    }

    let allPagesContent = '';
    
    for (let i = 0; i < evaluatorsData.length; i++) {
      const evaluator = evaluatorsData[i];
      const actualScores = await getActualEvaluationScores(evaluator.id, candidateInfo.id);
      const evaluationContent = await generateEvaluationHTML(evaluator, candidateInfo);
      
      allPagesContent += `
          <div class="evaluation-page">
            ${evaluationContent}
          </div>
        `;
      }

      printWindow.document.write(`
        <html>
          <head>
          <title>${candidateInfo.name} 평가대상 전체 평가표 - ${totalPages}페이지</title>
            <meta charset="UTF-8">
            ${getPrintStyle()}
          </head>
          <body>
          ${allPagesContent}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
          </body>
        </html>
      `);

      printWindow.document.close();

    toast({
      title: "인쇄 준비 완료",
      description: `${candidateInfo.name} 평가대상의 ${totalPages}페이지가 인쇄창에서 열렸습니다.`,
    });
  };

  const handlePrintAllCombinations = async () => {
    if (filteredData.length === 0 || evaluatorsData.length === 0) {
      toast({
        title: "데이터 없음",
        description: "평가위원 또는 평가대상 데이터가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const totalPages = filteredData.length * evaluatorsData.length;
    const confirmMessage = `총 ${totalPages}페이지 (평가위원 ${evaluatorsData.length}명 × 평가대상 ${filteredData.length}명)를 인쇄하시겠습니까?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "팝업 차단",
        description: "브라우저의 팝업 차단을 해제해주세요.",
        variant: "destructive",
      });
      return;
    }

    let allPagesContent = '';
    
    // 🔧 실제 평가점수를 반영한 전체 배치 인쇄
    for (let candidateIndex = 0; candidateIndex < filteredData.length; candidateIndex++) {
      const candidate = filteredData[candidateIndex].candidate;
      
      for (let evaluatorIndex = 0; evaluatorIndex < evaluatorsData.length; evaluatorIndex++) {
        const evaluator = evaluatorsData[evaluatorIndex];
        const actualScores = await getActualEvaluationScores(evaluator.id, candidate.id);
        const evaluationContent = await generateEvaluationHTML(evaluator, candidate);
        
        allPagesContent += `
          <div class="evaluation-page">
            ${evaluationContent}
          </div>
        `;
      }
      }

      printWindow.document.write(`
        <html>
          <head>
          <title>전체 평가표 배치 인쇄 - ${totalPages}페이지</title>
            <meta charset="UTF-8">
            ${getPrintStyle()}
          </head>
          <body>
          ${allPagesContent}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
          </body>
        </html>
      `);

      printWindow.document.close();

      toast({
      title: "전체 인쇄 준비 완료",
      description: `${totalPages}페이지의 평가표가 인쇄창에서 열렸습니다.`,
    });
  };

  // 📊 통계 섹션
  const renderStatistics = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>점수 분포</CardTitle>
        </CardHeader>
        <CardContent>
    <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-medium">우수 (90% 이상)</span>
              <span className="font-bold text-green-600">
                {filteredData.filter((r: CandidateResult) => r.percentage >= 90).length}명
              </span>
      </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="font-medium">양호 (80-89%)</span>
              <span className="font-bold text-blue-600">
                {filteredData.filter((r: CandidateResult) => r.percentage >= 80 && r.percentage < 90).length}명
              </span>
      </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
              <span className="font-medium">보통 (70-79%)</span>
              <span className="font-bold text-yellow-600">
                {filteredData.filter((r: CandidateResult) => r.percentage >= 70 && r.percentage < 80).length}명
              </span>
        </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">개선필요 (70% 미만)</span>
              <span className="font-bold text-gray-600">
                {filteredData.filter((r: CandidateResult) => r.percentage < 70).length}명
              </span>
        </div>
      </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>카테고리별 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mainCategories.map((category: any) => {
              const categoryResults = filteredData.filter((r: CandidateResult) => r.candidate.mainCategory === category.name);
              const avgScore = categoryResults.length > 0 ? 
                categoryResults.reduce((sum: number, r: CandidateResult) => sum + r.percentage, 0) / categoryResults.length : 0;
              
              return (
                <div key={category.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{category.name}</h3>
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

  // 🏆 순위 결과 섹션  
  const renderRankingSection = () => (
    <Tabs value={rankingActiveTab} onValueChange={setRankingActiveTab} className="w-full">
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
              종합 순위표
              </CardTitle>
            <CardDescription>
              전체 평가대상의 종합 순위를 확인할 수 있습니다.
            </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-center">순위</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">이름</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">소속</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">직책</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">구분</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">총점</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">득점률</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">평가위원수</th>
                    </tr>
                  </thead>
                  <tbody>
                  {rankedData.length > 0 ? (
                    rankedData.map((result: CandidateResult, index: number) => (
                      <tr key={result.candidate.id} className={index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                        <td className="border border-gray-300 px-4 py-2 text-center font-bold">
                          {result.rank}
                          {index < 3 && <span className="ml-1 text-yellow-600">🏆</span>}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-medium">
                          {result.candidate.name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {result.candidate.department}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {result.candidate.position}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {result.candidate.category}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {result.totalScore.toFixed(1)} / {result.maxPossibleScore.toFixed(1)}
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
                          {result.evaluatorCount}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-base font-medium mb-2">평가 결과가 없습니다.</p>
                        <div className="text-sm text-gray-600">
                          <p>• 전체 평가대상: {candidatesData?.length || 0}명</p>
                          <p>• 전체 평가위원: {evaluatorsData?.length || 0}명</p>
                          <p>• 완료된 평가: {resultsData?.length || 0}건</p>
                          <p className="mt-2">평가를 완료하면 여기에 결과가 표시됩니다.</p>
                        </div>
                        </td>
                      </tr>
                  )}
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
            <CardDescription>
              구분과 세부구분을 선택하여 계층적으로 결과를 확인할 수 있습니다.
            </CardDescription>
            </CardHeader>
            <CardContent>
            {/* 필터링은 페이지 상위에서 처리됨 */}
            
            {/* 🔧 계층적 카테고리별 결과 표시 */}
            <Tabs defaultValue="hierarchy" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="hierarchy">계층별 결과</TabsTrigger>
                <TabsTrigger value="main">메인 카테고리</TabsTrigger>
              </TabsList>

              {/* 계층별 결과 (메인 → 서브) */}
              <TabsContent value="hierarchy" className="space-y-6">
                {mainCategoryResults.map((mainCategoryData: any) => (
                  <Card key={mainCategoryData.category} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        📁 {mainCategoryData.category}
                        <Badge variant="outline">{mainCategoryData.count}명</Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        평균 점수: {mainCategoryData.avgScore.toFixed(1)}%
                      </p>
                    </CardHeader>
                    <CardContent>
                      {/* 해당 메인 카테고리의 서브 카테고리들 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subCategoryResults
                          .filter((subData: any) => {
                            // 해당 메인 카테고리에 속하는 서브 카테고리만 필터링
                            const subCategory = subCategories.find(sub => sub.name === subData.category);
                            const mainCategory = mainCategories.find(main => main.name === mainCategoryData.category);
                            return subCategory && mainCategory && subCategory.parentId === mainCategory.id;
                          })
                          .map((subCategoryData: any) => {
                            const topInSubCategory = subCategoryData.results.slice(0, 3);
                            
                            return (
                              <Card key={subCategoryData.category} className="border border-gray-200">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">📄 {subCategoryData.category}</CardTitle>
                                  <p className="text-xs text-gray-600">
                                    {subCategoryData.count}명 · 평균 {subCategoryData.avgScore.toFixed(1)}%
                                  </p>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="space-y-1">
                                    {topInSubCategory.length > 0 ? (
                                      topInSubCategory.map((result: CandidateResult, index: number) => (
                                        <div key={result.candidate.id} className="flex items-center justify-between text-xs p-1">
                                          <span>{index + 1}. {result.candidate.name}</span>
                                          <span className="font-medium text-blue-600">
                                            {result.percentage.toFixed(1)}%
                                          </span>
                </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-gray-500 text-center py-2">데이터 없음</p>
                                    )}
              </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* 메인 카테고리별 상위 3명 */}
              <TabsContent value="main" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mainCategoryResults.map((categoryData: any) => {
                    const topInCategory = categoryData.results.slice(0, 3);
                  
                  return (
                      <Card key={categoryData.category} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                          <CardTitle className="text-lg">📁 {categoryData.category}</CardTitle>
                          <p className="text-sm text-gray-600">
                            총 {categoryData.count}명 · 평균 {categoryData.avgScore.toFixed(1)}%
                          </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                            {topInCategory.length > 0 ? (
                              topInCategory.map((result: CandidateResult, index: number) => (
                            <div key={result.candidate.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{index + 1}.</span>
                                <span className="text-sm">{result.candidate.name}</span>
                              </div>
                              <span className="text-sm font-medium text-blue-600">
                                {result.percentage.toFixed(1)}%
                              </span>
                            </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <p className="text-sm">해당 카테고리에 평가대상이 없습니다</p>
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              </TabsContent>


            </Tabs>
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
                기준점수 70% 미달자: {failedCandidates.length}명
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
                              -{(70 - result.percentage).toFixed(1)}%
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
                      {passedCandidates.length > 0 ? ((passedCandidates.length / totalCandidatesCount) * 100).toFixed(1) : 0}%
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
  );

  // 📋 상세결과 섹션
  const renderDetailedResults = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>상세 평가 결과</span>
          <div className="flex items-center space-x-2">
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
                <TableHead>소속</TableHead>
                <TableHead>직책</TableHead>
                <TableHead>구분</TableHead>
                <TableHead className="text-right">총점</TableHead>
                <TableHead className="text-right">득점률</TableHead>
                <TableHead className="text-center">평가위원수</TableHead>
                <TableHead className="text-center">완료평가</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedData.length > 0 ? (
                rankedData.map((result: CandidateResult, index: number) => (
                  <TableRow key={result.candidate.id}>
                    <TableCell className="font-medium">{result.rank}</TableCell>
                    <TableCell className="font-medium">{result.candidate.name}</TableCell>
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

  // filteredData 기준으로 1위부터 다시 rank를 부여한 rankedData
  const rankedData = useMemo(() => {
    return filteredData.map((result: CandidateResult, idx: number) => ({
      ...result,
      rank: idx + 1,
    }));
  }, [filteredData]);

  // 1. 최종 선정자만 추출
  const selectedCandidates = rankedData.filter(r => r.percentage >= 70); // 예시: 70% 이상 합격

  // 2. 최종 심사결과 보고서 템플릿 컴포넌트
  const FinalReportTemplate = ({
    overview,
    candidates,
    evaluators,
    date,
  }: {
    overview: {
      title: string;
      date: string;
      place: string;
      host: string;
      method: string;
      maxScore: number;
      targetCount: number;
      candidateCount: number;
    };
    candidates: any[];
    evaluators: any[];
    date: string;
  }) => (
    <div style={{ fontFamily: 'Malgun Gothic, Arial, sans-serif', background: '#fff', color: '#222', padding: 32, width: 800, margin: '0 auto' }}>
      <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 24 }}>돌봄SOS 서비스 제공기관 선정 심사결과 최종 서명부</h2>
    <hr />
    <h3 style={{ fontWeight: 600, fontSize: 16, margin: '24px 0 8px' }}>1. 심사 개요</h3>
    <ul style={{ marginBottom: 16 }}>
      <li>사업명: {overview.title}</li>
      <li>심사일시: {overview.date}</li>
      <li>심사장소: {overview.place}</li>
      <li>주관부서: {overview.host}</li>
      <li>심사방식: {overview.method} (최대 {overview.maxScore}점)</li>
      <li>심사대상 기관수: 총 {overview.targetCount}개 기관</li>
      <li>신청기관 수: 총 {overview.candidateCount}개 기관</li>
    </ul>
    <h3 style={{ fontWeight: 600, fontSize: 16, margin: '24px 0 8px' }}>2. 심사 결과</h3>
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
      <thead>
        <tr>
          <th style={{ border: '1px solid #aaa', padding: 8 }}>순위</th>
          <th style={{ border: '1px solid #aaa', padding: 8 }}>기관명</th>
          <th style={{ border: '1px solid #aaa', padding: 8 }}>평가점수</th>
          <th style={{ border: '1px solid #aaa', padding: 8 }}>선정여부</th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((c, idx) => (
          <tr key={c.candidate.id}>
            <td style={{ border: '1px solid #aaa', padding: 8, textAlign: 'center' }}>{idx + 1}</td>
            <td style={{ border: '1px solid #aaa', padding: 8 }}>{c.candidate.name}</td>
            <td style={{ border: '1px solid #aaa', padding: 8, textAlign: 'center' }}>{c.totalScore}점</td>
            <td style={{ border: '1px solid #aaa', padding: 8, textAlign: 'center' }}>{c.percentage >= 70 ? '선정' : '미선정'}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
      ※ 평균점수는 5인 평가위원의 점수를 합산 후 최고/최저 점수 제외 후 평균값 산정
                  </div>
    {/* 🟢 심사위원 서명란 표(정적 JSX) 제거: 동적 템플릿 기반으로만 출력 */}
    {/* <h3 style={{ fontWeight: 600, fontSize: 16, margin: '24px 0 8px' }}>3. 심사위원 서명란</h3>
    <table ...> ... </table> */}
    <div style={{ fontSize: 13, marginTop: 24, textAlign: 'right' }}>작성일: {date}</div>
    </div>
  );

// 3. 인쇄 미리보기 및 출력 함수
const handlePrintFinalReport = async (): Promise<void> => {
  if (!reportTemplate?.editorData?.blocks) {
    toast({
      title: '출력 오류',
      description: '저장된 템플릿이 없거나 에디터 데이터가 없습니다.',
      variant: 'destructive',
    });
    return;
  }
  const htmlContent = `
    <html>
      <head>
        <title>${reportTemplate.title || '보고서 미리보기'}</title>
        <style>
          body { font-family: 'Noto Sans KR', sans-serif; margin: 40px; }
          h1, h2, h3, h4, h5, h6 { margin: 16px 0 8px 0; }
          p { margin: 8px 0; }
          table { margin: 16px 0; }
        </style>
      </head>
      <body>
        <h2 style="text-align:center;">${reportTemplate.title || ''}</h2>
        ${renderEditorBlocks(reportTemplate.editorData.blocks)}
      </body>
    </html>
  `;
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
};

  // [추가] 최종 선정 심사결과보고서 템플릿 저장 함수 (upsert)
  const handleSaveReportTemplate = async (template: any) => {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .upsert([
          {
            name: 'final_report_template',
            template_json: JSON.stringify(template),
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'name' }); // fix: string not array
      if (error) {
        toast({
          title: '저장 실패',
          description: '템플릿 저장 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '저장 완료',
          description: '템플릿이 성공적으로 저장되었습니다.',
        });
        await handleLoadReportTemplate();
      }
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '템플릿 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // ResultsPage 함수형 컴포넌트 내부 useState 선언부 근처에 추가
  const [reportTemplate, setReportTemplate] = useState<any>(null);

  // 템플릿 불러오기 함수 구현
  const handleLoadReportTemplate = async () => {
    const { data, error } = await supabase
      .from('report_templates')
      .select('template_json')
      .eq('name', 'final_report_template')
      .single();
    if (error || !data?.template_json) {
      setReportTemplate(null);
      return;
    }
    try {
      setReportTemplate(JSON.parse(data.template_json));
    } catch (e) {
      setReportTemplate(null);
    }
  };

  // 컴포넌트 마운트 시 템플릿 자동 로드
  useEffect(() => {
    handleLoadReportTemplate();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">데이터를 불러오는 중...</p>
              <div className="mt-4 text-sm text-gray-500">
                <p>평가 결과: {resultsLoading ? '로딩 중...' : '완료'}</p>                
                <p>평가 항목: {itemsLoading ? '로딩 중...' : '완료'}</p>
              </div>
              {resultsError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">평가 결과 로딩 중 오류가 발생했습니다.</p>
                  <p className="text-red-500 text-xs mt-1">{resultsError.message}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                📊 평가 결과 조회
              </h1>
              <p className="text-gray-600 mt-2">
                전체 평가 결과와 통계를 확인할 수 있습니다.
              </p>
            </div>
            <Button 
              onClick={handleExportResults}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel 내보내기
            </Button>
          </div>

            {/* 🔧 전체 페이지 상위 필터 */}
            <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
              <h3 className="text-sm font-bold mb-3 text-blue-800">필터링 옵션</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 메인 카테고리 (구분) */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-gray-700">구분 (메인 카테고리)</label>
                  <Select value={selectedMainCategory} onValueChange={setSelectedMainCategory}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="구분 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-sm">
                      <SelectItem value="all">전체 구분</SelectItem>
                      {mainCategories.map((category: string) => (
                        <SelectItem key={category} value={category} className="hover:bg-gray-50">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 서브 카테고리 (세부구분) */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-gray-700">세부구분 (서브 카테고리)</label>
                  <Select 
                    value={selectedSubCategory} 
                    onValueChange={setSelectedSubCategory}
                    disabled={selectedMainCategory === "all" || subCategories.length === 0}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="세부구분 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-sm">
                      <SelectItem value="all">전체 세부구분</SelectItem>
                      {subCategories.map((category: string) => (
                        <SelectItem key={category} value={category} className="hover:bg-gray-50">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 필터 상태 표시 */}
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedMainCategory !== "all" && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    구분: {selectedMainCategory}
                  </Badge>
                )}
                {selectedSubCategory !== "all" && (
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                    세부구분: {selectedSubCategory}
                  </Badge>
                )}
                <span className="text-xs text-gray-600">
                  필터링 결과: {filteredData.length}명
                </span>
              </div>

              {/* 🔧 계층적 카테고리 데이터 상태 표시 */}
              {!isLoading && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-700 space-y-1">
                    <div className="flex justify-between">
                      <span>계층적 카테고리 시스템 상태</span>
                      <span className="font-medium">
                        {mainCategories.length > 0 ? '✅ 활성' : '❌ 비활성'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p>• 메인 카테고리: {mainCategories.length}개</p>
                        <p>• 서브 카테고리: {subCategories.length}개</p>
                      </div>
                      <div>
                        <p>• 전체 평가대상: {candidatesData.length}명</p>
                        <p>• 평가 결과: {resultsData.length}건</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white border rounded-lg p-1">
              <TabsTrigger 
                value="ranking" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                <Trophy className="h-4 w-4" />
                순위 결과
              </TabsTrigger>
              <TabsTrigger 
                value="detailed" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                <BarChart3 className="h-4 w-4" />
                상세 결과
              </TabsTrigger>
              <TabsTrigger 
                value="statistics" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                <TrendingUp className="h-4 w-4" />
                통계
              </TabsTrigger>
              <TabsTrigger 
                value="report" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                <FileText className="h-4 w-4" />
                보고서
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="ranking" className="space-y-6">
                {renderRankingSection()}
              </TabsContent>
              <TabsContent value="detailed" className="space-y-6">
                {renderDetailedResults()}
              </TabsContent>
              <TabsContent value="statistics" className="space-y-6">
                {renderStatistics()}
              </TabsContent>
              <TabsContent value="report" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>보고서 출력</CardTitle>
                        <CardDescription>다양한 형식의 보고서 출력을 지원합니다.</CardDescription>
                      </div>
                      <Button onClick={handlePrintFinalReport} className="bg-blue-600 text-white ml-4">
                        최종 선정 심사결과보고서 출력
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 기존 보고서 출력 UI/기능 복구: 평가위원/평가대상 선택, 개별/전체 인쇄, 기존 보고서/엑셀 출력 등 */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <h3 className="text-sm font-bold mb-3 text-blue-800">평가위원 및 평가대상 선택</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium mb-2 text-gray-700">평가위원 선택 (개별 인쇄용)</label>
                          <select 
                            className="w-full text-sm border rounded px-3 py-2 bg-white"
                            value={selectedEvaluator?.toString() || ""}
                            onChange={(e) => setSelectedEvaluator(e.target.value ? parseInt(e.target.value) : null)}
                          >
                            <option value="">평가위원 선택</option>
                            {evaluatorsData.map((evaluator: any) => (
                              <option key={evaluator.id} value={evaluator.id.toString()}>
                                {evaluator.name} ({evaluator.department})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-2 text-gray-700">평가대상 선택 (개별 인쇄용)</label>
                          <select 
                            className="w-full text-sm border rounded px-3 py-2 bg-white"
                            value={selectedCandidate?.toString() || ""}
                            onChange={(e) => setSelectedCandidate(e.target.value ? parseInt(e.target.value) : null)}
                          >
                            <option value="">평가대상 선택</option>
                            {rankedData.map((result: CandidateResult) => (
                              <option key={result.candidate.id} value={result.candidate.id.toString()}>
                                {result.candidate.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* 개별 인쇄 & 전체 배치 인쇄 */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {/* 개별 인쇄 */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-700">개별 인쇄</div>
                            <div className="text-xs text-gray-600">선택한 평가위원과 평가대상의 평가표 (실제 점수 반영)</div>
                          </div>
                          <Button 
                            onClick={handlePrintTemplate}
                            variant="outline"
                            size="sm"
                            disabled={!selectedEvaluator || !selectedCandidate}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            인쇄
                          </Button>
                        </div>
                        {/* 전체 배치 인쇄 */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-blue-800">전체 배치 인쇄</div>
                            <div className="text-xs text-gray-600">
                              모든 평가위원 × 모든 평가대상 ({candidatesData.length}명 × {evaluatorsData.length}명 = {candidatesData.length * evaluatorsData.length}페이지)
                            </div>
                          </div>
                          <Button 
                            onClick={handlePrintAllCombinations}
                            variant="default"
                            size="sm"
                            disabled={candidatesData.length === 0 || evaluatorsData.length === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            전체 인쇄
                          </Button>
                        </div>
                      </div>
                      {/* 인쇄 옵션 */}
                      <div className="mt-4 space-y-3">
                        {/* 평가위원별/평가대상별 인쇄 */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* 평가위원별 인쇄 */}
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="font-medium text-sm text-gray-700 mb-2">평가위원별 일괄 인쇄</div>
                            <div className="text-xs text-gray-500 mb-2">특정 평가위원의 모든 평가표</div>
                            <select 
                              className="w-full text-xs border rounded px-2 py-1 bg-white mb-2"
                              onChange={(e) => e.target.value && handlePrintByEvaluator(parseInt(e.target.value))}
                              defaultValue=""
                            >
                              <option value="">평가위원 선택</option>
                              {evaluatorsData.map((evaluator: any) => (
                                <option key={evaluator.id} value={evaluator.id}>
                                  {evaluator.name} ({candidatesData.length}페이지)
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* 평가대상별 인쇄 */}
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="font-medium text-sm text-gray-700 mb-2">평가대상별 일괄 인쇄</div>
                            <div className="text-xs text-gray-500 mb-2">특정 평가대상의 모든 평가표</div>
                            <select 
                              className="w-full text-xs border rounded px-2 py-1 bg-white mb-2"
                              onChange={(e) => e.target.value && handlePrintByCandidate(parseInt(e.target.value))}
                              defaultValue=""
                            >
                              <option value="">평가대상 선택</option>
                              {rankedData.map((result: CandidateResult) => (
                                <option key={result.candidate.id} value={result.candidate.id}>
                                  {result.candidate.name} ({evaluatorsData.length}페이지)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {/* 인쇄 팁 */}
                        <div className="text-xs text-gray-600 p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                          <span className="text-orange-600 font-medium">💡 인쇄 팁:</span> 브라우저 인쇄 설정에서 '머리글 및 바닥글' 옵션을 해제하면 더 깨끗한 출력이 가능합니다
                        </div>
                      </div>
                    </div>                    
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        )}
      </div>
    </div>
  );
}