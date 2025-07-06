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

  // 데이터베이스 데이터를 템플릿 구조로 변환
  const convertDataToTemplate = () => {
    if (!categories || !items) return;
    
    const categoryItems = categories.map((category: any) => {
      const categoryItemList = items
        .filter((item: any) => item.categoryId === category.id)
        .reduce((sum: any, item: any) => sum + (item.maxScore || 0), 0);
      
      const itemList = items
        .filter((item: any) => item.categoryId === category.id)
        .map((item: any, index: any) => ({
          id: item.id,
          text: item.itemName,
          type: item.type || '정량',
          points: item.maxScore || 0,
          score: 0
        }));

      return {
        id: category.categoryCode || category.id,
        title: category.categoryName,
        totalPoints: categoryItemList,
        items: itemList
      };
    });

    if (categoryItems.length > 0) {
      setCurrentTemplate(prev => ({
        ...prev,
        sections: categoryItems
      }));
    }
  };

  // 데이터가 로드되면 템플릿 변환
  useEffect(() => {
    convertDataToTemplate();
  }, [categories, items]);

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
  const generateEvaluationHTML = (evaluatorInfo: any, candidateInfo: any, templateData = currentTemplate) => {
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
    const totalPossiblePoints = templateData.sections.reduce((sum: any, section: any) => 
      sum + section.items.reduce((itemSum: any, item: any) => itemSum + item.points, 0), 0
    );

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${candidateTitle}</title>
    <style>
        @media print {
            @page {
                size: A4;
                margin: 25mm 20mm 20mm 20mm;
            }
            body { margin: 0; padding: 0; }
        }
        
        body {
            font-family: 'Malgun Gothic', sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #333;
            line-height: 1.4;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .main-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 10px;
        }
        
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        
        .info-table td {
            border: 1px solid #666;
            padding: 8px 12px;
            font-size: 14px;
        }
        
        .info-label {
            background-color: #f8f9fa;
            font-weight: bold;
            width: 120px;
            text-align: center;
        }
        
        .evaluation-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .evaluation-table th,
        .evaluation-table td {
            border: 1px solid #666;
            text-align: center;
            vertical-align: middle;
            font-size: 12px;
            padding: 8px 4px;
        }
        
        .evaluation-table th {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #1e293b;
        }
        
        .section-cell {
            background-color: #dbeafe;
            font-weight: bold;
            text-align: center;
            vertical-align: middle;
        }
        
        .item-cell {
            text-align: left;
            padding-left: 8px;
        }
        
        .type-cell,
        .points-cell,
        .score-cell {
            text-align: center;
            vertical-align: middle;
        }
        
        .total-row {
            background-color: #f1f5f9;
            font-weight: bold;
        }
        
        .total-row td {
            text-align: center;
            vertical-align: middle;
        }
        
        .signature-area {
            margin-top: 40px;
            text-align: right;
            page-break-inside: avoid;
        }
        
        .signature-table {
            width: 300px;
            margin-left: auto;
            border-collapse: collapse;
        }
        
        .signature-table td {
            border: 1px solid #666;
            padding: 12px;
            text-align: center;
        }
        
        .signature-label {
            background-color: #f8f9fa;
            font-weight: bold;
            width: 100px;
        }
        
        .signature-space {
            width: 200px;
            height: 40px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="main-title">${candidateTitle}</div>
    </div>
    
    <table class="info-table">
        <tr>
            <td class="info-label">평가대상</td>
            <td>${candidateInfo ? candidateInfo.name : '전체'}</td>
            <td class="info-label">구분</td>
            <td>${categoryInfo}</td>
        </tr>
        <tr>
            <td class="info-label">평가위원</td>
            <td>${evaluatorInfo ? evaluatorInfo.name + positionText : '미선택'}</td>
            <td class="info-label">평가일시</td>
            <td>${today}</td>
        </tr>
    </table>
    
    <table class="evaluation-table">
        <thead>
            <tr>
                <th style="width: 120px;">구분</th>
                <th style="width: auto;">세부 항목</th>
                ${visibleColumns.map(col => 
                  `<th style="width: ${col.id === 'type' ? '60px' : col.id === 'points' ? '60px' : '80px'};">${col.title}</th>`
                ).join('')}
            </tr>
        </thead>
        <tbody>
            ${templateData.sections.flatMap((section: any) => 
              section.items.map((item: any, itemIndex: any) => `
                <tr>
                    ${itemIndex === 0 ? `
                        <td class="section-cell" rowspan="${section.items.length}">
                            <div style="font-weight: bold; font-size: 11px;">${section.id}. ${section.title}</div>
                            <div style="font-size: 10px; color: #666; margin-top: 2px;">(${section.items.reduce((sum: any, i: any) => sum + i.points, 0)}점)</div>
                        </td>
                    ` : ''}
                    <td class="item-cell">${itemIndex + 1}. ${item.text}</td>
                    ${visibleColumns.map(column => {
                      if (column.id === 'type') {
                        return `<td class="type-cell">${item.type}</td>`;
                      } else if (column.id === 'points') {
                        return `<td class="points-cell">${item.points}점</td>`;
                      } else if (column.id === 'score') {
                        return `<td class="score-cell">${item.score || ''}</td>`;
                      }
                      return `<td class="${column.id}-cell">${item[column.id] || ''}</td>`;
                    }).join('')}
                </tr>
              `).join('')
            ).join('')}
            <tr class="total-row">
                <td>합계</td>
                <td></td>
                ${visibleColumns.map(column => {
                  if (column.id === 'points') {
                    return `<td>${totalPossiblePoints}점</td>`;
                  } else if (column.id === 'score') {
                    const totalScore = templateData.sections.reduce((sum: any, section: any) => 
                      sum + section.items.reduce((itemSum: any, item: any) => itemSum + (item.score || 0), 0), 0
                    );
                    return `<td>${totalScore}점</td>`;
                  }
                  return `<td></td>`;
                }).join('')}
            </tr>
        </tbody>
    </table>
    
    <div class="signature-area">
        <table class="signature-table">
            <tr>
                <td class="signature-label">평가위원</td>
                <td class="signature-space">${evaluatorInfo ? evaluatorInfo.name : ''}</td>
            </tr>
            <tr>
                <td class="signature-label">서명</td>
                <td class="signature-space">(인)</td>
            </tr>
        </table>
    </div>
</body>
</html>
    `;
  };

  // 개별 심사표 보기
  const viewEvaluationSheet = () => {
    if (!selectedEvaluatorInfo || !selectedCandidateInfo) {
      showNotification('평가위원과 평가대상을 선택해주세요.', 'error');
      return;
    }

    const htmlContent = generateEvaluationHTML(selectedEvaluatorInfo, selectedCandidateInfo);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  // 배치 인쇄 기능
  const batchPrint = () => {
    if (evaluators.length === 0 || candidates.length === 0) {
      showNotification('평가위원과 평가대상 데이터가 필요합니다.', 'error');
      return;
    }

    let combinedHTML = '';
    candidates.forEach((candidate: any, candidateIndex: any) => {
      evaluators.forEach((evaluator: any, evaluatorIndex: any) => {
        const htmlContent = generateEvaluationHTML(evaluator, candidate);
        
        // 각 심사표를 새 페이지로 시작하도록 page-break 추가
        const pageBreakHTML = candidateIndex === 0 && evaluatorIndex === 0 ? '' : '<div style="page-break-before: always;"></div>';
        
        combinedHTML += pageBreakHTML + htmlContent.replace('<!DOCTYPE html>', '').replace('<html lang="ko">', '').replace('<head>', '').replace('</head>', '').replace('<body>', '').replace('</body>', '').replace('</html>', '');
      });
    });

    const finalHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>심사표 일괄 인쇄</title>
    ${generateEvaluationHTML(evaluators[0], candidates[0]).match(/<style>[\s\S]*?<\/style>/)?.[0] || ''}
</head>
<body>
    ${combinedHTML}
</body>
</html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(finalHTML);
      newWindow.document.close();
      setTimeout(() => {
        newWindow.print();
      }, 1000);
    }
  };

  // 개별 인쇄
  const printIndividual = () => {
    if (!selectedEvaluatorInfo || !selectedCandidateInfo) {
      showNotification('평가위원과 평가대상을 선택해주세요.', 'error');
      return;
    }

    const htmlContent = generateEvaluationHTML(selectedEvaluatorInfo, selectedCandidateInfo);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      setTimeout(() => {
        newWindow.print();
      }, 1000);
    }
  };

  // 🎯 선택된 평가위원별 심사표 보기
  const viewByEvaluator = (evaluatorId: any) => {
    const evaluatorInfo = evaluators.find((e: any) => e.id === evaluatorId);
    const allCandidates = candidates;

    if (!evaluatorInfo || allCandidates.length === 0) {
      showNotification('선택된 평가위원 또는 평가대상 데이터가 없습니다.', 'error');
      return;
    }

    let combinedHTML = '';
    allCandidates.forEach((candidate: any) => {
      const htmlContent = generateEvaluationHTML(evaluatorInfo, candidate);
      const pageBreakHTML = candidate === allCandidates[0] ? '' : '<div style="page-break-before: always;"></div>';
      combinedHTML += pageBreakHTML + htmlContent.replace('<!DOCTYPE html>', '').replace('<html lang="ko">', '').replace('<head>', '').replace('</head>', '').replace('<body>', '').replace('</body>', '').replace('</html>', '');
    });

    const finalHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${evaluatorInfo.name} 평가위원 심사표</title>
    ${generateEvaluationHTML(evaluators[0], candidates[0]).match(/<style>[\s\S]*?<\/style>/)?.[0] || ''}
</head>
<body>
    ${combinedHTML}
</body>
</html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(finalHTML);
      newWindow.document.close();
    }
  };

  // 🎯 선택된 평가대상별 심사표 보기
  const viewByCandidate = (candidateId: any) => {
    const candidateInfo = candidates.find((c: any) => c.id === candidateId);
    const allEvaluators = evaluators;

    if (!candidateInfo || allEvaluators.length === 0) {
      showNotification('선택된 평가대상 또는 평가위원 데이터가 없습니다.', 'error');
      return;
    }

    let combinedHTML = '';
    allEvaluators.forEach((evaluator: any) => {
      const htmlContent = generateEvaluationHTML(evaluator, candidateInfo);
      const pageBreakHTML = evaluator === allEvaluators[0] ? '' : '<div style="page-break-before: always;"></div>';
      combinedHTML += pageBreakHTML + htmlContent.replace('<!DOCTYPE html>', '').replace('<html lang="ko">', '').replace('<head>', '').replace('</head>', '').replace('<body>', '').replace('</body>', '').replace('</html>', '');
    });

    const finalHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${candidateInfo.name} 평가대상 심사표</title>
    ${generateEvaluationHTML(evaluators[0], candidates[0]).match(/<style>[\s\S]*?<\/style>/)?.[0] || ''}
</head>
<body>
    ${combinedHTML}
</body>
</html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(finalHTML);
      newWindow.document.close();
    }
  };

  // 템플릿 편집 함수들
  const updateSection = (sectionId: any, field: any, value: any) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    }));
  };

  const updateItem = (sectionId: any, itemId: any, field: any, value: any) => {
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

  const updateScore = (sectionId: any, itemId: any, score: any) => {
    updateItem(sectionId, itemId, 'score', score);
  };

  const addSection = () => {
    const newSectionId = String.fromCharCode(65 + currentTemplate.sections.length); // A, B, C, ...
    setCurrentTemplate(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: newSectionId,
          title: `새 평가영역 ${newSectionId}`,
          totalPoints: 10,
          items: [
            { id: Date.now(), text: "새 평가항목", type: "정량", points: 10, score: 0 }
          ]
        }
      ]
    }));
  };

  const deleteSection = (sectionId: any) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const addItem = (sectionId: any) => {
    const newItemId = Date.now();
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: [
                ...section.items,
                { id: newItemId, text: "새 항목", type: "정량", points: 10, score: 0 }
              ]
            }
          : section
      )
    }));
  };

  const deleteItem = (sectionId: any, itemId: any) => {
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

  const calculateSectionScore = (section: any) => {
    return section.items.reduce((sum: any, item: any) => sum + item.points, 0);
  };

  const calculateTotalPoints = () => {
    return currentTemplate.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + item.points, 0), 0
    );
  };

  const calculateTotalScore = () => {
    return currentTemplate.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + item.score, 0), 0
    );
  };

  // 엑셀 업로드 처리
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // 동적 import로 XLSX 라이브러리 로드
      const XLSX = await import('https://unpkg.com/xlsx@0.18.5/xlsx.mjs');
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('업로드된 데이터:', jsonData);
      showNotification('파일이 성공적으로 업로드되었습니다.');
    } catch (error: any) {
      console.error('파일 업로드 오류:', error);
      showNotification('파일 업로드에 실패했습니다.', 'error');
    }

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 템플릿 다운로드
  const downloadTemplate = () => {
    const templateData = candidates.map((candidate: any) => ({
      '기관명(성명)': candidate.name,
      '소속(부서)': candidate.department || '',
      '직책(직급)': candidate.position || '',
      '구분': candidate.category || '',
      '비고': ''
    }));

    // CSV 형태로 변환
    const headers = ['기관명(성명)', '소속(부서)', '직책(직급)', '구분', '비고'];
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '평가대상_템플릿.csv';
    link.click();
    
    showNotification('템플릿이 다운로드되었습니다.');
  };

  // 뮤테이션들
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) throw new Error('카테고리 생성 실패');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      setNewCategory({ categoryCode: "", categoryName: "", description: "" });
      setIsAddingCategory(false);
      showNotification('카테고리가 생성되었습니다.');
    },
    onError: (error: any) => {
      console.error('카테고리 생성 실패:', error);
      showNotification('카테고리 생성에 실패했습니다.', 'error');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await fetch("/api/admin/evaluation-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(itemData),
      });
      if (!response.ok) throw new Error('평가항목 생성 실패');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
      setNewItem({ categoryId: "", itemCode: "", itemName: "", description: "", maxScore: "", weight: "" });
      setIsAddingItem(false);
      showNotification('평가항목이 생성되었습니다.');
    },
    onError: (error: any) => {
      console.error('평가항목 생성 실패:', error);
      showNotification('평가항목 생성에 실패했습니다.', 'error');
    },
  });

  // 🎯 Supabase 저장 뮤테이션 (심사표 저장)
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      console.log('템플릿 저장 시작:', currentTemplate);
      
      for (const section of currentTemplate.sections) {
        try {
          // 카테고리 생성
          const categoryResponse = await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({
              categoryCode: section.id,
              categoryName: section.title,
              description: `${section.title} 관련 평가 항목들`,
              sortOrder: currentTemplate.sections.indexOf(section),
              isActive: true
            }),
          });
          
          if (!categoryResponse.ok) {
            throw new Error(`카테고리 생성 실패: ${categoryResponse.statusText}`);
          }
          
          const categoryData = await categoryResponse.json();
          console.log('카테고리 생성 성공:', categoryData);
          
          // 100ms 지연
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // 평가항목들 생성
          for (const item of section.items) {
            const itemResponse = await fetch("/api/admin/evaluation-items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: 'include',
              body: JSON.stringify({
                categoryId: categoryData.id,
                itemCode: `${section.id}${item.id}`,
                itemName: item.text,
                description: `평가항목: ${item.text}`,
                maxScore: item.points,
                weight: 1.0,
                isActive: true
              }),
            });
            
            if (!itemResponse.ok) {
              throw new Error(`평가항목 생성 실패: ${itemResponse.statusText}`);
            }
            
            const itemData = await itemResponse.json();
            console.log('평가항목 생성 성공:', itemData);
            
            // 100ms 지연
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error('저장 중 오류:', error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "심사표가 성공적으로 저장되었습니다.",
      });
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
    },
    onError: (error: any) => {
      console.error('저장 실패:', error);
      toast({
        title: "오류",
        description: "심사표 저장에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleCreateCategory = () => {
    if (!newCategory.categoryCode || !newCategory.categoryName) {
      showNotification('카테고리 코드와 이름을 입력해주세요.', 'error');
      return;
    }
    createCategoryMutation.mutate(newCategory);
  };

  const handleCreateItem = () => {
    if (!newItem.categoryId || !newItem.itemName) {
      showNotification('카테고리와 항목명을 입력해주세요.', 'error');
      return;
    }
    createItemMutation.mutate({
      ...newItem,
      maxScore: parseInt(newItem.maxScore) || 0,
      weight: parseFloat(newItem.weight) || 1.0,
    });
  };

  return (
    <div className="space-y-6">
      {/* 제목과 기본 컨트롤들 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">평가표 템플릿</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "default" : "outline"}
          >
            {isEditing ? "편집 완료" : "편집하기"}
          </Button>
          <Button
            onClick={() => saveTemplateMutation.mutate()}
            disabled={saveTemplateMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {saveTemplateMutation.isPending ? "저장 중..." : "심사표 저장"}
          </Button>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            템플릿 다운로드
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            파일 업로드
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* 평가표 템플릿 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            {isEditing ? (
              <Input
                value={currentTemplate.title}
                onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                className="text-lg font-semibold"
              />
            ) : (
              currentTemplate.title
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-800">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-4 py-3 text-center font-bold w-32">구분</th>
                  <th className="border border-gray-400 px-4 py-3 text-center font-bold flex-1">세부 항목</th>
                  {columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => (
                    <th key={column.id} className="border border-gray-400 px-2 py-3 text-center font-bold w-16">
                      {column.title}
                    </th>
                  ))}
                  {isEditing && (
                    <th className="border border-gray-400 px-2 py-3 text-center font-bold w-16">삭제</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentTemplate.sections.flatMap((section) => 
                  section.items.map((item, itemIndex) => (
                    <tr key={`${section.id}-${item.id}`} className="hover:bg-gray-50">
                      {itemIndex === 0 && (
                        <td 
                          className="border border-gray-400 px-4 py-3 font-medium bg-blue-50 align-middle text-center"
                          rowSpan={section.items.length}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div>
                              {isEditing ? (
                                <Input
                                  value={section.title}
                                  onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                                  className="text-sm font-bold text-center"
                                />
                              ) : (
                                <div className="font-bold text-sm">{section.id}. {section.title}</div>
                              )}
                              <div className="text-xs text-gray-600 mt-1">
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
                      {column.id === 'points' ? 
                        `${calculateTotalPoints()}점` : 
                        column.id === 'score' ? 
                          `${calculateTotalScore()}점` : 
                          ''}
                    </td>
                  ))}
                  {isEditing && (
                    <td className="border border-gray-400 px-2 py-3"></td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 편집 모드 추가 버튼 */}
      {isEditing && (
        <div className="flex justify-center">
          <Button onClick={addSection} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            평가영역 추가
          </Button>
        </div>
      )}

      {/* 심사표 보기 섹션 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">심사표 보기</h3>
        
        {/* 평가위원 및 평가대상 선택 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">평가위원 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <select
                  value={selectedEvaluator || ''}
                  onChange={(e) => setSelectedEvaluator(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">평가위원을 선택하세요</option>
                  {evaluators.map((evaluator: any) => (
                    <option key={evaluator.id} value={evaluator.id}>
                      {evaluator.name}
                    </option>
                  ))}
                </select>
                <div className="space-y-1">
                  {evaluators.map((evaluator: any) => (
                    <Button
                      key={evaluator.id}
                      onClick={() => viewByEvaluator(evaluator.id)}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start"
                    >
                      {evaluator.name} 위원 심사표 보기
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">평가대상 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <select
                  value={selectedCandidate || ''}
                  onChange={(e) => setSelectedCandidate(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">평가대상을 선택하세요</option>
                  {candidates.map((candidate: any) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
                <div className="space-y-1">
                  {candidates.map((candidate: any) => (
                    <Button
                      key={candidate.id}
                      onClick={() => viewByCandidate(candidate.id)}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start"
                    >
                      {candidate.name} 심사표 보기
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 심사표 보기 및 인쇄 버튼들 */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={viewEvaluationSheet} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="h-4 w-4 mr-2" />
            심사표 보기
          </Button>
          <Button onClick={printIndividual} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            개별 인쇄
          </Button>
          <Button onClick={batchPrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            배치 인쇄
          </Button>
        </div>
      </div>
    </div>
  );
}