import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
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
  const [templateData, setTemplateData] = useState<TemplateSection[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState(defaultTemplate);

  // 데이터베이스에서 평가항목 조회
  const { data: categories = [] } = useQuery<EvaluationCategory[]>({
    queryKey: ['/api/admin/categories'],
  });

  const { data: items = [] } = useQuery<EvaluationItem[]>({
    queryKey: ['/api/admin/evaluation-items'],
  });

  // 템플릿 내보내기 뮤테이션
  const exportTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateSection[]) => {
      // 카테고리부터 생성
      for (const section of templateData) {
        const categoryData = {
          categoryCode: section.categoryName.split('.')[0],
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

  // 데이터베이스 데이터를 템플릿 형태로 변환
  useEffect(() => {
    if (categories && items && categories.length > 0 && items.length > 0) {
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
      
      if (templateSections.length > 0) {
        setTemplateData(templateSections);
      } else {
        // 데이터베이스에 데이터가 없으면 기본 템플릿 사용
        const defaultSections = defaultTemplate.sections.map(section => ({
          categoryName: section.categoryName,
          items: section.items.map(item => ({ ...item })),
          totalPoints: section.items.reduce((sum, item) => sum + item.points, 0)
        }));
        setTemplateData(defaultSections);
      }
    } else {
      // 데이터가 로딩중이거나 없을 때는 기본 템플릿 사용
      const defaultSections = defaultTemplate.sections.map(section => ({
        categoryName: section.categoryName,
        items: section.items.map(item => ({ ...item })),
        totalPoints: section.items.reduce((sum, item) => sum + item.points, 0)
      }));
      setTemplateData(defaultSections);
    }
  }, [categories, items]);

  // 점수 변경 핸들러
  const handleScoreChange = (sectionIndex: number, itemIndex: number, score: number) => {
    const newTemplateData = [...templateData];
    newTemplateData[sectionIndex].items[itemIndex].score = score;
    setTemplateData(newTemplateData);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">평가항목 관리</h1>
            <p className="text-lg text-gray-600">평가 카테고리와 항목을 관리할 수 있습니다.</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const dataStr = JSON.stringify(templateData, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = 'evaluation_template.json';
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
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

        {/* 템플릿 뷰 (심사표 형태로 표시) - 바로 표시 */}
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
                            style={{ verticalAlign: 'middle' }}
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
      </div>
    </div>
  );
}