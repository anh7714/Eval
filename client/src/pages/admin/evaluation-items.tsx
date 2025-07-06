import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload, Plus, Edit3, Save, X, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TemplateItem {
  id: number;
  text: string;
  type: string;
  points: number;
  score: number;
}

interface TemplateSection {
  categoryCode: string;
  categoryName: string;
  items: TemplateItem[];
  totalPoints: number;
}

// 기본 템플릿 데이터
const defaultTemplate = {
  title: "재공기관 선정 심의위 평가표",
  sections: [
    {
      categoryCode: "A",
      categoryName: "기관수행",
      items: [
        { id: 1, text: "1. 돌봄SOS 사업 운영 계획의 공정", type: "정량", points: 20, score: 0 },
        { id: 2, text: "2. 설비 및 운영 계획 확보 상태", type: "정량", points: 5, score: 0 },
        { id: 3, text: "3. 기관 운영 기간", type: "정량", points: 5, score: 0 },
        { id: 4, text: "4. 조직규모", type: "정량", points: 5, score: 0 }
      ]
    },
    {
      categoryCode: "B",
      categoryName: "인력운영",
      items: [
        { id: 5, text: "1. 시설 운영 총책임자 및 담당자의 전문성", type: "정성", points: 5, score: 0 },
        { id: 6, text: "2. 활동지원 담당자 자격", type: "정성", points: 5, score: 0 },
        { id: 7, text: "3. SOS서비스 수행 인력의 전문성", type: "정량", points: 10, score: 0 }
      ]
    },
    {
      categoryCode: "C",
      categoryName: "안전관리",
      items: [
        { id: 8, text: "1. 배상책임보험", type: "정성", points: 5, score: 0 },
        { id: 9, text: "2. 사고예방 및 가이드라인", type: "정성", points: 5, score: 0 }
      ]
    },
    {
      categoryCode: "D",
      categoryName: "품질관리",
      items: [
        { id: 10, text: "1. 서비스 품질 향상 계획", type: "정성", points: 5, score: 0 }
      ]
    },
    {
      categoryCode: "E",
      categoryName: "실적평가",
      items: [
        { id: 11, text: "1. 연간 실적 평가 결과", type: "정량", points: 20, score: 0 },
        { id: 12, text: "2. 기관 운영 성과", type: "정량", points: 5, score: 0 }
      ]
    }
  ]
};

