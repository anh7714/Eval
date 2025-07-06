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
  const [viewMode, setViewMode] = useState<'template' | 'management'>('template'); // 기본값을 템플릿 뷰로 설정
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

  // 템플릿 저장 뮤테이션
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      console.log('📝 심사표 저장 시작...', template);
      
      // 1. 카테고리들을 먼저 저장
      const savedCategories = [];
      for (let sectionIndex = 0; sectionIndex < template.sections.length; sectionIndex++) {
        const section = template.sections[sectionIndex];
        const categoryData = {
          categoryName: section.title,
          categoryCode: section.id,
          description: `${section.title} 관련 평가 카테고리`,
          type: 'evaluation',
          isActive: true,
          sortOrder: sectionIndex + 1
        };

        const response = await fetch('/api/admin/evaluation-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(categoryData)
        });

        if (!response.ok) {
          throw new Error(`카테고리 저장 실패: ${response.statusText}`);
        }

        const savedCategory = await response.json();
        savedCategories.push(savedCategory);
        
        // 서버 부하 방지를 위한 지연
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 2. 평가항목들을 순차적으로 저장
      const savedItems = [];
      for (let sectionIndex = 0; sectionIndex < template.sections.length; sectionIndex++) {
        const section = template.sections[sectionIndex];
        const categoryId = savedCategories[sectionIndex].id;

        for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
          const item = section.items[itemIndex];
          const itemData = {
            categoryId: categoryId,
            itemCode: `ITEM_${Date.now()}_${sectionIndex}_${itemIndex}`,
            itemName: item.text,
            description: item.text,
            maxScore: item.points || 0,
            weight: "1.00",
            sortOrder: itemIndex + 1,
            isActive: true
          };

          const response = await fetch('/api/admin/evaluation-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(itemData)
          });

          if (!response.ok) {
            throw new Error(`평가항목 저장 실패: ${response.statusText}`);
          }

          const savedItem = await response.json();
          savedItems.push(savedItem);
          
          // 서버 부하 방지를 위한 지연
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return { savedCategories, savedItems };
    },
    onSuccess: (data) => {
      const { savedCategories, savedItems } = data;
      showNotification(
        `심사표 저장 완료! ${savedCategories.length}개 카테고리와 ${savedItems.length}개 평가항목이 저장되었습니다.`,
        'success'
      );
      
      // 데이터 다시 로드
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
      
      // 편집 모드 종료하고 심사표 보기 모드로 전환
      setIsEditing(false);
      setViewMode('template');
    },
    onError: (error: any) => {
      console.error('❌ 심사표 저장 오류:', error);
      showNotification(`저장 실패: ${error.message || "심사표 저장 중 오류가 발생했습니다."}`, 'error');
    }
  });

  // 데이터베이스 데이터를 템플릿 구조로 변환
  const convertDataToTemplate = () => {
    if (!categories.length || !items.length) {
      return currentTemplate; // 데이터가 없으면 기본 템플릿 반환
    }

    const sections = categories.map(category => ({
      id: category.categoryCode,
      title: category.categoryName,
      totalPoints: items
        .filter(item => item.categoryId === category.id)
        .reduce((sum, item) => sum + (item.maxScore || 0), 0),
      items: items
        .filter(item => item.categoryId === category.id)
        .map((item, index) => ({
          id: index + 1,
          text: item.itemName,
          type: '정성', // 기본값으로 설정
          points: item.maxScore || 0,
          score: 0
        }))
    }));

    return {
      title: "제공기관 선정 심의회 평가표",
      totalScore: sections.reduce((sum, section) => sum + section.totalPoints, 0),
      sections
    };
  };

  // 데이터베이스 데이터가 로드되면 템플릿 업데이트
  useEffect(() => {
    if (categories.length > 0 && items.length > 0) {
      const convertedTemplate = convertDataToTemplate();
      setCurrentTemplate(convertedTemplate);
    }
  }, [categories, items]);

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
    toast({
      title: type === 'success' ? "성공" : type === 'error' ? "오류" : "정보",
      description: message,
      variant: type === 'error' ? "destructive" : "default"
    });
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
    const totalPoints = templateData.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + (item.points || 0), 0), 0
    );

    // 총 점수 계산
    const totalScore = templateData.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + (item.score || 0), 0), 0
    );

    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${candidateTitle}</title>
        <style>
          @page { 
            size: A4; 
            margin: 25mm 15mm 20mm 15mm; 
          }
          
          body { 
            font-family: '맑은 고딕', Arial, sans-serif; 
            font-size: 12px; 
            line-height: 1.4; 
            margin: 0; 
            padding: 0; 
          }
          
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
          }
          
          .header h1 { 
            font-size: 18px; 
            font-weight: bold; 
            margin: 0 0 10px 0; 
          }
          
          .info-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px; 
          }
          
          .info-table th, .info-table td { 
            border: 1px solid #000; 
            padding: 8px; 
            text-align: left; 
          }
          
          .info-table th { 
            background-color: #f5f5f5; 
            font-weight: bold; 
            width: 25%; 
          }
          
          .main-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px; 
          }
          
          .main-table th, .main-table td { 
            border: 1px solid #000; 
            padding: 6px; 
            text-align: center; 
            vertical-align: middle; 
          }
          
          .main-table th { 
            background-color: #f5f5f5; 
            font-weight: bold; 
          }
          
          .section-header { 
            background-color: #f0f0f0; 
            font-weight: bold; 
          }
          
          .total-row { 
            background-color: #f5f5f5; 
            font-weight: bold; 
          }
          
          .item-text { 
            text-align: left; 
            padding-left: 10px; 
          }
          
          .signature { 
            margin-top: 30px; 
            text-align: right; 
          }
          
          .signature-box { 
            display: inline-block; 
            text-align: center; 
            margin-left: 50px; 
          }
          
          .signature-line { 
            border-top: 1px solid #000; 
            width: 100px; 
            margin-top: 40px; 
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${candidateTitle}</h1>
        </div>
        
        <table class="info-table">
          <tr>
            <th>기관명(성명)</th>
            <td>${candidateInfo?.name || ''}</td>
            <th>소속(부서)</th>
            <td>${candidateInfo?.department || ''}</td>
          </tr>
          <tr>
            <th>직책(직급)</th>
            <td>${candidateInfo?.position || ''}</td>
            <th>구분</th>
            <td>${candidateInfo?.category || ''}</td>
          </tr>
        </table>
        
        <table class="main-table">
          <thead>
            <tr>
              ${visibleColumns.map(col => `<th>${col.title}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${templateData.sections.map(section => {
              const sectionRows = section.items.map((item: any, index: number) => {
                return `
                  <tr>
                    ${index === 0 ? `<td rowspan="${section.items.length}" class="section-header">${section.title}</td>` : ''}
                    <td class="item-text">${item.text}</td>
                    ${visibleColumns.slice(2).map(col => {
                      if (col.id === 'type') return `<td>${item[col.id] || ''}</td>`;
                      if (col.id === 'points') return `<td>${item[col.id] || ''}</td>`;
                      if (col.id === 'score') return `<td></td>`;
                      return `<td>${item[col.id] || ''}</td>`;
                    }).join('')}
                  </tr>
                `;
              }).join('');
              return sectionRows;
            }).join('')}
            <tr class="total-row">
              <td colspan="2">합계</td>
              ${visibleColumns.slice(2).map(col => {
                if (col.id === 'points') return `<td>${totalPoints}점</td>`;
                if (col.id === 'score') return `<td class="total-score">점</td>`;
                return `<td></td>`;
              }).join('')}
            </tr>
          </tbody>
        </table>
        
        <div class="signature">
          <div class="signature-box">
            <div>평가위원</div>
            <div class="signature-line"></div>
            <div style="margin-top: 5px;">${evaluatorInfo?.name || ''} (인)</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // 인쇄 함수들
  const handlePrint = () => {
    if (!selectedEvaluator || !selectedCandidate) {
      showNotification("평가위원과 평가대상을 선택해주세요.", 'error');
      return;
    }

    const printContent = generateEvaluationHTML(selectedEvaluatorInfo, selectedCandidateInfo);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleBatchPrint = () => {
    if (!candidates.length || !evaluators.length) {
      showNotification("평가대상과 평가위원 데이터가 필요합니다.", 'error');
      return;
    }

    const allCombinations = candidates.flatMap((candidate: any, candidateIndex: number) => 
      evaluators.map((evaluator: any, evaluatorIndex: number) => ({
        candidate,
        evaluator,
        pageBreak: !(candidateIndex === candidates.length - 1 && evaluatorIndex === evaluators.length - 1)
      }))
    );

    const batchContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>배치 인쇄 - 평가표</title>
        <style>
          @page { size: A4; margin: 25mm 15mm 20mm 15mm; }
          .page-break { page-break-after: always; }
          ${generateEvaluationHTML(evaluators[0], candidates[0]).match(/<style>(.*?)<\/style>/s)?.[1] || ''}
        </style>
      </head>
      <body>
        ${allCombinations.map(({ candidate, evaluator, pageBreak }) => `
          <div class="page${pageBreak ? ' page-break' : ''}">
            ${generateEvaluationHTML(evaluator, candidate).match(/<body>(.*?)<\/body>/s)?.[1] || ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(batchContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  // 템플릿 편집 함수들
  const updateTemplateScore = (sectionId: string, itemId: number, score: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, score } : item
              )
            }
          : section
      )
    }));
  };

  const handleScoreInput = (sectionId: string, itemId: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateTemplateScore(sectionId, itemId, numValue);
  };

  // 파일 업로드/다운로드 함수들
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const templateData = JSON.parse(content);
          setCurrentTemplate(templateData);
          showNotification("템플릿이 성공적으로 업로드되었습니다.", 'success');
        } catch (error) {
          showNotification("파일 형식이 올바르지 않습니다.", 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExcelDownload = async () => {
    try {
      const XLSX = await import('https://unpkg.com/xlsx@0.18.5/xlsx.mjs');
      
      const evaluationData = currentTemplate.sections.flatMap(section => 
        section.items.map(item => ({
          '구분': section.title,
          '세부항목': item.text,
          '유형': item.type,
          '배점': item.points,
          '평가점수': item.score || 0
        }))
      );

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(evaluationData);
      XLSX.utils.book_append_sheet(wb, ws, '평가항목');

      const fileName = `평가표_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showNotification("엑셀 파일이 성공적으로 다운로드되었습니다.", 'success');
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      showNotification("엑셀 다운로드 중 오류가 발생했습니다.", 'error');
    }
  };

  // 카테고리 추가 뮤테이션
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) throw new Error('카테고리 생성 실패');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      setIsAddingCategory(false);
      setNewCategory({ categoryCode: "", categoryName: "", description: "" });
      showNotification("카테고리가 추가되었습니다.", 'success');
    },
    onError: () => {
      showNotification("카테고리 추가 중 오류가 발생했습니다.", 'error');
    }
  });

  // 평가항목 추가 뮤테이션
  const createItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await fetch('/api/admin/evaluation-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });
      if (!response.ok) throw new Error('평가항목 생성 실패');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
      setIsAddingItem(false);
      setNewItem({ categoryId: "", itemCode: "", itemName: "", description: "", maxScore: "", weight: "" });
      showNotification("평가항목이 추가되었습니다.", 'success');
    },
    onError: () => {
      showNotification("평가항목 추가 중 오류가 발생했습니다.", 'error');
    }
  });

  // 핸들러 함수들
  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate({
      name: newCategory.categoryName,
      type: 'category',
      isActive: true,
      sortOrder: categories.length + 1
    });
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createItemMutation.mutate({
      categoryId: parseInt(newItem.categoryId),
      itemCode: newItem.itemCode,
      itemName: newItem.itemName,
      description: newItem.description,
      maxScore: parseInt(newItem.maxScore),
      weight: parseFloat(newItem.weight),
      isActive: true,
      sortOrder: items.length + 1
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">평가항목 관리</h1>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setViewMode('template')}
              variant={viewMode === 'template' ? 'default' : 'outline'}
            >
              심사표 보기
            </Button>
            <Button 
              onClick={() => setViewMode('management')}
              variant={viewMode === 'management' ? 'default' : 'outline'}
            >
              관리 모드
            </Button>
          </div>
        </div>

        {viewMode === 'template' ? (
          // 심사표 보기 모드
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>평가표 템플릿</CardTitle>
                  <CardDescription>평가표를 보고 편집할 수 있습니다.</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    엑셀 불러오기
                  </Button>
                  <Button onClick={handleExcelDownload} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    엑셀 다운로드
                  </Button>
                  <Button onClick={() => setIsEditing(!isEditing)} variant="outline">
                    <Edit3 className="h-4 w-4 mr-2" />
                    {isEditing ? "편집 완료" : "편집"}
                  </Button>
                  <Button 
                    onClick={() => saveTemplateMutation.mutate(currentTemplate)} 
                    disabled={saveTemplateMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveTemplateMutation.isPending ? "저장 중..." : "심사표 저장"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* 평가위원/평가대상 선택 섹션 */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">인쇄 설정</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">평가위원 선택</label>
                    <select
                      value={selectedEvaluator || ''}
                      onChange={(e) => setSelectedEvaluator(Number(e.target.value) || null)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">평가위원 선택</option>
                      {evaluators.map((evaluator: any) => (
                        <option key={evaluator.id} value={evaluator.id}>
                          {evaluator.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">평가대상 선택</label>
                    <select
                      value={selectedCandidate || ''}
                      onChange={(e) => setSelectedCandidate(Number(e.target.value) || null)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">평가대상 선택</option>
                      {candidates.map((candidate: any) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col justify-end space-y-2">
                    <Button onClick={handlePrint} variant="outline" className="w-full">
                      <Printer className="h-4 w-4 mr-2" />
                      개별 인쇄
                    </Button>
                    <Button onClick={handleBatchPrint} variant="outline" className="w-full">
                      <Printer className="h-4 w-4 mr-2" />
                      배치 인쇄
                    </Button>
                  </div>
                </div>
              </div>

              {/* 평가표 테이블 */}
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-4">{getDynamicTitle()}</h2>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {visibleColumns.map(column => (
                          <th key={column.id} className="border border-gray-400 px-4 py-3 text-center font-semibold">
                            {column.title}
                          </th>
                        ))}
                        {isEditing && <th className="border border-gray-400 px-4 py-3 text-center font-semibold">편집</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentTemplate.sections.map((section) => (
                        <React.Fragment key={section.id}>
                          {section.items.map((item, index) => (
                            <tr key={`${section.id}-${item.id}`} className="hover:bg-gray-50">
                              {index === 0 && (
                                <td 
                                  rowSpan={section.items.length}
                                  className="border border-gray-400 px-4 py-3 text-center font-medium bg-gray-50"
                                >
                                  {section.title}
                                </td>
                              )}
                              <td className="border border-gray-400 px-4 py-3 text-left">
                                {isEditing ? (
                                  <Input
                                    value={item.text}
                                    onChange={(e) => {
                                      setCurrentTemplate(prev => ({
                                        ...prev,
                                        sections: prev.sections.map(s =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                items: s.items.map(i =>
                                                  i.id === item.id ? { ...i, text: e.target.value } : i
                                                )
                                              }
                                            : s
                                        )
                                      }));
                                    }}
                                    className="w-full"
                                  />
                                ) : (
                                  item.text
                                )}
                              </td>
                              {visibleColumns.slice(2).map(column => (
                                <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                                  {column.id === 'type' ? (
                                    isEditing ? (
                                      <select 
                                        value={item[column.id] || ''}
                                        onChange={(e) => {
                                          setCurrentTemplate(prev => ({
                                            ...prev,
                                            sections: prev.sections.map(s =>
                                              s.id === section.id
                                                ? {
                                                    ...s,
                                                    items: s.items.map(i =>
                                                      i.id === item.id ? { ...i, [column.id]: e.target.value } : i
                                                    )
                                                  }
                                                : s
                                            )
                                          }));
                                        }}
                                        className="w-full border rounded px-2 py-1"
                                      >
                                        <option value="">선택</option>
                                        {column.options?.map(option => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      item[column.id] || ''
                                    )
                                  ) : column.id === 'points' ? (
                                    isEditing ? (
                                      <Input
                                        type="number"
                                        value={item[column.id] || ''}
                                        onChange={(e) => {
                                          setCurrentTemplate(prev => ({
                                            ...prev,
                                            sections: prev.sections.map(s =>
                                              s.id === section.id
                                                ? {
                                                    ...s,
                                                    items: s.items.map(i =>
                                                      i.id === item.id ? { ...i, [column.id]: parseInt(e.target.value) || 0 } : i
                                                    )
                                                  }
                                                : s
                                            )
                                          }));
                                        }}
                                        className="w-full text-center"
                                      />
                                    ) : (
                                      `${item[column.id] || 0}점`
                                    )
                                  ) : column.id === 'score' ? (
                                    <Input
                                      type="number"
                                      value={item.score || ''}
                                      onChange={(e) => handleScoreInput(section.id, item.id, e.target.value)}
                                      className="w-full text-center"
                                      min="0"
                                      max={item.points || 100}
                                    />
                                  ) : (
                                    item[column.id] || ''
                                  )}
                                </td>
                              ))}
                              {isEditing && (
                                <td className="border border-gray-400 px-2 py-3 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setCurrentTemplate(prev => ({
                                        ...prev,
                                        sections: prev.sections.map(s =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                items: s.items.filter(i => i.id !== item.id)
                                              }
                                            : s
                                        )
                                      }));
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {/* 합계 행 */}
                      <tr className="bg-gray-100 font-bold">
                        <td className="border border-gray-400 px-4 py-3 text-center">합계</td>
                        <td className="border border-gray-400 px-4 py-3 text-center">-</td>
                        {visibleColumns.slice(2).map(column => (
                          <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                            {column.id === 'points' ? (
                              `${calculateTotalPoints()}점`
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
        ) : (
          // 관리 모드 - 평가표 템플릿 기능이 통합된 상태
          <div className="space-y-6">
            {/* 평가표 템플릿 섹션 (관리모드에 통합) */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>평가표 템플릿</CardTitle>
                    <CardDescription>평가표를 디자인하고 관리합니다.</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      엑셀 불러오기
                    </Button>
                    <Button onClick={handleExcelDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      엑셀 다운로드
                    </Button>
                    <Button onClick={() => setIsEditing(!isEditing)} variant="outline">
                      <Edit3 className="h-4 w-4 mr-2" />
                      {isEditing ? "편집 완료" : "편집"}
                    </Button>
                    <Button 
                      onClick={() => saveTemplateMutation.mutate(currentTemplate)} 
                      disabled={saveTemplateMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveTemplateMutation.isPending ? "저장 중..." : "심사표 저장"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* 평가표 테이블 */}
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold mb-4">{currentTemplate.title}</h2>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          {visibleColumns.map(column => (
                            <th key={column.id} className="border border-gray-400 px-4 py-3 text-center font-semibold">
                              {column.title}
                            </th>
                          ))}
                          {isEditing && <th className="border border-gray-400 px-4 py-3 text-center font-semibold">편집</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {currentTemplate.sections.map((section) => (
                          <React.Fragment key={section.id}>
                            {section.items.map((item, index) => (
                              <tr key={`${section.id}-${item.id}`} className="hover:bg-gray-50">
                                {index === 0 && (
                                  <td 
                                    rowSpan={section.items.length}
                                    className="border border-gray-400 px-4 py-3 text-center font-medium bg-gray-50"
                                  >
                                    {section.title}
                                  </td>
                                )}
                                <td className="border border-gray-400 px-4 py-3 text-left">
                                  {isEditing ? (
                                    <Input
                                      value={item.text}
                                      onChange={(e) => {
                                        setCurrentTemplate(prev => ({
                                          ...prev,
                                          sections: prev.sections.map(s =>
                                            s.id === section.id
                                              ? {
                                                  ...s,
                                                  items: s.items.map(i =>
                                                    i.id === item.id ? { ...i, text: e.target.value } : i
                                                  )
                                                }
                                              : s
                                          )
                                        }));
                                      }}
                                      className="w-full"
                                    />
                                  ) : (
                                    item.text
                                  )}
                                </td>
                                {visibleColumns.slice(2).map(column => (
                                  <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                                    {column.id === 'type' ? (
                                      isEditing ? (
                                        <select 
                                          value={item[column.id] || ''}
                                          onChange={(e) => {
                                            setCurrentTemplate(prev => ({
                                              ...prev,
                                              sections: prev.sections.map(s =>
                                                s.id === section.id
                                                  ? {
                                                      ...s,
                                                      items: s.items.map(i =>
                                                        i.id === item.id ? { ...i, [column.id]: e.target.value } : i
                                                      )
                                                    }
                                                  : s
                                              )
                                            }));
                                          }}
                                          className="w-full border rounded px-2 py-1"
                                        >
                                          <option value="">선택</option>
                                          {column.options?.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        item[column.id] || ''
                                      )
                                    ) : column.id === 'points' ? (
                                      isEditing ? (
                                        <Input
                                          type="number"
                                          value={item[column.id] || ''}
                                          onChange={(e) => {
                                            setCurrentTemplate(prev => ({
                                              ...prev,
                                              sections: prev.sections.map(s =>
                                                s.id === section.id
                                                  ? {
                                                      ...s,
                                                      items: s.items.map(i =>
                                                        i.id === item.id ? { ...i, [column.id]: parseInt(e.target.value) || 0 } : i
                                                      )
                                                    }
                                                  : s
                                              )
                                            }));
                                          }}
                                          className="w-full text-center"
                                        />
                                      ) : (
                                        `${item[column.id] || 0}점`
                                      )
                                    ) : column.id === 'score' ? (
                                      <Input
                                        type="number"
                                        value={item.score || ''}
                                        onChange={(e) => handleScoreInput(section.id, item.id, e.target.value)}
                                        className="w-full text-center"
                                        min="0"
                                        max={item.points || 100}
                                      />
                                    ) : (
                                      item[column.id] || ''
                                    )}
                                  </td>
                                ))}
                                {isEditing && (
                                  <td className="border border-gray-400 px-2 py-3 text-center">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setCurrentTemplate(prev => ({
                                          ...prev,
                                          sections: prev.sections.map(s =>
                                            s.id === section.id
                                              ? {
                                                  ...s,
                                                  items: s.items.filter(i => i.id !== item.id)
                                                }
                                              : s
                                          )
                                        }));
                                      }}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                        {/* 합계 행 */}
                        <tr className="bg-gray-100 font-bold">
                          <td className="border border-gray-400 px-4 py-3 text-center">합계</td>
                          <td className="border border-gray-400 px-4 py-3 text-center">-</td>
                          {visibleColumns.slice(2).map(column => (
                            <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                              {column.id === 'points' ? (
                                `${calculateTotalPoints()}점`
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

            {/* 기존 Tabs 구조 유지 - 단, 평가표 템플릿 탭만 제거 */}
            <Tabs defaultValue="categories" className="space-y-6">
              <TabsList>
                <TabsTrigger value="categories">평가 카테고리</TabsTrigger>
                <TabsTrigger value="items">평가 항목</TabsTrigger>
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
                        <CardDescription>카테고리 정보를 입력하세요.</CardDescription>
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
                                placeholder="예: 기술역량"
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
                                <h3 className="font-semibold">{category.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {category.type} · 정렬 순서: {category.sortOrder}
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
                                    {category.name}
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
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}