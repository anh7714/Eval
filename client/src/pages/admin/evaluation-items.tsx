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

  // 편집 관련 함수들
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

  const updateScore = (sectionId: string, itemId: number, score: number) => {
    updateItem(sectionId, itemId, 'score', score);
  };

  const addItem = (sectionId: string) => {
    const newItemId = Date.now();
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: [...section.items, { id: newItemId, text: '새 항목', type: '정성', points: 10, score: 0 }]
            }
          : section
      )
    }));
  };

  const deleteSection = (sectionId: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
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
      const evaluationData = currentTemplate.sections.flatMap(section => 
        section.items.map(item => ({
          '구분': section.title,
          '세부항목': item.text,
          '유형': item.type,
          '배점': item.points,
          '평가점수': item.score || 0
        }))
      );

      // XLSX 라이브러리 동적 로드
      const XLSX = await import('https://unpkg.com/xlsx@0.18.5/xlsx.mjs');
      
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
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              엑셀 불러오기
            </Button>
            <Button onClick={handleExcelDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              엑셀 다운로드
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />

        {viewMode === 'template' ? (
          // 심사표 보기 모드 - 기존 코드 완전 그대로
          <Card className="bg-white">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold text-gray-800">
                {currentTemplate.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-gray-800">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold w-32">구분</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold flex-1">세부 항목</th>
                      <th className="border border-gray-400 px-2 py-3 text-center font-bold w-16">유형</th>
                      <th className="border border-gray-400 px-2 py-3 text-center font-bold w-16">배점</th>
                      <th className="border border-gray-400 px-2 py-3 text-center font-bold w-20">평가점수</th>
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
                              <div className="font-bold text-sm">{section.id}. {section.title}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                ({calculateSectionScore(section)}점)
                              </div>
                            </td>
                          )}
                          <td className="border border-gray-400 px-4 py-2 align-middle">
                            <span className="text-sm">{itemIndex + 1}. {item.text}</span>
                          </td>
                          <td className="border border-gray-400 px-2 py-2 text-center align-middle">
                            <span className="text-xs">{item.type}</span>
                          </td>
                          <td className="border border-gray-400 px-2 py-2 text-center align-middle">
                            <span className="text-xs">{item.points}점</span>
                          </td>
                          <td className="border border-gray-400 px-2 py-2 text-center align-middle">
                            <span className="text-xs">{item.score || 0}점</span>
                          </td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-yellow-50 font-bold">
                      <td className="border border-gray-400 px-4 py-3 text-center" colSpan={3}>총계</td>
                      <td className="border border-gray-400 px-2 py-3 text-center">{calculateTotalPoints()}점</td>
                      <td className="border border-gray-400 px-2 py-3 text-center">{calculateTotalScore()}점</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          // 관리 모드 - 평가표 템플릿 기능이 통합된 상태
          <div className="space-y-6">
            {/* 평가표 템플릿 섹션 (관리모드에 통합) */}
            <Card className="bg-white">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>평가표 템플릿</CardTitle>
                    <CardDescription>평가표를 디자인하고 관리합니다.</CardDescription>
                  </div>
                  <div className="flex space-x-2">
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
                                      <select
                                        value={item[column.id] || ''}
                                        onChange={(e) => updateItem(section.id, item.id, column.id, e.target.value)}
                                        className="text-xs w-full border rounded px-1 py-1"
                                      >
                                        <option value="">선택</option>
                                        {column.options?.map(option => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                      </select>
                                    ) : column.id === 'points' ? (
                                      <Input
                                        type="number"
                                        value={item[column.id] || ''}
                                        onChange={(e) => updateItem(section.id, item.id, column.id, parseInt(e.target.value) || 0)}
                                        className="text-xs text-center w-16 mx-auto"
                                      />
                                    ) : (
                                      <Input
                                        value={item[column.id] || ''}
                                        onChange={(e) => updateItem(section.id, item.id, column.id, e.target.value)}
                                        className="text-xs text-center w-full"
                                      />
                                    )
                                  ) : (
                                    <span className="text-xs">
                                      {column.id === 'points' ? `${item[column.id] || 0}점` : (item[column.id] || '')}
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
                      <tr className="bg-yellow-50 font-bold">
                        <td className="border border-gray-400 px-4 py-3 text-center" colSpan={2}>총계</td>
                        {columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => (
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