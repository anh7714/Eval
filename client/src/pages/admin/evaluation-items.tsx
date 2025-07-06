import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Upload, Plus, Edit3, Save, X, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EvaluationItem {
  id: number;
  categoryId: number;
  itemCode: string;
  itemName: string;
  itemType: string;
  points: number;
  isActive: boolean;
  sortOrder: number;
  categoryName: string;
}

interface EvaluationCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

interface TemplateItem {
  id: number;
  text: string;
  type: string;
  points: number;
  score: number;
}

interface TemplateSection {
  categoryName: string;
  items: TemplateItem[];
  totalPoints: number;
}

export default function EvaluationItemManagement() {
  const queryClient = useQueryClient();
  const [templateData, setTemplateData] = useState<TemplateSection[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EvaluationCategory | null>(null);
  const [editingItem, setEditingItem] = useState<EvaluationItem | null>(null);
  const [newCategory, setNewCategory] = useState({
    categoryCode: '',
    categoryName: '',
    description: ''
  });
  const [newItem, setNewItem] = useState({
    categoryId: '',
    itemCode: '',
    itemName: '',
    itemType: '정량',
    points: 0
  });

  // 템플릿 제목 설정
  const currentTemplate = {
    title: "재공기관 선정 심의위 평가표"
  };

  // 데이터 조회
  const { data: categories = [] } = useQuery<EvaluationCategory[]>({
    queryKey: ['/api/admin/categories'],
  });

  const { data: items = [] } = useQuery<EvaluationItem[]>({
    queryKey: ['/api/admin/evaluation-items'],
  });

  // 카테고리 추가 뮤테이션
  const addCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      setIsAddingCategory(false);
      setNewCategory({ categoryCode: '', categoryName: '', description: '' });
      toast({ title: "카테고리가 추가되었습니다." });
    }
  });

  // 평가항목 추가 뮤테이션
  const addItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/evaluation-items', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evaluation-items'] });
      setIsAddingItem(false);
      setNewItem({ categoryId: '', itemCode: '', itemName: '', itemType: '정량', points: 0 });
      toast({ title: "평가항목이 추가되었습니다." });
    }
  });

  // 카테고리 삭제 뮤테이션
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/categories/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evaluation-items'] });
      toast({ title: "카테고리가 삭제되었습니다." });
    }
  });

  // 평가항목 삭제 뮤테이션
  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/evaluation-items/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evaluation-items'] });
      toast({ title: "평가항목이 삭제되었습니다." });
    }
  });

  // 데이터베이스 데이터를 템플릿 형태로 변환
  useEffect(() => {
    if (categories && items) {
      const categoryMap = new Map();
      
      categories.forEach(category => {
        if (!categoryMap.has(category.id)) {
          categoryMap.set(category.id, {
            categoryName: category.categoryName,
            items: [],
            totalPoints: 0
          });
        }
      });

      items.forEach(item => {
        if (categoryMap.has(item.categoryId)) {
          const section = categoryMap.get(item.categoryId);
          section.items.push({
            id: item.id,
            text: item.itemName,
            type: item.itemType,
            points: item.points,
            score: 0
          });
          section.totalPoints += item.points;
        }
      });

      const templateSections = Array.from(categoryMap.values()).filter(section => section.items.length > 0);
      setTemplateData(templateSections);
    }
  }, [categories, items]);

  // 점수 변경 핸들러
  const handleScoreChange = (sectionIndex: number, itemIndex: number, score: number) => {
    const newTemplateData = [...templateData];
    newTemplateData[sectionIndex].items[itemIndex].score = score;
    setTemplateData(newTemplateData);
  };

  // 카테고리 추가 핸들러
  const handleAddCategory = () => {
    if (!newCategory.categoryCode || !newCategory.categoryName) {
      toast({ title: "카테고리 코드와 이름을 입력해주세요.", variant: "destructive" });
      return;
    }

    addCategoryMutation.mutate({
      categoryCode: newCategory.categoryCode,
      categoryName: newCategory.categoryName,
      description: newCategory.description,
      sortOrder: categories.length,
      isActive: true
    });
  };

  // 평가항목 추가 핸들러
  const handleAddItem = () => {
    if (!newItem.categoryId || !newItem.itemName || !newItem.itemCode) {
      toast({ title: "모든 필드를 입력해주세요.", variant: "destructive" });
      return;
    }

    addItemMutation.mutate({
      categoryId: parseInt(newItem.categoryId),
      itemCode: newItem.itemCode,
      itemName: newItem.itemName,
      itemType: newItem.itemType,
      points: newItem.points,
      sortOrder: items.filter(item => item.categoryId === parseInt(newItem.categoryId)).length,
      isActive: true
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">평가항목 관리</h1>
          <p className="text-lg text-gray-600">평가표 템플릿과 관련된 모든 기능을 관리할 수 있습니다.</p>
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
            템플릿 다운로드
          </Button>
        </div>
      </div>

      {/* 평가표 템플릿 미리보기 */}
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
                  <th className="border border-gray-300 px-4 py-2 text-center" style={{ width: '20%' }}>
                    평가점수
                  </th>
                </tr>
              </thead>
              <tbody>
                {templateData.map((section, sectionIndex) => (
                  section.items.map((item, itemIndex) => (
                    <tr key={`${sectionIndex}-${itemIndex}`} className="hover:bg-gray-50">
                      {itemIndex === 0 && (
                        <td 
                          className="border border-gray-300 px-4 py-2 text-center font-medium bg-blue-50 align-middle"
                          rowSpan={section.items.length}
                        >
                          {section.categoryName}
                          <br />
                          <span className="text-sm text-gray-600">({section.totalPoints}점)</span>
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
                    </tr>
                  ))
                ))}
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
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 카테고리 관리 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>평가 카테고리 관리</CardTitle>
            <Button onClick={() => setIsAddingCategory(true)}>
              <Plus className="h-4 w-4 mr-2" />
              카테고리 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 카테고리 추가 폼 */}
            {isAddingCategory && (
              <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="categoryCode">카테고리 코드</Label>
                      <Input
                        id="categoryCode"
                        value={newCategory.categoryCode}
                        onChange={(e) => setNewCategory({...newCategory, categoryCode: e.target.value})}
                        placeholder="A, B, C..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="categoryName">카테고리 이름</Label>
                      <Input
                        id="categoryName"
                        value={newCategory.categoryName}
                        onChange={(e) => setNewCategory({...newCategory, categoryName: e.target.value})}
                        placeholder="예: 기관수행"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">설명</Label>
                      <Input
                        id="description"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                        placeholder="카테고리 설명"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button onClick={handleAddCategory} disabled={addCategoryMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingCategory(false)}>
                      <X className="h-4 w-4 mr-2" />
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 카테고리 목록 */}
            <div className="grid gap-4">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {category.categoryCode}. {category.categoryName}
                    </div>
                    <div className="text-sm text-gray-600">{category.description}</div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                      disabled={deleteCategoryMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 평가항목 관리 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>평가 항목 관리</CardTitle>
            <Button onClick={() => setIsAddingItem(true)}>
              <Plus className="h-4 w-4 mr-2" />
              평가항목 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 평가항목 추가 폼 */}
            {isAddingItem && (
              <Card className="border-2 border-dashed border-green-300 bg-green-50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="itemCategory">카테고리</Label>
                      <Select value={newItem.categoryId} onValueChange={(value) => setNewItem({...newItem, categoryId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="카테고리 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.categoryCode}. {category.categoryName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="itemCode">항목 코드</Label>
                      <Input
                        id="itemCode"
                        value={newItem.itemCode}
                        onChange={(e) => setNewItem({...newItem, itemCode: e.target.value})}
                        placeholder="1, 2, 3..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="itemName">항목 이름</Label>
                      <Input
                        id="itemName"
                        value={newItem.itemName}
                        onChange={(e) => setNewItem({...newItem, itemName: e.target.value})}
                        placeholder="평가 항목명"
                      />
                    </div>
                    <div>
                      <Label htmlFor="itemType">평가 유형</Label>
                      <Select value={newItem.itemType} onValueChange={(value) => setNewItem({...newItem, itemType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="정량">정량</SelectItem>
                          <SelectItem value="정성">정성</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="points">배점</Label>
                      <Input
                        id="points"
                        type="number"
                        value={newItem.points}
                        onChange={(e) => setNewItem({...newItem, points: parseInt(e.target.value) || 0})}
                        placeholder="점수"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button onClick={handleAddItem} disabled={addItemMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingItem(false)}>
                      <X className="h-4 w-4 mr-2" />
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 평가항목 목록 */}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.itemCode}. {item.itemName}
                    </div>
                    <div className="text-sm text-gray-600">
                      카테고리: {item.categoryName} | 유형: {item.itemType} | 배점: {item.points}점
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                      disabled={deleteItemMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}