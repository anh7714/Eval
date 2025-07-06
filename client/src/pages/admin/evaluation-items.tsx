import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
        id: 1,
        title: "신청기관 현황",
        items: [
          { id: 1, text: "법인 또는 단체 설립 현황", type: "정량", points: 10, score: 0 },
          { id: 2, text: "최근 3년 내 사업실적", type: "정량", points: 10, score: 0 },
          { id: 3, text: "조직 현황", type: "정량", points: 10, score: 0 },
          { id: 4, text: "재정 현황", type: "정량", points: 10, score: 0 },
        ]
      },
      {
        id: 2,
        title: "사업 운영계획",
        items: [
          { id: 5, text: "사업 운영 계획의 적절성", type: "정성", points: 20, score: 0 },
          { id: 6, text: "사업 운영의 효과성", type: "정성", points: 20, score: 0 },
        ]
      },
      {
        id: 3,
        title: "인력 및 조직 운영",
        items: [
          { id: 7, text: "인력 배치 계획", type: "정량", points: 10, score: 0 },
          { id: 8, text: "전문 인력 확보", type: "정량", points: 10, score: 0 },
        ]
      }
    ]
  });

  // 편집 상태 관리
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(currentTemplate);

  // 파일 업로드 처리
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 데이터 가져오기 쿼리
  const { data: categories } = useQuery({
    queryKey: ['/api/admin/categories'],
    select: (data) => data || []
  });

  const { data: items } = useQuery({
    queryKey: ['/api/admin/evaluation-items'],
    select: (data) => data || []
  });

  // 템플릿 보기 모드에서 총 점수 계산
  const calculateTotalScore = () => {
    return (categories || []).reduce((sum: number, category: any) => sum + 
      (items || []).filter((item: any) => item.categoryId === category.id).reduce((itemSum: number, item: any) => itemSum + item.score, 0), 0);
  };

  // 시스템 설정 정보 가져오기
  const { data: systemConfig } = useQuery({
    queryKey: ['/api/system/config'],
    select: (data) => data || {}
  });

  // 가중치 기반 총 점수 계산 (템플릿 기반)
  const calculateWeightedTotalScore = () => {
    return currentTemplate.sections.reduce((sum: number, section: any) => 
      sum + section.items.reduce((itemSum: number, item: any) => itemSum + (item.score || 0), 0), 0);
  };

  // 평가표 업데이트 핸들러
  const updateTemplateScore = (sectionId: number, itemId: number, score: number) => {
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

  // 평가위원 및 평가대상 데이터 가져오기
  const { data: evaluators } = useQuery({
    queryKey: ['/api/admin/evaluators'],
    select: (data) => data || []
  });

  const { data: candidates } = useQuery({
    queryKey: ['/api/admin/candidates'],
    select: (data) => data || []
  });

  // 인쇄 처리
  const handlePrint = () => {
    if (!selectedEvaluator || !selectedCandidate) {
      toast({
        title: "오류",
        description: "평가위원과 평가대상을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    const evaluatorInfo = evaluators.find((e: any) => e.id === selectedEvaluator);
    const candidateInfo = candidates.find((c: any) => c.id === selectedCandidate);

    if (!evaluatorInfo || !candidateInfo) {
      toast({
        title: "오류",
        description: "선택된 평가위원 또는 평가대상 정보를 찾을 수 없습니다.",
        variant: "destructive"
      });
      return;
    }

    // 인쇄용 HTML 생성
    const printContent = generatePrintableHTML(evaluatorInfo, candidateInfo);
    
    // 새 창에서 인쇄
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  // 배치 인쇄 처리
  const handleBatchPrint = () => {
    const printContent = generateBatchPrintHTML();
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  // 인쇄용 HTML 생성
  const generatePrintableHTML = (evaluatorInfo: any, candidateInfo: any) => {
    const visibleColumns = columnConfig.filter(col => col.visible);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>평가표 - ${candidateInfo.name}</title>
        <style>
          @page { size: A4; margin: 25mm 15mm 20mm 15mm; }
          body { font-family: '맑은 고딕', Arial, sans-serif; font-size: 12px; line-height: 1.4; margin: 0; padding: 0; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 18px; font-weight: bold; margin: 0 0 10px 0; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-table th, .info-table td { border: 1px solid #000; padding: 8px; text-align: left; }
          .info-table th { background-color: #f5f5f5; font-weight: bold; width: 25%; }
          .main-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .main-table th, .main-table td { border: 1px solid #000; padding: 6px; text-align: center; vertical-align: middle; }
          .main-table th { background-color: #f5f5f5; font-weight: bold; }
          .section-header { background-color: #f0f0f0; font-weight: bold; }
          .total-row { background-color: #f5f5f5; font-weight: bold; }
          .item-text { text-align: left; padding-left: 20px; }
          .signature { margin-top: 30px; text-align: right; }
          .signature-box { display: inline-block; text-align: center; margin-left: 50px; }
          .signature-line { border-top: 1px solid #000; width: 100px; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${systemConfig.evaluationTitle || currentTemplate.title}</h1>
        </div>
        
        <table class="info-table">
          <tr>
            <th>기관명(성명)</th>
            <td>${candidateInfo.name}</td>
            <th>소속(부서)</th>
            <td>${candidateInfo.department || ''}</td>
          </tr>
          <tr>
            <th>직책(직급)</th>
            <td>${candidateInfo.position || ''}</td>
            <th>구분</th>
            <td>${candidateInfo.category || ''}</td>
          </tr>
        </table>
        
        <table class="main-table">
          <thead>
            <tr>
              ${visibleColumns.map(col => `<th>${col.title}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${currentTemplate.sections.map(section => {
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
                if (col.id === 'points') return `<td>${currentTemplate.sections.reduce((sum: number, section: any) => sum + section.items.reduce((itemSum: number, item: any) => itemSum + item.points, 0), 0)}점</td>`;
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
            <div style="margin-top: 5px;">${evaluatorInfo.name} (인)</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // 배치 인쇄용 HTML 생성
  const generateBatchPrintHTML = () => {
    if (!candidates || !evaluators) return '';
    
    const allCombinations = candidates.flatMap((candidate: any, candidateIndex: number) => 
      evaluators.map((evaluator: any, evaluatorIndex: number) => ({
        candidate,
        evaluator,
        pageBreak: !(candidateIndex === candidates.length - 1 && evaluatorIndex === evaluators.length - 1)
      }))
    );

    const visibleColumns = columnConfig.filter(col => col.visible);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>배치 인쇄 - 평가표</title>
        <style>
          @page { size: A4; margin: 25mm 15mm 20mm 15mm; }
          body { font-family: '맑은 고딕', Arial, sans-serif; font-size: 12px; line-height: 1.4; margin: 0; padding: 0; }
          .page-break { page-break-after: always; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 18px; font-weight: bold; margin: 0 0 10px 0; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-table th, .info-table td { border: 1px solid #000; padding: 8px; text-align: left; }
          .info-table th { background-color: #f5f5f5; font-weight: bold; width: 25%; }
          .main-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .main-table th, .main-table td { border: 1px solid #000; padding: 6px; text-align: center; vertical-align: middle; }
          .main-table th { background-color: #f5f5f5; font-weight: bold; }
          .section-header { background-color: #f0f0f0; font-weight: bold; }
          .total-row { background-color: #f5f5f5; font-weight: bold; }
          .item-text { text-align: left; padding-left: 20px; }
          .signature { margin-top: 30px; text-align: right; }
          .signature-box { display: inline-block; text-align: center; margin-left: 50px; }
          .signature-line { border-top: 1px solid #000; width: 100px; margin-top: 40px; }
        </style>
      </head>
      <body>
        ${allCombinations.map(({ candidate, evaluator, pageBreak }) => `
          <div class="page${pageBreak ? ' page-break' : ''}">
            <div class="header">
              <h1>${systemConfig.evaluationTitle || currentTemplate.title}</h1>
            </div>
            
            <table class="info-table">
              <tr>
                <th>기관명(성명)</th>
                <td>${candidate.name}</td>
                <th>소속(부서)</th>
                <td>${candidate.department || ''}</td>
              </tr>
              <tr>
                <th>직책(직급)</th>
                <td>${candidate.position || ''}</td>
                <th>구분</th>
                <td>${candidate.category || ''}</td>
              </tr>
            </table>
            
            <table class="main-table">
              <thead>
                <tr>
                  ${visibleColumns.map(col => `<th>${col.title}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${currentTemplate.sections.map(section => {
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
                    if (col.id === 'points') return `<td>${currentTemplate.sections.reduce((sum: number, section: any) => sum + section.items.reduce((itemSum: number, item: any) => itemSum + item.points, 0), 0)}점</td>`;
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
                <div style="margin-top: 5px;">${evaluator.name} (인)</div>
              </div>
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;
  };

  // 점수 입력 핸들러
  const handleScoreInput = (sectionId: number, itemId: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateTemplateScore(sectionId, itemId, numValue);
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const templateData = JSON.parse(content);
          setCurrentTemplate(templateData);
          toast({
            title: "성공",
            description: "템플릿이 성공적으로 업로드되었습니다.",
          });
        } catch (error) {
          toast({
            title: "오류",
            description: "파일 형식이 올바르지 않습니다.",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    }
  };

  // 파일 다운로드 핸들러
  const handleFileDownload = () => {
    const dataStr = JSON.stringify(currentTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `평가표_템플릿_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // 엑셀 다운로드 핸들러
  const handleExcelDownload = async () => {
    try {
      // 동적 import 사용
      const XLSX = await import('https://unpkg.com/xlsx@0.18.5/xlsx.mjs');
      
      // 평가대상 데이터 준비
      const candidateData = candidates.map((candidate: any) => ({
        '기관명(성명)': candidate.name,
        '소속(부서)': candidate.department || '',
        '직책(직급)': candidate.position || '',
        '구분': candidate.category || '',
        '활성상태': candidate.isActive ? '활성' : '비활성'
      }));

      // 평가 항목 데이터 준비
      const evaluationData = currentTemplate.sections.flatMap(section => 
        section.items.map((item: any) => ({
          '구분': section.title,
          '세부항목': item.text,
          '유형': item.type,
          '배점': item.points,
          '평가점수': item.score || 0
        }))
      );

      // 워크북 생성
      const wb = XLSX.utils.book_new();
      
      // 평가대상 시트 추가
      const candidateWS = XLSX.utils.json_to_sheet(candidateData);
      XLSX.utils.book_append_sheet(wb, candidateWS, '평가대상');
      
      // 평가항목 시트 추가
      const evaluationWS = XLSX.utils.json_to_sheet(evaluationData);
      XLSX.utils.book_append_sheet(wb, evaluationWS, '평가항목');

      // 파일 다운로드
      const fileName = `평가표_데이터_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: "성공",
        description: "엑셀 파일이 성공적으로 다운로드되었습니다.",
      });
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      toast({
        title: "오류",
        description: "엑셀 다운로드 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 템플릿 저장 (Supabase API 호출)
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await fetch('/api/admin/save-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });
      
      if (!response.ok) {
        throw new Error('템플릿 저장 실패');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "심사표가 성공적으로 저장되었습니다.",
      });
      // 카테고리와 항목 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evaluation-items'] });
    },
    onError: (error) => {
      console.error('저장 오류:', error);
      toast({
        title: "오류",
        description: "심사표 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 템플릿 저장 핸들러
  const handleSaveTemplate = () => {
    saveTemplateMutation.mutate(currentTemplate);
  };

  // 편집 모드 토글
  const toggleEditMode = () => {
    if (isEditing) {
      setCurrentTemplate(editingTemplate);
    } else {
      setEditingTemplate(currentTemplate);
    }
    setIsEditing(!isEditing);
  };

  // 편집 취소
  const cancelEdit = () => {
    setEditingTemplate(currentTemplate);
    setIsEditing(false);
  };

  // 편집 저장
  const saveEdit = () => {
    setCurrentTemplate(editingTemplate);
    setIsEditing(false);
    toast({
      title: "성공",
      description: "편집 내용이 저장되었습니다.",
    });
  };

  // 배치 인쇄 개별 선택 핸들러
  const handleIndividualPrint = (evaluatorId: any) => {
    const evaluatorInfo = evaluators.find((e: any) => e.id === evaluatorId);
    if (!evaluatorInfo) return;
    
    const candidateInfo = candidates.find((c: any) => c.id === selectedCandidate);
    if (!candidateInfo) return;
    
    const printContent = generatePrintableHTML(evaluatorInfo, candidateInfo);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  // 평가대상별 인쇄 핸들러
  const handleCandidatePrint = (candidateId: any) => {
    const candidateInfo = candidates.find((c: any) => c.id === candidateId);
    if (!candidateInfo) return;
    
    const evaluatorInfo = evaluators.find((e: any) => e.id === selectedEvaluator);
    if (!evaluatorInfo) return;
    
    const printContent = generatePrintableHTML(evaluatorInfo, candidateInfo);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      setIsAddingCategory(false);
      setNewCategory({ categoryCode: "", categoryName: "", description: "" });
      toast({ title: "성공", description: "카테고리가 추가되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "카테고리 추가 중 오류가 발생했습니다.", variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evaluation-items'] });
      setIsAddingItem(false);
      setNewItem({ categoryId: "", itemCode: "", itemName: "", description: "", maxScore: "", weight: "" });
      toast({ title: "성공", description: "평가항목이 추가되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "평가항목 추가 중 오류가 발생했습니다.", variant: "destructive" });
    }
  });

  // 카테고리 추가 핸들러
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate({
      name: newCategory.categoryName,
      type: 'category',
      isActive: true,
      sortOrder: (categories?.length || 0) + 1
    });
  };

  // 평가항목 추가 핸들러
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    createItemMutation.mutate({
      categoryId: parseInt(newItem.categoryId),
      itemCode: newItem.itemCode,
      itemName: newItem.itemName,
      description: newItem.description,
      maxScore: parseInt(newItem.maxScore),
      weight: parseFloat(newItem.weight),
      isActive: true,
      sortOrder: (items?.length || 0) + 1
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 모드 선택 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">평가항목 관리</h1>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setViewMode('template')}
              variant={viewMode === 'template' ? 'default' : 'outline'}
            >
              템플릿 뷰
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
          // 템플릿 뷰 모드
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>평가표 템플릿</CardTitle>
                  <CardDescription>평가표를 디자인하고 관리합니다.</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleFileDownload} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    JSON 다운로드
                  </Button>
                  <Button onClick={handleExcelDownload} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    엑셀 다운로드
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    파일 업로드
                  </Button>
                  <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {saveTemplateMutation.isPending ? "저장 중..." : "심사표 저장"}
                  </Button>
                  <Button onClick={toggleEditMode} variant="outline">
                    <Edit3 className="h-4 w-4 mr-2" />
                    {isEditing ? "편집 완료" : "편집 모드"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {/* 평가표 템플릿 표시 */}
              <div className="space-y-6">
                {/* 제목 편집 */}
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">평가표 제목</label>
                      <Input
                        value={editingTemplate.title}
                        onChange={(e) => setEditingTemplate({...editingTemplate, title: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={saveEdit}>저장</Button>
                      <Button onClick={cancelEdit} variant="outline">취소</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <h2 className="text-xl font-bold mb-4">{currentTemplate.title}</h2>
                  </div>
                )}

                {/* 평가표 테이블 */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {columnConfig.filter(col => col.visible).map(column => (
                          <th key={column.id} className="border border-gray-400 px-4 py-3 text-center font-semibold">
                            {column.title}
                          </th>
                        ))}
                        {isEditing && <th className="border border-gray-400 px-4 py-3 text-center font-semibold">편집</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentTemplate.sections.map((section) => (
                        section.items.map((item: any, index: number) => (
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
                                    const newTemplate = {...editingTemplate};
                                    const sectionIndex = newTemplate.sections.findIndex(s => s.id === section.id);
                                    const itemIndex = newTemplate.sections[sectionIndex].items.findIndex((i: any) => i.id === item.id);
                                    newTemplate.sections[sectionIndex].items[itemIndex].text = e.target.value;
                                    setEditingTemplate(newTemplate);
                                  }}
                                  className="w-full"
                                />
                              ) : (
                                item.text
                              )}
                            </td>
                            {columnConfig.filter(col => col.visible).slice(2).map(column => (
                              <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                                {column.id === 'type' ? (
                                  isEditing ? (
                                    <select 
                                      value={item[column.id] || ''}
                                      onChange={(e) => {
                                        const newTemplate = {...editingTemplate};
                                        const sectionIndex = newTemplate.sections.findIndex(s => s.id === section.id);
                                        const itemIndex = newTemplate.sections[sectionIndex].items.findIndex((i: any) => i.id === item.id);
                                        newTemplate.sections[sectionIndex].items[itemIndex][column.id] = e.target.value;
                                        setEditingTemplate(newTemplate);
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
                                        const newTemplate = {...editingTemplate};
                                        const sectionIndex = newTemplate.sections.findIndex(s => s.id === section.id);
                                        const itemIndex = newTemplate.sections[sectionIndex].items.findIndex((i: any) => i.id === item.id);
                                        newTemplate.sections[sectionIndex].items[itemIndex][column.id] = parseInt(e.target.value) || 0;
                                        setEditingTemplate(newTemplate);
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
                                    const newTemplate = {...editingTemplate};
                                    const sectionIndex = newTemplate.sections.findIndex(s => s.id === section.id);
                                    newTemplate.sections[sectionIndex].items = 
                                      newTemplate.sections[sectionIndex].items.filter((i: any) => i.id !== item.id);
                                    setEditingTemplate(newTemplate);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))
                      ))}
                      {/* 합계 행 */}
                      <tr className="bg-gray-100 font-bold">
                        <td className="border border-gray-400 px-4 py-3 text-center">합계</td>
                        <td className="border border-gray-400 px-4 py-3 text-center">-</td>
                        {columnConfig.filter(col => col.visible).slice(2).map(column => (
                          <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                            {column.id === 'points' ? (
                              `${currentTemplate.sections.reduce((sum: number, section: any) => sum + section.items.reduce((itemSum: number, item: any) => itemSum + item.points, 0), 0)}점`
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
          // 관리 모드 (평가표 템플릿 통합)
          <div className="space-y-6">
            {/* 평가표 템플릿 섹션 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>평가표 템플릿</CardTitle>
                    <CardDescription>평가표를 디자인하고 관리합니다.</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleFileDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      JSON 다운로드
                    </Button>
                    <Button onClick={handleExcelDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      엑셀 다운로드
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      파일 업로드
                    </Button>
                    <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {saveTemplateMutation.isPending ? "저장 중..." : "심사표 저장"}
                    </Button>
                    <Button onClick={toggleEditMode} variant="outline">
                      <Edit3 className="h-4 w-4 mr-2" />
                      {isEditing ? "편집 완료" : "편집 모드"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {/* 평가표 템플릿 표시 */}
                <div className="space-y-6">
                  {/* 제목 편집 */}
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">평가표 제목</label>
                        <Input
                          value={editingTemplate.title}
                          onChange={(e) => setEditingTemplate({...editingTemplate, title: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={saveEdit}>저장</Button>
                        <Button onClick={cancelEdit} variant="outline">취소</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <h2 className="text-xl font-bold mb-4">{currentTemplate.title}</h2>
                    </div>
                  )}

                  {/* 평가표 테이블 */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          {columnConfig.filter(col => col.visible).map(column => (
                            <th key={column.id} className="border border-gray-400 px-4 py-3 text-center font-semibold">
                              {column.title}
                            </th>
                          ))}
                          {isEditing && <th className="border border-gray-400 px-4 py-3 text-center font-semibold">편집</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {currentTemplate.sections.map((section) => (
                          section.items.map((item: any, index: number) => (
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
                                      const newTemplate = {...editingTemplate};
                                      const sectionIndex = newTemplate.sections.findIndex(s => s.id === section.id);
                                      const itemIndex = newTemplate.sections[sectionIndex].items.findIndex((i: any) => i.id === item.id);
                                      newTemplate.sections[sectionIndex].items[itemIndex].text = e.target.value;
                                      setEditingTemplate(newTemplate);
                                    }}
                                    className="w-full"
                                  />
                                ) : (
                                  item.text
                                )}
                              </td>
                              {columnConfig.filter(col => col.visible).slice(2).map(column => (
                                <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                                  {column.id === 'type' ? (
                                    isEditing ? (
                                      <select 
                                        value={item[column.id] || ''}
                                        onChange={(e) => {
                                          const newTemplate = {...editingTemplate};
                                          const sectionIndex = newTemplate.sections.findIndex(s => s.id === section.id);
                                          const itemIndex = newTemplate.sections[sectionIndex].items.findIndex((i: any) => i.id === item.id);
                                          newTemplate.sections[sectionIndex].items[itemIndex][column.id] = e.target.value;
                                          setEditingTemplate(newTemplate);
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
                                          const newTemplate = {...editingTemplate};
                                          const sectionIndex = newTemplate.sections.findIndex(s => s.id === section.id);
                                          const itemIndex = newTemplate.sections[sectionIndex].items.findIndex((i: any) => i.id === item.id);
                                          newTemplate.sections[sectionIndex].items[itemIndex][column.id] = parseInt(e.target.value) || 0;
                                          setEditingTemplate(newTemplate);
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
                                      const newTemplate = {...editingTemplate};
                                      const sectionIndex = newTemplate.sections.findIndex(s => s.id === section.id);
                                      newTemplate.sections[sectionIndex].items = 
                                        newTemplate.sections[sectionIndex].items.filter((i: any) => i.id !== item.id);
                                      setEditingTemplate(newTemplate);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))
                        ))}
                        {/* 합계 행 */}
                        <tr className="bg-gray-100 font-bold">
                          <td className="border border-gray-400 px-4 py-3 text-center">합계</td>
                          <td className="border border-gray-400 px-4 py-3 text-center">-</td>
                          {columnConfig.filter(col => col.visible).slice(2).map(column => (
                            <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                              {column.id === 'points' ? (
                                `${currentTemplate.sections.reduce((sum: number, section: any) => sum + section.items.reduce((itemSum: number, item: any) => itemSum + item.points, 0), 0)}점`
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

            {/* 평가 카테고리 관리 */}
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
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddCategory} className="space-y-4">
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
                  <CardDescription>총 {categories?.length || 0}개의 카테고리가 등록되어 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories?.map((category: any) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h3 className="font-semibold">{category.name}</h3>
                          <p className="text-sm text-gray-600">
                            {category.type} · 정렬 순서: {category.sortOrder}
                          </p>
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
                    {(!categories || categories.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        등록된 카테고리가 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 평가 항목 관리 */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">평가 항목</h2>
                <Button onClick={() => setIsAddingItem(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  항목 추가
                </Button>
              </div>
              {isAddingItem && (
                <Card>
                  <CardHeader>
                    <CardTitle>새 평가 항목 추가</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddItem} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">카테고리</label>
                          <select
                            value={newItem.categoryId}
                            onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                            required
                            className="w-full border rounded px-3 py-2"
                          >
                            <option value="">카테고리 선택</option>
                            {categories?.map((category: any) => (
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
                  <CardDescription>총 {items?.length || 0}개의 평가 항목이 등록되어 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items?.map((item: any) => (
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
                    {(!items || items.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        등록된 평가 항목이 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}