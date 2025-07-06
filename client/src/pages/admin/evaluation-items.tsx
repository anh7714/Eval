import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Download, Upload, FileText, Save, X } from 'lucide-react';

interface TemplateSection {
  id: string;
  title: string;
  items: TemplateItem[];
}

interface TemplateItem {
  id: string;
  text: string;
  type: string;
  points: number;
  score: number;
}

interface EvaluationTemplate {
  title: string;
  sections: TemplateSection[];
}

const EvaluationItemsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'template' | 'management'>('template');
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<EvaluationTemplate>({
    title: '제공기관 선정 심사표',
    sections: [
      {
        id: '1',
        title: 'A. 기관운영능력',
        items: [
          { id: '1-1', text: '돌봄SOS 서비스 운영 체계와 관련 방안', type: '정량', points: 20, score: 0 },
          { id: '1-2', text: '실무 담당자 역량 확보', type: '정량', points: 5, score: 0 },
          { id: '1-3', text: '기관 운영 역량', type: '정량', points: 5, score: 0 },
          { id: '1-4', text: '조직구성', type: '정량', points: 5, score: 0 }
        ]
      }
    ]
  });

  // 데이터 로딩
  const { data: categoriesData = [] } = useQuery({
    queryKey: ['/api/admin/categories'],
    enabled: viewMode === 'management'
  });

  const { data: itemsData = [] } = useQuery({
    queryKey: ['/api/admin/evaluation-items'],
    enabled: viewMode === 'management'
  });

  // 템플릿 내보내기 함수
  const exportTemplate = async () => {
    try {
      const response = await fetch('/api/admin/export-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template: currentTemplate }),
      });

      if (!response.ok) throw new Error('템플릿 내보내기 실패');

      const result = await response.json();
      
      toast({
        title: '템플릿 내보내기 성공',
        description: '평가항목이 성공적으로 생성되었습니다.',
      });

      // 평가항목 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evaluation-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });

    } catch (error) {
      toast({
        title: '템플릿 내보내기 실패',
        description: '템플릿 내보내기 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 템플릿 수정 함수들
  const updateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const updateItem = (sectionId: string, itemId: string, updates: Partial<TemplateItem>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              )
            }
          : section
      )
    }));
  };

  const addItem = (sectionId: string) => {
    const newItem: TemplateItem = {
      id: Date.now().toString(),
      text: '새 항목',
      type: '정량',
      points: 5,
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

  const deleteItem = (sectionId: string, itemId: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: section.items.filter(item => item.id !== itemId) }
          : section
      )
    }));
  };

  const calculateTotalPoints = () => {
    return currentTemplate.sections.reduce((total, section) => 
      total + section.items.reduce((sectionTotal, item) => sectionTotal + item.points, 0), 0
    );
  };

  const calculateTotalScore = () => {
    return currentTemplate.sections.reduce((total, section) => 
      total + section.items.reduce((sectionTotal, item) => sectionTotal + item.score, 0), 0
    );
  };

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
              관리모드
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
              <div className="text-center space-y-2">
                <div className="text-lg font-semibold">기관명(성명): _______________</div>
                <div className="text-lg font-semibold">소속(부서): _______________</div>
                <div className="text-lg font-semibold">직책(직급): _______________</div>
              </div>
              <div className="flex justify-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? '수정완료' : '수정'}
                </Button>
                <Button variant="outline" size="sm" onClick={exportTemplate}>
                  <Upload className="h-4 w-4 mr-2" />
                  평가항목으로 내보내기
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-4 py-2 text-center">구분</th>
                      <th className="border border-gray-400 px-4 py-2 text-center">세부 항목</th>
                      <th className="border border-gray-400 px-4 py-2 text-center">유형</th>
                      <th className="border border-gray-400 px-4 py-2 text-center">배점</th>
                      <th className="border border-gray-400 px-4 py-2 text-center">평가점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTemplate.sections.map((section) => (
                      <React.Fragment key={section.id}>
                        {section.items.map((item, itemIndex) => (
                          <tr key={item.id}>
                            {itemIndex === 0 && (
                              <td 
                                className="border border-gray-400 px-4 py-3 text-center font-medium bg-gray-50"
                                rowSpan={section.items.length}
                              >
                                {isEditing ? (
                                  <Input
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                    className="text-center"
                                  />
                                ) : (
                                  section.title
                                )}
                              </td>
                            )}
                            <td className="border border-gray-400 px-4 py-3">
                              {isEditing ? (
                                <div className="flex items-center space-x-2">
                                  <Input
                                    value={item.text}
                                    onChange={(e) => updateItem(section.id, item.id, { text: e.target.value })}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteItem(section.id, item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                item.text
                              )}
                            </td>
                            <td className="border border-gray-400 px-2 py-3 text-center">
                              {isEditing ? (
                                <select
                                  value={item.type}
                                  onChange={(e) => updateItem(section.id, item.id, { type: e.target.value })}
                                  className="w-full p-1 border rounded"
                                >
                                  <option value="정량">정량</option>
                                  <option value="정성">정성</option>
                                </select>
                              ) : (
                                item.type
                              )}
                            </td>
                            <td className="border border-gray-400 px-2 py-3 text-center">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={item.points}
                                  onChange={(e) => updateItem(section.id, item.id, { points: parseInt(e.target.value) || 0 })}
                                  className="text-center"
                                />
                              ) : (
                                `${item.points}점`
                              )}
                            </td>
                            <td className="border border-gray-400 px-2 py-3 text-center">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={item.score}
                                  onChange={(e) => updateItem(section.id, item.id, { score: parseInt(e.target.value) || 0 })}
                                  className="text-center"
                                />
                              ) : (
                                `${item.score}점`
                              )}
                            </td>
                          </tr>
                        ))}
                        {isEditing && (
                          <tr>
                            <td className="border border-gray-400 px-4 py-2 text-center" colSpan={5}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addItem(section.id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                항목 추가
                              </Button>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    <tr className="bg-gray-100 font-bold">
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
          // 관리 모드 - 평가표 템플릿 편집 기능 직접 표시
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold">
                평가표 템플릿
              </CardTitle>
              <div className="text-center space-y-2">
                <Input
                  value={currentTemplate.title}
                  onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                  className="text-center text-xl font-bold"
                  placeholder="템플릿 제목"
                />
              </div>
              <div className="flex justify-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? '수정완료' : '수정'}
                </Button>
                <Button variant="outline" size="sm" onClick={exportTemplate}>
                  <Upload className="h-4 w-4 mr-2" />
                  평가항목으로 내보내기
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-4 py-2 text-center">구분</th>
                      <th className="border border-gray-400 px-4 py-2 text-center">세부 항목</th>
                      <th className="border border-gray-400 px-4 py-2 text-center">유형</th>
                      <th className="border border-gray-400 px-4 py-2 text-center">배점</th>
                      <th className="border border-gray-400 px-4 py-2 text-center">평가점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTemplate.sections.map((section) => (
                      <React.Fragment key={section.id}>
                        {section.items.map((item, itemIndex) => (
                          <tr key={item.id}>
                            {itemIndex === 0 && (
                              <td 
                                className="border border-gray-400 px-4 py-3 text-center font-medium bg-gray-50"
                                rowSpan={section.items.length}
                              >
                                <Input
                                  value={section.title}
                                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                  className="text-center"
                                />
                              </td>
                            )}
                            <td className="border border-gray-400 px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <Input
                                  value={item.text}
                                  onChange={(e) => updateItem(section.id, item.id, { text: e.target.value })}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteItem(section.id, item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="border border-gray-400 px-2 py-3 text-center">
                              <select
                                value={item.type}
                                onChange={(e) => updateItem(section.id, item.id, { type: e.target.value })}
                                className="w-full p-1 border rounded"
                              >
                                <option value="정량">정량</option>
                                <option value="정성">정성</option>
                              </select>
                            </td>
                            <td className="border border-gray-400 px-2 py-3 text-center">
                              <Input
                                type="number"
                                value={item.points}
                                onChange={(e) => updateItem(section.id, item.id, { points: parseInt(e.target.value) || 0 })}
                                className="text-center"
                              />
                            </td>
                            <td className="border border-gray-400 px-2 py-3 text-center">
                              <Input
                                type="number"
                                value={item.score}
                                onChange={(e) => updateItem(section.id, item.id, { score: parseInt(e.target.value) || 0 })}
                                className="text-center"
                              />
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td className="border border-gray-400 px-4 py-2 text-center" colSpan={5}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addItem(section.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              항목 추가
                            </Button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-400 px-4 py-3 text-center" colSpan={3}>총계</td>
                      <td className="border border-gray-400 px-2 py-3 text-center">{calculateTotalPoints()}점</td>
                      <td className="border border-gray-400 px-2 py-3 text-center">{calculateTotalScore()}점</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EvaluationItemsPage;