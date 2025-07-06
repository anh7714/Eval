import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, Download, Save, X, Printer, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EvaluationItemManagement() {
  const [viewMode, setViewMode] = useState<'template' | 'management'>('template');
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        title: "A. 기관전문능력",
        subtitle: "(25점)",
        items: [
          { id: 1, text: "1. 제SOoS 사업 운영 체계의 건전 정도", type: "정량", points: 20, score: 0 },
          { id: 2, text: "2. 담당 직 담당 책무 확인", type: "정량", points: 5, score: 0 },
          { id: 3, text: "3. 기관 운영 기간", type: "정량", points: 5, score: 0 },
          { id: 4, text: "4. 조직도", type: "정량", points: 5, score: 0 }
        ]
      },
      {
        id: 2,
        title: "B. 전문활용",
        subtitle: "(20점)",
        items: [
          { id: 5, text: "1. 시설 운영 통식한 활용 위 당담자의 경력", type: "정량", points: 5, score: 0 },
          { id: 6, text: "2. 제SOoS 사업 운영 체계와 담당자", type: "정량", points: 5, score: 0 },
          { id: 7, text: "3. SOoSNet으로 수급 당담인 위무", type: "정량", points: 10, score: 0 }
        ]
      }
    ]
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 데이터 페칭
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/admin/categories'],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/admin/evaluation-items'],
  });

  const { data: evaluators = [] } = useQuery({
    queryKey: ['/api/admin/evaluators'],
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ['/api/admin/candidates'],
  });

  // 컬럼 설정 함수들
  const updateColumnConfig = (columnId: string, field: string, value: any) => {
    setColumnConfig(prev => prev.map(col => 
      col.id === columnId ? { ...col, [field]: value } : col
    ));
  };

  const deleteColumn = (columnId: string) => {
    setColumnConfig(prev => prev.filter(col => col.id !== columnId));
  };

  const addColumn = () => {
    const newId = `custom_${Date.now()}`;
    setColumnConfig(prev => [...prev, {
      id: newId,
      title: '새 컬럼',
      type: 'text',
      visible: true,
      required: false,
      width: 'w-20'
    }]);
  };

  // 템플릿 관리 함수들
  const addSection = () => {
    const newSection = {
      id: Date.now(),
      title: "새 영역",
      subtitle: "(점수)",
      items: []
    };
    setCurrentTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const addItem = (sectionId: number) => {
    const newItem = {
      id: Date.now(),
      text: "새 평가 항목",
      type: "정량",
      points: 0,
      score: 0
    };
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: [...section.items, newItem] }
          : section
      )
    }));
  };

  const updateItem = (sectionId: number, itemId: number, field: string, value: any) => {
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

  const deleteItem = (sectionId: number, itemId: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: section.items.filter(item => item.id !== itemId) }
          : section
      )
    }));
  };

  const deleteSection = (sectionId: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const updateSection = (sectionId: number, field: string, value: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    }));
  };

  // 계산 함수들
  const calculateSectionTotal = (section: any) => {
    return section.items.reduce((sum: number, item: any) => sum + (item.points || 0), 0);
  };

  const calculateSectionScore = (section: any) => {
    return section.items.reduce((sum: number, item: any) => sum + (item.score || 0), 0);
  };

  const calculateTotalScore = () => {
    return currentTemplate.sections.reduce((sum: number, section: any) => sum + calculateSectionScore(section), 0);
  };

  // 파일 관리 함수들
  const saveTemplate = () => {
    const dataStr = JSON.stringify(currentTemplate, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "템플릿이 저장되었습니다." });
  };

  const loadTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const template = JSON.parse(e.target?.result as string);
          setCurrentTemplate(template);
          toast({ title: "템플릿을 불러왔습니다." });
        } catch (error) {
          toast({ title: "파일 형식이 올바르지 않습니다.", variant: "destructive" });
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
    toast({ title: "점수가 초기화되었습니다." });
  };

  const printTemplate = () => {
    window.print();
  };

  const exportToEvaluationItems = async () => {
    try {
      // 템플릿 섹션을 카테고리로 변환
      for (const section of currentTemplate.sections) {
        // 카테고리 생성
        const categoryResponse = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryCode: `SEC_${section.id}`,
            categoryName: section.title,
            description: section.subtitle
          })
        });
        
        if (categoryResponse.ok) {
          const category = await categoryResponse.json();
          
          // 각 항목을 평가항목으로 변환
          for (const item of section.items) {
            await fetch('/api/admin/evaluation-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                categoryId: category.id,
                itemCode: `ITEM_${item.id}`,
                itemName: item.text,
                description: '',
                maxScore: item.points,
                weight: 1.0
              })
            });
          }
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/evaluation-items'] });
      
      toast({ 
        title: "평가항목으로 내보내기 완료", 
        description: "템플릿이 평가항목으로 성공적으로 변환되었습니다." 
      });
      
      // 평가항목 탭으로 이동
      setViewMode('management');
    } catch (error) {
      console.error('Export error:', error);
      toast({ 
        title: "내보내기 실패", 
        description: "평가항목 변환 중 오류가 발생했습니다.",
        variant: "destructive" 
      });
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
            <Button 
              variant={viewMode === 'template' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('template')}
            >
              심사표 보기
            </Button>
            <Button 
              variant={viewMode === 'management' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('management')}
            >
              관리 모드
            </Button>
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

        {viewMode === 'template' ? (
          // 템플릿 뷰 (심사표 형태로 표시)
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold">
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
                        <tr key={`${section.id}-${item.id}`} className="border-b">
                          {itemIndex === 0 && (
                            <td 
                              className="border border-gray-400 px-2 py-2 text-center font-semibold align-middle"
                              rowSpan={section.items.length}
                            >
                              <div className="flex flex-col">
                                <span>{section.title}</span>
                                <span className="text-xs text-gray-600">{section.subtitle}</span>
                              </div>
                            </td>
                          )}
                          <td className="border border-gray-400 px-4 py-2 text-left align-middle">
                            {item.text}
                          </td>
                          <td className="border border-gray-400 px-2 py-2 text-center align-middle">
                            {item.type}
                          </td>
                          <td className="border border-gray-400 px-2 py-2 text-center align-middle">
                            {item.points}점
                          </td>
                          <td className="border border-gray-400 px-2 py-2 text-center align-middle">
                            0점
                          </td>
                        </tr>
                      ))
                    )}
                    {/* 합계 행 */}
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-400 px-4 py-3 text-center">합계</td>
                      <td className="border border-gray-400 px-4 py-3"></td>
                      <td className="border border-gray-400 px-2 py-3 text-center"></td>
                      <td className="border border-gray-400 px-2 py-3 text-center">
                        {currentTemplate.sections.reduce((sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + item.points, 0), 0)}점
                      </td>
                      <td className="border border-gray-400 px-2 py-3 text-center">
                        <span className="text-lg font-bold">{calculateTotalScore()}점</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          // 관리 모드 (기존 템플릿 탭 기능)
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
                      {isEditing ? (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          편집 완료
                        </>
                      ) : (
                        <>
                          <Edit3 className="h-4 w-4 mr-2" />
                          편집
                        </>
                      )}
                    </Button>
                    <Button onClick={saveTemplate} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      JSON 저장
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

                {/* 템플릿 편집 영역 */}
                <div className="space-y-4">
                  {isEditing && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">제목</label>
                      <Input
                        value={currentTemplate.title}
                        onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                        className="text-lg font-bold"
                      />
                    </div>
                  )}

                  {currentTemplate.sections.map((section) => (
                    <div key={section.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-center mb-3">
                        {isEditing ? (
                          <div className="flex gap-2 flex-1">
                            <Input
                              value={section.title}
                              onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                              className="font-semibold"
                            />
                            <Input
                              value={section.subtitle}
                              onChange={(e) => updateSection(section.id, 'subtitle', e.target.value)}
                              className="w-32"
                            />
                          </div>
                        ) : (
                          <h3 className="text-lg font-semibold">
                            {section.title} {section.subtitle}
                          </h3>
                        )}
                        {isEditing && (
                          <div className="flex gap-1">
                            <Button onClick={() => addItem(section.id)} size="sm" variant="outline">
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button onClick={() => deleteSection(section.id)} size="sm" variant="outline">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {section.items.map((item) => (
                          <div key={item.id} className="flex gap-2 items-center p-2 border rounded">
                            {isEditing ? (
                              <>
                                <Input
                                  value={item.text}
                                  onChange={(e) => updateItem(section.id, item.id, 'text', e.target.value)}
                                  className="flex-1"
                                />
                                <select
                                  value={item.type}
                                  onChange={(e) => updateItem(section.id, item.id, 'type', e.target.value)}
                                  className="border rounded px-2 py-1"
                                >
                                  <option value="정량">정량</option>
                                  <option value="정성">정성</option>
                                </select>
                                <Input
                                  type="number"
                                  value={item.points}
                                  onChange={(e) => updateItem(section.id, item.id, 'points', parseInt(e.target.value) || 0)}
                                  className="w-20"
                                />
                                <Input
                                  type="number"
                                  value={item.score}
                                  onChange={(e) => updateItem(section.id, item.id, 'score', parseInt(e.target.value) || 0)}
                                  className="w-20"
                                />
                                <Button onClick={() => deleteItem(section.id, item.id)} size="sm" variant="outline">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1">{item.text}</span>
                                <span className="w-16 text-center">{item.type}</span>
                                <span className="w-16 text-center">{item.points}점</span>
                                <span className="w-20 text-center">{item.score}점</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}