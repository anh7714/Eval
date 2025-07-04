import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Upload, Download, Save, X, Printer, Edit3, FileDown } from "lucide-react";
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
  
  // 평가위원 정보 (수동 입력용)
  const [evaluator, setEvaluator] = useState({
    name: '평가위원명',
    position: '직책',
    department: '소속기관'
  });

  // 평가표 템플릿 상태
  const [currentTemplate, setCurrentTemplate] = useState({
    title: '평가표',
    category: '구분',
    data: [
      { id: 1, text: '업무수행능력', type: '정량', points: 30, score: 0 },
      { id: 2, text: '문제해결능력', type: '정량', points: 30, score: 0 },
      { id: 3, text: '의사소통능력', type: '정성', points: 20, score: 0 },
      { id: 4, text: '협력 및 적응력', type: '정성', points: 20, score: 0 },
    ]
  });

  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API 데이터 가져오기
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/admin/categories'],
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/admin/evaluation-items'],
  });

  const { data: candidates } = useQuery({
    queryKey: ['/api/admin/candidates'],
  });

  const { data: evaluators } = useQuery({
    queryKey: ['/api/admin/evaluators'],
  });

  const { data: systemConfig } = useQuery({
    queryKey: ['/api/system/config'],
  });

  // 알림 표시 함수
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    toast({
      title: type === 'error' ? '오류' : type === 'info' ? '알림' : '성공',
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    });
  };

  // 동적 제목 생성
  const getDynamicTitle = () => {
    if (selectedCandidate && candidates) {
      const candidate = (candidates as any[]).find(c => c.id === selectedCandidate);
      return candidate ? `${candidate.name} 심사표` : systemConfig?.evaluationTitle || '평가표';
    }
    return systemConfig?.evaluationTitle || '평가표';
  };

  // 동적 구분 정보 생성
  const getDynamicCategory = () => {
    if (selectedCandidate && candidates) {
      const candidate = (candidates as any[]).find(c => c.id === selectedCandidate);
      return candidate ? (candidate.category || candidate.department) : '구분';
    }
    return '구분';
  };

  // 템플릿 업데이트 함수
  const updateTemplateData = (newData: any[]) => {
    setCurrentTemplate(prev => ({
      ...prev,
      data: newData,
      title: getDynamicTitle(),
      category: getDynamicCategory()
    }));
  };

  // 영역 추가
  const addSection = () => {
    const newSection = {
      id: Date.now(),
      text: '새 영역',
      type: '정량',
      points: 10,
      score: 0
    };
    updateTemplateData([...currentTemplate.data, newSection]);
  };

  // 컬럼 추가
  const addColumn = () => {
    const newColumnId = `column_${Date.now()}`;
    const newColumn = {
      id: newColumnId,
      title: '새 컬럼',
      type: 'number',
      visible: true,
      required: false,
      width: 'w-20'
    };
    
    // 배점 컬럼 앞에 새 컬럼 삽입
    const pointsIndex = columnConfig.findIndex(col => col.id === 'points');
    const newConfig = [...columnConfig];
    newConfig.splice(pointsIndex, 0, newColumn);
    setColumnConfig(newConfig);

    // 기존 데이터에 새 컬럼 값 추가
    const updatedData = currentTemplate.data.map(item => ({
      ...item,
      [newColumnId]: 0
    }));
    updateTemplateData(updatedData);
  };

  // 점수 초기화
  const resetScores = () => {
    const resetData = currentTemplate.data.map(item => ({
      ...item,
      score: 0,
      // 동적 컬럼들도 0으로 초기화
      ...Object.fromEntries(
        columnConfig
          .filter(col => !['section', 'item', 'type', 'points', 'score'].includes(col.id))
          .map(col => [col.id, 0])
      )
    }));
    updateTemplateData(resetData);
    showNotification('모든 점수가 초기화되었습니다.');
  };

  // 컬럼 제거
  const removeColumn = (columnId: string) => {
    if (columnConfig.find(col => col.id === columnId)?.required) {
      showNotification('필수 컬럼은 제거할 수 없습니다.', 'error');
      return;
    }
    
    setColumnConfig(prev => prev.filter(col => col.id !== columnId));
    
    // 데이터에서도 해당 컬럼 제거
    const updatedData = currentTemplate.data.map(item => {
      const { [columnId]: removed, ...rest } = item as any;
      return rest;
    });
    updateTemplateData(updatedData);
  };

  // 컬럼 순서 변경
  const moveColumn = (columnId: string, direction: 'left' | 'right') => {
    const currentIndex = columnConfig.findIndex(col => col.id === columnId);
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= columnConfig.length) return;
    
    const newConfig = [...columnConfig];
    [newConfig[currentIndex], newConfig[newIndex]] = [newConfig[newIndex], newConfig[currentIndex]];
    setColumnConfig(newConfig);
  };

  // 행 값 업데이트
  const updateRowValue = (id: number, field: string, value: any) => {
    const updatedData = currentTemplate.data.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    updateTemplateData(updatedData);
  };

  // 행 삭제
  const deleteRow = (id: number) => {
    const updatedData = currentTemplate.data.filter(item => item.id !== id);
    updateTemplateData(updatedData);
  };

  // 템플릿 파일 저장
  const saveTemplate = () => {
    const templateData = {
      columnConfig,
      data: currentTemplate.data,
      title: currentTemplate.title,
      category: currentTemplate.category,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `평가표_템플릿_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('템플릿이 저장되었습니다.');
  };

  // 템플릿 파일 불러오기
  const loadTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const templateData = JSON.parse(e.target?.result as string);
        if (templateData.columnConfig && templateData.data) {
          setColumnConfig(templateData.columnConfig);
          setCurrentTemplate({
            title: templateData.title || getDynamicTitle(),
            category: templateData.category || getDynamicCategory(),
            data: templateData.data
          });
          showNotification('템플릿이 성공적으로 불러와졌습니다.');
        } else {
          showNotification('잘못된 템플릿 파일 형식입니다.', 'error');
        }
      } catch (error) {
        showNotification('파일을 읽는 중 오류가 발생했습니다.', 'error');
      }
    };
    reader.readAsText(file);
    
    // 파일 입력 초기화
    if (event.target) {
      event.target.value = '';
    }
  };

  // 총점 계산
  const calculateTotal = () => {
    return currentTemplate.data.reduce((sum, item) => sum + (item.score || 0), 0);
  };

  // 일반 인쇄 함수
  const printTemplate = () => {
    const printContent = document.getElementById('template-print-area');
    if (!printContent) {
      showNotification('인쇄할 내용을 찾을 수 없습니다.', 'error');
      return;
    }

    const printStyle = `
      <style>
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:text-center { text-align: center !important; }
          .print\\:text-4xl { font-size: 2.25rem !important; }
          .print\\:font-black { font-weight: 900 !important; }
          .print\\:text-black { color: black !important; }
          .print\\:border-none { border: none !important; }
          
          @page {
            margin: 0 !important;
            size: A4 !important;
          }
          
          body { 
            font-size: 14px !important; 
            line-height: 1.5 !important;
            margin: 0 !important;
            padding: 95px 50px 50px 50px !important;
            font-family: "맑은 고딕", "Malgun Gothic", Arial, sans-serif !important;
          }
          
          html {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .title {
            text-align: center !important;
            font-size: 24px !important;
            font-weight: bold !important;
            margin-bottom: 15px !important;
            color: black !important;
          }
          
          .evaluation-date {
            text-align: center !important;
            margin: 40px 0 20px 0 !important;
            font-size: 16px !important;
            font-weight: bold !important;
          }
          
          .evaluator-info {
            text-align: right !important;
            margin-top: 20px !important;
            margin-bottom: 20px !important;
            font-size: 20px !important;
            font-weight: bold !important;
            padding: 20px !important;
            text-decoration: underline !important;
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
            text-align: left !important;
          }
          
          th { 
            background-color: #e8e8e8 !important; 
            text-align: center !important;
            font-weight: bold !important;
          }
          
          .points-cell { text-align: center !important; }
          .score-cell { text-align: center !important; }
          .type-cell { text-align: center !important; }
          
          .section-row { 
            background-color: #f0f0f0 !important; 
            font-weight: bold !important; 
          }
          
          .total-row { 
            background-color: #e8e8e8 !important; 
            font-weight: bold !important; 
          }
          
          .section-cell .text-xs {
            text-align: center !important;
          }
          
          .no-print { 
            display: none !important; 
          }
          
          input {
            border: none !important;
            background: transparent !important;
            font-size: inherit !important;
            font-weight: inherit !important;
            text-align: inherit !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          select {
            border: none !important;
            background: transparent !important;
            font-size: inherit !important;
          }
        }
      </style>
    `;
    
    // 평가위원 정보 결정 (선택된 평가위원 우선, 없으면 수동 입력)
    const selectedEvaluatorInfo = selectedEvaluator && evaluators ? 
      (evaluators as any[]).find(e => e.id === selectedEvaluator) : null;
    const evaluatorInfo = selectedEvaluatorInfo || evaluator;
    const positionText = evaluatorInfo.position ? ` (${evaluatorInfo.position})` : '';
    const today = new Date().toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const evaluationFooter = `
      <div class="evaluation-date">
        평가일: ${today}
      </div>
      <div class="evaluator-info">
        평가위원 : ${evaluatorInfo.name}${positionText} (서명)
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>평가표 출력 - ${getDynamicTitle()}</title>
          <meta charset="UTF-8">
          ${printStyle}
        </head>
        <body>
          ${printContent.innerHTML}
          ${evaluationFooter}
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.print();
    
    showNotification('인쇄 미리보기가 열렸습니다!', 'info');
  };

  // 배치 인쇄 함수 - 모든 평가위원 x 모든 후보자 조합으로 자동 인쇄
  const printAllCombinations = () => {
    if (!candidates || (candidates as any[]).length === 0 || !evaluators || (evaluators as any[]).length === 0) {
      showNotification('평가대상과 평가위원이 모두 등록되어야 배치 인쇄가 가능합니다.', 'error');
      return;
    }

    const printContent = document.getElementById('template-print-area');
    if (!printContent) {
      showNotification('인쇄할 내용을 찾을 수 없습니다.', 'error');
      return;
    }

    let allPrintContent = '';
    let isFirstPage = true;
    const today = new Date().toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // 모든 조합 생성 및 인쇄 내용 구성
    (candidates as any[]).forEach((candidate: any) => {
      (evaluators as any[]).forEach((evaluator: any) => {
        // 평가위원 정보
        const positionText = evaluator.position ? ` (${evaluator.position})` : '';
        
        // 동적 제목과 구분 정보
        const dynamicTitle = `${candidate.name} 심사표`;
        const categoryInfo = candidate.category || candidate.department;
        
        // 평가일/평가위원 정보
        const evaluationFooter = `
          <div class="evaluation-date">
            평가일: ${today}
          </div>
          <div class="evaluator-info">
            평가위원 : ${evaluator.name}${positionText} (서명)
          </div>
        `;
        
        // 템플릿 내용 복사 및 동적 정보 교체
        let templateContent = printContent.innerHTML;
        
        // 구분 정보 교체
        templateContent = templateContent.replace(
          /<td colspan="2" class="border-t border-l border-r border-gray-400 p-2 text-sm text-right">\s*<span>구분 : [^<]*<\/span>\s*<\/td>/g,
          `<td colspan="2" class="border-t border-l border-r border-gray-400 p-2 text-sm text-right"><span>구분 : ${categoryInfo}</span></td>`
        );
        
        // 제목 교체
        templateContent = templateContent.replace(
          /<td colspan="2" class="border-l border-r border-b border-gray-400 p-4 text-center text-lg font-bold title">[^<]*<\/td>/,
          `<td colspan="2" class="border-l border-r border-b border-gray-400 p-4 text-center text-lg font-bold title">${dynamicTitle}</td>`
        );
        
        // 페이지 구분 (첫 번째가 아니면 새 페이지)
        const pageBreak = !isFirstPage ? '<div style="page-break-before: always;"></div>' : '';
        
        // 모든 내용 추가
        allPrintContent += `
          ${pageBreak}
          ${templateContent}
          ${evaluationFooter}
        `;
        
        isFirstPage = false;
      });
    });

    // 일반 인쇄와 완전히 동일한 스타일 사용
    const printStyle = `
      <style>
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:text-center { text-align: center !important; }
          .print\\:text-4xl { font-size: 2.25rem !important; }
          .print\\:font-black { font-weight: 900 !important; }
          .print\\:text-black { color: black !important; }
          .print\\:border-none { border: none !important; }
          
          @page {
            margin: 0 !important;
            size: A4 !important;
          }
          
          body { 
            font-size: 14px !important; 
            line-height: 1.5 !important;
            margin: 0 !important;
            padding: 95px 50px 50px 50px !important;
            font-family: "맑은 고딕", "Malgun Gothic", Arial, sans-serif !important;
          }
          
          html {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .title {
            text-align: center !important;
            font-size: 24px !important;
            font-weight: bold !important;
            margin-bottom: 15px !important;
            color: black !important;
          }
          
          .evaluation-date {
            text-align: center !important;
            margin: 40px 0 20px 0 !important;
            font-size: 16px !important;
            font-weight: bold !important;
          }
          
          .evaluator-info {
            text-align: right !important;
            margin-top: 20px !important;
            margin-bottom: 20px !important;
            font-size: 20px !important;
            font-weight: bold !important;
            padding: 20px !important;
            text-decoration: underline !important;
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
            text-align: left !important;
          }
          
          th { 
            background-color: #e8e8e8 !important; 
            text-align: center !important;
            font-weight: bold !important;
          }
          
          .points-cell { text-align: center !important; }
          .score-cell { text-align: center !important; }
          .type-cell { text-align: center !important; }
          
          .section-row { 
            background-color: #f0f0f0 !important; 
            font-weight: bold !important; 
          }
          
          .total-row { 
            background-color: #e8e8e8 !important; 
            font-weight: bold !important; 
          }
          
          .section-cell .text-xs {
            text-align: center !important;
          }
          
          .no-print { 
            display: none !important; 
          }
          
          input {
            border: none !important;
            background: transparent !important;
            font-size: inherit !important;
            font-weight: inherit !important;
            text-align: inherit !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          select {
            border: none !important;
            background: transparent !important;
            font-size: inherit !important;
          }
        }
      </style>
    `;

    // 배치 인쇄 실행
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>전체 평가표 배치 인쇄</title>
          <meta charset="UTF-8">
          ${printStyle}
        </head>
        <body>
          ${allPrintContent}
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.print();
    
    showNotification(`총 ${(candidates as any[]).length * (evaluators as any[]).length}개의 평가표를 배치 인쇄합니다!`, 'info');
  };

  const createCategoryMutation = useMutation({
    mutationFn: async (category: typeof newCategory) => {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      toast({ title: "성공", description: "카테고리가 생성되었습니다." });
      setIsAddingCategory(false);
      setNewCategory({ categoryCode: "", categoryName: "", description: "" });
    },
    onError: () => {
      toast({ title: "오류", description: "카테고리 생성에 실패했습니다.", variant: "destructive" });
    }
  });

  const createItemMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const response = await fetch('/api/admin/evaluation-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          categoryId: parseInt(item.categoryId),
          maxScore: parseFloat(item.maxScore),
          weight: parseFloat(item.weight),
        }),
      });
      if (!response.ok) throw new Error('Failed to create item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evaluation-items'] });
      toast({ title: "성공", description: "평가 항목이 생성되었습니다." });
      setIsAddingItem(false);
      setNewItem({ categoryId: "", itemCode: "", itemName: "", description: "", maxScore: "", weight: "" });
    },
    onError: () => {
      toast({ title: "오류", description: "평가 항목 생성에 실패했습니다.", variant: "destructive" });
    }
  });

  if (categoriesLoading || itemsLoading) {
    return <div className="p-6">로딩 중...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">평가 템플릿 관리</h1>
        <div className="flex gap-2">
          <Button onClick={printAllCombinations} variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            전체 배치 인쇄
          </Button>
        </div>
      </div>

      <Tabs defaultValue="template" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="template">평가표 템플릿</TabsTrigger>
          <TabsTrigger value="categories">카테고리 관리</TabsTrigger>
          <TabsTrigger value="items">평가 항목 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="template" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>평가표 템플릿</CardTitle>
                  <CardDescription>
                    평가표 템플릿을 편집하고 설정할 수 있습니다.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setIsEditing(!isEditing)} variant="outline" size="sm">
                    <Edit3 className="h-4 w-4 mr-2" />
                    {isEditing ? '편집 완료' : '편집 모드'}
                  </Button>
                  <Button onClick={saveTemplate} variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    저장
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

              {/* 평가위원 및 평가대상 선택 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-2">평가위원 선택</label>
                  <select 
                    value={selectedEvaluator || ''} 
                    onChange={(e) => setSelectedEvaluator(e.target.value ? Number(e.target.value) : null)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">평가위원을 선택하세요</option>
                    {evaluators && (evaluators as any[]).map((evaluator: any) => (
                      <option key={evaluator.id} value={evaluator.id}>
                        {evaluator.name} {evaluator.position && `(${evaluator.position})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">평가대상 선택</label>
                  <select 
                    value={selectedCandidate || ''} 
                    onChange={(e) => setSelectedCandidate(e.target.value ? Number(e.target.value) : null)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">평가대상을 선택하세요</option>
                    {candidates && (candidates as any[]).map((candidate: any) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} ({candidate.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 수동 평가위원 정보 입력 (선택된 평가위원이 없을 때만) */}
              {!selectedEvaluator && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-2">평가위원명</label>
                    <Input
                      value={evaluator.name}
                      onChange={(e) => setEvaluator(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="평가위원명을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">직책</label>
                    <Input
                      value={evaluator.position}
                      onChange={(e) => setEvaluator(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="직책을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">소속기관</label>
                    <Input
                      value={evaluator.department}
                      onChange={(e) => setEvaluator(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="소속기관을 입력하세요"
                    />
                  </div>
                </div>
              )}

              {/* 미리보기 및 실제 템플릿 */}
              <div id="template-print-area" className="print:block">
                {/* 상단 정보 테이블 */}
                <table className="w-full border-2 border-gray-400 mb-4">
                  <tbody>
                    <tr>
                      <td colSpan={2} className="border-t border-l border-r border-gray-400 p-2 text-sm text-right">
                        <span>구분 : {getDynamicCategory()}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="border-l border-r border-b border-gray-400 p-4 text-center text-lg font-bold title">
                        {getDynamicTitle()}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 메인 평가 테이블 */}
                <table className="w-full border-2 border-gray-400">
                  <thead>
                    <tr className="bg-gray-100">
                      {columnConfig.filter(col => col.visible).map((column) => (
                        <th key={column.id} className={`border border-gray-400 p-3 text-center text-sm font-medium ${column.width}`}>
                          {column.title}
                          {isEditing && !column.required && (
                            <div className="flex gap-1 mt-1 justify-center">
                              <button
                                onClick={() => moveColumn(column.id, 'left')}
                                className="text-xs px-1 py-0.5 bg-blue-100 rounded hover:bg-blue-200"
                                title="왼쪽으로 이동"
                              >
                                ←
                              </button>
                              <button
                                onClick={() => moveColumn(column.id, 'right')}
                                className="text-xs px-1 py-0.5 bg-blue-100 rounded hover:bg-blue-200"
                                title="오른쪽으로 이동"
                              >
                                →
                              </button>
                              <button
                                onClick={() => removeColumn(column.id)}
                                className="text-xs px-1 py-0.5 bg-red-100 rounded hover:bg-red-200"
                                title="컬럼 삭제"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </th>
                      ))}
                      {isEditing && <th className="border border-gray-400 p-3 text-center text-sm font-medium w-20">작업</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentTemplate.data.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {columnConfig.filter(col => col.visible).map((column) => (
                          <td key={column.id} className="border border-gray-400 p-2">
                            {column.type === 'section' ? (
                              isEditing ? (
                                <Input
                                  value={item.text || ''}
                                  onChange={(e) => updateRowValue(item.id, 'text', e.target.value)}
                                  className="text-center"
                                />
                              ) : (
                                <div className="text-center">{item.text}</div>
                              )
                            ) : column.type === 'text' ? (
                              isEditing ? (
                                <Input
                                  value={item.text || ''}
                                  onChange={(e) => updateRowValue(item.id, 'text', e.target.value)}
                                />
                              ) : (
                                <div>{item.text}</div>
                              )
                            ) : column.type === 'select' ? (
                              isEditing ? (
                                <select
                                  value={item.type || ''}
                                  onChange={(e) => updateRowValue(item.id, 'type', e.target.value)}
                                  className="w-full p-1 border rounded text-center"
                                >
                                  {column.options?.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="text-center">{item.type}</div>
                              )
                            ) : column.type === 'number' ? (
                              column.id === 'points' ? (
                                isEditing ? (
                                  <Input
                                    type="number"
                                    value={item[column.id as keyof typeof item] || 0}
                                    onChange={(e) => updateRowValue(item.id, column.id, parseInt(e.target.value) || 0)}
                                    className="text-center"
                                  />
                                ) : (
                                  <div className="text-center">{item[column.id as keyof typeof item] || 0}</div>
                                )
                              ) : (
                                <Input
                                  type="number"
                                  value={item[column.id as keyof typeof item] || 0}
                                  onChange={(e) => updateRowValue(item.id, column.id, parseInt(e.target.value) || 0)}
                                  className="text-center"
                                  min="0"
                                  max={column.id === 'score' ? item.points : undefined}
                                />
                              )
                            ) : (
                              <div className="text-center">
                                {item[column.id as keyof typeof item] || 0}
                              </div>
                            )}
                          </td>
                        ))}
                        {isEditing && (
                          <td className="border border-gray-400 p-2 text-center">
                            <Button
                              onClick={() => deleteRow(item.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    
                    {/* 총점 행 */}
                    <tr className="bg-gray-200 font-bold">
                      <td colSpan={columnConfig.filter(col => col.visible && !['points', 'score'].includes(col.id)).length} 
                          className="border border-gray-400 p-3 text-center">
                        총점
                      </td>
                      <td className="border border-gray-400 p-3 text-center">
                        {currentTemplate.data.reduce((sum, item) => sum + (item.points || 0), 0)}
                      </td>
                      <td className="border border-gray-400 p-3 text-center">
                        {calculateTotal()}
                      </td>
                      {isEditing && <td className="border border-gray-400 p-3"></td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>카테고리 관리</CardTitle>
                  <CardDescription>평가 카테고리를 관리할 수 있습니다.</CardDescription>
                </div>
                <Button onClick={() => setIsAddingCategory(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  카테고리 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isAddingCategory && (
                <div className="mb-4 p-4 border rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="카테고리 코드"
                      value={newCategory.categoryCode}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, categoryCode: e.target.value }))}
                    />
                    <Input
                      placeholder="카테고리명"
                      value={newCategory.categoryName}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, categoryName: e.target.value }))}
                    />
                    <Input
                      placeholder="설명"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => createCategoryMutation.mutate(newCategory)}
                      disabled={createCategoryMutation.isPending}
                    >
                      저장
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingCategory(false)}>
                      취소
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {categories && (categories as any[]).map((category: any) => (
                  <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{category.categoryName}</div>
                      <div className="text-sm text-gray-500">{category.categoryCode} - {category.description}</div>
                    </div>
                    <div className="flex gap-2">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>평가 항목 관리</CardTitle>
                  <CardDescription>평가 항목을 관리할 수 있습니다.</CardDescription>
                </div>
                <Button onClick={() => setIsAddingItem(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  항목 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isAddingItem && (
                <div className="mb-4 p-4 border rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={newItem.categoryId}
                      onChange={(e) => setNewItem(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="p-2 border rounded-md"
                    >
                      <option value="">카테고리 선택</option>
                      {categories && (categories as any[]).map((category: any) => (
                        <option key={category.id} value={category.id}>
                          {category.categoryName}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="항목 코드"
                      value={newItem.itemCode}
                      onChange={(e) => setNewItem(prev => ({ ...prev, itemCode: e.target.value }))}
                    />
                    <Input
                      placeholder="항목명"
                      value={newItem.itemName}
                      onChange={(e) => setNewItem(prev => ({ ...prev, itemName: e.target.value }))}
                    />
                    <Input
                      placeholder="설명"
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <Input
                      placeholder="최대 점수"
                      type="number"
                      value={newItem.maxScore}
                      onChange={(e) => setNewItem(prev => ({ ...prev, maxScore: e.target.value }))}
                    />
                    <Input
                      placeholder="가중치"
                      type="number"
                      step="0.1"
                      value={newItem.weight}
                      onChange={(e) => setNewItem(prev => ({ ...prev, weight: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => createItemMutation.mutate(newItem)}
                      disabled={createItemMutation.isPending}
                    >
                      저장
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingItem(false)}>
                      취소
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {items && (items as any[]).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-sm text-gray-500">
                        {item.categoryName} - {item.itemCode} - 최대: {item.maxScore}점, 가중치: {item.weight}
                      </div>
                    </div>
                    <div className="flex gap-2">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}