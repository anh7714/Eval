import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  // 시스템 설정 정보 가져오기
  const { data: systemConfig } = useQuery({
    queryKey: ['/api/system/config'],
    select: (data) => data || {}
  });

  // 총 점수 계산
  const calculateTotalScore = () => {
    return currentTemplate.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + (item.score || 0), 0), 0);
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

  // 점수 입력 핸들러
  const handleScoreInput = (sectionId: number, itemId: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateTemplateScore(sectionId, itemId, numValue);
  };

  // 템플릿 편집 핸들러
  const updateTemplateItem = (sectionId: number, itemId: number, field: string, value: any) => {
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

  // 섹션 편집 핸들러
  const updateSectionTitle = (sectionId: number, title: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, title } : section
      )
    }));
  };

  // 컬럼 설정 업데이트
  const updateColumnConfig = (columnId: string, field: string, value: any) => {
    setColumnConfig(prev => prev.map(col => 
      col.id === columnId ? { ...col, [field]: value } : col
    ));
  };

  // 새 섹션 추가
  const addSection = () => {
    const newId = Math.max(...currentTemplate.sections.map(s => s.id)) + 1;
    setCurrentTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, {
        id: newId,
        title: "새 영역",
        items: [
          { id: Date.now(), text: "새 항목", type: "정량", points: 10, score: 0 }
        ]
      }]
    }));
  };

  // 새 항목 추가
  const addItem = (sectionId: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: [...section.items, {
                id: Date.now(),
                text: "새 항목",
                type: "정량",
                points: 10,
                score: 0
              }]
            }
          : section
      )
    }));
  };

  // 항목 삭제
  const removeItem = (sectionId: number, itemId: number) => {
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

  // 섹션 삭제
  const removeSection = (sectionId: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  // 파일 업로드 핸들러
  const loadTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  // JSON 저장
  const saveTemplate = () => {
    const dataStr = JSON.stringify(currentTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `평가표_템플릿_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // 엑셀 저장
  const saveAsExcel = async () => {
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

  // 점수 초기화
  const resetScores = () => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        items: section.items.map(item => ({ ...item, score: 0 }))
      }))
    }));
    toast({
      title: "성공",
      description: "모든 점수가 초기화되었습니다.",
    });
  };

  // 평가항목으로 내보내기 (심사표 저장)
  const exportToEvaluationItemsMutation = useMutation({
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

  const exportToEvaluationItems = () => {
    exportToEvaluationItemsMutation.mutate(currentTemplate);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">평가항목 관리</h1>
        </div>

        <div className="space-y-6">
          {/* 평가표 템플릿 섹션 */}
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
                  <Button onClick={exportToEvaluationItems} variant="default" size="sm" className="bg-green-600 hover:bg-green-700" disabled={exportToEvaluationItemsMutation.isPending}>
                    <Upload className="h-4 w-4 mr-2" />
                    {exportToEvaluationItemsMutation.isPending ? "저장 중..." : "심사표 저장"}
                  </Button>
                  {isEditing && (
                    <>
                      <Button onClick={addSection} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        영역 추가
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
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={column.visible}
                            onChange={(e) => updateColumnConfig(column.id, 'visible', e.target.checked)}
                            disabled={column.required}
                          />
                          표시
                        </label>
                        {column.required && (
                          <Badge variant="secondary" className="text-xs">필수</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 템플릿 제목 편집 */}
              {isEditing && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="text-sm font-bold mb-2 block text-blue-800">평가표 제목</label>
                  <Input
                    value={currentTemplate.title}
                    onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                    className="text-lg font-bold"
                  />
                </div>
              )}

              {/* 평가표 테이블 */}
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-4">{currentTemplate.title}</h2>
                </div>

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
                        <React.Fragment key={section.id}>
                          {section.items.map((item, index) => (
                            <tr key={`${section.id}-${item.id}`} className="hover:bg-gray-50">
                              {index === 0 && (
                                <td 
                                  rowSpan={section.items.length}
                                  className="border border-gray-400 px-4 py-3 text-center font-medium bg-gray-50 relative"
                                >
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <Input
                                        value={section.title}
                                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                        className="text-center font-medium"
                                      />
                                      <div className="flex gap-1 justify-center">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => addItem(section.id)}
                                          className="text-xs"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => removeSection(section.id)}
                                          className="text-xs text-red-600"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    section.title
                                  )}
                                </td>
                              )}
                              <td className="border border-gray-400 px-4 py-3 text-left">
                                {isEditing ? (
                                  <Input
                                    value={item.text}
                                    onChange={(e) => updateTemplateItem(section.id, item.id, 'text', e.target.value)}
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
                                        onChange={(e) => updateTemplateItem(section.id, item.id, column.id, e.target.value)}
                                        className="w-full border rounded px-2 py-1 text-center"
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
                                        onChange={(e) => updateTemplateItem(section.id, item.id, column.id, parseInt(e.target.value) || 0)}
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
                                    onClick={() => removeItem(section.id, item.id)}
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
                        {columnConfig.filter(col => col.visible).slice(2).map(column => (
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
      </div>
    </div>
  );
}