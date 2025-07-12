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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("ranking");
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
  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/admin/results"],
    refetchInterval: false, // 자동 새로고침 비활성화 (실시간 구독만 사용)
    staleTime: 30000, // 30초
    refetchOnWindowFocus: false, // 창 포커스 시 새로고침 비활성화
    refetchOnMount: true,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/admin/categories"],
    refetchInterval: false, // 자동 새로고침 비활성화
    staleTime: 60000, // 60초
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

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
  const categoriesData = categories as any[];
  const candidatesData = candidates as any[];
  const evaluatorsData = evaluators as any[];

  // 🔧 데이터 검증 및 디버깅
  useEffect(() => {
    console.log('📊 결과 페이지 데이터 상태:', {
      resultsLoading,
      categoriesLoading,
      itemsLoading,
      resultsCount: resultsData?.length || 0,
      categoriesCount: categoriesData?.length || 0,
      evaluatorsCount: evaluatorsData?.length || 0,
      results: resultsData,
      categories: categoriesData
    });
  }, [resultsLoading, categoriesLoading, itemsLoading, resultsData, categoriesData, evaluatorsData]);

  // 로딩 상태 체크 (조건부 return 대신 조건부 렌더링 사용)
  const isLoading = resultsLoading || categoriesLoading || itemsLoading;

  // 🎯 순위 관련 데이터 처리 (useMemo로 메모이제이션)
  const passThreshold = 70;
  
  // 카테고리 필터링된 결과 데이터
  const filteredData = useMemo(() => {
    return selectedCategory === "all" 
      ? resultsData 
      : resultsData.filter((result: CandidateResult) => 
          result.candidate.category === selectedCategory
        );
  }, [selectedCategory, resultsData]);
  
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
            구분: result.candidate.category || '',
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
            구분: result.candidate.category || '',
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
          const customData = filteredData.filter((result: CandidateResult) => {
            if (selectedCategory !== 'all' && result.candidate.category !== selectedCategory) {
              return false;
            }
            return true;
          });
          reportData = customData.map((result: CandidateResult) => ({
            순위: result.rank,
            이름: result.candidate.name,
            소속: result.candidate.department || '',
            직책: result.candidate.position || '',
            구분: result.candidate.category || '',
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
        { '보고서 제목': `선택된 카테고리: ${selectedCategory === 'all' ? '전체' : selectedCategory}` },
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
    if (candidatesData.length === 0) {
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

    const totalPages = candidatesData.length;
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
    
    for (let i = 0; i < candidatesData.length; i++) {
      const candidate = candidatesData[i];
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

    const candidateInfo = candidatesData.find((c: any) => c.id === candidateId);
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
      const actualScores = await getActualEvaluationScores(evaluator.id, candidateId);
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
    if (candidatesData.length === 0 || evaluatorsData.length === 0) {
      toast({
        title: "데이터 없음",
        description: "평가위원 또는 평가대상 데이터가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const totalPages = candidatesData.length * evaluatorsData.length;
    const confirmMessage = `총 ${totalPages}페이지 (평가위원 ${evaluatorsData.length}명 × 평가대상 ${candidatesData.length}명)를 인쇄하시겠습니까?`;
    
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
    for (let candidateIndex = 0; candidateIndex < candidatesData.length; candidateIndex++) {
      const candidate = candidatesData[candidateIndex];
      
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
            {categoriesData.map((category: any) => {
              const categoryResults = filteredData.filter((r: CandidateResult) => r.candidate.category === category.categoryName);
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

  // 🏆 순위 결과 섹션  
  const renderRankingSection = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                  {filteredData.length > 0 ? (
                    filteredData.map((result: CandidateResult, index: number) => (
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
                        평가 결과가 없습니다.
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
                    {categoriesData.map((category: any) => (
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
              {categoriesData.map((category: any) => {
                const categoryResults = filteredData.filter((r: CandidateResult) => r.candidate.category === category.categoryName);
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
            <div className="relative">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="전체 카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  {categoriesData.map((category: any) => (
                    <SelectItem key={category.id} value={category.categoryName}>
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
              {filteredData.length > 0 ? (
                filteredData.map((result: CandidateResult) => (
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
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
                    </div>
                  </CardHeader>
                  <CardContent>
                                      {/* 평가위원 및 평가대상 선택 */}
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
                          {candidatesData.map((candidate: any) => (
                            <option key={candidate.id} value={candidate.id.toString()}>
                              {candidate.name}
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
                            {candidatesData.map((candidate: any) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name} ({evaluatorsData.length}페이지)
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