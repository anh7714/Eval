import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, Printer, Edit, FileText } from 'lucide-react';

// Supabase 설정 (환경변수에서 불러오기)
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://bqgbppdppkhsqkekqrui.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZ2JwcGRwcGtoc3FrZWtxcnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTY5MDAsImV4cCI6MjA2NjkzMjkwMH0.dRlTpr_LuIofkxWuW5mv8m0rUNzztgEpzwkGbIHQQTc';

// 타입 정의 수정
interface Candidate {
  id: number;
  name: string;
  department?: string;
  position?: string;
  averageScore?: number;
  selected?: boolean;
  sessionCount?: number;
  mainCategory?: string; // 구분 (main_category)
  subCategory?: string;  // 세부구분 (sub_category)
}

interface EvaluationSession {
  id: number;
  candidate_id: number;
  total_score: number;
  is_completed: boolean;
}

interface Evaluator {
  id: number;
  name: string;
  role?: string; // role 필드 추가
}

// Supabase API 호출 함수
const supabaseRequest = async (table: string, select: string = '*') => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${table}:`, error);
    return [];
  }
};

// 평가 결과 계산 함수
const calculateEvaluationResults = (candidates: Candidate[], evaluationSessions: EvaluationSession[]) => {
  return candidates.map((candidate: Candidate) => {
    // 해당 candidate의 모든 완료된 평가 세션 찾기
    const candidateSessions = evaluationSessions.filter(
      (session: EvaluationSession) => session.candidate_id === candidate.id && session.is_completed
    );
    
    if (candidateSessions.length === 0) {
      return {
        ...candidate,
        averageScore: 0,
        selected: false,
        sessionCount: 0
      };
    }
    
    // 평균 점수 계산
    const totalScore = candidateSessions.reduce((sum: number, session: EvaluationSession) => sum + (session.total_score || 0), 0);
    const averageScore = totalScore / candidateSessions.length;
    
    // 선정 기준 (예: 70점 이상)
    const selected = averageScore >= 70;
    
    return {
      ...candidate,
      averageScore: Math.round(averageScore * 10) / 10, // 소수점 1자리
      selected,
      sessionCount: candidateSessions.length
    };
  }).sort((a: Candidate, b: Candidate) => (b.averageScore || 0) - (a.averageScore || 0)); // 점수 순으로 정렬
};

// 한글 문서 스타일 템플릿 데이터
const defaultTemplate = {
  title: '돌봄SOS 서비스 제공기관 선정 심사결과 보고서',
  sections: [
    {
      id: '1',
      type: 'checklist',
      title: '1. 심사 개요',
      items: [
        { text: '사업명: {{사업명}}' },
        { text: '심사일시: {{현재날짜}}' },
        { text: '심사장소: {{심사장소}}' },
        { text: '심사방법: {{심사방법}}' },
        { text: '심사위원 수: 총 {{총평가위원수}}명' },
        { text: '심사대상 기관 수: 총 {{총평가대상수}}개 기관' },
        { text: '선정기관 수: 총 {{선정기관수}}개 기관' }
      ]
    },
    {
      id: '2',
      type: 'table',
      title: '2. 심사 결과',
      headers: ['순번', '기관명', '평균점수', '선정 여부', '구분-세부구분'],
      rows: [
        ['1', '{{평가대상명1}}', '{{평가대상점수1}}', '선정', '신규 - 일시동행'],
        ['2', '{{평가대상명2}}', '{{평가대상점수2}}', '선정', '재협약 - 주거편의'],
        ['3', '{{평가대상명3}}', '{{평가대상점수3}}', '선정', '신규 - 식사배달']
      ],
      note: '※ 평균점수는 완료된 평가 세션의 점수를 합산 후 평균산출한 수치임\n※ 최종 선정은 관리자가 각 구분-세부구분별로 수동 선정한 결과임'
    },
    {
      id: '3',
      type: 'signature',
      title: '3. 심사위원 서명란',
      signers: [
        { role: '심사위원장', name: '{{평가위원명1}}', date: '{{현재날짜}}' },
        { role: '심사위원', name: '{{평가위원명2}}', date: '{{현재날짜}}' },
        { role: '심사위원', name: '{{평가위원명3}}', date: '{{현재날짜}}' }
      ],
      footer: '작성일: {{현재날짜}}'
    }
  ]
};

export default function HWPStyleDocumentEditor() {
  const [template, setTemplate] = useState(defaultTemplate);
  const [currentView, setCurrentView] = useState('preview');
  
  // Supabase 데이터 state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evaluationSessions, setEvaluationSessions] = useState<EvaluationSession[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [reportTemplates, setReportTemplates] = useState<any[]>([]);
  const [processedCandidates, setProcessedCandidates] = useState<Candidate[]>([]); // 점수 계산된 후보들
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 최종 선정 상태 관리를 위한 state 수정
  const [finalSelections, setFinalSelections] = useState<{
    [key: string]: {
      candidateId: number;
      candidateName: string;
      mainCategory: string;
      subCategory: string;
      isSelected: boolean;
      averageScore: number;
    }[]
  }>({});

  // 구분-세부구분별 최종 선정 관리
  const handleFinalSelection = (candidateId: number, mainCategory: string, subCategory: string, isSelected: boolean) => {
    setFinalSelections(prev => ({
      ...prev,
      [`${mainCategory}-${subCategory}`]: prev[`${mainCategory}-${subCategory}`]?.map(item => 
        item.candidateId === candidateId 
          ? { ...item, isSelected }
          : item
      ) || []
    }));
  };

  // 최종 선정된 대상자들만 필터링
  const getFinalSelectedCandidates = () => {
    const selected: any[] = [];
    Object.values(finalSelections).forEach(categorySelections => {
      categorySelections.forEach(item => {
        if (item.isSelected) {
          selected.push(item);
        }
      });
    });
    return selected;
  };

  // 구분-세부구분별로 그룹화된 선정 결과
  const getGroupedFinalSelections = () => {
    const finalSelected = getFinalSelectedCandidates();
    
    // 구분-세부구분별로 그룹화
    const grouped: { [key: string]: any[] } = {};
    
    finalSelected.forEach(candidate => {
      const mainCategory = candidate.mainCategory || '신규';  // category → mainCategory로 변경
      const subCategory = candidate.subCategory || '일시동행';
      const key = `${mainCategory}-${subCategory}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(candidate);
    });
    
    return grouped;
  };

  // 동적으로 표 행 생성 (구분-세부구분별로)
  const generateDynamicRows = () => {
    const groupedSelections = getGroupedFinalSelections();
    const rows: string[][] = [];
    let rowNumber = 1;
    
    Object.entries(groupedSelections).forEach(([categoryKey, candidates]) => {
      const [mainCategory, subCategory] = categoryKey.split('-');
      
      candidates.forEach(candidate => {
        rows.push([
          String(rowNumber++),
          candidate.name,
          candidate.averageScore?.toString() || '0.0',
          '선정',
          `${mainCategory} > ${subCategory}` // mainCategory와 subCategory 사용
        ]);
      });
    });
    
    return rows;
  };

  // Supabase 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [candidatesData, sessionsData, evaluatorsData, templatesData] = await Promise.all([
          supabaseRequest('candidates'),
          supabaseRequest('evaluation_sessions'),
          supabaseRequest('evaluators'),
          supabaseRequest('report_templates')
        ]);
        
        // candidates 데이터에 mainCategory와 subCategory 매핑 추가
        const mappedCandidates = candidatesData.map((candidate: any) => ({
          id: candidate.id,
          name: candidate.name,
          department: candidate.department,
          position: candidate.position,
          mainCategory: candidate.main_category, // Supabase의 main_category 필드 매핑
          subCategory: candidate.sub_category,   // Supabase의 sub_category 필드 매핑
        }));
        
        setCandidates(mappedCandidates);
        setEvaluationSessions(sessionsData);
        setEvaluators(evaluatorsData);
        setReportTemplates(templatesData);
        
        // 평가 결과 계산 (매핑된 데이터 사용)
        const calculatedCandidates = calculateEvaluationResults(mappedCandidates, sessionsData);
        setProcessedCandidates(calculatedCandidates);
        
        // 데이터 로드 후 템플릿 업데이트
        updateTemplateWithData(calculatedCandidates, sessionsData, evaluatorsData, templatesData);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        setError('Supabase 데이터를 불러오는데 실패했습니다. 연결을 확인해주세요.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 데이터 기반 템플릿 업데이트
  const updateTemplateWithData = (calculatedCandidates: Candidate[], sessionsData: EvaluationSession[], evaluatorsData: Evaluator[], templatesData: any[]) => {
    // 데이터가 없을 경우 기본값 사용
    const fallbackCandidates = calculatedCandidates.length > 0 ? calculatedCandidates : [
      { id: 1, name: '○○복지센터', averageScore: 92.4, selected: true },
      { id: 2, name: '△△지역아동센터', averageScore: 89.7, selected: true },
      { id: 3, name: '□□사회복지관', averageScore: 88.3, selected: true },
      { id: 4, name: '◇◇노인복지센터', averageScore: 74.5, selected: false }
    ];

    const fallbackEvaluators = evaluatorsData.length > 0 ? evaluatorsData : [
      { id: 1, name: '[평가위원장명]', role: '심사위원장' },
      { id: 2, name: '[평가위원명]', role: '심사위원' },
      { id: 3, name: '[평가위원명]', role: '심사위원' }
    ];

    // 동적으로 표 행 생성
    const dynamicRows = fallbackCandidates.map((candidate: Candidate, index: number) => [
      String(index + 1),
      candidate.name || '평가대상명',
      candidate.averageScore?.toString() || '0.0',
      candidate.selected ? '선정' : '미선정'
    ]);

    // 동적으로 서명란 생성 (실제 role 필드 사용)
    const dynamicSigners = fallbackEvaluators.map((evaluator: Evaluator, index: number) => ({
      role: evaluator.role || (index === 0 ? '심사위원장' : '심사위원'), // 실제 role 필드 우선 사용
      name: `{{평가위원명${index + 1}}}`,
      date: '{{현재날짜}}'
    }));

    // 템플릿 업데이트
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.type === 'table' && section.title.includes('심사 결과')) {
          return {
            ...section,
            rows: dynamicRows
          };
        }
        if (section.type === 'signature') {
          return {
            ...section,
            signers: dynamicSigners
          };
        }
        return section;
      })
    }));
  };

  // 키값을 실제 데이터로 치환 (실제 Supabase 구조 사용)
  const replaceKeyValues = (text: string) => {
    if (!text) return '';
    
    const now = new Date();
    const selectedCandidates = processedCandidates.filter(c => c.selected);
    
    // 데이터가 없을 경우 기본값 사용
    const fallbackCandidates = processedCandidates.length > 0 ? processedCandidates : [
      { id: 1, name: '○○복지센터', averageScore: 92.4, selected: true },
      { id: 2, name: '△△지역아동센터', averageScore: 89.7, selected: true },
      { id: 3, name: '□□사회복지관', averageScore: 88.3, selected: true },
      { id: 4, name: '◇◇노인복지센터', averageScore: 74.5, selected: false }
    ];
    
    const fallbackEvaluators = evaluators.length > 0 ? evaluators : [
      { id: 1, name: '[평가위원장명]', role: '심사위원장' },
      { id: 2, name: '[평가위원명]', role: '심사위원' },
      { id: 3, name: '[평가위원명]', role: '심사위원' }
    ];
    
    const fallbackSelected = processedCandidates.length > 0 ? selectedCandidates : fallbackCandidates.filter(c => c.selected);
    
    const keyMappings: { [key: string]: string } = {
      '{{사업명}}': '돌봄SOS 서비스 제공기관 선정', // 고정값
      '{{현재날짜}}': now.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      '{{심사장소}}': '구로구청 소통홀(신관 3층)', // 고정값
      '{{심사방법}}': '서류 및 정성·정량 평가 (100점 만점)', // 고정값
      '{{총평가위원수}}': fallbackEvaluators.length.toString(),
      '{{총평가대상수}}': fallbackCandidates.length.toString(),
      '{{선정기관수}}': fallbackSelected.length.toString(),
      // 동적 평가위원명
      ...fallbackEvaluators.reduce((acc: { [key: string]: string }, evaluator: Evaluator, index: number) => {
        acc[`{{평가위원명${index + 1}}}`] = evaluator.name || `[평가위원${index + 1}명]`;
        return acc;
      }, {})
    };
    
    let result = text;
    Object.entries(keyMappings).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      result = result.replace(regex, value);
    });
    return result;
  };

  // 섹션 업데이트
  const updateSection = (sectionId: string, field: string, value: any) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    }));
  };

  // 체크리스트 아이템 업데이트
  const updateChecklistItem = (sectionId: string, itemIndex: number, value: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? {
          ...section,
          items: section.items.map((item: any, index: number) =>
            index === itemIndex ? { ...item, text: value } : item
          )
        } : section
      )
    }));
  };

  // 표 데이터 업데이트
  const updateTableCell = (sectionId: string, rowIndex: number, colIndex: number, value: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? {
          ...section,
          rows: section.rows.map((row: string[], rIndex: number) =>
            rIndex === rowIndex ? row.map((cell: string, cIndex: number) =>
              cIndex === colIndex ? value : cell
            ) : row
          )
        } : section
      )
    }));
  };

  // 인쇄 처리 함수 - UI 개선
  const handlePrint = () => {
    try {
      // 선택된 후보자들 가져오기
      const selectedCandidates = Object.values(finalSelections)
        .flat()
        .filter(item => item.isSelected)
        .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

      // 현재 날짜 생성
      const currentDate = new Date().toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // 템플릿에서 작성일자 가져오기
      const getTemplateDate = () => {
        // 템플릿의 서명란에서 날짜 찾기
        const signatureSection = template.sections.find(section => section.type === 'signature');
        if (signatureSection?.signers?.[0]?.date) {
          return signatureSection.signers[0].date.replace('{{현재날짜}}', currentDate);
        }
        
        // 템플릿의 footer에서 날짜 찾기
        if (signatureSection?.footer) {
          return signatureSection.footer.replace('{{현재날짜}}', currentDate);
        }
        
        // 기본값
        return currentDate;
      };

      const templateDate = getTemplateDate();

      // 인쇄용 HTML 생성 - UI 개선
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>심사결과 보고서</title>
          <style>
            @page {
              margin: 0;
              size: A4;
            }
            
            body {
              margin: 0;
              padding: 15mm;
              font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
              font-size: 11pt;
              line-height: 1.3;
              color: #000;
              background: white;
            }
            
            /* 제목 스타일 - 컴팩트하게 */
            .report-title {
              font-size: 16pt;
              font-weight: bold;
              text-align: center;
              margin-bottom: 15mm;
              color: #1a1a1a;
            }
            
            /* 섹션 제목 - 컴팩트하게 */
            .section-title {
              font-size: 12pt;
              font-weight: bold;
              margin: 6mm 0 3mm 0;
              color: #2c2c2c;
              border-bottom: 0.5pt solid #333;
              padding-bottom: 1mm;
            }
            
            /* 개요 정보 - 컴팩트하게 */
            .overview-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 2mm;
              margin: 3mm 0;
              font-size: 9pt;
            }
            
            .overview-item {
              display: flex;
              align-items: center;
              padding: 1.5mm 0;
            }
            
            .overview-label {
              font-weight: bold;
              min-width: 20mm;
              color: #333;
            }
            
            .overview-value {
              margin-left: 2mm;
              color: #000;
            }
            
            /* 테이블 스타일 - 컴팩트하게 */
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin: 3mm 0;
              font-size: 8pt;
              page-break-inside: auto;
            }
            
            .report-table th {
              background: #f5f5f5;
              border: 0.5pt solid #333;
              padding: 2mm 1.5mm;
              text-align: center;
              font-weight: bold;
              font-size: 8pt;
            }
            
            .report-table td {
              border: 0.5pt solid #333;
              padding: 2mm 1.5mm;
              text-align: center;
              font-size: 8pt;
            }
            
            /* 기관명 글자수 제한 해제 */
            .report-table td:nth-child(2) {
              max-width: none;
              overflow: visible;
              text-overflow: unset;
              white-space: normal;
              word-wrap: break-word;
            }
            
            /* 서명란 스타일 - 높이 더 줄이고 글씨 크기 증가 */
            .signature-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6mm;
              font-size: 9pt; /* 8pt에서 9pt로 증가 */
              page-break-inside: avoid;
            }
            
            .signature-table th {
              background: #f5f5f5;
              border: 0.5pt solid #333;
              padding: 2mm 2mm; /* 2.5mm에서 2mm로 축소 */
              text-align: center;
              font-weight: bold;
              font-size: 9pt; /* 헤더 글씨도 9pt로 증가 */
            }
            
            .signature-table td {
              border: 0.5pt solid #333;
              padding: 2mm 2mm; /* 3mm에서 2mm로 축소 */
              text-align: center;
              height: 6mm; /* 8mm에서 6mm로 더 축소 */
            }
            
            /* 각주 스타일 */
            .footnote {
              font-size: 7pt;
              color: #666;
              margin-top: 3mm;
              padding-top: 1.5mm;
              border-top: 0.3pt solid #ccc;
            }
            
            /* 작성일자 스타일 - 크고 진하게 */
            .creation-date {
              margin-top: 8mm;
              text-align: center;
              font-size: 11pt; /* 크기 증가 */
              font-weight: bold; /* 진하게 */
              color: #000;
            }
            
            /* 페이지 나누기 설정 */
            .page-break {
              page-break-before: always;
            }
            
            /* 테이블 행 높이 조정 */
            .report-table tr {
              height: 6mm;
            }
            
            /* 대용량 데이터 대응 */
            @media print {
              /* 20개 이상일 때 자동 페이지 나누기 */
              .report-table tbody tr:nth-child(20n) {
                page-break-after: always;
              }
              
              /* 서명란은 항상 새 페이지에서 시작 */
              .signature-section {
                page-break-before: always;
              }
            }
            
            /* 반응형 글자 크기 */
            @media print {
              /* 30개 이상일 때 글자 크기 축소 */
              .large-data .report-table {
                font-size: 7pt;
              }
              
              .large-data .report-table th,
              .large-data .report-table td {
                padding: 1.5mm 1mm;
              }
              
              /* 40개 이상일 때 더 작게 */
              .extra-large-data .report-table {
                font-size: 6pt;
              }
              
              .extra-large-data .report-table th,
              .extra-large-data .report-table td {
                padding: 1mm 0.8mm;
              }
            }
          </style>
        </head>
        <body class="${selectedCandidates.length > 30 ? 'large-data' : ''} ${selectedCandidates.length > 40 ? 'extra-large-data' : ''}">
          <div class="report-title">돌봄SOS 서비스 제공기관 선정 심사결과 보고서</div>
          
          <div class="section-title">1. 심사 개요</div>
          <div class="overview-grid">
            <div class="overview-item">
              <span class="overview-label">사업명</span>
              <span class="overview-value">돌봄SOS 서비스 제공기관 선정</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">심사일시</span>
              <span class="overview-value">${templateDate}</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">심사장소</span>
              <span class="overview-value">구로구청 소통홀(신관 3층)</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">심사방법</span>
              <span class="overview-value">서류 및 정성·정량 평가 (100점 만점)</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">심사위원 수</span>
              <span class="overview-value">총 ${evaluators.length}명</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">심사대상 기관 수</span>
              <span class="overview-value">총 ${processedCandidates.length}개 기관</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">선정기관 수</span>
              <span class="overview-value">총 ${selectedCandidates.length}개 기관</span>
            </div>
          </div>
          
          <div class="section-title">2. 심사 결과</div>
          <table class="report-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>기관명</th>
                <th>평균점수</th>
                <th>선정 여부</th>
                <th>구분-세부구분</th>
              </tr>
            </thead>
            <tbody>
              ${selectedCandidates.map((candidate, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${candidate.candidateName}</td>
                  <td>${candidate.averageScore}</td>
                  <td>선정</td>
                  <td>${candidate.mainCategory} > ${candidate.subCategory}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footnote">
            ※평균점수는 완료된 평가 세션의 점수를 합산 후 평균산출한 수치임<br>
            ※최종 선정은 관리자가 각 구분-세부구분별로 수동 선정한 결과임
          </div>
          
          <div class="section-title signature-section">3. 심사위원 서명란</div>
          <table class="signature-table">
            <thead>
              <tr>
                <th>구분</th>
                <th>성명 (직위)</th>
                <th>서명</th>
              </tr>
            </thead>
            <tbody>
              ${evaluators.map((evaluator, index) => `
                <tr>
                  <td>${evaluator.role || (index === 0 ? '심사위원장' : '심사위원')}</td>
                  <td>${evaluator.name || `[평가위원${index + 1}명]`}</td>
                  <td>(서명)</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- 작성일자 - 크고 진하게 -->
          <div class="creation-date">
            작성일: ${currentDate}
          </div>
        </body>
        </html>
      `;

      // 새 창에서 인쇄 실행
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // 인쇄 실행
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      } else {
        // 팝업이 차단된 경우 기본 인쇄 사용
        console.log('팝업이 차단되었습니다. 기본 인쇄를 사용합니다.');
        window.print();
      }
    } catch (error) {
      console.error('인쇄 오류:', error);
      // 오류 발생 시 기본 인쇄 사용
      window.print();
    }
  };

  // 미리보기 렌더링
  const renderPreview = () => (
    <div id="document-preview" className="bg-white p-8 max-w-4xl mx-auto shadow-lg border rounded-lg">
      <h1 className="text-center text-xl font-bold mb-8 border-b-2 border-black pb-4">
        {replaceKeyValues(template.title)}
      </h1>

      {template.sections.map(section => (
        <div key={section.id} className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            {replaceKeyValues(section.title)}
          </h2>

          {section.type === 'checklist' && (
            <div className="space-y-2 ml-4">
              {section.items.map((item, index) => (
                <div key={index} className="flex items-center">
                  <span className="mr-2 text-lg">☐</span>
                  <span className="text-sm">{replaceKeyValues(item.text)}</span>
                </div>
              ))}
            </div>
          )}

          {section.type === 'table' && (
            <div>
              <table className="w-full border-collapse border border-gray-800 mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    {section.headers.map((header, index) => (
                      <th key={index} className="border border-gray-800 p-3 font-bold text-center text-sm">
                        {replaceKeyValues(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border border-gray-800 p-3 text-center text-sm">
                          {replaceKeyValues(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {section.note && (
                <p className="text-sm text-gray-600 mt-2">
                  {replaceKeyValues(section.note)}
                </p>
              )}
            </div>
          )}

          {section.type === 'signature' && (
            <div className="mt-6">
              <table className="w-full border-collapse border border-gray-800">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-800 p-4 font-bold text-sm">구분</th>
                    <th className="border border-gray-800 p-4 font-bold text-sm">
                      성명<br />(직위)
                    </th>
                    <th className="border border-gray-800 p-4 font-bold text-sm">서명</th>
                  </tr>
                </thead>
                <tbody>
                  {section.signers.map((signer, index) => (
                    <tr key={index}>
                      <td className="border border-gray-800 p-4 text-center text-sm">
                        {replaceKeyValues(signer.role)}
                      </td>
                      <td className="border border-gray-800 p-4 text-center text-sm">
                        {replaceKeyValues(signer.name)}
                      </td>
                      <td className="border border-gray-800 p-4 text-center">
                        <div className="h-8 flex items-center justify-center text-gray-400">
                          (서명)
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {section.footer && (
                <div className="text-right mt-6 font-medium text-sm">
                  {replaceKeyValues(section.footer)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // 편집 모드 렌더링
  const renderEditMode = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>문서 제목</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={template.title}
            onChange={(e) => setTemplate(prev => ({ ...prev, title: e.target.value }))}
            className="text-lg font-semibold"
          />
        </CardContent>
      </Card>

      {template.sections.map(section => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <Input
                value={section.title}
                onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                className="text-base font-medium bg-transparent border-0 p-0"
              />
              <Badge variant="secondary">{section.type}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {section.type === 'checklist' && (
              <div className="space-y-3">
                <label className="text-sm font-medium block">체크리스트 항목들</label>
                {section.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-lg">☐</span>
                    <Input
                      value={item.text}
                      onChange={(e) => updateChecklistItem(section.id, index, e.target.value)}
                      className="flex-1"
                      placeholder="항목 내용을 입력하세요"
                    />
                  </div>
                ))}
              </div>
            )}

            {section.type === 'table' && (
              <div>
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">표 헤더</label>
                  <div className="grid grid-cols-4 gap-2">
                    {section.headers.map((header, index) => (
                      <Input
                        key={index}
                        value={header}
                        onChange={(e) => {
                          const newHeaders = [...section.headers];
                          newHeaders[index] = e.target.value;
                          updateSection(section.id, 'headers', newHeaders);
                        }}
                        className="text-center font-medium"
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block">표 데이터</label>
                  {section.rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-4 gap-2">
                      {row.map((cell, cellIndex) => (
                        <Input
                          key={cellIndex}
                          value={cell}
                          onChange={(e) => 
                            updateTableCell(section.id, rowIndex, cellIndex, e.target.value)
                          }
                          className="text-center"
                        />
                      ))}
                    </div>
                  ))}
                </div>
                {section.note && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">참고사항</label>
                    <Textarea
                      value={section.note}
                      onChange={(e) => updateSection(section.id, 'note', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {section.type === 'signature' && (
              <div className="space-y-4">
                <label className="text-sm font-medium block">서명란 설정</label>
                {section.signers.map((signer, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded">
                    <div>
                      <label className="text-xs text-gray-600">역할</label>
                      <Input
                        value={signer.role}
                        onChange={(e) => {
                          const newSigners = [...section.signers];
                          newSigners[index] = { ...signer, role: e.target.value };
                          updateSection(section.id, 'signers', newSigners);
                        }}
                        placeholder="심사위원장"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">이름</label>
                      <Input
                        value={signer.name}
                        onChange={(e) => {
                          const newSigners = [...section.signers];
                          newSigners[index] = { ...signer, name: e.target.value };
                          updateSection(section.id, 'signers', newSigners);
                        }}
                        placeholder="{{평가위원명}}"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">날짜</label>
                      <Input
                        value={signer.date}
                        onChange={(e) => {
                          const newSigners = [...section.signers];
                          newSigners[index] = { ...signer, date: e.target.value };
                          updateSection(section.id, 'signers', newSigners);
                        }}
                        placeholder="{{현재날짜}}"
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
                {section.footer && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">서명란 하단</label>
                    <Input
                      value={section.footer}
                      onChange={(e) => updateSection(section.id, 'footer', e.target.value)}
                      placeholder="작성일: {{현재날짜}}"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // 최종 선정 관리 UI 렌더링
  const renderFinalSelectionManager = () => {
    // 구분-세부구분별로 후보자들을 그룹화
    const groupedCandidates: { [key: string]: Candidate[] } = {};
    
    processedCandidates.forEach(candidate => {
      const mainCategory = candidate.mainCategory || '신규';  // mainCategory 사용
      const subCategory = candidate.subCategory || '일시동행';
      const key = `${mainCategory}-${subCategory}`;
      
      if (!groupedCandidates[key]) {
        groupedCandidates[key] = [];
      }
      groupedCandidates[key].push(candidate);
    });

    return (
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="font-medium text-yellow-800 mb-2">🎯 최종 선정 관리</h3>
        <p className="text-sm text-yellow-700 mb-4">
          각 구분-세부구분별로 최종 선정할 대상자를 체크하세요. 
          체크된 대상자들만 심사결과 보고서에 포함됩니다.
        </p>
        
        {Object.entries(groupedCandidates).map(([categoryKey, candidates]) => {
          const [mainCategory, subCategory] = categoryKey.split('-');
          return (
            <div key={categoryKey} className="mb-4 p-3 bg-white rounded border">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <Badge variant="outline" className="mr-2">{mainCategory}</Badge>
                <Badge variant="secondary">{subCategory}</Badge>
                <span className="ml-2 text-sm text-gray-600">
                  ({candidates.length}개 기관)
                </span>
              </h4>
              <div className="space-y-2">
                {candidates.map((candidate) => {
                  const isSelected = finalSelections[categoryKey]?.find(
                    item => item.candidateId === candidate.id
                  )?.isSelected || false;
                  
                  return (
                    <div key={candidate.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSelections = finalSelections[categoryKey] || [];
                          const existingIndex = newSelections.findIndex(
                            item => item.candidateId === candidate.id
                          );
                          
                          if (existingIndex >= 0) {
                            newSelections[existingIndex] = {
                              ...newSelections[existingIndex],
                              isSelected: e.target.checked
                            };
                          } else {
                            newSelections.push({
                              candidateId: candidate.id,
                              candidateName: candidate.name,
                              mainCategory: candidate.mainCategory || '신규',  // 실제 candidate의 mainCategory 사용
                              subCategory: candidate.subCategory || '일시동행',  // 실제 candidate의 subCategory 사용
                              isSelected: e.target.checked,
                              averageScore: candidate.averageScore || 0
                            });
                          }
                          
                          setFinalSelections(prev => ({
                            ...prev,
                            [categoryKey]: newSelections
                          }));
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">{candidate.name}</span>
                      <Badge variant={candidate.selected ? "default" : "secondary"}>
                        {candidate.averageScore || 0}점
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {candidate.selected ? '자동선정' : '미선정'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        <div className="mt-4 p-3 bg-blue-50 rounded border">
          <h4 className="font-medium text-blue-800 mb-2">📊 선정 현황</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">총 선정 대상:</span>
              <span className="ml-2 font-medium">
                {Object.values(finalSelections).flat().filter(item => item.isSelected).length}개
              </span>
            </div>
            <div>
              <span className="text-gray-600">총 후보:</span>
              <span className="ml-2 font-medium">{processedCandidates.length}개</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 동적으로 표 행 생성 (최종 선정된 대상자들만)
  const generateFinalSelectionRows = () => {
    const selectedCandidates = Object.values(finalSelections)
      .flat()
      .filter(item => item.isSelected)
      .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
    
    return selectedCandidates.map((candidate, index) => [
      String(index + 1),
      candidate.candidateName,
      candidate.averageScore?.toString() || '0.0',
      '선정',
      `${candidate.mainCategory} > ${candidate.subCategory}` // 저장된 mainCategory와 subCategory 사용
    ]);
  };

  // 템플릿 업데이트 함수 수정
  const updateTemplateWithFinalSelections = () => {
    const finalRows = generateFinalSelectionRows();
    
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.type === 'table' && section.title.includes('심사 결과')) {
          return {
            ...section,
            rows: finalRows.length > 0 ? finalRows : [
              ['1', '선정된 대상자가 없습니다', '0.0', '미선정', '신규 - 일시동행']
            ]
          };
        }
        return section;
      })
    }));
  };

  // finalSelections이 변경될 때마다 템플릿 업데이트
  useEffect(() => {
    updateTemplateWithFinalSelections();
  }, [finalSelections]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">📄 한글 문서 스타일 편집기</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentView(currentView === 'edit' ? 'preview' : 'edit')}
              variant="outline"
              disabled={loading}
            >
              <Edit className="h-4 w-4 mr-2" />
              {currentView === 'edit' ? '미리보기' : '편집 모드'}
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              <Printer className="h-4 w-4 mr-2" />
              인쇄
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              저장
            </Button>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-700">Supabase에서 데이터를 불러오는 중...</span>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-medium text-red-800 mb-2">❌ 데이터 로드 실패</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 최종 선정 관리 UI */}
        {!loading && !error && renderFinalSelectionManager()}

        {/* 데이터 현황 */}
        {!loading && !error && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-800 mb-2">📊 실시간 Supabase 데이터</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center p-2 bg-white rounded shadow">
                <div className="font-bold text-green-600 text-lg">
                  {processedCandidates.length > 0 ? processedCandidates.length : candidates.length || '4 (기본)'}
                </div>
                <div className="text-gray-600">평가대상</div>
              </div>
              <div className="text-center p-2 bg-white rounded shadow">
                <div className="font-bold text-blue-600 text-lg">
                  {evaluators.length > 0 ? evaluators.length : '3 (기본)'}
                </div>
                <div className="text-gray-600">평가위원</div>
              </div>
              <div className="text-center p-2 bg-white rounded shadow">
                <div className="font-bold text-purple-600 text-lg">{evaluationSessions.length}</div>
                <div className="text-gray-600">평가세션</div>
              </div>
              <div className="text-center p-2 bg-white rounded shadow">
                <div className="font-bold text-orange-600 text-lg">
                  {Object.values(finalSelections).flat().filter(item => item.isSelected).length}
                </div>
                <div className="text-gray-600">최종선정</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-center">
              <span className="text-green-600">✅ 체크박스로 최종 선정 관리 가능</span>
            </div>
          </div>
        )}

        <div className="mb-6">
          {currentView === 'edit' ? renderEditMode() : renderPreview()}
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-800 mb-2">💡 사용법</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>최종 선정 관리</strong>: 구분-세부구분별로 체크박스로 선정</li>
            <li>• <strong>편집 모드</strong>: 텍스트, 표, 체크리스트를 직접 수정</li>
            <li>• <strong>미리보기</strong>: 실제 출력될 모습 확인</li>
            <li>• <strong>실시간 계산</strong>: evaluation_sessions에서 평균 점수 자동 계산</li>
            <li>• <strong>수동 선정</strong>: 관리자가 각 구분-세부구분별로 최종 선정</li>
            <li>• <strong>동적 생성</strong>: 선정된 대상자만 보고서에 포함</li>
            <li>• <strong>인쇄 최적화</strong>: A4 용지에 맞게 자동 조정</li>
          </ul>
          <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
            <strong>📝 실제 Supabase 테이블 구조:</strong><br/>
            • candidates: name (기관명), mainCategory (구분), subCategory (세부구분)<br/>
            • evaluators: name (평가위원명), role (심사위원장/심사위원)<br/>
            • evaluation_sessions: candidate_id, total_score, is_completed<br/>
            • 평균 점수 = 완료된 평가 세션의 total_score 평균<br/>
            • 선정 기준 = 평균 점수 70점 이상<br/>
            • 서명란 = 실제 role 필드에 따라 심사위원장/심사위원 구분
          </div>
        </div>
      </div>
    </div>
  );
} 