export default function EvaluationItemManagement() {
  const queryClient = useQueryClient();
  const [currentTemplate, setCurrentTemplate] = useState(defaultTemplate);
  const [templateData, setTemplateData] = useState<TemplateSection[]>([]);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{sectionIndex: number, itemIndex: number} | null>(null);
  const [newSection, setNewSection] = useState({
    categoryCode: '',
    categoryName: '',
    items: []
  });
  const [newItem, setNewItem] = useState({
    text: '',
    type: '정량',
    points: 0
  });

  // 템플릿 내보내기 뮤테이션
  const exportTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateSection[]) => {
      // 카테고리부터 생성
      for (const section of templateData) {
        const categoryData = {
          categoryCode: section.categoryCode,
          categoryName: section.categoryName,
          description: `${section.categoryName} 관련 평가 항목들`,
          sortOrder: templateData.indexOf(section),
          isActive: true
        };

        const category = await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify(categoryData)
        });

        // 각 카테고리의 평가항목들 생성
        for (const item of section.items) {
          const itemData = {
            categoryId: category.id,
            itemCode: item.id.toString(),
            itemName: item.text,
            itemType: item.type,
            points: item.points,
            sortOrder: section.items.indexOf(item),
            isActive: true
          };

          await apiRequest('/api/evaluation-items', {
            method: 'POST',
            body: JSON.stringify(itemData)
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evaluation-items'] });
      toast({ title: "템플릿이 평가항목으로 내보내졌습니다!" });
    },
    onError: (error) => {
      console.error('Export error:', error);
      toast({ title: "내보내기 중 오류가 발생했습니다.", variant: "destructive" });
    }
  });

  // 컴포넌트 초기화
  useEffect(() => {
    const sections = defaultTemplate.sections.map(section => ({
      ...section,
      totalPoints: section.items.reduce((sum, item) => sum + item.points, 0)
    }));
    setTemplateData(sections);
  }, []);

  // 점수 변경 핸들러
  const handleScoreChange = (sectionIndex: number, itemIndex: number, score: number) => {
    const newTemplateData = [...templateData];
    newTemplateData[sectionIndex].items[itemIndex].score = score;
    setTemplateData(newTemplateData);
  };

  // 템플릿 제목 변경
  const handleTitleChange = (newTitle: string) => {
    setCurrentTemplate({...currentTemplate, title: newTitle});
  };

  // 섹션 추가
  const handleAddSection = () => {
    if (!newSection.categoryCode || !newSection.categoryName) {
      toast({ title: "카테고리 코드와 이름을 입력해주세요.", variant: "destructive" });
      return;
    }

    const newSectionData = {
      ...newSection,
      items: [],
      totalPoints: 0
    };

    setTemplateData([...templateData, newSectionData]);
    setNewSection({ categoryCode: '', categoryName: '', items: [] });
    setEditingSection(null);
  };

  // 항목 추가
  const handleAddItem = (sectionIndex: number) => {
    if (!newItem.text || newItem.points <= 0) {
      toast({ title: "항목명과 배점을 올바르게 입력해주세요.", variant: "destructive" });
      return;
    }

    const newTemplateData = [...templateData];
    const newItemData = {
      ...newItem,
      id: Date.now(), // 임시 ID
      score: 0
    };

    newTemplateData[sectionIndex].items.push(newItemData);
    newTemplateData[sectionIndex].totalPoints += newItem.points;
    
    setTemplateData(newTemplateData);
    setNewItem({ text: '', type: '정량', points: 0 });
    setEditingItem(null);
  };

  // 항목 삭제
  const handleDeleteItem = (sectionIndex: number, itemIndex: number) => {
    const newTemplateData = [...templateData];
    const removedItem = newTemplateData[sectionIndex].items[itemIndex];
    
    newTemplateData[sectionIndex].items.splice(itemIndex, 1);
    newTemplateData[sectionIndex].totalPoints -= removedItem.points;
    
    setTemplateData(newTemplateData);
  };

  // 섹션 삭제
  const handleDeleteSection = (sectionIndex: number) => {
    const newTemplateData = [...templateData];
    newTemplateData.splice(sectionIndex, 1);
    setTemplateData(newTemplateData);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">평가표 템플릿</h1>
          <p className="text-lg text-gray-600">평가표 템플릿을 편집하고 평가항목으로 내보낼 수 있습니다.</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const dataStr = JSON.stringify(templateData, null, 2);
              const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
              const linkElement = document.createElement('a');
              linkElement.setAttribute('href', dataUri);
              linkElement.setAttribute('download', 'evaluation_template.json');
              linkElement.click();
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            JSON 다운로드
          </Button>
          <Button 
            onClick={() => exportTemplateMutation.mutate(templateData)}
            disabled={exportTemplateMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            평가항목으로 내보내기
          </Button>
        </div>
      </div>

      {/* 템플릿 제목 편집 */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Label htmlFor="templateTitle" className="text-lg font-semibold">템플릿 제목:</Label>
            <Input
              id="templateTitle"
              value={currentTemplate.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="flex-1 text-lg font-bold"
            />
          </div>
        </CardHeader>
      </Card>

      {/* 평가표 템플릿 편집 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            {currentTemplate.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-center" style={{ width: '12%' }}>
                    구분 (배점)
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center" style={{ width: '48%' }}>
                    세부 항목
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center" style={{ width: '10%' }}>
                    유형
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center" style={{ width: '10%' }}>
                    배점
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center" style={{ width: '15%' }}>
                    평가점수
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center" style={{ width: '5%' }}>
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {templateData.map((section, sectionIndex) => (
                  <React.Fragment key={sectionIndex}>
                    {section.items.map((item, itemIndex) => (
                      <tr key={`${sectionIndex}-${itemIndex}`} className="hover:bg-gray-50">
                        {itemIndex === 0 && (
                          <td 
                            className="border border-gray-300 px-4 py-2 text-center font-medium bg-blue-50 align-middle relative"
                            rowSpan={section.items.length + 1}
                          >
                            {section.categoryCode}. {section.categoryName}
                            <br />
                            <span className="text-sm text-gray-600">({section.totalPoints}점)</span>
                            <div className="absolute top-1 right-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSection(sectionIndex)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        )}
                        <td className="border border-gray-300 px-4 py-2">
                          {item.text}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {item.type}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {item.points}점
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.points}
                            value={item.score}
                            onChange={(e) => handleScoreChange(sectionIndex, itemIndex, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(sectionIndex, itemIndex)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {/* 항목 추가 행 */}
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2" colSpan={4}>
                        {editingItem?.sectionIndex === sectionIndex ? (
                          <div className="flex space-x-2 items-center">
                            <Input
                              value={newItem.text}
                              onChange={(e) => setNewItem({...newItem, text: e.target.value})}
                              placeholder="항목명"
                              className="flex-1"
                            />
                            <Select value={newItem.type} onValueChange={(value) => setNewItem({...newItem, type: value})}>
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="정량">정량</SelectItem>
                                <SelectItem value="정성">정성</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={newItem.points}
                              onChange={(e) => setNewItem({...newItem, points: parseInt(e.target.value) || 0})}
                              placeholder="배점"
                              className="w-20"
                            />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingItem({sectionIndex, itemIndex: -1})}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            항목 추가
                          </Button>
                        )}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center" colSpan={2}>
                        {editingItem?.sectionIndex === sectionIndex && (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              onClick={() => handleAddItem(sectionIndex)}
                              className="h-6 px-2 text-xs"
                            >
                              저장
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingItem(null)}
                              className="h-6 px-2 text-xs"
                            >
                              취소
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                
                {/* 섹션 추가 행 */}
                {editingSection !== null ? (
                  <tr className="bg-yellow-50">
                    <td className="border border-gray-300 px-4 py-2" colSpan={6}>
                      <div className="flex space-x-4 items-center">
                        <div className="flex space-x-2 flex-1">
                          <Input
                            value={newSection.categoryCode}
                            onChange={(e) => setNewSection({...newSection, categoryCode: e.target.value})}
                            placeholder="코드 (A, B, C...)"
                            className="w-32"
                          />
                          <Input
                            value={newSection.categoryName}
                            onChange={(e) => setNewSection({...newSection, categoryName: e.target.value})}
                            placeholder="카테고리명"
                            className="flex-1"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={handleAddSection}>
                            <Save className="h-4 w-4 mr-2" />
                            저장
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingSection(null)}>
                            <X className="h-4 w-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-center" colSpan={6}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSection(0)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        새 카테고리 추가
                      </Button>
                    </td>
                  </tr>
                )}

                {/* 합계 행 */}
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-gray-300 px-4 py-2 text-center" colSpan={3}>
                    합계
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {templateData.reduce((sum, section) => sum + section.totalPoints, 0)}점
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {templateData.reduce((sum, section) => 
                      sum + section.items.reduce((itemSum, item) => itemSum + item.score, 0), 0
                    )}점
                  </td>
                  <td className="border border-gray-300 px-4 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}