import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Upload, Download, Save, X, Printer, Edit3, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
    isQuantitative: false,
    hasPresetScores: false,
  });

  // 컬럼 설정 관리
  const [columnConfig, setColumnConfig] = useState([
    { id: 'section', title: '구분', type: 'section', visible: true, required: true, width: 'w-32' },
    { id: 'item', title: '세부 항목', type: 'text', visible: true, required: true, width: 'flex-1' },
    { id: 'type', title: '유형', type: 'select', visible: true, required: false, width: 'w-16', options: ['정량', '정성'] },
    { id: 'points', title: '배점', type: 'number', visible: true, required: true, width: 'w-16' },
    { id: 'score', title: '평가점수', type: 'number', visible: true, required: true, width: 'w-20' },
  ]);

  // 평가위원 및 평가대상 선택
  const [selectedEvaluator, setSelectedEvaluator] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [batchPrintMode, setBatchPrintMode] = useState(false);
  const [showPresetScoreModal, setShowPresetScoreModal] = useState(false);

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

  // 데이터 쿼리들 - 실시간 연동 적용
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories, isFetching: categoriesFetching } = useQuery({
    queryKey: ["/api/admin/categories"],
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const { data: items = [], isLoading: itemsLoading, error: itemsError, refetch: refetchItems, isFetching: itemsFetching } = useQuery({
    queryKey: ["/api/admin/evaluation-items"],
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // 에러 상태 로깅
  useEffect(() => {
    if (categoriesError) {
      console.error('❌ 카테고리 조회 오류:', categoriesError);
    }
    if (itemsError) {
      console.error('❌ 평가항목 조회 오류:', itemsError);
    }
  }, [categoriesError, itemsError]);

  // 성공 상태 로깅
  useEffect(() => {
    if (categories && categories.length > 0) {
      console.log('✅ 카테고리 조회 성공:', categories);
    }
    if (items && items.length > 0) {
      console.log('✅ 평가항목 조회 성공:', items);
    }
  }, [categories, items]);

  // 기본 템플릿 로드
  useEffect(() => {
    const loadDefaultTemplate = async () => {
      try {
        const response = await fetch('/api/admin/templates/default', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const template = await response.json();
          console.log('✅ 기본 템플릿 로드 성공:', template);
          setCurrentTemplate(template.templateData);
        } else if (response.status !== 404) {
          console.log('ℹ️ 저장된 기본 템플릿이 없습니다. 기본값을 사용합니다.');
        }
      } catch (error) {
        console.log('ℹ️ 기본 템플릿 로드 실패. 기본값을 사용합니다:', error);
      }
    };

    loadDefaultTemplate();
  }, []);

  // 실시간 구독 + 폴링 백업 시스템 (카테고리용)
  useEffect(() => {
    let categoriesChannel: any;
    let categoriesPollingInterval: NodeJS.Timeout;
    let isCategoriesRealtimeConnected = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupCategoriesSubscription = () => {
      console.log(`🔄 카테고리 실시간 구독 시도 ${retryCount + 1}/${maxRetries}`);
      
      categoriesChannel = supabase
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
                supabase.removeChannel(categoriesChannel);
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
        }, 8000); // 8초마다 폴링
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
        }, 8000); // 8초마다 폴링
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

  // 평가위원 목록 가져오기
  const { data: evaluators = [] } = useQuery({
    queryKey: ["/api/admin/evaluators"],
  });

  // 후보자 목록 가져오기
  const { data: candidates = [] } = useQuery({
    queryKey: ["/api/admin/candidates"],
  });

  // 시스템 설정 가져오기
  const { data: systemConfig = {} } = useQuery({
    queryKey: ["/api/system/config"],
  });

  // 템플릿 저장 뮤테이션 (덮어쓰기 방식)
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      console.log('📝 심사표 저장 시작 (덮어쓰기 방식)...', template);
      console.log('📋 저장할 템플릿 구조:', JSON.stringify(template, null, 2));
      
      // 1. 기존 데이터 모두 삭제
      console.log('🗑️ 기존 데이터 삭제 중...');
      
      // 기존 평가항목 삭제
      const deleteItemsResponse = await fetch('/api/admin/evaluation-items/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      // 기존 카테고리 삭제
      const deleteCategoriesResponse = await fetch('/api/admin/evaluation-categories/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      console.log('✅ 기존 데이터 삭제 완료');

      // 1.5. 심사표 제목을 시스템 설정에 저장
      console.log('📝 심사표 제목 저장 중...', template.title);
      try {
        const titleResponse = await fetch('/api/system/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            evaluationTitle: template.title
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
      for (let sectionIndex = 0; sectionIndex < template.sections.length; sectionIndex++) {
        const section = template.sections[sectionIndex];
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

        if (!response.ok) {
          throw new Error(`카테고리 저장 실패: ${response.statusText}`);
        }

        const savedCategory = await response.json();
        savedCategories.push(savedCategory);
        
        // 서버 부하 방지를 위한 지연
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 3. 새로운 평가항목들을 저장
      const savedItems = [];
      for (let sectionIndex = 0; sectionIndex < template.sections.length; sectionIndex++) {
        const section = template.sections[sectionIndex];
        const categoryId = savedCategories[sectionIndex].id;

        for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
          const item = section.items[itemIndex];
          console.log(`📋 평가항목 데이터 생성: ${item.text}, 유형: ${item.type}, 정량여부: ${item.type === '정량'}`);
          
          const itemData = {
            categoryId: categoryId,
            code: `ITEM_${Date.now()}_${sectionIndex}_${itemIndex}`,
            name: item.text,
            description: item.text,
            maxScore: item.points || 0,
            weight: "1.00",
            isQuantitative: item.type === '정량',
            hasPresetScores: item.type === '정량',
            sortOrder: itemIndex + 1,
            isActive: true
          };
          
          console.log(`💾 저장할 평가항목 데이터:`, itemData);

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
          
          // 4. 정량 평가항목의 경우 preset 점수 저장 (나중에 구현)
          if (item.type === '정량') {
            console.log(`✅ 정량 평가항목 저장 완료: ${item.text} (ID: ${savedItem.id})`);
            // TODO: 정량 평가항목용 preset 점수 시스템은 별도 구현 예정
          }
          
          // 서버 부하 방지를 위한 지연
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // 7. 템플릿을 데이터베이스에 저장
      try {
        const templateData = {
          name: "기본 평가표 템플릿",
          title: template.title,
          description: "평가표 관리에서 생성된 기본 템플릿",
          templateData: template,
          isActive: true,
          isDefault: true
        };

        const templateResponse = await fetch('/api/admin/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(templateData)
        });

        if (templateResponse.ok) {
          console.log('✅ 템플릿이 데이터베이스에 저장되었습니다');
        } else {
          console.warn('⚠️ 템플릿 저장 실패, 평가항목은 정상 저장됨');
        }
      } catch (error) {
        console.warn('⚠️ 템플릿 저장 중 오류:', error);
      }

      return { savedCategories, savedItems };
    },
    onSuccess: (data) => {
      const { savedCategories, savedItems } = data;
      toast({ 
        title: "성공", 
        description: `심사표 저장 완료! ${savedCategories.length}개 카테고리와 ${savedItems.length}개 평가항목이 저장되었습니다.`,
      });
      
      // 데이터 다시 로드
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/config"] }); // 시스템 설정 갱신
      
      // 편집 모드 종료하고 심사표 보기 모드로 전환
      setIsEditing(false);
      setViewMode('template');
    },
    onError: (error: any) => {
      console.error('❌ 심사표 저장 오류:', error);
      toast({ title: "오류", description: `저장 실패: ${error.message || "심사표 저장 중 오류가 발생했습니다."}`, variant: "destructive" });
    }
  });

  // 데이터베이스 데이터를 템플릿 구조로 변환
  const convertDataToTemplate = () => {
    if (!categories || !items || !Array.isArray(categories) || !Array.isArray(items) || categories.length === 0 || items.length === 0) {
      return currentTemplate; // 데이터가 없으면 기본 템플릿 반환
    }

    const sections = (categories as any[]).map((category: any, categoryIndex: number) => ({
      id: String.fromCharCode(65 + categoryIndex), // A, B, C...
      title: category.name,
      totalPoints: (items as any[])
        .filter((item: any) => item.categoryId === category.id)
        .reduce((sum: number, item: any) => sum + (item.maxScore || 0), 0),
      items: (items as any[])
        .filter((item: any) => item.categoryId === category.id)
        .map((item: any, index: number) => ({
          id: index + 1,
          text: item.name,
          type: item.isQuantitative ? '정량' : '정성', // 데이터베이스 값 기반 매핑
          points: item.maxScore || 0,
          score: 0
        }))
    }));

    return {
      title: (systemConfig as any)?.evaluationTitle || "제공기관 선정 심의회 평가표",
      totalScore: sections.reduce((sum: number, section: any) => sum + section.totalPoints, 0),
      sections
    };
  };

  // 데이터베이스 데이터가 로드되면 템플릿 업데이트
  useEffect(() => {
    console.log('✅ 데이터 로드 상태:', { 
      categoriesCount: categories.length, 
      itemsCount: items.length,
      categories,
      items 
    });
    
    if (categories && items && Array.isArray(categories) && Array.isArray(items) && categories.length > 0 && items.length > 0) {
      console.log('🔄 템플릿 변환 시작...');
      const convertedTemplate = convertDataToTemplate();
      console.log('📋 변환된 템플릿:', convertedTemplate);
      setCurrentTemplate(convertedTemplate);
    } else if ((categories && Array.isArray(categories) && categories.length > 0) || (items && Array.isArray(items) && items.length > 0)) {
      console.log('⚠️ 부분 데이터만 로드됨');
    }
  }, [categories, items, systemConfig]);

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

  // 보이는 컬럼들만 필터링
  const visibleColumns = columnConfig.filter(col => col.visible);

  // 선택된 평가위원과 평가대상 정보
  const selectedEvaluatorInfo = evaluators.find((e: any) => e.id === selectedEvaluator);
  const selectedCandidateInfo = candidates.find((c: any) => c.id === selectedCandidate);

  // 동적 제목 생성
  const getDynamicTitle = () => {
    if (selectedCandidateInfo) {
      return `${selectedCandidateInfo.name} 심사표`;
    }
    return currentTemplate.title;
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

  // 추가 함수들
  const addSection = () => {
    const newSectionId = String.fromCharCode(65 + currentTemplate.sections.length); // A, B, C...
    const newSection = {
      id: newSectionId,
      title: '새구분',
      totalPoints: 10,
      items: [
        { id: 1, text: '새 항목', type: '정성', points: 10, score: 0 }
      ]
    };
    setCurrentTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const saveTemplate = () => {
    const dataStr = JSON.stringify(currentTemplate, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evaluation_template.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "성공", description: "템플릿이 JSON 파일로 저장되었습니다." });
  };

  const saveAsExcel = async () => {
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
      
      toast({ title: "성공", description: "Excel 파일이 성공적으로 저장되었습니다." });
    } catch (error) {
      console.error('Excel 저장 오류:', error);
      toast({ title: "오류", description: "Excel 저장 중 오류가 발생했습니다.", variant: "destructive" });
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

  const printTemplate = () => {
    window.print();
  };

  const addColumn = () => {
    const newColumnId = `col_${Date.now()}`;
    const newColumn = {
      id: newColumnId,
      title: '새 컬럼',
      type: 'text',
      visible: true,
      required: false,
      width: 'w-20'
    };
    setColumnConfig(prev => [...prev, newColumn]);
    toast({ title: "성공", description: "새 컬럼이 추가되었습니다." });
  };

  const updateColumnConfig = (id: string, field: string, value: any) => {
    setColumnConfig(prev => prev.map(col => 
      col.id === id ? { ...col, [field]: value } : col
    ));
  };

  const deleteColumn = (id: string) => {
    if (columnConfig.find(col => col.id === id)?.required) {
      toast({ title: "오류", description: "필수 컬럼은 삭제할 수 없습니다.", variant: "destructive" });
      return;
    }
    setColumnConfig(prev => prev.filter(col => col.id !== id));
    toast({ title: "성공", description: "컬럼이 삭제되었습니다." });
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
          toast({ title: "성공", description: "템플릿이 성공적으로 업로드되었습니다." });
        } catch (error) {
          toast({ title: "오류", description: "파일 형식이 올바르지 않습니다.", variant: "destructive" });
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
      
      toast({ title: "성공", description: "엑셀 파일이 성공적으로 다운로드되었습니다." });
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      toast({ title: "오류", description: "엑셀 다운로드 중 오류가 발생했습니다.", variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/evaluation-items"] });
      setIsAddingItem(false);
      setNewItem({ categoryId: "", itemCode: "", itemName: "", description: "", maxScore: "", weight: "", isQuantitative: false, hasPresetScores: false });
      toast({ title: "성공", description: "평가항목이 추가되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "평가항목 추가 중 오류가 발생했습니다.", variant: "destructive" });
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
      isQuantitative: newItem.isQuantitative,
      hasPresetScores: newItem.hasPresetScores,
      isActive: true,
      sortOrder: items.length + 1
    });
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
            {/* 실시간 상태 정보 */}
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
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              엑셀 불러오기
            </Button>
            <Button variant="outline" size="sm" onClick={handleExcelDownload}>
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
          // 템플릿 뷰 (심사표 형태로 표시)
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <CardTitle className="text-center text-2xl font-bold">
                    {currentTemplate.title}
                  </CardTitle>
                </div>
                <div className="flex flex-col gap-3 min-w-[300px]">
                  <div className="flex gap-2">
                    <select
                      value={selectedEvaluator || ''}
                      onChange={(e) => setSelectedEvaluator(e.target.value ? Number(e.target.value) : null)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
                    >
                      <option value="">평가위원 선택</option>
                      {evaluators.map((evaluator: any) => (
                        <option key={evaluator.id} value={evaluator.id}>
                          {evaluator.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedCandidate || ''}
                      onChange={(e) => setSelectedCandidate(e.target.value ? Number(e.target.value) : null)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
                    >
                      <option value="">평가대상 선택</option>
                      {candidates.map((candidate: any) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={printEvaluationSheet}
                      disabled={!selectedEvaluator || !selectedCandidate}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-xs flex-1"
                    >
                      <Printer className="w-3 h-3" />
                      개별 인쇄
                    </Button>
                    <Button
                      onClick={printAllCombinations}
                      disabled={candidates.length === 0 || evaluators.length === 0}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-xs flex-1"
                    >
                      <Printer className="w-3 h-3" />
                      배치 인쇄
                    </Button>
                  </div>
                </div>
              </div>
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
          // 관리 모드에 평가표 템플릿 내용을 직접 통합
          <div className="space-y-6">
            {/* 평가표 템플릿 섹션 (관리모드 메인화면에 통합) */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>평가표 템플릿</CardTitle>
                    <CardDescription>평가표를 디자인하고 관리합니다.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (isEditing) {
                          // 편집 완료 시 템플릿 상태 저장
                          console.log('✅ 편집 완료 - 템플릿 상태 저장됨:', currentTemplate);
                          toast({ title: "성공", description: "템플릿 편집이 완료되었습니다." });
                        }
                        setIsEditing(!isEditing);
                      }}
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
                    <Button onClick={printTemplate} variant="outline" size="sm">
                      <Printer className="h-4 w-4 mr-2" />
                      인쇄
                    </Button>
                    <Button 
                      onClick={() => saveTemplateMutation.mutate(currentTemplate)} 
                      disabled={saveTemplateMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {saveTemplateMutation.isPending ? "저장 중..." : "심사표 저장"}
                    </Button>
                    
                    {/* 테스트용 데이터 정리 버튼 */}
                    <Button 
                      onClick={async () => {
                        if (window.confirm('모든 평가 데이터를 정리하시겠습니까? (카테고리, 평가항목, 템플릿)')) {
                          try {
                            const response = await fetch('/api/admin/clear-evaluation-data', {
                              method: 'POST',
                              credentials: 'include'
                            });
                            if (response.ok) {
                              toast({ title: "성공", description: "평가 데이터 정리 완료" });
                              window.location.reload();
                            } else {
                              toast({ title: "오류", description: "데이터 정리 실패", variant: "destructive" });
                            }
                          } catch (error) {
                            toast({ title: "오류", description: `오류 발생: ${error}`, variant: "destructive" });
                          }
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      데이터 정리
                    </Button>
                    {isEditing && (
                      <>
                        <Button onClick={addSection} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          영역 추가
                        </Button>
                        <Button 
                          onClick={() => setShowPresetScoreModal(true)} 
                          size="sm" 
                          variant="outline" 
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
                        >
                          사전점수 관리
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
                  onChange={handleFileUpload}
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
                
                {/* 평가표 제목 (편집 가능) */}
                <div className="mb-6">
                  <div className="border border-gray-400 bg-white">
                    <div className="px-4 py-2 text-center border-b border-gray-400">
                      {isEditing ? (
                        <Input
                          value={currentTemplate.title}
                          onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                          className="text-center text-lg font-bold border-none shadow-none focus:ring-0"
                        />
                      ) : (
                        <h2 className="text-lg font-bold">{currentTemplate.title}</h2>
                      )}
                    </div>
                  </div>
                </div>

                {/* 평가표 데이터 테이블 */}
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
          </div>
        )}

        {/* 사전 점수 관리 모달 */}
        {showPresetScoreModal && (
          <PresetScoreModal />
        )}
      </div>
    </div>
  );

  // 알림 함수
  function showNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
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
  }

  // 사전 점수 관리 모달 컴포넌트
  const PresetScoreModal = () => {
    const [candidatePresetScores, setCandidatePresetScores] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // 안전한 데이터 확인
    const safeItems = Array.isArray(items) ? items : [];
    const safeCandidates = Array.isArray(candidates) ? candidates : [];
    
    // 정량 평가항목 필터링 - 모든 평가항목을 정량으로 처리 (임시)
    const quantitativeItems = safeItems; // 모든 항목을 정량으로 처리
    
    console.log('🔍 모달 열림 - quantitativeItems:', quantitativeItems);
    console.log('🔍 모달 열림 - candidates:', safeCandidates);
    
    // 사전 점수 데이터 로드
    useEffect(() => {
      const loadPresetScores = async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/admin/candidate-preset-scores', {
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            setCandidatePresetScores(data);
            console.log('🔍 로드된 사전점수 데이터:', data);
          }
        } catch (error) {
          console.error('사전 점수 로드 오류:', error);
        } finally {
          setLoading(false);
        }
      };
      loadPresetScores();
    }, []);

    // 사전 점수 저장
    const savePresetScore = async (candidateId: number, itemId: number, score: number, applyPreset?: boolean) => {
      try {
        const response = await fetch('/api/admin/candidate-preset-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            candidateId,
            evaluationItemId: itemId,
            presetScore: score,
            applyPreset: applyPreset
          })
        });
        
        if (response.ok) {
          toast({ title: "성공", description: "사전 점수가 저장되었습니다." });
          // 데이터 다시 로드
          const data = await response.json();
          setCandidatePresetScores(prev => {
            const filtered = prev.filter(p => !(p.candidate_id === candidateId && p.evaluation_item_id === itemId));
            return [...filtered, data];
          });
        }
      } catch (error) {
        console.error('사전 점수 저장 오류:', error);
        toast({ title: "오류", description: "사전 점수 저장 중 오류가 발생했습니다.", variant: "destructive" });
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">사전 점수 관리</h2>
            <button
              onClick={() => setShowPresetScoreModal(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">사전점수 설정 안내</h3>
            <p className="text-sm text-blue-700">
              • <strong>사전점수 설정</strong>: 각 평가대상별로 미리 점수를 설정합니다<br/>
              • <strong>적용 여부</strong>: 평가 시 해당 점수를 기본값으로 사용할지 선택합니다<br/>
              • <strong>평가 시</strong>: 적용된 사전점수는 평가점수란에 회색으로 표시되며 수정 불가합니다
            </p>
          </div>

          <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {quantitativeItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">평가항목이 없습니다.</p>
                <p className="text-sm text-gray-500 mt-2">
                  먼저 평가항목을 추가해주세요.
                </p>
              </div>
            ) : (
              quantitativeItems.map(item => (
                <div key={item.id} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">
                    {item.name} (최대 {item.maxScore}점)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {safeCandidates.length > 0 ? safeCandidates.map(candidate => {
                      const existingScore = candidatePresetScores.find(
                        p => p.candidate_id === candidate.id && p.evaluation_item_id === item.id
                      );
                      
                      return (
                        <div key={candidate.id} className="flex items-center gap-2">
                          <span className="text-sm flex-1">{candidate.name}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={item.maxScore || 100}
                              defaultValue={existingScore?.preset_score || ''}
                              placeholder="점수"
                              className="w-20 text-center"
                              onBlur={(e) => {
                                const score = parseInt(e.target.value);
                                if (!isNaN(score) && score >= 0 && score <= (item.maxScore || 100)) {
                                  const currentApply = existingScore?.apply_preset || false;
                                  savePresetScore(candidate.id, item.id, score, currentApply);
                                }
                              }}
                            />
                            <select 
                              className="w-20 text-xs border rounded px-1 py-1 bg-white"
                              defaultValue={existingScore?.apply_preset ? "yes" : "no"}
                              onChange={(e) => {
                                const applyPreset = e.target.value === "yes";
                                const currentScore = existingScore?.preset_score || 0;
                                savePresetScore(candidate.id, item.id, currentScore, applyPreset);
                              }}
                            >
                              <option value="no">미적용</option>
                              <option value="yes">적용</option>
                            </select>
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-gray-500">평가대상이 없습니다.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  // 🎯 통합된 평가표 HTML 생성 함수 (일반/배치/개별 인쇄 모두 공통 사용)
  function generateEvaluationHTML(evaluatorInfo: any, candidateInfo: any, templateData = currentTemplate) {
    const today = new Date().toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // 동적 컬럼 생성
    const visibleColumns = columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id));

    // 제목 및 카테고리 정보 결정
    const candidateTitle = candidateInfo ? `${candidateInfo.name} 심사표` : templateData.title;
    const categoryInfo = candidateInfo ? (candidateInfo.category || candidateInfo.department || '') : '';

    // 평가위원 정보 결정
    const positionText = evaluatorInfo.position ? ` (${evaluatorInfo.position})` : '';

    // 총 배점 계산
    const totalPoints = templateData.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + (item.points || 0), 0), 0
    );

    // 총 점수 계산
    const totalScore = templateData.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + (item.score || 0), 0), 0
    );

    return `
      <!-- 제목과 구분 정보 표 -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #666;">
        <tr>
          <td colspan="2" style="border: 1px solid #666; padding: 8px; text-align: right; font-size: 12px;">
            <span>구분 : ${categoryInfo}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="border: 1px solid #666; padding: 16px; text-align: center; font-size: 18px; font-weight: bold;">
            ${candidateTitle}
          </td>
        </tr>
      </table>

      <!-- 평가 항목 표 -->
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #666;">
        <thead>
          <tr>
            <th style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; font-weight: bold; font-size: 13px;">구분 (${totalPoints}점)</th>
            <th style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; font-weight: bold; font-size: 13px;">세부 항목</th>
            ${visibleColumns.map(column => `
              <th style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; font-weight: bold; font-size: 13px;">
                ${column.title}
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${templateData.sections.map(section => {
            return section.items.map((item, itemIndex) => {
              return `
                <tr>
                  ${itemIndex === 0 ? `
                    <td rowspan="${section.items.length}" style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f8f9fa; font-weight: bold; vertical-align: top; font-size: 12px;">
                      ${section.id}. ${section.title}<br>
                      <span style="font-size: 10px; color: #666;">(${section.items.reduce((sum, sectionItem) => sum + (sectionItem.points || 0), 0)}점)</span>
                    </td>
                  ` : ''}
                  <td style="border: 1px solid #666; padding: 8px; font-size: 12px;">
                    ${itemIndex + 1}. ${item.text}
                  </td>
                  ${visibleColumns.map(column => `
                    <td style="border: 1px solid #666; padding: 8px; text-align: center; font-size: 12px; vertical-align: middle;" class="${column.id === 'type' ? 'type-cell' : column.id === 'points' ? 'points-cell' : column.id === 'score' ? 'score-cell' : 'custom-cell'}">
                      ${column.id === 'points' ? `${item[column.id] || 0}점` : 
                       column.id === 'score' ? `${item[column.id] || 0}점` :
                       column.id === 'type' ? (item[column.id] || '') :
                       (item[column.id] || '')}
                    </td>
                  `).join('')}
                </tr>
              `;
            }).join('');
          }).join('')}
          <!-- 합계 행 -->
          <tr style="background-color: #e8e8e8; font-weight: bold;">
            <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #e8e8e8; vertical-align: middle; font-size: 13px;">합계</td>
            <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f5f5f5; vertical-align: middle;"></td>
            ${visibleColumns.map(column => `
              <td style="border: 1px solid #666; padding: 12px; text-align: center; background-color: #f5f5f5; font-size: 13px; vertical-align: middle;">
                ${column.id === 'points' ? `${totalPoints}점` : 
                  column.id === 'score' ? `${totalScore}점` : 
                  ''}
              </td>
            `).join('')}
          </tr>
        </tbody>
      </table>
      <div class="evaluation-date">
        평가일: ${today}
      </div>
      <div class="evaluator-info">
        평가위원 : ${evaluatorInfo.name}${positionText} (서명)
      </div>
    `;
  }

  // 🎯 통합 인쇄 스타일 (모든 인쇄 함수에서 공통 사용)
  function getPrintStyle() {
    return `
      <style>
        @media print {
          @page {
            margin: 0 !important;
            size: A4 !important;
          }
          body {
            font-family: "맑은 고딕", "Malgun Gothic", Arial, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .evaluation-page {
            padding: 95px 50px 50px 50px !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            min-height: 100vh !important;
            box-sizing: border-box !important;
          }
          .evaluation-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .title {
            text-align: center !important;
            font-size: 24px !important;
            font-weight: bold !important;
            margin-bottom: 15px !important;
            color: black !important;
          }
          .evaluator-info {
            text-align: right !important;
            font-size: 16px !important;
            font-weight: bold !important;
            margin-top: 20px !important;
            margin-bottom: 20px !important;
            padding: 0 10px;
            text-decoration: underline !important;
          }
          .evaluation-date {
            text-align: center !important;
            font-size: 16px !important;
            font-weight: bold !important;
            margin-top: 20px !important;
            margin-bottom: 20px !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-bottom: 30px !important;
            font-size: 13px !important;
            border: 2px solid #666 !important;
          }
          th, td {
            border: 1px solid #666 !important;
            padding: 12px 10px !important;
            vertical-align: middle !important;
          }
          th {
            background-color: #e8e8e8 !important;
            text-align: center !important;
            font-weight: bold !important;
          }
          .evaluation-page table:nth-of-type(1),
          .evaluation-page table:nth-of-type(2) {
            border-left: none !important;
            border-right: none !important;
          }
          .evaluation-page table:nth-of-type(1) td:first-child,
          .evaluation-page table:nth-of-type(1) th:first-child,
          .evaluation-page table:nth-of-type(2) td:first-child,
          .evaluation-page table:nth-of-type(2) th:first-child {
            border-left: none !important;
          }
          .evaluation-page table:nth-of-type(1) td:last-child,
          .evaluation-page table:nth-of-type(1) th:last-child,
          .evaluation-page table:nth-of-type(2) td:last-child,
          .evaluation-page table:nth-of-type(2) th:last-child {
            border-right: none !important;
          }
          .type-cell,
          .points-cell,
          .score-cell,
          .custom-cell {
            text-align: center !important;
          }
          .section-cell {
            background-color: #f8f9fa !important;
            font-weight: bold !important;
            text-align: center !important;
            vertical-align: top !important;
          }
          .no-print {
            display: none !important;
          }
          input, select {
            border: none !important;
            background: transparent !important;
            font-size: inherit !important;
            text-align: center !important;
            width: 100% !important;
          }
        }
      </style>
    `;
  }

  // 🎯 개별 인쇄 기능 (통합 함수 사용)
  function printEvaluationSheet() {
    if (!selectedEvaluator || !selectedCandidate) {
      showNotification('평가위원과 평가대상을 선택해주세요.', 'error');
      return;
    }

    const evaluatorInfo = evaluators.find((e: any) => e.id === selectedEvaluator);
    const candidateInfo = candidates.find((c: any) => c.id === selectedCandidate);

    if (!evaluatorInfo || !candidateInfo) {
      showNotification('선택한 평가위원 또는 평가대상 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    // 통합 HTML 생성 함수 사용
    const evaluationContent = generateEvaluationHTML(evaluatorInfo, candidateInfo);

    // 제목 결정
    const dynamicTitle = candidateInfo ? `${candidateInfo.name} 심사표` : currentTemplate.title;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>평가표 출력 - ${dynamicTitle}</title>
          <meta charset="UTF-8">
          ${getPrintStyle()}
        </head>
        <body>
          <div class="evaluation-page">
            ${evaluationContent}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    showNotification('인쇄 미리보기가 열렸습니다!', 'info');
  }

  // 🎯 배치 인쇄 기능 (통합 함수 사용)
  function printAllCombinations() {
    if (candidates.length === 0 || evaluators.length === 0) {
      showNotification('평가대상과 평가위원이 모두 등록되어야 배치 인쇄가 가능합니다.', 'error');
      return;
    }

    let allPrintContent = '';
    const totalPages = candidates.length * evaluators.length;

    candidates.forEach((candidate: any, candidateIndex: number) => {
      evaluators.forEach((evaluator: any, evaluatorIndex: number) => {
        // 🎯 일반 인쇄와 완전히 동일한 로직 사용
        const evaluationContent = generateEvaluationHTML(evaluator, candidate);
        allPrintContent += `
          <div class="evaluation-page">
            ${evaluationContent}
          </div>
        `;
      });
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>전체 평가표 배치 인쇄 (${totalPages}페이지)</title>
          <meta charset="UTF-8">
          ${getPrintStyle()}
        </head>
        <body>
          ${allPrintContent}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    showNotification(`총 ${totalPages}개의 평가표가 생성되었습니다!`, 'info');
  }
}