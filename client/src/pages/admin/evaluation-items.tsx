import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Upload, Download, Save, X, Printer, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EvaluationItemManagement() {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newCategory, setNewCategory] = useState({
    categoryCode: "",
    categoryName: "",
    description: "",
  });
  const [newItem, setNewItem] = useState({
    categoryId: "",
    itemCode: "",
    itemName: "",
    description: "",
    maxScore: "",
    weight: "",
  });

  // 컬럼 설정 관리
  const [columnConfig, setColumnConfig] = useState([
    { id: 'section', title: '구분', type: 'section', visible: true, required: true, width: 'w-32' },
    { id: 'item', title: '세부 항목', type: 'text', visible: true, required: true, width: 'flex-1' },
    { id: 'type', title: '유형', type: 'select', visible: true, required: false, width: 'w-16', options: ['정량', '정성'] },
    { id: 'points', title: '배점', type: 'number', visible: true, required: true, width: 'w-16' },
    { id: 'score', title: '평가점수', type: 'number', visible: true, required: true, width: 'w-20' },
  ]);

  // 평가위원 및 평가대상 선택
  const [selectedEvaluator, setSelectedEvaluator] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [batchPrintMode, setBatchPrintMode] = useState(false);



  // 평가표 템플릿 상태
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
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 데이터 쿼리들
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/admin/categories"],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/admin/evaluation-items"],
  });

  // 평가위원 목록 가져오기
  const { data: evaluators = [] } = useQuery({
    queryKey: ["/api/admin/evaluators"],
  });

  // 후보자 목록 가져오기
  const { data: candidates = [] } = useQuery({
    queryKey: ["/api/admin/candidates"],
  });

  // 컬럼 설정 변경 시 기존 데이터 동기화
  useEffect(() => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        items: section.items.map(item => {
          const updatedItem = { ...item };
          columnConfig.forEach(column => {
            if (!['section', 'item', 'type', 'points', 'score'].includes(column.id)) {
              if (!(column.id in updatedItem)) {
                updatedItem[column.id] = column.type === 'number' ? 0 : '';
              }
            }
          });
          return updatedItem;
        })
      }))
    }));
  }, [columnConfig]);

  // 템플릿 관련 함수들
  const calculateSectionScore = (section: any) => {
    return section.items.reduce((sum: number, item: any) => sum + (item.points || 0), 0);
  };

  const calculateSectionTotalPoints = (section: any) => {
    return section.items.reduce((sum: number, item: any) => sum + (item.points || 0), 0);
  };

  const calculateTotalPoints = () => {
    return currentTemplate.sections.reduce((sum, section) => sum + calculateSectionTotalPoints(section), 0);
  };

  const calculateTotalScore = () => {
    return currentTemplate.sections.reduce((sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + (item.score || 0), 0), 0);
  };

  // 보이는 컬럼들만 필터링
  const visibleColumns = columnConfig.filter(col => col.visible);

  // 선택된 평가위원과 평가대상 정보
  const selectedEvaluatorInfo = evaluators.find((e: any) => e.id === selectedEvaluator);
  const selectedCandidateInfo = candidates.find((c: any) => c.id === selectedCandidate);

  // 동적 제목 생성
  const getDynamicTitle = () => {
    if (selectedCandidateInfo) {
      return `${selectedCandidateInfo.name} 심사표`;
    }
    return currentTemplate.title;
  };

  // 알림 함수
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50`;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  // 🎯 통합된 평가표 HTML 생성 함수 (일반/배치/개별 인쇄 모두 공통 사용)
  const generateEvaluationHTML = (evaluatorInfo, candidateInfo, templateData = currentTemplate) => {
    const today = new Date().toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // 동적 컬럼 생성
    const visibleColumns = columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id));

    // 제목 및 카테고리 정보 결정
    const candidateTitle = candidateInfo ? `${candidateInfo.name} 심사표` : templateData.title;
    const categoryInfo = candidateInfo ? (candidateInfo.category || candidateInfo.department || '') : '';

    // 평가위원 정보 결정
    const positionText = evaluatorInfo.position ? ` (${evaluatorInfo.position})` : '';

    // 총 배점 계산
    const totalPoints = templateData.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + (item.points || 0), 0), 0
    );

    // 총 점수 계산
    const totalScore = templateData.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + (item.score || 0), 0), 0
    );

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
            ${visibleColumns.map(column => `
              <th style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; font-weight: bold; font-size: 13px;">
                ${column.title}
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${templateData.sections.map(section => {
            return section.items.map((item, itemIndex) => {
              return `
                <tr>
                  ${itemIndex === 0 ? `
                    <td rowspan="${section.items.length}" style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f8f9fa; font-weight: bold; vertical-align: top; font-size: 12px;">
                      ${section.id}. ${section.title}<br>
                      <span style="font-size: 10px; color: #666;">(${section.items.reduce((sum, sectionItem) => sum + (sectionItem.points || 0), 0)}점)</span>
                    </td>
                  ` : ''}
                  <td style="border: 1px solid #666; padding: 8px; font-size: 12px;">
                    ${itemIndex + 1}. ${item.text}
                  </td>
                  ${visibleColumns.map(column => `
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
            ${visibleColumns.map(column => `
              <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f5f5f5; font-size: 13px; vertical-align: middle;">
                ${column.id === 'points' ? `${totalPoints}점` : 
                  column.id === 'score' ? `${totalScore}점` : 
                  ''}
              </td>
            `).join('')}
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
  };

  // 🎯 통합 인쇄 스타일 (모든 인쇄 함수에서 공통 사용)
  const getPrintStyle = () => `
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

  // 컬럼 설정 관리 함수들
  const updateColumnConfig = (columnId: string, field: string, value: any) => {
    setColumnConfig(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, [field]: value } : col
      )
    );
  };

  const addColumn = () => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      title: '새 컬럼',
      type: 'text',
      visible: true,
      required: false,
      width: 'w-20'
    };

    // 배점(points) 앞에 새 컬럼 삽입
    setColumnConfig(prev => {
      const pointsIndex = prev.findIndex(col => col.id === 'points');
      if (pointsIndex === -1) {
        return [...prev, newColumn];
      }
      const newConfig = [...prev];
      newConfig.splice(pointsIndex, 0, newColumn);
      return newConfig;
    });

    // 기존 데이터에 새 컬럼 필드 추가
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        items: section.items.map(item => ({
          ...item,
          [newColumn.id]: ''
        }))
      }))
    }));

    showNotification('새 컬럼이 추가되었습니다!');
  };

  const deleteColumn = (columnId: string) => {
    const column = columnConfig.find(col => col.id === columnId);
    if (column?.required) {
      showNotification('필수 컬럼은 삭제할 수 없습니다.', 'error');
      return;
    }

    setColumnConfig(prev => prev.filter(col => col.id !== columnId));

    // 기존 데이터에서 해당 컬럼 필드 제거
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        items: section.items.map(item => {
          const newItem = { ...item };
          delete newItem[columnId];
          return newItem;
        })
      }))
    }));

    showNotification('컬럼이 삭제되었습니다!');
  };

  const updateScore = (sectionId: string, itemId: number, score: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, score: Math.min(score, item.points) } : item
              )
            }
          : section
      )
    }));
  };

  const addSection = () => {
    const newId = String.fromCharCode(65 + currentTemplate.sections.length);
    setCurrentTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, {
        id: newId,
        title: '새 평가영역',
        totalPoints: 10,
        items: [{ id: 1, text: '새 평가항목', type: '정량', points: 10, score: 0 }]
      }]
    }));
  };

  const deleteSection = (sectionId: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const addItem = (sectionId: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: [...section.items, {
                id: Math.max(...section.items.map(i => i.id)) + 1,
                text: '새 평가항목',
                type: '정량',
                points: 5,
                score: 0
              }]
            }
          : section
      )
    }));
  };

  const deleteItem = (sectionId: string, itemId: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.filter(item => item.id !== itemId)
            }
          : section
      )
    }));
  };

  const updateItem = (sectionId: string, itemId: number, field: string, value: any) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, [field]: value } : item
              )
            }
          : section
      )
    }));
  };

  const updateSection = (sectionId: string, field: string, value: any) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    }));
  };

  const saveTemplate = () => {
    // 현재 날짜와 시간으로 파일명 생성
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const fileName = `평가표_${currentTemplate.title.replace(/[^\w\s]/gi, '')}_${dateStr}_${timeStr}.json`;

    // 평가위원 정보와 컬럼 설정도 포함해서 저장
    const templateWithAll = {
      ...currentTemplate,

      columnConfig: columnConfig
    };

    const dataStr = JSON.stringify(templateWithAll, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();

    showNotification('✅ 템플릿이 저장되었습니다!');
  };

  // 🎯 Excel로 저장하기 (인쇄 미리보기와 동일한 서식 적용)
  const saveAsExcel = async () => {
    try {
      // SheetJS 라이브러리 사용
      const XLSX = await import('https://unpkg.com/xlsx@0.18.5/xlsx.mjs');

      // 평가위원 정보 결정
      const evaluatorInfo = selectedEvaluatorInfo || { name: "평가위원", department: "기관명", position: "위원" };
      const candidateInfo = candidates.find((c: any) => c.id === selectedCandidate);

      // 제목 및 정보 결정
      const dynamicTitle = candidateInfo ? `${candidateInfo.name} 심사표` : currentTemplate.title;
      const categoryInfo = candidateInfo ? (candidateInfo.category || candidateInfo.department || '') : '';
      const today = new Date().toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // 동적 컬럼 필터링
      const visibleColumns = columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id));

      // 새 워크북 생성
      const wb = XLSX.utils.book_new();

      // 워크시트 데이터 배열 생성
      const wsData = [];

      // 1. 상단 구분 정보 행
      const headerRow1 = new Array(2 + visibleColumns.length).fill('');
      headerRow1[headerRow1.length - 1] = `구분: ${categoryInfo}`;
      wsData.push(headerRow1);

      // 2. 제목 행
      const titleRow = new Array(2 + visibleColumns.length).fill('');
      titleRow[0] = dynamicTitle;
      wsData.push(titleRow);

      // 3. 빈 행
      wsData.push(new Array(2 + visibleColumns.length).fill(''));

      // 4. 테이블 헤더
      const totalPoints = currentTemplate.sections.reduce((sum, section) => 
        sum + section.items.reduce((itemSum, item) => itemSum + (item.points || 0), 0), 0
      );

      const headerRow = [
        `구분 (${totalPoints}점)`,
        '세부 항목',
        ...visibleColumns.map(col => col.title)
      ];
      wsData.push(headerRow);

      // 5. 데이터 행들
      currentTemplate.sections.forEach(section => {
        section.items.forEach((item, itemIndex) => {
          const row = [];

          // 첫 번째 아이템인 경우에만 섹션 정보 추가
          if (itemIndex === 0) {
            const sectionPoints = section.items.reduce((sum, sectionItem) => sum + (sectionItem.points || 0), 0);
            row.push(`${section.id}. ${section.title}\n(${sectionPoints}점)`);
          } else {
            row.push(''); // 병합된 셀이므로 빈 값
          }

          // 세부 항목
          row.push(`${itemIndex + 1}. ${item.text}`);

          // 동적 컬럼들
          visibleColumns.forEach(column => {
            if (column.id === 'points') {
              row.push(`${item[column.id] || 0}점`);
            } else if (column.id === 'score') {
              row.push(`${item[column.id] || 0}점`);
            } else {
              row.push(item[column.id] || '');
            }
          });

          wsData.push(row);
        });
      });

      // 6. 합계 행
      const totalScore = currentTemplate.sections.reduce((sum, section) => 
        sum + section.items.reduce((itemSum, item) => itemSum + (item.score || 0), 0), 0
      );

      const totalRow = ['합계', ''];
      visibleColumns.forEach(column => {
        if (column.id === 'points') {
          totalRow.push(`${totalPoints}점`);
        } else if (column.id === 'score') {
          totalRow.push(`${totalScore}점`);
        } else {
          totalRow.push('');
        }
      });
      wsData.push(totalRow);

      // 7. 빈 행들
      wsData.push(new Array(2 + visibleColumns.length).fill(''));
      wsData.push(new Array(2 + visibleColumns.length).fill(''));

      // 8. 평가일
      const dateRow = new Array(2 + visibleColumns.length).fill('');
      dateRow[Math.floor(dateRow.length / 2)] = `평가일: ${today}`;
      wsData.push(dateRow);

      // 9. 평가위원 정보
      const positionText = evaluatorInfo.position ? ` (${evaluatorInfo.position})` : '';
      const evaluatorRow = new Array(2 + visibleColumns.length).fill('');
      evaluatorRow[evaluatorRow.length - 1] = `평가위원: ${evaluatorInfo.name}${positionText} (서명)`;
      wsData.push(evaluatorRow);

      // 워크시트 생성
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // 열 너비 설정
      const colWidths = [
        { wch: 25 }, // 구분
        { wch: 50 }, // 세부 항목
        ...visibleColumns.map(col => ({ wch: col.id === 'type' ? 10 : 12 }))
      ];
      ws['!cols'] = colWidths;

      // 행 높이 설정
      ws['!rows'] = [
        { hpt: 20 }, // 구분 행
        { hpt: 30 }, // 제목 행  
        { hpt: 10 }, // 빈 행
        { hpt: 25 }, // 헤더 행
        ...new Array(currentTemplate.sections.reduce((sum, s) => sum + s.items.length, 0)).fill({ hpt: 20 }), // 데이터 행들
        { hpt: 25 }, // 합계 행
        { hpt: 10 }, // 빈 행
        { hpt: 10 }, // 빈 행
        { hpt: 20 }, // 평가일
        { hpt: 20 }  // 평가위원
      ];

      // 셀 병합 설정
      const merges = [];

      // 제목 행 병합
      merges.push({
        s: { r: 1, c: 0 },
        e: { r: 1, c: 1 + visibleColumns.length }
      });

      // 구분 정보 행 병합
      merges.push({
        s: { r: 0, c: 0 },
        e: { r: 0, c: visibleColumns.length }
      });

      // 섹션별 첫 번째 컬럼 병합
      let currentRow = 4; // 헤더 다음부터
      currentTemplate.sections.forEach(section => {
        if (section.items.length > 1) {
          merges.push({
            s: { r: currentRow, c: 0 },
            e: { r: currentRow + section.items.length - 1, c: 0 }
          });
        }
        currentRow += section.items.length;
      });

      ws['!merges'] = merges;

      // 셀 스타일링 추가
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };

          // 기본 스타일
          ws[cellAddress].s = {
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            },
            alignment: { 
              horizontal: 'center', 
              vertical: 'center',
              wrapText: true 
            }
          };

          // 제목 행 스타일 (굵게, 큰 글씨)
          if (R === 1) {
            ws[cellAddress].s.font = { bold: true, sz: 16 };
            ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
          }

          // 헤더 행 스타일 (회색 배경, 굵게)
          if (R === 3) {
            ws[cellAddress].s.fill = { fgColor: { rgb: 'E8E8E8' } };
            ws[cellAddress].s.font = { bold: true, sz: 11 };
          }

          // 합계 행 스타일 (회색 배경, 굵게)
          if (R === 4 + currentTemplate.sections.reduce((sum, s) => sum + s.items.length, 0)) {
            ws[cellAddress].s.fill = { fgColor: { rgb: 'E8E8E8' } };
            ws[cellAddress].s.font = { bold: true, sz: 11 };
          }

          // 구분 컬럼 스타일 (연한 회색 배경)
          if (C === 0 && R >= 4 && R < 4 + currentTemplate.sections.reduce((sum, s) => sum + s.items.length, 0)) {
            ws[cellAddress].s.fill = { fgColor: { rgb: 'F8F9FA' } };
            ws[cellAddress].s.font = { bold: true, sz: 10 };
          }

          // 구분 정보 행 스타일 (오른쪽 정렬)
          if (R === 0) {
            ws[cellAddress].s.alignment = { horizontal: 'right', vertical: 'center' };
          }

          // 평가위원 정보 행 스타일 (오른쪽 정렬)
          if (R === wsData.length - 1) {
            ws[cellAddress].s.alignment = { horizontal: 'right', vertical: 'center' };
          }
        }
      }

      // 워크시트를 워크북에 추가
      XLSX.utils.book_append_sheet(wb, ws, '평가표');

      // 파일명 생성
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const fileName = `평가표_${dynamicTitle.replace(/[^\w\s]/gi, '')}_${dateStr}_${timeStr}.xlsx`;

      // Excel 파일 다운로드
      XLSX.writeFile(wb, fileName);

      showNotification('✅ 서식이 적용된 Excel 파일이 저장되었습니다!', 'success');

    } catch (error) {
      console.error('Excel 저장 오류:', error);
      showNotification('❌ Excel 저장 중 오류가 발생했습니다: ' + error.message, 'error');

      // 오류 발생 시 CSV로 대체
      console.log('CSV로 대체 저장을 시도합니다...');
      saveAsCSVFallback();
    }
  };

  // CSV 대체 저장 함수
  const saveAsCSVFallback = () => {
    try {
      // 평가위원 정보 결정
      const evaluatorInfo = selectedEvaluatorInfo || { name: "평가위원", department: "기관명", position: "위원" };
      const candidateInfo = candidates.find((c: any) => c.id === selectedCandidate);

      // 제목 및 정보 결정
      const dynamicTitle = candidateInfo ? `${candidateInfo.name} 심사표` : currentTemplate.title;
      const categoryInfo = candidateInfo ? (candidateInfo.category || candidateInfo.department || '') : '';
      const today = new Date().toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // 동적 컬럼 필터링
      const visibleColumns = columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id));

      // CSV 데이터 생성
      const csvData = [];

      // 1. 상단 정보
      csvData.push(['구분:', categoryInfo]);
      csvData.push([dynamicTitle]);
      csvData.push([]); // 빈 행

      // 2. 헤더
      const totalPoints = currentTemplate.sections.reduce((sum, section) => 
        sum + section.items.reduce((itemSum, item) => itemSum + (item.points || 0), 0), 0
      );

      csvData.push([
        `구분 (${totalPoints}점)`,
        '세부 항목',
        ...visibleColumns.map(col => col.title)
      ]);

      // 3. 데이터 행들
      currentTemplate.sections.forEach(section => {
        section.items.forEach((item, itemIndex) => {
          const row = [];

          // 섹션 정보 (첫 번째 아이템에만)
          if (itemIndex === 0) {
            const sectionPoints = section.items.reduce((sum, sectionItem) => sum + (sectionItem.points || 0), 0);
            row.push(`${section.id}. ${section.title} (${sectionPoints}점)`);
          } else {
            row.push('');
          }

          // 세부 항목
          row.push(`${itemIndex + 1}. ${item.text}`);

          // 동적 컬럼들
          visibleColumns.forEach(column => {
            if (column.id === 'points') {
              row.push(`${item[column.id] || 0}점`);
            } else if (column.id === 'score') {
              row.push(`${item[column.id] || 0}점`);
            } else {
              row.push(item[column.id] || '');
            }
          });

          csvData.push(row);
        });
      });

      // 4. 합계 행
      const totalScore = currentTemplate.sections.reduce((sum, section) => 
        sum + section.items.reduce((itemSum, item) => itemSum + (item.score || 0), 0), 0
      );

      const totalRow = ['합계', ''];
      visibleColumns.forEach(column => {
        if (column.id === 'points') {
          totalRow.push(`${totalPoints}점`);
        } else if (column.id === 'score') {
          totalRow.push(`${totalScore}점`);
        } else {
          totalRow.push('');
        }
      });
      csvData.push(totalRow);

      // 5. 하단 정보
      csvData.push([]); // 빈 행
      csvData.push([`평가일: ${today}`]);
      const positionText = evaluatorInfo.position ? ` (${evaluatorInfo.position})` : '';
      csvData.push([`평가위원: ${evaluatorInfo.name}${positionText} (서명)`]);

      // CSV 문자열 생성
      const csvContent = csvData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // BOM 추가 (한글 인코딩을 위해)
      const bom = '\uFEFF';
      const csvWithBom = bom + csvContent;

      // 파일 다운로드
      const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      // 파일명 생성
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const fileName = `평가표_${dynamicTitle.replace(/[^\w\s]/gi, '')}_${dateStr}_${timeStr}.csv`;

      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification('⚠️ Excel 라이브러리 오류로 CSV 파일로 저장되었습니다', 'info');

    } catch (error) {
      console.error('CSV 저장 오류:', error);
      showNotification('❌ 파일 저장에 실패했습니다: ' + error.message, 'error');
    }
  };

  const loadTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const template = JSON.parse(e.target?.result as string);

          // 템플릿 유효성 검사
          if (!template.title || !template.sections || !Array.isArray(template.sections)) {
            throw new Error('올바르지 않은 템플릿 형식입니다.');
          }

          // 평가위원 정보가 있으면 같이 불러오기


          // 컬럼 설정이 있으면 같이 불러오기
          if (template.columnConfig) {
            setColumnConfig(template.columnConfig);
          }

          setCurrentTemplate(template);
          showNotification('✅ 템플릿이 성공적으로 불러와졌습니다!', 'info');

        } catch (error: any) {
          showNotification('❌ ' + error.message, 'error');
        }
      };
      reader.readAsText(file);
    }

    // 파일 입력 초기화 (같은 파일 다시 선택 가능)
    event.target.value = '';
  };

  // 점수 초기화 함수
  const resetScores = () => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        items: section.items.map(item => ({ ...item, score: 0 }))
      }))
    }));
    showNotification('모든 점수가 초기화되었습니다!', 'success');
  };

  // 🎯 일반 인쇄 기능 (통합 함수 사용)
  const printTemplate = () => {
    // 평가위원 정보 결정 (선택된 평가위원 우선, 없으면 수동 입력)
    const evaluatorInfo = selectedEvaluatorInfo || { name: "평가위원", department: "기관명", position: "위원" };

    // 평가대상 정보 결정
    const candidateInfo = candidates.find((c: any) => c.id === selectedCandidate);

    // 통합 HTML 생성 함수 사용
    const evaluationContent = generateEvaluationHTML(evaluatorInfo, candidateInfo);

    // 제목 결정
    const dynamicTitle = candidateInfo ? `${candidateInfo.name} 심사표` : currentTemplate.title;

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
  };

  // 🎯 배치 인쇄 기능 (통합 함수 사용) + 추후 확장 대비
  const printAllCombinations = () => {
    if (candidates.length === 0 || evaluators.length === 0) {
      showNotification('평가대상과 평가위원이 모두 등록되어야 배치 인쇄가 가능합니다.', 'error');
      return;
    }

    let allPrintContent = '';
    const totalPages = candidates.length * evaluators.length;

    candidates.forEach((candidate, candidateIndex) => {
      evaluators.forEach((evaluator, evaluatorIndex) => {
        // 🎯 일반 인쇄와 완전히 동일한 로직 사용
        const evaluationContent = generateEvaluationHTML(evaluator, candidate);

        allPrintContent += `
          <div class="evaluation-page">
            ${evaluationContent}
          </div>
        `;
      });
    });

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
    showNotification(`총 ${totalPages}개의 평가표가 생성되었습니다!`, 'info');
  };

  // 🚀 추후 확장용: 평가위원별 일괄 인쇄
  const printByEvaluator = (evaluatorId) => {
    const evaluator = evaluators.find(e => e.id === evaluatorId);
    if (!evaluator || candidates.length === 0) return;

    let printContent = '';
    candidates.forEach(candidate => {
      const evaluationContent = generateEvaluationHTML(evaluator, candidate);
      printContent += `<div class="evaluation-page">${evaluationContent}</div>`;
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${evaluator.name} 평가위원 전체 평가표</title>
            <meta charset="UTF-8">
            ${getPrintStyle()}
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // 🚀 추후 확장용: 평가대상별 일괄 인쇄
  const printByCandidate = (candidateId) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate || evaluators.length === 0) return;

    let printContent = '';
    evaluators.forEach(evaluator => {
      const evaluationContent = generateEvaluationHTML(evaluator, candidate);
      printContent += `<div class="evaluation-page">${evaluationContent}</div>`;
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${candidate.name} 평가대상 전체 평가표</title>
            <meta charset="UTF-8">
            ${getPrintStyle()}
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const createCategoryMutation = useMutation({
    mutationFn: async (category: typeof newCategory) => {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });
      if (!response.ok) throw new Error("Failed to create category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      toast({ title: "성공", description: "평가 카테고리가 추가되었습니다." });
      setIsAddingCategory(false);
      setNewCategory({ categoryCode: "", categoryName: "", description: "" });
    },
    onError: () => {
      toast({ title: "오류", description: "카테고리 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const response = await fetch("/api/admin/evaluation-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item,
          categoryId: parseInt(item.categoryId),
          maxScore: parseInt(item.maxScore),
          weight: parseFloat(item.weight),
        }),
      });
      if (!response.ok) throw new Error("Failed to create item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
      toast({ title: "성공", description: "평가 항목이 추가되었습니다." });
      setIsAddingItem(false);
      setNewItem({ categoryId: "", itemCode: "", itemName: "", description: "", maxScore: "", weight: "" });
    },
    onError: () => {
      toast({ title: "오류", description: "평가 항목 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate(newCategory);
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createItemMutation.mutate(newItem);
  };

  // 평가항목으로 내보내기 기능
  const exportToEvaluationItems = async () => {
    try {
      // 먼저 기존 카테고리들을 생성
      const createdCategories: any[] = [];
      
      for (const section of currentTemplate.sections) {
        // 카테고리 생성
        const categoryResponse = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryCode: section.id,
            categoryName: section.title,
            description: `${section.title} 관련 평가 항목들`,
            isActive: true
          })
        });
        
        if (categoryResponse.ok) {
          const category = await categoryResponse.json();
          createdCategories.push(category);
          
          // 각 카테고리에 대한 평가 항목들 생성
          for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
            const item = section.items[itemIndex];
            
            const itemResponse = await fetch('/api/admin/evaluation-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                categoryId: category.id.toString(),
                itemCode: `${section.id}${itemIndex + 1}`,
                itemName: item.text,
                description: `${section.title} - ${item.text}`,
                maxScore: item.points.toString(),
                weight: "1.0"
              })
            });
            
            if (!itemResponse.ok) {
              console.error(`Failed to create item: ${item.text}`);
            }
          }
        }
      }
      
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
      
      toast({ 
        title: "성공", 
        description: `템플릿이 평가항목으로 성공적으로 내보내졌습니다. ${createdCategories.length}개 카테고리와 ${currentTemplate.sections.reduce((sum, section) => sum + section.items.length, 0)}개 항목이 생성되었습니다.` 
      });
      
      // 평가 항목 탭으로 자동 이동
      setTimeout(() => {
        const itemsTab = document.querySelector('[data-value="items"]') as HTMLElement;
        if (itemsTab) itemsTab.click();
      }, 1000);
      
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "오류", description: "평가항목 내보내기에 실패했습니다.", variant: "destructive" });
    }
  };

  if (categoriesLoading || itemsLoading) {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">평가항목 관리</h1>
            <p className="text-lg text-gray-600">평가 카테고리와 항목을 관리할 수 있습니다.</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              엑셀 업로드
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              엑셀 다운로드
            </Button>
          </div>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories">평가 카테고리</TabsTrigger>
            <TabsTrigger value="items">평가 항목</TabsTrigger>
            <TabsTrigger value="template">평가표 템플릿</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">평가 카테고리</h2>
                <Button onClick={() => setIsAddingCategory(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  카테고리 추가
                </Button>
              </div>

              {isAddingCategory && (
                <Card>
                  <CardHeader>
                    <CardTitle>새 카테고리 추가</CardTitle>
                    <CardDescription>평가 카테고리 정보를 입력하세요.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">카테고리 코드</label>
                          <Input
                            value={newCategory.categoryCode}
                            onChange={(e) => setNewCategory({ ...newCategory, categoryCode: e.target.value })}
                            required
                            placeholder="예: TECH"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">카테고리 이름</label>
                          <Input
                            value={newCategory.categoryName}
                            onChange={(e) => setNewCategory({ ...newCategory, categoryName: e.target.value })}
                            required
                            placeholder="예: 기술 역량"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium">설명</label>
                          <Input
                            value={newCategory.description}
                            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                            placeholder="카테고리에 대한 설명"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button type="submit" disabled={createCategoryMutation.isPending}>
                          {createCategoryMutation.isPending ? "추가 중..." : "추가"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsAddingCategory(false)}>
                          취소
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>카테고리 목록</CardTitle>
                  <CardDescription>총 {categories.length}개의 카테고리가 등록되어 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.map((category: any) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-semibold">{category.categoryName}</h3>
                            <p className="text-sm text-gray-600">
                              {category.categoryCode} · {category.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={category.isActive ? "default" : "secondary"}>
                            {category.isActive ? "활성" : "비활성"}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {categories.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        등록된 카테고리가 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="items">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">평가 항목</h2>
                <Button 
                  onClick={() => setIsAddingItem(true)}
                  disabled={categories.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  항목 추가
                </Button>
              </div>

              {categories.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-gray-500">
                      평가 항목을 추가하려면 먼저 카테고리를 생성해주세요.
                    </p>
                  </CardContent>
                </Card>
              )}

              {isAddingItem && categories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>새 평가 항목 추가</CardTitle>
                    <CardDescription>평가 항목 정보를 입력하세요.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleItemSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">카테고리</label>
                          <select
                            className="w-full px-3 py-2 border rounded-md"
                            value={newItem.categoryId}
                            onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                            required
                          >
                            <option value="">카테고리 선택</option>
                            {categories.map((category: any) => (
                              <option key={category.id} value={category.id}>
                                {category.categoryName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">항목 코드</label>
                          <Input
                            value={newItem.itemCode}
                            onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                            required
                            placeholder="예: TECH001"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">항목 이름</label>
                          <Input
                            value={newItem.itemName}
                            onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                            required
                            placeholder="예: 프로그래밍 능력"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">최대 점수</label>
                          <Input
                            type="number"
                            value={newItem.maxScore}
                            onChange={(e) => setNewItem({ ...newItem, maxScore: e.target.value })}
                            required
                            placeholder="예: 100"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">가중치</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={newItem.weight}
                            onChange={(e) => setNewItem({ ...newItem, weight: e.target.value })}
                            required
                            placeholder="예: 1.0"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium">설명</label>
                          <Input
                            value={newItem.description}
                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                            placeholder="평가 항목에 대한 설명"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button type="submit" disabled={createItemMutation.isPending}>
                          {createItemMutation.isPending ? "추가 중..." : "추가"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsAddingItem(false)}>
                          취소
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>평가 항목 목록</CardTitle>
                  <CardDescription>총 {items.length}개의 평가 항목이 등록되어 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-semibold">{item.itemName}</h3>
                            <p className="text-sm text-gray-600">
                              {item.itemCode} · {item.categoryName} · 최대 {item.maxScore}점 · 가중치 {item.weight}
                            </p>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={item.isActive ? "default" : "secondary"}>
                            {item.isActive ? "활성" : "비활성"}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        등록된 평가 항목이 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="template">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>평가표 템플릿</CardTitle>
                      <CardDescription>평가표를 디자인하고 관리합니다.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsEditing(!isEditing)}
                        variant={isEditing ? "default" : "outline"}
                        size="sm"
                      >
                        {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit3 className="h-4 w-4 mr-2" />}
                        {isEditing ? "편집 완료" : "편집"}
                      </Button>
                      <Button onClick={saveTemplate} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        JSON 저장
                      </Button>
                      <Button onClick={saveAsExcel} variant="outline" size="sm" className="bg-green-50 hover:bg-green-100 border-green-200">
                        <Download className="h-4 w-4 mr-2" />
                        Excel 저장
                      </Button>
                      <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        불러오기
                      </Button>
                      <Button onClick={resetScores} variant="outline" size="sm">
                        <X className="h-4 w-4 mr-2" />
                        점수 초기화
                      </Button>
                      <Button onClick={printTemplate} variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" />
                        인쇄
                      </Button>
                      <Button onClick={exportToEvaluationItems} variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                        <Upload className="h-4 w-4 mr-2" />
                        평가항목으로 내보내기
                      </Button>
                      {isEditing && (
                        <>
                          <Button onClick={addSection} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            영역 추가
                          </Button>
                          <Button onClick={addColumn} size="sm" variant="secondary">
                            <Plus className="h-4 w-4 mr-2" />
                            컬럼 추가
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={loadTemplate}
                    accept=".json"
                    className="hidden"
                  />





                  {/* 컬럼 관리 (편집 모드에서만 표시) */}
                  {isEditing && (
                    <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h3 className="text-sm font-bold mb-3 text-amber-800">컬럼 설정</h3>
                      <div className="mb-4 p-3 bg-amber-100 rounded-md border-l-4 border-amber-400">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-xs text-amber-800">
                              <strong>제목박스의 컬럼 표시/숨김을 설정할 수 있습니다. 필수 컬럼은 삭제할 수 없습니다.</strong>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {columnConfig.map((column) => (
                          <div key={column.id} className="flex items-center gap-2 text-xs bg-white p-2 rounded border">
                            <Input
                              value={column.title}
                              onChange={(e) => updateColumnConfig(column.id, 'title', e.target.value)}
                              className="w-32 text-xs"
                              disabled={column.required}
                            />
                            <select
                              value={column.type}
                              onChange={(e) => updateColumnConfig(column.id, 'type', e.target.value)}
                              className="text-xs border rounded px-2 py-1 bg-white"
                              disabled={column.required}
                            >
                              <option value="text">텍스트</option>
                              <option value="number">숫자</option>
                              <option value="select">선택</option>
                            </select>
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={column.visible}
                                onChange={(e) => updateColumnConfig(column.id, 'visible', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-xs">표시</span>
                            </label>
                            <div className="text-xs text-gray-500">
                              {column.required ? '필수' : '선택'}
                            </div>
                            {!column.required && (
                              <Button
                                onClick={() => deleteColumn(column.id)}
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0 hover:bg-red-50 hover:border-red-200"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 인쇄용 영역 */}
                  <div id="template-print-area">
                    {/* 제목과 구분 정보 표 */}
                    <div className="overflow-x-auto mb-0">
                      <table className="w-full border-collapse border border-gray-400 text-sm">
                        <tbody>
                          <tr>
                            <td colSpan={2} className="border-t border-l border-r border-gray-400 p-2 text-sm text-right">
                              {selectedCandidateInfo && (
                                <span>구분 : {selectedCandidateInfo.category || selectedCandidateInfo.department}</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="border-l border-r border-b border-gray-400 p-4 text-center text-lg font-bold title">
                              {selectedCandidateInfo ? getDynamicTitle() : currentTemplate.title}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 평가표 데이터 테이블 */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-400 text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-400 px-4 py-3 text-center font-bold">구분 ({currentTemplate.sections.reduce((sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + item.points, 0), 0)}점)</th>
                            <th className="border border-gray-400 px-4 py-3 text-center font-bold">세부 항목</th>
                            {columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => (
                              <th key={column.id} className="border border-gray-400 px-2 py-3 text-center font-bold w-16">
                                {column.title}
                              </th>
                            ))}
                            {isEditing && <th className="border border-gray-400 px-2 py-3 text-center font-bold w-20">관리</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {currentTemplate.sections.flatMap((section) => 
                            section.items.map((item, itemIndex) => (
                                <tr key={`${section.id}-${item.id}`} className="hover:bg-gray-50">
                                  {itemIndex === 0 && (
                                    <td 
                                      className="border border-gray-400 px-4 py-3 font-medium bg-blue-50 align-top text-center"
                                      rowSpan={section.items.length}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="w-full">
                                          {isEditing ? (
                                            <Input
                                              value={section.title}
                                              onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                                              className="font-bold text-sm bg-transparent border-b border-gray-300"
                                            />
                                          ) : (
                                            <span className="font-bold text-sm">{section.id}. {section.title}</span>
                                          )}
                                          <div className="text-xs text-gray-600 mt-1 text-center">
                                            ({calculateSectionScore(section)}점)
                                          </div>
                                        </div>
                                        {isEditing && (
                                          <div className="flex flex-col gap-1 ml-2">
                                            <Button
                                              onClick={() => addItem(section.id)}
                                              size="sm"
                                              variant="outline"
                                              className="h-6 w-6 p-0"
                                            >
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              onClick={() => deleteSection(section.id)}
                                              size="sm"
                                              variant="outline"
                                              className="h-6 w-6 p-0"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  )}

                                  <td className="border border-gray-400 px-4 py-2">
                                    {isEditing ? (
                                      <Input
                                        value={item.text}
                                        onChange={(e) => updateItem(section.id, item.id, 'text', e.target.value)}
                                        className="text-sm"
                                      />
                                    ) : (
                                      <span className="text-sm">{itemIndex + 1}. {item.text}</span>
                                    )}
                                  </td>

                                  {columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => (
                                    <td key={column.id} className={`border border-gray-400 px-2 py-2 text-center ${column.id === 'type' ? 'type-cell' : column.id === 'points' ? 'points-cell' : column.id === 'score' ? 'score-cell' : ''}`}>
                                      {column.id === 'score' ? (
                                        <div className="flex justify-center items-center">
                                          <Input
                                            type="number"
                                            value={item.score}
                                            onChange={(e) => updateScore(section.id, item.id, parseInt(e.target.value) || 0)}
                                            max={item.points}
                                            min={0}
                                            className="text-xs text-center w-16 mx-auto"
                                          />
                                        </div>
                                      ) : isEditing ? (
                                        column.id === 'type' ? (
                                          <div className="flex justify-center items-center">
                                            <select
                                              value={item.type}
                                              onChange={(e) => updateItem(section.id, item.id, 'type', e.target.value)}
                                              className="text-xs border rounded px-1 py-1 text-center mx-auto"
                                            >
                                              <option value="정량">정량</option>
                                              <option value="정성">정성</option>
                                            </select>
                                          </div>
                                        ) : (
                                          <div className="flex justify-center items-center">
                                            <Input
                                              type={column.type === 'number' ? 'number' : 'text'}
                                              value={item[column.id] || (column.type === 'number' ? 0 : '')}
                                              onChange={(e) => updateItem(section.id, item.id, column.id, column.type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value)}
                                              className="text-xs text-center w-12 mx-auto"
                                            />
                                          </div>
                                        )
                                      ) : (
                                        <span className="text-xs">
                                          {column.id === 'points' ? `${item[column.id]}점` : 
                                           column.id === 'score' ? item[column.id] :
                                           item[column.id]}
                                        </span>
                                      )}
                                    </td>
                                  ))}

                                  {isEditing && (
                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                      <Button
                                        onClick={() => deleteItem(section.id, item.id)}
                                        size="sm"
                                        variant="outline"
                                        className="h-6 w-6 p-0"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </td>
                                  )}
                                </tr>
                              ))
                          )}
                          {/* 합계 행 */}
                          <tr className="bg-gray-100 font-bold">
                            <td className="border border-gray-400 px-4 py-3 text-center">합계</td>
                            <td className="border border-gray-400 px-4 py-3"></td>
                            {columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => (
                              <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                                {column.id === 'points' ? (
                                  `${currentTemplate.sections.reduce((sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + item.points, 0), 0)}점`
                                ) : column.id === 'score' ? (
                                  <span className="text-lg font-bold">{calculateTotalScore()}점</span>
                                ) : ''}
                              </td>
                            ))}
                            {isEditing && <td className="border border-gray-400 px-2 py-3"></td>}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}