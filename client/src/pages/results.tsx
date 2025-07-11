import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, Users, FileText, BarChart3, Award, Trophy, Target, Scale, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("ranking");
  
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

  // 🎯 평가항목관리와 동일한 템플릿 초기값 (데이터베이스 데이터로 대체될 예정)
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

  // Admin API를 사용하여 데이터 가져오기
  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/admin/results"],
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

  // 🎯 실제 평가 항목 데이터 가져오기
  const { data: evaluationItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/admin/evaluation-items"],
  });

  // 🎯 시스템 설정 가져오기
  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system/config"],
  });

  // 🎯 평가항목관리와 동일한 데이터베이스 데이터를 템플릿 구조로 변환 (기존)
  const convertDataToTemplateOld = () => {
    // 데이터가 유효하지 않은 경우 현재 템플릿 반환
    if (!Array.isArray(categories) || !Array.isArray(evaluationItems)) {
      console.log('❌ 데이터가 배열이 아님. 현재 템플릿 유지.');
      return currentTemplate;
    }
    
    // 빈 데이터인 경우 현재 템플릿 유지
    if (categories.length === 0 || evaluationItems.length === 0) {
      console.log('⚠️ 데이터가 비어있음. 현재 템플릿 유지.');
      return currentTemplate;
    }

    console.log('🔧 평가결과조회 템플릿 변환 중...', { categoriesLength: categories.length, itemsLength: evaluationItems.length });

    const sections = (categories as any[]).map((category: any, categoryIndex: number) => ({
      id: String.fromCharCode(65 + categoryIndex), // A, B, C...
      title: category.name,
      totalPoints: (evaluationItems as any[])
        .filter((item: any) => item.categoryId === category.id)
        .reduce((sum: number, item: any) => sum + (item.maxScore || 0), 0),
      items: (evaluationItems as any[])
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
      title: (systemConfig as any)?.evaluationTitle || "제공기관 선정 심의회 평가표",
      totalScore: sections.reduce((sum: number, section: any) => sum + section.totalPoints, 0),
      sections
    };
  };

  // 🎯 평가위원 모달과 동일한 템플릿 변환 함수
  const convertDataToTemplate = (categories: any[], evaluationItems: any[], systemConfig: any) => {
    if (!Array.isArray(categories) || !Array.isArray(evaluationItems)) {
      console.log('❌ 데이터가 배열이 아님. 기본 템플릿 반환.');
      return { title: "심사표", totalScore: 100, sections: [] };
    }
    
    if (categories.length === 0 || evaluationItems.length === 0) {
      console.log('⚠️ 데이터가 비어있음. 기본 템플릿 반환.');
      return { title: "심사표", totalScore: 100, sections: [] };
    }

    console.log('🔧 결과 조회 심사표 템플릿 변환 중...', { categoriesLength: categories.length, itemsLength: evaluationItems.length });

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

  // 🎯 데이터베이스 데이터가 로드되면 템플릿 업데이트
  useEffect(() => {
    console.log('✅ 평가결과조회 데이터 로드 상태 체크:', { 
      categoriesLoading,
      itemsLoading,
      categoriesCount: Array.isArray(categories) ? categories.length : 0, 
      itemsCount: Array.isArray(evaluationItems) ? evaluationItems.length : 0,
      hasSystemConfig: !!systemConfig,
      categories,
      evaluationItems,
      systemConfig
    });

    // 초기 로딩이 완료되었는지 확인
    if (categoriesLoading || itemsLoading) {
      console.log('⏳ 아직 초기 로딩 중...');
      return;
    }
    
    // 데이터가 모두 로드되었고 유효한 경우에만 템플릿 업데이트
    if (Array.isArray(categories) && Array.isArray(evaluationItems) && categories.length > 0 && evaluationItems.length > 0) {
      console.log('🔄 평가결과조회 템플릿 변환 시작...');
      const convertedTemplate = convertDataToTemplateOld();
      console.log('📋 변환된 템플릿:', convertedTemplate);
      setCurrentTemplate(convertedTemplate);
    } else if (Array.isArray(categories) && Array.isArray(evaluationItems)) {
      console.log('⚠️ 데이터가 로드되었지만 비어있음 - 기존 템플릿 유지');
      // 데이터가 비어있는 경우 기존 템플릿을 유지하고 제목만 업데이트
      if (systemConfig && (systemConfig as any)?.evaluationTitle) {
        setCurrentTemplate(prev => ({
          ...prev,
          title: (systemConfig as any).evaluationTitle
        }));
      }
    }
  }, [categories, evaluationItems, systemConfig, categoriesLoading, itemsLoading]);

  // 타입 안전한 결과 데이터
  const resultsData = results as CandidateResult[];
  const categoriesData = categories as any[];
  const candidatesData = candidates as any[];
  const evaluatorsData = evaluators as any[];

  if (resultsLoading || categoriesLoading || itemsLoading) {
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
    ? resultsData 
    : resultsData.filter((result: CandidateResult) => result.candidate.category === selectedCategory);

  const completedCandidates = resultsData.filter((result: CandidateResult) => 
    result.completedEvaluations > 0
  ).length;

  const totalCandidates = resultsData.length;
  const averageScore = resultsData.reduce((sum: number, result: CandidateResult) => 
    sum + result.percentage, 0) / resultsData.length || 0;

  // 🎯 평가항목관리와 동일한 통합 인쇄 스타일
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

  // 🎯 평가위원 모달과 동일한 방식으로 심사표 생성
  async function generateEvaluationHTML(evaluatorInfo: any, candidateInfo: any) {
    const today = new Date().toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // 🎯 평가위원 모달과 동일한 데이터 가져오기
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
        console.log('📊 결과확인 모달 실제 평가 데이터:', evaluationData);
        console.log('📊 결과확인 모달 평가 점수 (scores):', evaluationData.scores);
        console.log('📊 결과확인 모달 총점 (totalScore):', evaluationData.totalScore);
        
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

      // 4. 평가위원 모달과 동일한 템플릿 생성
      actualTemplate = convertDataToTemplate(categoriesData, itemsData, configData);
      console.log('🎯 결과확인 모달 생성된 템플릿:', actualTemplate);
      console.log('🎯 결과확인 모달 템플릿 항목들:', actualTemplate.sections.map((s: any) => ({
        title: s.title,
        items: s.items.map((i: any) => ({
          id: i.id,
          evaluationItemId: i.evaluationItemId,
          text: i.text,
          type: i.type,
          points: i.points
        }))
      })));

    } catch (error) {
      console.error('❌ 심사표 데이터 조회 오류:', error);
      // 오류 시 기본 템플릿 사용
      actualTemplate = currentTemplate;
    }

    // 5. 템플릿에 실제 점수 반영 (평가위원 모달과 동일한 방식)
    const templateWithActualScores = {
      ...actualTemplate,
      sections: actualTemplate.sections.map((section: any) => ({
        ...section,
        items: section.items.map((item: any) => {
          // 🎯 모든 가능한 키 형태로 점수 찾기 (평가위원 결과확인과 동일)
          const itemId = item.evaluationItemId;
          const itemCode = item.code;
          
          // 가능한 모든 키 형태로 점수 검색
          const possibleKeys = [
            itemCode,                    // CODE 기반
            itemId,                      // ID 기반 (숫자)
            itemId?.toString(),          // ID 기반 (문자열)
            `${itemId}`,                 // ID 기반 (템플릿 리터럴)
            parseInt(itemId),            // ID 기반 (정수 변환)
          ].filter(key => key !== undefined && key !== null);
          
          let actualScore = 0;
          let foundKey = null;
          
          // 각 키로 점수 찾기
          for (const key of possibleKeys) {
            if (actualScores[key] !== undefined && actualScores[key] !== null) {
              actualScore = actualScores[key];
              foundKey = key;
              break;
            }
          }
          
          console.log(`🔍 보고서 출력 점수 매핑: "${item.text}"`);
          console.log(`   📝 평가항목 정보: ID=${itemId}, CODE=${itemCode}`);
          console.log(`   🔑 시도한 키들:`, possibleKeys);
          console.log(`   📊 전체 점수 객체 키들:`, Object.keys(actualScores));
          console.log(`   ✅ 찾은 키: ${foundKey}, 점수: ${actualScore}`);
          console.log(`   ---`);
          
          return {
            ...item,
            score: actualScore
          };
        })
      }))
    };

    console.log('🎯 결과확인 모달 최종 템플릿 (점수 반영 후):', templateWithActualScores);

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
            <th style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; font-weight: bold; font-size: 13px;">유형</th>
            <th style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; font-weight: bold; font-size: 13px;">배점</th>
            <th style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; font-weight: bold; font-size: 13px;">평가점수</th>
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
                  <td style="border: 1px solid #666; padding: 8px; text-align: center; font-size: 12px; vertical-align: middle;">
                    ${item.type}
                  </td>
                  <td style="border: 1px solid #666; padding: 8px; text-align: center; font-size: 12px; vertical-align: middle;">
                    ${item.points}점
                  </td>
                  <td style="border: 1px solid #666; padding: 8px; text-align: center; font-size: 12px; vertical-align: middle; background-color: #e3f2fd;">
                    <strong>${item.score || 0}점</strong>
                  </td>
                </tr>
              `;
            }).join('');
          }).join('')}
          <!-- 합계 행 -->
          <tr style="background-color: #e8e8e8; font-weight: bold;">
            <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; vertical-align: middle; font-size: 13px;">합계</td>
            <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f5f5f5; vertical-align: middle;"></td>
            <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f5f5f5; vertical-align: middle;"></td>
            <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f5f5f5; font-size: 13px; vertical-align: middle;">
              ${totalPoints}점
            </td>
            <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e3f2fd; font-size: 14px; vertical-align: middle;">
              <strong>${totalScore}점</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="evaluation-date">
        평가일: ${today}
      </div>
      <div class="evaluator-info">
        평가위원 : ${evaluatorInfo.name}${positionText} (서명)
      </div>
    `;
  }

  // 🎯 알림 함수
  function showNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
    toast({
      title: type === 'success' ? "성공" : type === 'error' ? "오류" : "알림",
      description: message,
      variant: type === 'error' ? "destructive" : "default"
    });
  }

  // 🎯 개별 인쇄 기능 (평가항목관리와 동일)
  async function printEvaluationSheet() {
    if (!selectedEvaluator || !selectedCandidate) {
      showNotification('평가위원과 평가대상을 선택해주세요.', 'error');
      return;
    }

    const evaluatorInfo = (evaluators as any[]).find((e: any) => e.id === selectedEvaluator);
    const candidateInfo = (candidates as any[]).find((c: any) => c.id === selectedCandidate);

    if (!evaluatorInfo || !candidateInfo) {
      showNotification('선택한 평가위원 또는 평가대상 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    try {
      // 🎯 비동기 HTML 생성
      const evaluationContent = await generateEvaluationHTML(evaluatorInfo, candidateInfo);
      
      // 제목 결정
      const dynamicTitle = candidateInfo ? `${candidateInfo.name} 심사표` : (currentTemplate?.title || "제공기관 선정 심의회 평가표");

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showNotification('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>평가표 출력 - ${dynamicTitle}</title>
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
      printWindow.print();
      showNotification('인쇄 미리보기가 열렸습니다!', 'info');
    } catch (error) {
      console.error('❌ 인쇄 오류:', error);
      showNotification('인쇄 중 오류가 발생했습니다.', 'error');
    }
  }

  // 🎯 배치 인쇄 기능 (평가항목관리와 동일)
  async function printAllCombinations() {
    if ((candidates as any[]).length === 0 || (evaluators as any[]).length === 0) {
      showNotification('평가대상과 평가위원이 모두 등록되어야 배치 인쇄가 가능합니다.', 'error');
      return;
    }

    try {
      let allPrintContent = '';
      const totalPages = (candidates as any[]).length * (evaluators as any[]).length;

      // 🎯 모든 조합의 HTML을 순차적으로 생성
      for (const candidate of candidates as any[]) {
        for (const evaluator of evaluators as any[]) {
          const evaluationContent = await generateEvaluationHTML(evaluator, candidate);
          allPrintContent += `
            <div class="evaluation-page">
              ${evaluationContent}
            </div>
          `;
        }
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showNotification('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>전체 평가표 배치 인쇄 (${totalPages}페이지)</title>
            <meta charset="UTF-8">
            ${getPrintStyle()}
          </head>
          <body>
            ${allPrintContent}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.print();
      showNotification(`${totalPages}페이지 배치 인쇄 미리보기가 열렸습니다!`, 'success');
    } catch (error) {
      console.error('❌ 배치 인쇄 오류:', error);
      showNotification('배치 인쇄 중 오류가 발생했습니다.', 'error');
    }
  }

  // 🎯 평가위원별 인쇄 기능 (평가항목관리와 동일)
  const printByEvaluator = async (evaluatorId: number) => {
    if ((candidates as any[]).length === 0) {
      showNotification('평가대상이 등록되어야 인쇄가 가능합니다.', 'error');
      return;
    }

    const evaluator = (evaluators as any[]).find((e: any) => e.id === evaluatorId);
    if (!evaluator) {
      showNotification('평가위원 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    try {
      let printContent = '';
      for (const candidate of candidates as any[]) {
        const evaluationContent = await generateEvaluationHTML(evaluator, candidate);
        printContent += `
          <div class="evaluation-page">
            ${evaluationContent}
          </div>
        `;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showNotification('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>${evaluator.name} 평가위원 - 전체 평가표 (${(candidates as any[]).length}페이지)</title>
            <meta charset="UTF-8">
            ${getPrintStyle()}
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.print();
      showNotification(`${evaluator.name} 평가위원 전체 평가표 인쇄 미리보기가 열렸습니다!`, 'success');
    } catch (error) {
      console.error('❌ 평가위원별 인쇄 오류:', error);
      showNotification('평가위원별 인쇄 중 오류가 발생했습니다.', 'error');
    }
  };

  // 🎯 평가대상별 인쇄 기능 (평가항목관리와 동일)
  const printByCandidate = async (candidateId: number) => {
    if ((evaluators as any[]).length === 0) {
      showNotification('평가위원이 등록되어야 인쇄가 가능합니다.', 'error');
      return;
    }

    const candidate = (candidates as any[]).find((c: any) => c.id === candidateId);
    if (!candidate) {
      showNotification('평가대상 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    try {
      let printContent = '';
      for (const evaluator of evaluators as any[]) {
        const evaluationContent = await generateEvaluationHTML(evaluator, candidate);
        printContent += `
          <div class="evaluation-page">
            ${evaluationContent}
          </div>
        `;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showNotification('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>${candidate.name} 평가대상 - 전체 평가표 (${(evaluators as any[]).length}페이지)</title>
            <meta charset="UTF-8">
            ${getPrintStyle()}
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.print();
      showNotification(`${candidate.name} 평가대상 전체 평가표 인쇄 미리보기가 열렸습니다!`, 'success');
    } catch (error) {
      console.error('❌ 평가대상별 인쇄 오류:', error);
      showNotification('평가대상별 인쇄 중 오류가 발생했습니다.', 'error');
    }
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

  const selectedCandidateInfo = (candidates as any[]).find((c: any) => c.id === selectedCandidate);
  const selectedEvaluatorInfo = (evaluators as any[]).find((e: any) => e.id === selectedEvaluator);

  const getDynamicTitle = () => {
    if (selectedCandidateInfo) {
      return `${selectedCandidateInfo.name} 심사표`;
    }
    return currentTemplate?.title || "제공기관 선정 심의회 평가표";
  };

  const handleExportResults = () => {
    if (filteredResults.length === 0) {
      toast({
        title: "데이터 없음",
        description: "내보낼 결과가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    const exportData = filteredResults.map(result => ({
      "순위": result.rank,
      "이름": result.candidate.name,
      "부서": result.candidate.department,
      "직책": result.candidate.position,
      "카테고리": result.candidate.category,
      "총점": result.totalScore,
      "최대점수": result.maxPossibleScore,
      "백분율": `${result.percentage}%`,
      "평가위원수": result.evaluatorCount,
      "완료된평가수": result.completedEvaluations,
      "평균점수": result.averageScore
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "평가결과");
    XLSX.writeFile(wb, "평가결과.xlsx");
    
    toast({
      title: "내보내기 완료",
      description: "Excel 파일이 다운로드되었습니다.",
      variant: "default"
    });
  };

  // 🎯 보고서 출력 섹션 (평가항목관리와 동일한 출력 방식)
  const renderReportSection = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">심사표 보고서 출력</h3>
      </div>
      <div className="text-sm text-gray-600 mb-3">
        실제 데이터베이스 평가항목을 기반으로 심사표를 출력합니다.
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">평가위원 선택</label>
          <Select value={selectedEvaluator?.toString() || ""} onValueChange={(value) => setSelectedEvaluator(Number(value))}>
            <SelectTrigger>
              <SelectValue placeholder="평가위원을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {evaluatorsData.map((evaluator: any) => (
                <SelectItem key={evaluator.id} value={evaluator.id.toString()}>
                  {evaluator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">평가대상 선택</label>
          <Select value={selectedCandidate?.toString() || ""} onValueChange={(value) => setSelectedCandidate(Number(value))}>
            <SelectTrigger>
              <SelectValue placeholder="평가대상을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {candidatesData.map((candidate: any) => (
                <SelectItem key={candidate.id} value={candidate.id.toString()}>
                  {candidate.name} ({candidate.category})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button 
          onClick={printEvaluationSheet}
          className="flex items-center gap-2"
          disabled={!selectedEvaluator || !selectedCandidate}
        >
          <FileText className="h-4 w-4" />
          개별 심사표 출력
        </Button>
        
        <Button 
          onClick={printAllCombinations}
          variant="outline"
          className="flex items-center gap-2"
          disabled={candidatesData.length === 0 || evaluatorsData.length === 0}
        >
          <FileText className="h-4 w-4" />
          전체 배치 출력
        </Button>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <h4 className="font-medium mb-3 text-sm">일괄 출력</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">평가위원별 출력</span>
              <span className="text-xs text-gray-500">({evaluatorsData.length}명)</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {evaluatorsData.slice(0, 4).map((evaluator: any) => (
                <Button
                  key={evaluator.id}
                  variant="outline"
                  size="sm"
                  onClick={() => printByEvaluator(evaluator.id)}
                  className="text-xs h-8"
                >
                  {evaluator.name}
                </Button>
              ))}
              {evaluatorsData.length > 4 && (
                <div className="col-span-2">
                  <Select onValueChange={(value) => printByEvaluator(Number(value))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={`+${evaluatorsData.length - 4}명 더보기`} />
                    </SelectTrigger>
                    <SelectContent>
                      {evaluatorsData.slice(4).map((evaluator: any) => (
                        <SelectItem key={evaluator.id} value={evaluator.id.toString()}>
                          {evaluator.name} ({candidatesData.length}페이지)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">평가대상별 출력</span>
              <span className="text-xs text-gray-500">({candidatesData.length}명)</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {candidatesData.slice(0, 4).map((candidate: any) => (
                <Button
                  key={candidate.id}
                  variant="outline"
                  size="sm"
                  onClick={() => printByCandidate(candidate.id)}
                  className="text-xs h-8 truncate"
                  title={candidate.name}
                >
                  {candidate.name}
                </Button>
              ))}
              {candidatesData.length > 4 && (
                <div className="col-span-2">
                  <Select onValueChange={(value) => printByCandidate(Number(value))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={`+${candidatesData.length - 4}명 더보기`} />
                    </SelectTrigger>
                    <SelectContent>
                      {candidatesData.slice(4).map((candidate: any) => (
                        <SelectItem key={candidate.id} value={candidate.id.toString()}>
                          {candidate.name} ({evaluatorsData.length}페이지)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedEvaluatorInfo && selectedCandidateInfo && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-1 text-sm">선택된 정보</h4>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>평가위원:</strong> {selectedEvaluatorInfo.name}</p>
            <p><strong>평가대상:</strong> {selectedCandidateInfo.name} ({selectedCandidateInfo.category})</p>
            <p><strong>출력 제목:</strong> {getDynamicTitle()}</p>
          </div>
        </div>
      )}
    </div>
  );

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
                          <Badge variant={result.percentage >= 70 ? "default" : "destructive"}>
                            {result.percentage >= 70 ? "합격" : "불합격"}
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
                  const categoryResults = resultsData.filter((r: CandidateResult) => r.candidate.category === category.categoryName);
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
                  {categoriesData.map((category: any) => (
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

  // 🎯 순위 관련 데이터 처리 (타입 안전한 결과 사용)
  const passThreshold = 70; // 기준점수 70%
  const topPerformers = resultsData.slice(0, 10); // 상위 10명
  const failedCandidates = resultsData.filter((result: CandidateResult) => result.percentage < passThreshold);
  const passedCandidates = resultsData.filter((result: CandidateResult) => result.percentage >= passThreshold);
  
  // 동점자 처리
  const tieGroups = resultsData.reduce((groups: any, result: CandidateResult) => {
    const key = result.percentage.toFixed(1);
    if (!groups[key]) groups[key] = [];
    groups[key].push(result);
    return groups;
  }, {});
  
  const tiedCandidates = Object.values(tieGroups).filter((group: any) => group.length > 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 페이지 헤더 */}
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

          {/* 메인 탭 네비게이션 */}
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

            {/* 탭 콘텐츠 */}
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
                {renderReportSection()}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}