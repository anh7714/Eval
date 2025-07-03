import React, { useState, useRef } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 템플릿 관련 함수들
  const calculateSectionScore = (section: any) => {
    return section.items.reduce((sum: number, item: any) => sum + (item.score || 0), 0);
  };

  const calculateTotalScore = () => {
    return currentTemplate.sections.reduce((sum, section) => sum + calculateSectionScore(section), 0);
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
    const dataStr = JSON.stringify(currentTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = '평가표_템플릿.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast({ title: "성공", description: "템플릿이 다운로드되었습니다." });
  };

  const loadTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const template = JSON.parse(e.target?.result as string);
          setCurrentTemplate(template);
          toast({ title: "성공", description: "템플릿이 로드되었습니다." });
        } catch (error) {
          toast({ title: "오류", description: "파일 형식이 올바르지 않습니다.", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    }
  };

  const resetScores = () => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        items: section.items.map(item => ({ ...item, score: 0 }))
      }))
    }));
    toast({ title: "성공", description: "모든 점수가 초기화되었습니다." });
  };

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/admin/categories"],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/admin/evaluation-items"],
  });

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
                      {isEditing && (
                        <Button onClick={addSection} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          영역 추가
                        </Button>
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

                  {/* 템플릿 제목 */}
                  <div className="mb-6">
                    <Input
                      value={currentTemplate.title}
                      onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                      className="text-xl font-bold text-center border-none text-gray-800 bg-transparent"
                      disabled={!isEditing}
                    />
                    <div className="text-center text-sm text-gray-600 mt-2">
                      총점: {calculateTotalScore()} / {currentTemplate.totalScore}점
                    </div>
                  </div>

                  {/* 평가표 테이블 */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-400 text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-400 px-4 py-3 text-left font-bold">구분 ({currentTemplate.totalScore}점)</th>
                          <th className="border border-gray-400 px-4 py-3 text-left font-bold">세부 항목</th>
                          <th className="border border-gray-400 px-2 py-3 text-center font-bold w-16">유형</th>
                          <th className="border border-gray-400 px-2 py-3 text-center font-bold w-16">배점</th>
                          <th className="border border-gray-400 px-2 py-3 text-center font-bold w-20">평가점수</th>
                          {isEditing && <th className="border border-gray-400 px-2 py-3 text-center font-bold w-20">관리</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {currentTemplate.sections.flatMap((section) => 
                          section.items.map((item, itemIndex) => (
                              <tr key={`${section.id}-${item.id}`} className="hover:bg-gray-50">
                                {itemIndex === 0 && (
                                  <td 
                                    className="border border-gray-400 px-4 py-3 font-medium bg-blue-50 align-top"
                                    rowSpan={section.items.length}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        {isEditing ? (
                                          <Input
                                            value={section.title}
                                            onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                                            className="font-bold text-sm bg-transparent border-b border-gray-300"
                                          />
                                        ) : (
                                          <span className="font-bold text-sm">{section.id}. {section.title}</span>
                                        )}
                                        <div className="text-xs text-gray-600 mt-1">
                                          ({calculateSectionScore(section)}점)
                                        </div>
                                      </div>
                                      {isEditing && (
                                        <div className="flex flex-col gap-1">
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
                                    <span className="text-sm">{item.text}</span>
                                  )}
                                </td>
                                
                                <td className="border border-gray-400 px-2 py-2 text-center">
                                  {isEditing ? (
                                    <select
                                      value={item.type}
                                      onChange={(e) => updateItem(section.id, item.id, 'type', e.target.value)}
                                      className="text-xs border rounded px-1 py-1"
                                    >
                                      <option value="정량">정량</option>
                                      <option value="정성">정성</option>
                                    </select>
                                  ) : (
                                    <span className="text-xs">{item.type}</span>
                                  )}
                                </td>
                                
                                <td className="border border-gray-400 px-2 py-2 text-center">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      value={item.points}
                                      onChange={(e) => updateItem(section.id, item.id, 'points', parseInt(e.target.value) || 0)}
                                      className="text-xs text-center w-12"
                                    />
                                  ) : (
                                    <span className="text-xs">{item.points}</span>
                                  )}
                                </td>
                                
                                <td className="border border-gray-400 px-2 py-2 text-center">
                                  <Input
                                    type="number"
                                    value={item.score}
                                    onChange={(e) => updateScore(section.id, item.id, parseInt(e.target.value) || 0)}
                                    max={item.points}
                                    min={0}
                                    className="text-xs text-center w-16"
                                  />
                                </td>
                                
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
                      </tbody>
                    </table>
                  </div>

                  {/* 총점 표시 */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">총 평가점수</span>
                      <span className="text-xl font-bold text-blue-600">
                        {calculateTotalScore()} / {currentTemplate.totalScore}점 
                        ({Math.round((calculateTotalScore() / currentTemplate.totalScore) * 100)}%)
                      </span>
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