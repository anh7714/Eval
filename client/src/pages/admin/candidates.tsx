import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Plus, Edit, Trash2, Upload, Download, Settings, Users, Search, Filter, ArrowUpDown, RefreshCw, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, exportToExcel } from "@/lib/excel";
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://bqgbppdppkhsqkekqrui.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZ2JwcGRwcGtoc3FrZWtxcnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NTYzMjQsImV4cCI6MjA1MDUzMjMyNH0.JM8yGO9hZmfNVGMdFrAGTnFvL_sJXRayNqZOSsAMhzg'
);

export default function CandidateManagement() {
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  // 테이블 관련 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mainCategoryFilter, setMainCategoryFilter] = useState("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 💡 핵심: 낙관적 업데이트를 위한 상태
  const [pendingOperations, setPendingOperations] = useState<Set<number>>(new Set());
  const [failedOperations, setFailedOperations] = useState<Set<number>>(new Set());

  const [newCandidate, setNewCandidate] = useState({
    name: "",
    department: "",
    position: "",
    category: "",
    mainCategory: "",
    subCategory: "",
    description: "",
    sort_order: 0,
  });

  // 카테고리 관리 상태
  const [managedCategories, setManagedCategories] = useState({
    main: ["신규", "재협약"],
    sub: ["일시동행", "주거편의", "식사배달", "단시설"]
  });
  const [newCategoryInput, setNewCategoryInput] = useState({ main: "", sub: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 카테고리 관리 함수들
  const addMainCategory = () => {
    if (newCategoryInput.main.trim() && !managedCategories.main.includes(newCategoryInput.main.trim())) {
      setManagedCategories(prev => ({
        ...prev,
        main: [...prev.main, newCategoryInput.main.trim()]
      }));
      setNewCategoryInput(prev => ({ ...prev, main: "" }));
      toast({ title: "성공", description: "구분이 추가되었습니다." });
    }
  };

  const addSubCategory = () => {
    if (newCategoryInput.sub.trim() && !managedCategories.sub.includes(newCategoryInput.sub.trim())) {
      setManagedCategories(prev => ({
        ...prev,
        sub: [...prev.sub, newCategoryInput.sub.trim()]
      }));
      setNewCategoryInput(prev => ({ ...prev, sub: "" }));
      toast({ title: "성공", description: "세부구분이 추가되었습니다." });
    }
  };

  const removeMainCategory = (category: string) => {
    setManagedCategories(prev => ({
      ...prev,
      main: prev.main.filter(c => c !== category)
    }));
    toast({ title: "성공", description: "구분이 삭제되었습니다." });
  };

  const removeSubCategory = (category: string) => {
    setManagedCategories(prev => ({
      ...prev,
      sub: prev.sub.filter(c => c !== category)
    }));
    toast({ title: "성공", description: "세부구분이 삭제되었습니다." });
  };

  // 서버 데이터 조회
  const fetchCandidates = async () => {
    const timestamp = Date.now();
    console.log(`🔄 서버 데이터 조회: ${timestamp}`);
    
    const response = await fetch(`/api/admin/candidates?_t=${timestamp}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch candidates');
    }
    
    const data = await response.json();
    console.log(`✅ 서버 데이터 조회 완료: ${data.length}개`);
    return data;
  };

  const { data: candidates = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["candidates"],
    queryFn: fetchCandidates,
    staleTime: 30 * 1000, // 30초
    gcTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    retry: 1,
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 💡 Supabase 실시간 구독
  useEffect(() => {
    console.log('🔄 Supabase 실시간 구독 시작...');
    
    const channel = supabase
      .channel('candidates-realtime')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'candidates' 
        }, 
        (payload) => {
          console.log('📡 실시간 데이터 변경 감지:', payload);
          
          // React Query 캐시 무효화하여 최신 데이터 가져오기
          queryClient.invalidateQueries({ queryKey: ['candidates'] });
          
          // 토스트 알림
          if (payload.eventType === 'UPDATE') {
            toast({
              title: "실시간 업데이트",
              description: "평가대상 정보가 업데이트되었습니다.",
              duration: 2000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 구독 상태:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ 실시간 구독 활성화');
        }
      });

    return () => {
      console.log('🔄 Supabase 실시간 구독 정리...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // 💡 낙관적 업데이트를 위한 mutation
  const toggleCandidateMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/admin/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error('Failed to toggle candidate');
      return response.json();
    },
    onMutate: async ({ id, isActive }) => {
      // 💡 낙관적 업데이트: 즉시 UI 반영
      setPendingOperations(prev => new Set(Array.from(prev).concat([id])));
      
      // 캐시에서 즉시 업데이트
      queryClient.setQueryData(['candidates'], (old: any[]) =>
        old?.map(candidate =>
          candidate.id === id ? { ...candidate, isActive } : candidate
        ) || []
      );
    },
    onSuccess: (data, { id, isActive }) => {
      // 💡 성공 시 서버 데이터로 캐시 업데이트
      queryClient.setQueryData(['candidates'], (old: any[]) =>
        old?.map(candidate =>
          candidate.id === id ? { ...candidate, ...data } : candidate
        ) || []
      );
      toast({ 
        title: "성공", 
        description: `평가대상이 ${isActive ? '활성화' : '비활성화'}되었습니다.` 
      });
    },
    onError: (error, { id, isActive }) => {
      // 💡 실패 시 롤백
      setFailedOperations(prev => new Set(Array.from(prev).concat([id])));
      toast({ 
        title: "오류", 
        description: "상태 변경에 실패했습니다.", 
        variant: "destructive" 
      });
      
      // 캐시 롤백
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onSettled: (data, error, { id }) => {
      // 💡 완료 시 pending 상태 제거
      setPendingOperations(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(id);
        return newSet;
      });
      setFailedOperations(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(id);
        return newSet;
      });
    },
  });

  // 💡 일괄 토글을 위한 mutation
  const bulkToggleMutation = useMutation({
    mutationFn: async ({ ids, isActive }: { ids: number[]; isActive: boolean }) => {
      const results = await Promise.allSettled(
        ids.map(id =>
          fetch(`/api/admin/candidates/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
          })
        )
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
      const failCount = results.length - successCount;
      
      return { successCount, failCount, total: results.length };
    },
    onMutate: async ({ ids, isActive }) => {
      // 💡 낙관적 업데이트: 즉시 UI 반영
      setPendingOperations(prev => new Set(Array.from(prev).concat(ids)));
      
      // 캐시에서 즉시 업데이트
      queryClient.setQueryData(['candidates'], (old: any[]) =>
        old?.map(candidate =>
          ids.includes(candidate.id) ? { ...candidate, isActive } : candidate
        ) || []
      );
    },
    onError: (error, { ids }) => {
      // 💡 실패 시 롤백
      setFailedOperations(prev => new Set(Array.from(prev).concat(ids)));
      toast({ 
        title: "오류", 
        description: "일괄 변경에 실패했습니다.", 
        variant: "destructive" 
      });
      
      // 캐시 롤백
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onSuccess: (data, { ids, isActive }) => {
      // 💡 성공 시 pending 상태 제거
      setPendingOperations(prev => {
        const newSet = new Set(Array.from(prev));
        ids.forEach(id => newSet.delete(id));
        return newSet;
      });
      setFailedOperations(prev => {
        const newSet = new Set(Array.from(prev));
        ids.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      // 💡 부분 실패 시 캐시 무효화
      if (data.failCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
      }
      
      if (data.failCount === 0) {
        toast({ 
          title: "완료", 
          description: `${data.successCount}명 ${isActive ? '활성화' : '비활성화'} 완료` 
        });
        // 성공 시 선택 초기화
        setSelectedIds([]);
      } else {
        toast({ 
          title: "부분 완료", 
          description: `${data.successCount}명 성공, ${data.failCount}명 실패`, 
          variant: "destructive" 
        });
      }
    },
  });

  // 개별 토글 - 낙관적 업데이트
  const handleIndividualToggle = (candidate: any) => {
    const newStatus = !candidate.isActive;
    toggleCandidateMutation.mutate({ id: candidate.id, isActive: newStatus });
  };

  // 일괄 토글 - 낙관적 업데이트
  const handleBulkToggle = (active: boolean) => {
    const targets = selectedIds.length > 0 ? selectedIds : candidates.map((c: any) => c.id);
    if (targets.length === 0) {
      toast({ title: "알림", description: "처리할 대상이 없습니다." });
      return;
    }
    
    bulkToggleMutation.mutate({ ids: targets, isActive: active });
    setSelectedIds([]);
  };

  // 필터링 및 정렬 로직
  const filteredAndSortedCandidates = (candidates as any[])
    .filter((candidate: any) => {
      const matchesSearch = 
        candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.mainCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.subCategory?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && candidate.isActive) ||
        (statusFilter === "inactive" && !candidate.isActive);
      
      const matchesMainCategory = mainCategoryFilter === "all" || 
        candidate.mainCategory === mainCategoryFilter;
        
      const matchesSubCategory = subCategoryFilter === "all" || 
        candidate.subCategory === subCategoryFilter;
      
      return matchesSearch && matchesStatus && matchesMainCategory && matchesSubCategory;
    })
    .sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === "name" || sortField === "department" || sortField === "position" || sortField === "mainCategory" || sortField === "subCategory") {
        aValue = aValue || "";
        bValue = bValue || "";
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (sortField === "isActive") {
        return sortDirection === "asc" 
          ? (a.isActive ? 1 : -1)
          : (a.isActive ? -1 : 1);
      }
      
      return 0;
    });

  // 페이지네이션 로직
  const totalPages = Math.ceil(filteredAndSortedCandidates.length / itemsPerPage);
  const paginatedCandidates = filteredAndSortedCandidates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 정렬 핸들러
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // 검색/필터 리셋
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMainCategoryFilter("all");
    setSubCategoryFilter("all");
    setCurrentPage(1);
  };

  // 선택 관련 핸들러
  const handleSelect = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedCandidates.length && paginatedCandidates.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedCandidates.map((c: any) => c.id));
    }
  };

  // 수동 새로고침
  const handleManualRefresh = async () => {
    console.log("🔄 수동 서버 새로고침");
    await refetch();
    toast({ title: "새로고침", description: "서버에서 최신 데이터를 가져왔습니다." });
  };

  // CRUD 뮤테이션들
  const createMutation = useMutation({
    mutationFn: async (candidate: typeof newCandidate) => {
      const response = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidate),
      });
      if (!response.ok) throw new Error("Failed to create candidate");
      return response.json();
    },
    onSuccess: async (newCandidate) => {
      // 캐시에 즉시 추가
      queryClient.setQueryData(['candidates'], (old: any[]) => [...(old || []), newCandidate]);
      await refetch();
      toast({ title: "성공", description: "평가대상이 추가되었습니다." });
      setIsAddingCandidate(false);
      setNewCandidate({ name: "", department: "", position: "", category: "", mainCategory: "", subCategory: "", description: "", sort_order: 0 });
    },
    onError: () => {
      toast({ title: "오류", description: "평가대상 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (candidates: any[]) => {
      const response = await fetch("/api/admin/candidates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates }),
      });
      if (!response.ok) throw new Error("Failed to create candidates");
      return response.json();
    },
    onSuccess: async (newCandidates) => {
      // 캐시에 즉시 추가
      queryClient.setQueryData(['candidates'], (old: any[]) => [...(old || []), ...newCandidates]);
      await refetch();
      toast({ title: "성공", description: `${newCandidates.length}명의 평가대상이 추가되었습니다.` });
    },
    onError: () => {
      toast({ title: "오류", description: "평가대상 일괄 추가에 실패했습니다.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!data || Object.keys(data).length === 0) {
        throw new Error("No data to update");
      }
      
      const response = await fetch(`/api/admin/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update candidate");
      return response.json();
    },
    onSuccess: async (updatedCandidate, { id }) => {
      // 캐시에서 즉시 업데이트
      queryClient.setQueryData(['candidates'], (old: any[]) =>
        old?.map(candidate =>
          candidate.id === id ? { ...candidate, ...updatedCandidate } : candidate
        ) || []
      );
      await refetch();
      toast({ title: "성공", description: "평가대상이 수정되었습니다." });
      setEditingCandidate(null);
      setIsAddingCandidate(false);
      setNewCandidate({ name: "", department: "", position: "", category: "", mainCategory: "", subCategory: "", description: "", sort_order: 0 });
    },
    onError: (error: any) => {
      if (error.message === "No data to update") return;
      toast({ title: "오류", description: "평가대상 수정에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/candidates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete candidate");
      return response.json();
    },
    onSuccess: async (_, id) => {
      // 캐시에서 즉시 제거
      queryClient.setQueryData(['candidates'], (old: any[]) =>
        old?.filter(candidate => candidate.id !== id) || []
      );
      await refetch();
      toast({ title: "성공", description: "평가대상이 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "평가대상 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  // 폼 핸들러들
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const combinedCategory = newCandidate.mainCategory && newCandidate.subCategory 
      ? `${newCandidate.mainCategory} > ${newCandidate.subCategory}` 
      : newCandidate.mainCategory || newCandidate.category;
    
    const candidateData = {
      name: newCandidate.name,
      department: newCandidate.department,
      position: newCandidate.position,
      category: combinedCategory,
      mainCategory: newCandidate.mainCategory,
      subCategory: newCandidate.subCategory,
      description: newCandidate.description,
      sort_order: newCandidate.sort_order,
    };

    if (editingCandidate) {
      updateMutation.mutate({ id: editingCandidate.id, data: candidateData });
    } else {
      createMutation.mutate(candidateData);
    }
  };

  const handleEdit = (candidate: any) => {
    setEditingCandidate(candidate);
    let mainCategory = candidate.mainCategory || "";
    let subCategory = candidate.subCategory || "";
    if ((!mainCategory || !subCategory) && candidate.category && candidate.category.includes(" > ")) {
      const parts = candidate.category.split(" > ");
      mainCategory = parts[0] || "";
      subCategory = parts[1] || "";
    }
    setNewCandidate({
      name: candidate.name,
      department: candidate.department,
      position: candidate.position,
      category: candidate.category,
      mainCategory,
      subCategory,
      description: candidate.description || "",
      sort_order: candidate.sortOrder || candidate.sort_order || 0,
    });
    setIsAddingCandidate(true);
  };

  const handleDelete = (candidate: any) => {
    if (window.confirm(`정말로 "${candidate.name}" 평가대상을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(candidate.id);
    }
  };

  const handleCancel = () => {
    setEditingCandidate(null);
    setIsAddingCandidate(false);
    setNewCandidate({ name: "", department: "", position: "", category: "", mainCategory: "", subCategory: "", description: "", sort_order: 0 });
  };

  // 엑셀 관련 핸들러들
  const handleExcelUpload = async (file: File) => {
    try {
      const data = await parseExcelFile(file);
      const validCandidates = data.map((row: any, index: number) => {
        let mainCategory = row['구분'] || row['mainCategory'] || '';
        let subCategory = row['세부구분'] || row['subCategory'] || '';
        let category = mainCategory && subCategory ? `${mainCategory} > ${subCategory}` : mainCategory || '';
        return {
          name: row['기관명(성명)'] || row['이름'] || row['name'] || '',
          department: row['소속(부서)'] || row['부서'] || row['department'] || '',
          position: row['직책(직급)'] || row['직책'] || row['position'] || '',
          category,
          mainCategory,
          subCategory,
          description: row['설명'] || row['description'] || '',
          sort_order: index,
        };
      }).filter(candidate => candidate.name && candidate.department);
      
      if (validCandidates.length === 0) {
        toast({ title: "오류", description: "유효한 평가대상 데이터가 없습니다.", variant: "destructive" });
        return;
      }
      bulkCreateMutation.mutate(validCandidates);
    } catch (error) {
      toast({ title: "오류", description: "엑셀 파일 처리 중 오류가 발생했습니다.", variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleExcelUpload(file);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "기관명(성명)": "홍길동",
        "소속(부서)": "기획팀",
        "직책(직급)": "과장",
        구분: "신규",
        세부구분: "일시동행",
        설명: "기획업무 담당"
      },
      {
        "기관명(성명)": "김영희",
        "소속(부서)": "마케팅팀",
        "직책(직급)": "대리",
        구분: "재협약",
        세부구분: "주거편의",
        설명: "마케팅 전략 수립"
      },
      {
        "기관명(성명)": "박철수",
        "소속(부서)": "개발팀",
        "직책(직급)": "팀장",
        구분: "신규",
        세부구분: "식사배달",
        설명: "시스템 개발 총괄"
      }
    ];
    exportToExcel(templateData, `평가대상_업로드_템플릿.xlsx`);
    toast({ title: "성공", description: "업로드 템플릿 파일이 다운로드되었습니다." });
  };

  const isAnyOperationInProgress = 
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkCreateMutation.isPending;

  if (isLoading) {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">평가대상 관리</h1>
            <p className="text-lg text-gray-600">평가 대상을 관리할 수 있습니다.</p>
            <p className="text-sm text-gray-500 mt-2">
              💡 엑셀 업로드 형식: 기관명(성명), 소속(부서), 직책(직급), 구분, 설명 컬럼을 포함해주세요.
            </p>
            {/* 실시간 상태 정보 */}
            <div className="text-xs text-gray-400 mt-2 space-x-4">
              <span>🌐 서버: {candidates.length}개</span>
              <span>⏳ 처리중: {pendingOperations.size}개</span>
              <span>❌ 실패: {failedOperations.size}개</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkCreateMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {bulkCreateMutation.isPending ? "업로드 중..." : "엑셀 업로드"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              예시파일 다운
            </Button>
            <Button onClick={() => setIsAddingCandidate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              평가대상 추가
            </Button>
          </div>
        </div>

        {isAddingCandidate && (
          <Card className="mb-6 card-professional">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-xl">
              <CardTitle className="text-xl text-gray-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {editingCandidate ? "평가대상 수정" : "새 평가대상 추가"}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">평가대상 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">기관명(성명) *</label>
                    <Input
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      required
                      className="input-professional h-12"
                      placeholder="기관명 또는 성명을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">소속(부서)</label>
                    <Input
                      value={newCandidate.department}
                      onChange={(e) => setNewCandidate({ ...newCandidate, department: e.target.value })}
                      className="input-professional h-12"
                      placeholder="소속 또는 부서를 입력하세요 (선택사항)"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">직책(직급)</label>
                    <Input
                      value={newCandidate.position}
                      onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                      className="input-professional h-12"
                      placeholder="직책 또는 직급을 입력하세요 (선택사항)"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center justify-between">
                      구분
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCategoryManager(true)}
                        className="h-6 px-2 text-xs"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        관리
                      </Button>
                    </label>
                    <div className="relative">
                      <Select 
                        value={newCandidate.mainCategory}
                        onValueChange={(value) => setNewCandidate({ ...newCandidate, mainCategory: value })}
                      >
                        <SelectTrigger className="input-professional h-12 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors duration-200 shadow-sm hover:shadow-md">
                          <SelectValue placeholder="구분 선택" />
                        </SelectTrigger>
                        <SelectContent 
                          className="z-[100] border-2 border-gray-200 dark:border-gray-600 shadow-2xl bg-white dark:bg-gray-800 rounded-xl overflow-hidden"
                          position="popper"
                          sideOffset={4}
                        >
                          {managedCategories.main.map((category: string) => (
                            <SelectItem 
                              key={category} 
                              value={category}
                              className="hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer py-3 px-4 transition-colors duration-150"
                            >
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">세부 구분</label>
                    <div className="relative">
                      <Select 
                        value={newCandidate.subCategory}
                        onValueChange={(value) => setNewCandidate({ ...newCandidate, subCategory: value })}
                      >
                        <SelectTrigger className="input-professional h-12 border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 transition-colors duration-200 shadow-sm hover:shadow-md">
                          <SelectValue placeholder="세부 구분 선택" />
                        </SelectTrigger>
                        <SelectContent 
                          className="z-[100] border-2 border-gray-200 dark:border-gray-600 shadow-2xl bg-white dark:bg-gray-800 rounded-xl overflow-hidden"
                          position="popper"
                          sideOffset={4}
                        >
                          {managedCategories.sub.map((category: string) => (
                            <SelectItem 
                              key={category} 
                              value={category}
                              className="hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer py-3 px-4 transition-colors duration-150"
                            >
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">설명</label>
                    <Input
                      value={newCandidate.description}
                      onChange={(e) => setNewCandidate({ ...newCandidate, description: e.target.value })}
                      className="input-professional h-12"
                      placeholder="평가대상에 대한 간단한 설명을 입력하세요 (선택사항)"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={isAnyOperationInProgress}
                    className="btn-gradient-primary px-8 py-3 h-12"
                  >
                    {editingCandidate ? 
                      (updateMutation.isPending ? "수정 중..." : "수정") : 
                      (createMutation.isPending ? "추가 중..." : "추가")
                    }
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                    className="px-8 py-3 h-12 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                    disabled={isAnyOperationInProgress}
                  >
                    취소
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="card-professional">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-t-xl">
            <CardTitle className="text-xl text-gray-800 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              평가대상 목록
              {isFetching && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {pendingOperations.size > 0 && (
                <span className="text-sm text-blue-600 animate-pulse">
                  동기화 중: {pendingOperations.size}개
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              총 {candidates.length}명의 평가대상이 등록되어 있습니다.
              {filteredAndSortedCandidates.length !== candidates.length && 
                ` (검색 결과: ${filteredAndSortedCandidates.length}명)`
              }
              {failedOperations.size > 0 && (
                <span className="text-red-600 ml-2">⚠️ {failedOperations.size}개 동기화 실패</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 검색 및 필터 영역 */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="기관명(이름), 직책(직급), 구분으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="active">활성</SelectItem>
                    <SelectItem value="inactive">비활성</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={mainCategoryFilter} onValueChange={setMainCategoryFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="구분" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 구분</SelectItem>
                    {Array.from(new Set(candidates.map((c: any) => c.mainCategory).filter(Boolean))).map((category: any) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="세부구분" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 세부구분</SelectItem>
                    {Array.from(new Set(candidates.map((c: any) => c.subCategory).filter(Boolean))).map((category: any) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={resetFilters}
                  className="px-4"
                >
                  필터 초기화
                </Button>
              </div>
            </div>

            {/* 컨트롤 버튼들 */}
            <div className="flex gap-2 mb-4 justify-between">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isFetching}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                  서버 동기화
                </Button>
              </div>
              
              <div className="flex gap-2 items-center">
                {selectedIds.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedIds.length}개 선택됨
                  </span>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleBulkToggle(true)} 
                  disabled={false}
                  className="relative"
                >
                  ⚡ {selectedIds.length > 0 ? `선택항목 활성화 (${selectedIds.length})` : "전체 활성화"}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleBulkToggle(false)} 
                  disabled={false}
                  className="relative"
                >
                  ⚡ {selectedIds.length > 0 ? `선택항목 비활성화 (${selectedIds.length})` : "전체 비활성화"}
                </Button>
              </div>
            </div>

            {/* 테이블 */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.length === paginatedCandidates.length && paginatedCandidates.length > 0} 
                        onChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("mainCategory")}
                    >
                      <div className="flex items-center gap-2">
                        구분
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("subCategory")}
                    >
                      <div className="flex items-center gap-2">
                        세부구분
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-2">
                        기관명(성명)
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("department")}
                    >
                      <div className="flex items-center gap-2">
                        소속(부서)
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("position")}
                    >
                      <div className="flex items-center gap-2">
                        직책(직급)
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("isActive")}
                    >
                      <div className="flex items-center gap-2">
                        상태
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCandidates.map((candidate: any) => {
                    const isPending = pendingOperations.has(candidate.id);
                    const isFailed = failedOperations.has(candidate.id);
                    
                    return (
                      <TableRow 
                        key={candidate.id}
                        className={isPending ? "opacity-75 bg-blue-50" : isFailed ? "bg-red-50" : ""}
                      >
                        <TableCell>
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(candidate.id)} 
                            onChange={() => handleSelect(candidate.id)}
                          />
                        </TableCell>
                        <TableCell>{candidate.mainCategory || "정보 없음"}</TableCell>
                        <TableCell>{candidate.subCategory || "정보 없음"}</TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {candidate.name}
                              {isPending && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
                              {isFailed && <AlertCircle className="h-3 w-3 text-red-500" />}
                              {!isPending && !isFailed && <CheckCircle className="h-3 w-3 text-green-500" />}
                            </div>
                            {candidate.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {candidate.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{candidate.department || "정보 없음"}</TableCell>
                        <TableCell>{candidate.position || "정보 없음"}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={candidate.isActive ? "default" : "secondary"}
                            className={`px-2 py-1 ${isPending ? 'animate-pulse' : ''}`}
                          >
                            {candidate.isActive ? "활성" : "비활성"}
                            {isPending && " (동기화중)"}
                            {isFailed && " (실패)"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleIndividualToggle(candidate)}
                              className="h-8 px-2 text-xs relative"
                            >
                              ⚡ {candidate.isActive ? "비활성화" : "활성화"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEdit(candidate)}
                              className="h-8 w-8 p-0"
                              disabled={isAnyOperationInProgress}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDelete(candidate)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              disabled={isAnyOperationInProgress}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            {/* 빈 상태 */}
            {paginatedCandidates.length === 0 && (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {filteredAndSortedCandidates.length === 0 ? "검색 결과가 없습니다" : "등록된 평가대상이 없습니다"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {filteredAndSortedCandidates.length === 0 
                    ? "다른 검색어나 필터를 시도해보세요."
                    : "상단의 '평가대상 추가' 버튼을 사용하여 첫 평가대상을 추가해보세요."
                  }
                </p>
                {filteredAndSortedCandidates.length === 0 && (
                  <Button 
                    onClick={resetFilters}
                    variant="outline"
                    className="mr-2"
                  >
                    필터 초기화
                  </Button>
                )}
                <Button 
                  onClick={() => setIsAddingCandidate(true)}
                  className="btn-gradient-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  평가대상 추가하기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 카테고리 관리 다이얼로그 */}
        <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
          <DialogContent className="max-w-4xl max-h-[75vh] overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-2xl">
            <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                구분/세부구분 관리
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 구분 관리 */}
                <Card className="card-professional">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <CardTitle className="text-lg text-gray-800 dark:text-white">구분 관리</CardTitle>
                    <CardDescription>평가대상의 주요 구분을 관리합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="새 구분 입력"
                        value={newCategoryInput.main}
                        onChange={(e) => setNewCategoryInput({ ...newCategoryInput, main: e.target.value })}
                        className="flex-1"
                      />
                      <Button onClick={addMainCategory} size="sm">
                        추가
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {managedCategories.main.map((category: string) => (
                        <div key={category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{category}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMainCategory(category)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 세부구분 관리 */}
                <Card className="card-professional">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                    <CardTitle className="text-lg text-gray-800 dark:text-white">세부구분 관리</CardTitle>
                    <CardDescription>평가대상의 세부 구분을 관리합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="새 세부구분 입력"
                        value={newCategoryInput.sub}
                        onChange={(e) => setNewCategoryInput({ ...newCategoryInput, sub: e.target.value })}
                        className="flex-1"
                      />
                      <Button onClick={addSubCategory} size="sm">
                        추가
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {managedCategories.sub.map((category: string) => (
                        <div key={category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{category}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeSubCategory(category)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}