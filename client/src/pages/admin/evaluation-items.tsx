import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, Download, Eye, Edit, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
// import { supabase } from "@/lib/supabase";

// 타입 정의
interface EvaluationItem {
  id: number;
  categoryId: number;
  content: string;
  description?: string;
  maxScore: number;
  sortOrder: number;
  isActive: boolean;
  evaluationType: "quantitative" | "quantitative_preset" | "qualitative";
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface EvaluationTemplate {
  id: number;
  name: string;
  title: string;
  sections: Array<{
    title: string;
    items: Array<{
      content: string;
      maxScore: number;
      evaluationType: "quantitative" | "quantitative_preset" | "qualitative";
    }>;
  }>;
}

interface Evaluator {
  id: number;
  name: string;
  password: string;
  email?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
}

interface Candidate {
  id: number;
  name: string;
  department?: string;
  position?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function EvaluationItemsManagement() {
  const queryClient = useQueryClient();
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState<string>("view");
  const [editingItem, setEditingItem] = useState<EvaluationItem | null>(null);
  const [newItem, setNewItem] = useState({
    categoryId: 0,
    content: "",
    description: "",
    maxScore: 10,
    evaluationType: "quantitative" as "quantitative" | "quantitative_preset" | "qualitative"
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // 평가위원 및 평가대상 선택
  const [selectedEvaluator, setSelectedEvaluator] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [batchPrintMode, setBatchPrintMode] = useState(false);

  // 평가표 템플릿 상태
  const [currentTemplate, setCurrentTemplate] = useState({
    title: "제공기관 선정 심의회 평가표",
    sections: [
      {
        title: "기관수행",
        items: [
          { content: "돌봄SOS 사업 운영 계획서 검토", maxScore: 20, evaluationType: "quantitative" as const },
          { content: "사업 및 운영 역량 확인", maxScore: 5, evaluationType: "quantitative" as const },
          { content: "기관 운영 기간", maxScore: 5, evaluationType: "quantitative" as const },
          { content: "조직규모", maxScore: 5, evaluationType: "quantitative" as const }
        ]
      },
      {
        title: "안전운영",
        items: [
          { content: "사업 운영 출발점 및 당당자의 적절성", maxScore: 5, evaluationType: "quantitative" as const },
          { content: "직원연수 담당자 지정", maxScore: 5, evaluationType: "quantitative" as const }
        ]
      }
    ]
  });

  // 데이터 쿼리
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/admin/categories"],
    enabled: true
  });

  const { data: items = [] } = useQuery<EvaluationItem[]>({
    queryKey: ["/api/admin/evaluation-items"],
    enabled: true
  });

  const { data: evaluators = [] } = useQuery<Evaluator[]>({
    queryKey: ["/api/admin/evaluators"],
    enabled: true
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/admin/candidates"],
    enabled: true
  });

  const { data: template } = useQuery<EvaluationTemplate>({
    queryKey: ["/api/admin/templates/default"],
    enabled: true
  });

  // 실시간 구독 + 폴링 백업 시스템 (카테고리용)
  useEffect(() => {
    let categoriesChannel: any;
    let categoriesPollingInterval: NodeJS.Timeout;
    let isCategoriesRealtimeConnected = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupCategoriesSubscription = () => {
      console.log(`🔄 카테고리 실시간 구독 시도 ${retryCount + 1}/${maxRetries}`);
      
      // categoriesChannel = supabase
        .channel(`categories-${Date.now()}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'categories' 
          }, 
          (payload) => {
            console.log('📡 카테고리 실시간 변경:', payload.eventType);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
          }
        )
        .subscribe((status) => {
          console.log('📡 카테고리 구독 상태:', status);
          
          if (status === 'SUBSCRIBED') {
            isCategoriesRealtimeConnected = true;
            retryCount = 0;
            if (categoriesPollingInterval) {
              clearInterval(categoriesPollingInterval);
            }
            console.log('✅ 카테고리 실시간 구독 성공');
          } else if (status === 'CHANNEL_ERROR') {
            isCategoriesRealtimeConnected = false;
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(() => {
                console.log('🔄 카테고리 재연결 시도...');
                // supabase.removeChannel(categoriesChannel);
                setupCategoriesSubscription();
              }, 2000 * retryCount);
            } else {
              console.log('⚠️ 카테고리 실시간 연결 실패, 폴링으로 전환');
              startCategoriesPolling();
            }
          }
        });
    };

    const startCategoriesPolling = () => {
      if (!categoriesPollingInterval) {
        categoriesPollingInterval = setInterval(() => {
          if (!isCategoriesRealtimeConnected) {
            console.log('🔄 카테고리 폴링으로 데이터 동기화');
            queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
          }
        }, 8000);
      }
    };

    setupCategoriesSubscription();

    return () => {
      if (categoriesChannel) {
        supabase.removeChannel(categoriesChannel);
      }
      if (categoriesPollingInterval) {
        clearInterval(categoriesPollingInterval);
      }
    };
  }, [queryClient]);

  // 실시간 구독 + 폴링 백업 시스템 (평가항목용)
  useEffect(() => {
    let itemsChannel: any;
    let itemsPollingInterval: NodeJS.Timeout;
    let isItemsRealtimeConnected = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupItemsSubscription = () => {
      console.log(`🔄 평가항목 실시간 구독 시도 ${retryCount + 1}/${maxRetries}`);
      
      itemsChannel = supabase
        .channel(`evaluation-items-${Date.now()}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'evaluation_items' 
          }, 
          (payload) => {
            console.log('📡 평가항목 실시간 변경:', payload.eventType);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
          }
        )
        .subscribe((status) => {
          console.log('📡 평가항목 구독 상태:', status);
          
          if (status === 'SUBSCRIBED') {
            isItemsRealtimeConnected = true;
            retryCount = 0;
            if (itemsPollingInterval) {
              clearInterval(itemsPollingInterval);
            }
            console.log('✅ 평가항목 실시간 구독 성공');
          } else if (status === 'CHANNEL_ERROR') {
            isItemsRealtimeConnected = false;
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(() => {
                console.log('🔄 평가항목 재연결 시도...');
                supabase.removeChannel(itemsChannel);
                setupItemsSubscription();
              }, 2000 * retryCount);
            } else {
              console.log('⚠️ 평가항목 실시간 연결 실패, 폴링으로 전환');
              startItemsPolling();
            }
          }
        });
    };

    const startItemsPolling = () => {
      if (!itemsPollingInterval) {
        itemsPollingInterval = setInterval(() => {
          if (!isItemsRealtimeConnected) {
            console.log('🔄 평가항목 폴링으로 데이터 동기화');
            queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
          }
        }, 8000);
      }
    };

    setupItemsSubscription();

    return () => {
      if (itemsChannel) {
        supabase.removeChannel(itemsChannel);
      }
      if (itemsPollingInterval) {
        clearInterval(itemsPollingInterval);
      }
    };
  }, [queryClient]);

