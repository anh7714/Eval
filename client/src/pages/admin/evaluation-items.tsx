import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EvaluationItemManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 편집 모드 상태
  const [isEditing, setIsEditing] = useState(false);

  // 컬럼 설정 관리
  const [columnConfig] = useState([
    { id: 'section', label: '구분', type: 'section', visible: true, required: true, width: 'w-32' },
    { id: 'item', label: '세부 항목', type: 'text', visible: true, required: true, width: 'flex-1' },
    { id: 'type', label: '유형', type: 'select', visible: true, required: false, width: 'w-16', options: ['정량', '정성'] },
    { id: 'points', label: '배점', type: 'number', visible: true, required: true, width: 'w-16' },
    { id: 'score', label: '평가점수', type: 'number', visible: true, required: true, width: 'w-20' },
  ]);

  // 평가표 템플릿 상태
  const [currentTemplate, setCurrentTemplate] = useState({
    title: "제공기관 선정 심의회 평가표",
    totalScore: 100,
    sections: [
      {
        id: 1,
        title: "사업계획의 적정성",
        items: [
          { id: 1, text: "사업목표의 명확성", type: "정량", points: 10, score: 0 },
          { id: 2, text: "사업내용의 구체성", type: "정량", points: 10, score: 0 },
          { id: 3, text: "추진일정의 현실성", type: "정량", points: 10, score: 0 }
        ]
      },
      {
        id: 2,
        title: "예산계획의 타당성",
        items: [
          { id: 4, text: "예산편성의 적정성", type: "정량", points: 15, score: 0 },
          { id: 5, text: "비용대비 효과성", type: "정성", points: 15, score: 0 }
        ]
      },
      {
        id: 3,
        title: "추진역량 및 전문성",
        items: [
          { id: 6, text: "조직의 전문성", type: "정량", points: 20, score: 0 },
          { id: 7, text: "담당자의 역량", type: "정성", points: 20, score: 0 }
        ]
      }
    ]
  });

  // 템플릿 편집 함수들
  const updateSection = (sectionId: number, field: string, value: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, [field]: value } : section
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

  const updateScore = (sectionId: number, itemId: number, score: number) => {
    updateItem(sectionId, itemId, 'score', score);
  };

  const addSection = () => {
    const newSectionId = Math.max(...currentTemplate.sections.map(s => s.id)) + 1;
    setCurrentTemplate(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: newSectionId,
          title: `새 평가영역 ${newSectionId}`,
          items: [
            { id: Date.now(), text: "새 평가항목", type: "정량", points: 10, score: 0 }
          ]
        }
      ]
    }));
  };

  const deleteSection = (sectionId: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const addItem = (sectionId: number) => {
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

  const deleteItem = (sectionId: number, itemId: number) => {
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
    return section.items.reduce((sum: number, item: any) => sum + item.points, 0);
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

  // Supabase 저장 뮤테이션
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
              categoryCode: `CAT${section.id}`,
              categoryName: section.title,
              description: `평가영역: ${section.title}`,
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
                itemCode: `ITEM${item.id}`,
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

  const saveEvaluationSheet = () => {
    saveTemplateMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* 템플릿 편집 컨트롤 */}
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
            onClick={saveEvaluationSheet}
            disabled={saveTemplateMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {saveTemplateMutation.isPending ? "저장 중..." : "심사표 저장"}
          </Button>
        </div>
      </div>

      {/* 템플릿 표 */}
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
                      {column.label}
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
                                  value={item[column.id as keyof typeof item] || (column.type === 'number' ? 0 : '')}
                                  onChange={(e) => updateItem(section.id, item.id, column.id, column.type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value)}
                                  className="text-xs text-center w-12 mx-auto"
                                />
                              </div>
                            )
                          ) : (
                            <span className="text-xs">
                              {column.id === 'points' ? `${item[column.id as keyof typeof item]}점` : 
                               column.id === 'score' ? item[column.id as keyof typeof item] :
                               item[column.id as keyof typeof item]}
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
    </div>
  );
}