  // 평가항목 추가 뮤테이션
  const addItemMutation = useMutation({
    mutationFn: async (itemData: typeof newItem) => {
      const response = await fetch('/api/admin/evaluation-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(itemData)
      });
      if (!response.ok) throw new Error('Failed to add item');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "성공", description: "평가항목이 추가되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
      setShowAddDialog(false);
      setNewItem({ categoryId: 0, content: "", description: "", maxScore: 10, evaluationType: "quantitative" });
    },
    onError: () => {
      toast({ title: "오류", description: "평가항목 추가에 실패했습니다." });
    }
  });

  // 평가항목 수정 뮤테이션
  const updateItemMutation = useMutation({
    mutationFn: async (itemData: EvaluationItem) => {
      const response = await fetch(`/api/admin/evaluation-items/${itemData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(itemData)
      });
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "성공", description: "평가항목이 수정되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
      setEditingItem(null);
    },
    onError: () => {
      toast({ title: "오류", description: "평가항목 수정에 실패했습니다." });
    }
  });

  // 평가항목 삭제 뮤테이션
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/admin/evaluation-items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete item');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "성공", description: "평가항목이 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
    },
    onError: () => {
      toast({ title: "오류", description: "평가항목 삭제에 실패했습니다." });
    }
  });

  // 템플릿 내보내기 함수
  const exportTemplate = async () => {
    try {
      // 1. 시스템 설정의 평가 제목 업데이트
      try {
        const titleResponse = await fetch('/api/system/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            evaluationTitle: currentTemplate.title
          })
        });

        if (titleResponse.ok) {
          console.log('✅ 심사표 제목 저장 완료');
        } else {
          console.warn('⚠️ 심사표 제목 저장 실패, 계속 진행');
        }
      } catch (error) {
        console.warn('⚠️ 심사표 제목 저장 중 오류 발생:', error);
      }

      // 2. 새로운 카테고리들을 저장
      const savedCategories = [];
      for (let sectionIndex = 0; sectionIndex < currentTemplate.sections.length; sectionIndex++) {
        const section = currentTemplate.sections[sectionIndex];
        const categoryData = {
          name: section.title,
          type: 'evaluation',
          description: `${section.title} 관련 평가 카테고리`,
          isActive: true,
          sortOrder: sectionIndex + 1
        };

        const response = await fetch('/api/admin/evaluation-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(categoryData)
        });

        if (response.ok) {
          const savedCategory = await response.json();
          savedCategories.push(savedCategory);
          console.log(`✅ 카테고리 "${section.title}" 저장 완료`);
        } else {
          console.error(`❌ 카테고리 "${section.title}" 저장 실패`);
        }
      }

      // 3. 평가항목들을 저장
      let totalItemsCreated = 0;
      for (let sectionIndex = 0; sectionIndex < currentTemplate.sections.length; sectionIndex++) {
        const section = currentTemplate.sections[sectionIndex];
        const savedCategory = savedCategories[sectionIndex];

        if (savedCategory) {
          for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
            const item = section.items[itemIndex];
            const itemData = {
              categoryId: savedCategory.id,
              content: item.content,
              description: `${section.title} - ${item.content}`,
              maxScore: item.maxScore,
              evaluationType: item.evaluationType,
              isActive: true,
              sortOrder: itemIndex + 1
            };

            const response = await fetch('/api/admin/evaluation-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(itemData)
            });

            if (response.ok) {
              totalItemsCreated++;
              console.log(`✅ 평가항목 "${item.content}" 저장 완료`);
            } else {
              console.error(`❌ 평가항목 "${item.content}" 저장 실패`);
            }
          }
        }
      }

      // 4. 성공 메시지 및 화면 전환
      toast({
        title: "성공",
        description: `평가항목 ${totalItemsCreated}개가 성공적으로 내보내졌습니다.`
      });

      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });

      // 평가항목 탭으로 이동
      setActiveTab("view");

    } catch (error) {
      console.error('평가항목 내보내기 오류:', error);
      toast({
        title: "오류",
        description: "평가항목 내보내기에 실패했습니다."
      });
    }
  };

  // 템플릿 섹션 추가
  const addSection = () => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, { title: "새 섹션", items: [] }]
    }));
  };

  // 템플릿 항목 추가
  const addTemplateItem = (sectionIndex: number) => {
    setCurrentTemplate(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].items.push({
        content: "새 평가항목",
        maxScore: 10,
        evaluationType: "quantitative"
      });
      return { ...prev, sections: newSections };
    });
  };

  // 템플릿 섹션 삭제
  const removeSection = (sectionIndex: number) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter((_, index) => index !== sectionIndex)
    }));
  };

  // 템플릿 항목 삭제
  const removeTemplateItem = (sectionIndex: number, itemIndex: number) => {
    setCurrentTemplate(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].items = newSections[sectionIndex].items.filter((_, index) => index !== itemIndex);
      return { ...prev, sections: newSections };
    });
  };

  // 평가항목 유형 표시 함수
  const getEvaluationTypeLabel = (type: string) => {
    switch (type) {
      case "quantitative":
        return "정량";
      case "quantitative_preset":
        return "정량(사전)";
      case "qualitative":
        return "정성";
      default:
        return "정량";
    }
  };

  // 평가항목 유형 색상 함수
  const getEvaluationTypeColor = (type: string) => {
    switch (type) {
      case "quantitative":
        return "bg-blue-100 text-blue-800";
      case "quantitative_preset":
        return "bg-purple-100 text-purple-800";
      case "qualitative":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 심사표 보기 함수
  const renderEvaluationTable = () => {
    const groupedItems = categories.reduce((acc, category) => {
      const categoryItems = items.filter(item => item.categoryId === category.id);
      if (categoryItems.length > 0) {
        acc[category.name] = categoryItems;
      }
      return acc;
    }, {} as Record<string, EvaluationItem[]>);

    const totalMaxScore = items.reduce((sum, item) => sum + item.maxScore, 0);
    const totalItems = items.length;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">심사표 보기</h2>
            <p className="text-sm text-gray-600 mt-1">
              총 {totalItems}개 항목 (배점 합계: {totalMaxScore}점)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab("edit")}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              관리모드
            </Button>
          </div>
        </div>

        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">등록된 평가항목이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-2">
              관리모드에서 평가항목을 추가해보세요.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 border-b font-medium">구분 (100점)</th>
                  <th className="text-left p-3 border-b font-medium">세부 항목</th>
                  <th className="text-center p-3 border-b font-medium">유형</th>
                  <th className="text-center p-3 border-b font-medium">배점</th>
                  <th className="text-center p-3 border-b font-medium">평가점수</th>
                  <th className="text-center p-3 border-b font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
                  <React.Fragment key={categoryName}>
                    {categoryItems.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {index === 0 && (
                          <td rowSpan={categoryItems.length} className="p-3 border-b border-r bg-gray-50/50 font-medium align-top">
                            {categoryName}
                            <div className="text-sm text-gray-600 mt-1">
                              ({categoryItems.reduce((sum, item) => sum + item.maxScore, 0)}점)
                            </div>
                          </td>
                        )}
                        <td className="p-3 border-b">{item.content}</td>
                        <td className="p-3 border-b text-center">
                          <Badge className={`${getEvaluationTypeColor(item.evaluationType)} text-xs`}>
                            {getEvaluationTypeLabel(item.evaluationType)}
                          </Badge>
                        </td>
                        <td className="p-3 border-b text-center font-medium">{item.maxScore}</td>
                        <td className="p-3 border-b text-center">0</td>
                        <td className="p-3 border-b text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingItem(item)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td colSpan={3} className="p-3 text-center">합계</td>
                  <td className="p-3 text-center">{totalMaxScore}</td>
                  <td className="p-3 text-center">0</td>
                  <td className="p-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">평가항목 관리</h1>
              <p className="text-gray-600 mt-1">평가 카테고리의 항목을 관리할 수 있습니다.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setActiveTab("template")}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                심사표 보기
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab("edit")}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                관리 모드
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab("template")}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                엑셀 다운로드
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="view">심사표 보기</TabsTrigger>
            <TabsTrigger value="edit">관리 모드</TabsTrigger>
            <TabsTrigger value="template">평가표 템플릿</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="mt-6">
            {renderEvaluationTable()}
          </TabsContent>

          <TabsContent value="edit" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">평가항목 편집</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    평가항목을 추가, 수정, 삭제할 수 있습니다.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        항목 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>평가항목 추가</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="category">카테고리</Label>
                          <Select
                            value={newItem.categoryId.toString()}
                            onValueChange={(value) => setNewItem({ ...newItem, categoryId: parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="카테고리 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="content">항목 내용</Label>
                          <Textarea
                            id="content"
                            value={newItem.content}
                            onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                            placeholder="평가항목 내용을 입력하세요"
                          />
                        </div>
                        <div>
                          <Label htmlFor="evaluationType">평가 유형</Label>
                          <Select
                            value={newItem.evaluationType}
                            onValueChange={(value) => setNewItem({ ...newItem, evaluationType: value as "quantitative" | "quantitative_preset" | "qualitative" })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="quantitative">정량</SelectItem>
                              <SelectItem value="quantitative_preset">정량(사전)</SelectItem>
                              <SelectItem value="qualitative">정성</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="maxScore">배점</Label>
                          <Input
                            id="maxScore"
                            type="number"
                            value={newItem.maxScore}
                            onChange={(e) => setNewItem({ ...newItem, maxScore: parseInt(e.target.value) })}
                            min="1"
                            max="100"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">설명 (선택사항)</Label>
                          <Textarea
                            id="description"
                            value={newItem.description}
                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                            placeholder="평가항목 설명을 입력하세요"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => addItemMutation.mutate(newItem)}
                            disabled={!newItem.content || !newItem.categoryId || addItemMutation.isPending}
                            className="flex-1"
                          >
                            {addItemMutation.isPending ? "추가 중..." : "추가"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowAddDialog(false)}
                            className="flex-1"
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="grid gap-4">
                {items.map((item) => {
                  const category = categories.find(c => c.id === item.categoryId);
                  const isEditing = editingItem?.id === item.id;
                  
                  return (
                    <Card key={item.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{category?.name}</Badge>
                              <Badge className={`${getEvaluationTypeColor(item.evaluationType)} text-xs`}>
                                {getEvaluationTypeLabel(item.evaluationType)}
                              </Badge>
                              <Badge variant="outline">{item.maxScore}점</Badge>
                            </div>
                            {isEditing ? (
                              <div className="space-y-3">
                                <Textarea
                                  value={editingItem.content}
                                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                                  className="min-h-[60px]"
                                />
                                <div className="flex gap-2">
                                  <Select
                                    value={editingItem.evaluationType}
                                    onValueChange={(value) => setEditingItem({ ...editingItem, evaluationType: value as "quantitative" | "quantitative_preset" | "qualitative" })}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="quantitative">정량</SelectItem>
                                      <SelectItem value="quantitative_preset">정량(사전)</SelectItem>
                                      <SelectItem value="qualitative">정성</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    value={editingItem.maxScore}
                                    onChange={(e) => setEditingItem({ ...editingItem, maxScore: parseInt(e.target.value) })}
                                    className="w-20"
                                    min="1"
                                    max="100"
                                  />
                                </div>
                                <Textarea
                                  value={editingItem.description || ''}
                                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                  placeholder="설명 (선택사항)"
                                  className="min-h-[40px]"
                                />
                              </div>
                            ) : (
                              <div>
                                <h3 className="font-medium text-gray-900">{item.content}</h3>
                                {item.description && (
                                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 ml-4">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateItemMutation.mutate(editingItem)}
                                  disabled={updateItemMutation.isPending}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingItem(null)}
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingItem(item)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteItemMutation.mutate(item.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="template" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>평가표 템플릿</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      템플릿을 편집하고 평가항목으로 내보낼 수 있습니다.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={exportTemplate}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      평가항목으로 내보내기
                    </Button>
                    <Button
                      onClick={addSection}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      섹션 추가
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="templateTitle">평가표 제목</Label>
                    <Input
                      id="templateTitle"
                      value={currentTemplate.title}
                      onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-6">
                    {currentTemplate.sections.map((section, sectionIndex) => (
                      <Card key={sectionIndex} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <Input
                                value={section.title}
                                onChange={(e) => {
                                  const newSections = [...currentTemplate.sections];
                                  newSections[sectionIndex].title = e.target.value;
                                  setCurrentTemplate(prev => ({ ...prev, sections: newSections }));
                                }}
                                className="font-medium"
                              />
                            </div>
                            <div className="flex gap-1 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addTemplateItem(sectionIndex)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeSection(sectionIndex)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {section.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                <Input
                                  value={item.content}
                                  onChange={(e) => {
                                    const newSections = [...currentTemplate.sections];
                                    newSections[sectionIndex].items[itemIndex].content = e.target.value;
                                    setCurrentTemplate(prev => ({ ...prev, sections: newSections }));
                                  }}
                                  className="flex-1"
                                />
                                <Select
                                  value={item.evaluationType}
                                  onValueChange={(value) => {
                                    const newSections = [...currentTemplate.sections];
                                    newSections[sectionIndex].items[itemIndex].evaluationType = value as "quantitative" | "quantitative_preset" | "qualitative";
                                    setCurrentTemplate(prev => ({ ...prev, sections: newSections }));
                                  }}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="quantitative">정량</SelectItem>
                                    <SelectItem value="quantitative_preset">정량(사전)</SelectItem>
                                    <SelectItem value="qualitative">정성</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  value={item.maxScore}
                                  onChange={(e) => {
                                    const newSections = [...currentTemplate.sections];
                                    newSections[sectionIndex].items[itemIndex].maxScore = parseInt(e.target.value);
                                    setCurrentTemplate(prev => ({ ...prev, sections: newSections }));
                                  }}
                                  className="w-20"
                                  min="1"
                                  max="100"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeTemplateItem(sectionIndex, itemIndex)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}