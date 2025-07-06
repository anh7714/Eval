import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, BarChart3, Users, Trophy, Clipboard, Search, Filter, ArrowUpDown, TrendingUp, AlertCircle, CheckCircle, Upload, Save, X, Printer, Edit3, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResultsManagement() {
  const { toast } = useToast();
  
  // 테이블 관련 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("totalScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 평가 템플릿 관련 상태
  const [columnConfig, setColumnConfig] = useState([
    { id: 'section', title: '구분', type: 'section', visible: true, required: true, width: 'w-32' },
    { id: 'item', title: '세부 항목', type: 'text', visible: true, required: true, width: 'flex-1' },
    { id: 'type', title: '유형', type: 'select', visible: true, required: false, width: 'w-16', options: ['정량', '정성'] },
    { id: 'points', title: '배점', type: 'number', visible: true, required: true, width: 'w-16' },
    { id: 'score', title: '평가점수', type: 'number', visible: true, required: true, width: 'w-20' },
  ]);

  const [selectedEvaluator, setSelectedEvaluator] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [batchPrintMode, setBatchPrintMode] = useState(false);

  const [evaluator, setEvaluator] = useState({
    name: '평가위원명',
    position: '직책',
    department: '소속기관'
  });

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

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/admin/results"],
  });

  const { data: progress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["/api/admin/evaluator-progress"],
  });

  // 평가위원 목록 가져오기
  const { data: evaluators = [] } = useQuery({
    queryKey: ["/api/admin/evaluators"],
  });

  // 평가대상 목록 가져오기
  const { data: candidates = [] } = useQuery({
    queryKey: ["/api/admin/candidates"],
  });

  // 선택된 평가대상의 정보
  const selectedCandidateInfo = selectedCandidate 
    ? (candidates as any[]).find((c: any) => c.id === selectedCandidate)
    : null;

  // 평가 템플릿 헬퍼 함수들
  const calculateSectionScore = (section: any) => {
    return section.items.reduce((sum: any, item: any) => sum + item.points, 0);
  };

  const calculateTotalScore = () => {
    return currentTemplate.sections.reduce((total: any, section: any) => 
      total + section.items.reduce((sum: any, item: any) => sum + item.score, 0), 0
    );
  };

  const getDynamicTitle = () => {
    if (!selectedCandidateInfo) return currentTemplate.title;
    
    const baseTitle = currentTemplate.title.replace("제공기관 선정 심의회", "");
    return `${selectedCandidateInfo.name} ${baseTitle}`.trim();
  };

  // 템플릿 편집 함수들
  const updateSection = (sectionId: string, field: string, value: any) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId ? { ...section, [field]: value } : section
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

  const updateScore = (sectionId: string, itemId: number, score: number) => {
    updateItem(sectionId, itemId, 'score', score);
  };

  const addSection = () => {
    const newId = String.fromCharCode(65 + currentTemplate.sections.length); // A, B, C...
    const newSection = {
      id: newId,
      title: '새 구분',
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
                id: section.items.length + 1,
                text: '새 항목',
                type: '정성',
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

  const addColumn = () => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      title: '새 컬럼',
      type: 'text',
      visible: true,
      required: false,
      width: 'w-16'
    };
    setColumnConfig(prev => [...prev, newColumn]);
  };

  const updateColumnConfig = (columnId: string, field: string, value: any) => {
    setColumnConfig(prev => 
      prev.map(col => col.id === columnId ? { ...col, [field]: value } : col)
    );
  };

  const deleteColumn = (columnId: string) => {
    setColumnConfig(prev => prev.filter(col => col.id !== columnId));
  };

  const resetScores = () => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        items: section.items.map(item => ({ ...item, score: 0 }))
      }))
    }));
  };

  const saveTemplate = () => {
    const dataStr = JSON.stringify(currentTemplate, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evaluation-template.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveAsExcel = () => {
    // Excel 저장 기능 구현
    toast({ title: "알림", description: "Excel 저장 기능이 곧 추가됩니다." });
  };

  const loadTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const template = JSON.parse(e.target?.result as string);
        setCurrentTemplate(template);
        toast({ title: "성공", description: "템플릿이 로드되었습니다." });
      } catch (error) {
        toast({ title: "오류", description: "템플릿 파일을 읽을 수 없습니다.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const printTemplate = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = document.getElementById('template-print-area')?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>평가표 인쇄</title>
          <style>
            @media print {
              @page { 
                size: A4; 
                margin: 25mm 15mm 15mm 15mm; 
              }
              body { 
                font-family: 'Malgun Gothic', sans-serif; 
                font-size: 12px; 
                line-height: 1.4; 
                margin: 0; 
                padding: 0; 
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 10px; 
              }
              th, td { 
                border: 1px solid #333; 
                padding: 8px; 
                text-align: center; 
                vertical-align: middle; 
                word-break: keep-all; 
              }
              .title { 
                font-size: 18px; 
                font-weight: bold; 
                text-align: center; 
              }
              .type-cell, .points-cell, .score-cell { 
                text-align: center; 
                vertical-align: middle; 
              }
              .bg-blue-50 { 
                background-color: #eff6ff !important; 
              }
              .bg-gray-100 { 
                background-color: #f3f4f6 !important; 
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const printAllCombinations = () => {
    if ((candidates as any[]).length === 0 || (evaluators as any[]).length === 0) {
      toast({ title: "오류", description: "평가위원과 평가대상이 모두 필요합니다.", variant: "destructive" });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let allContent = '';
    
    (candidates as any[]).forEach((candidate: any, candidateIndex: number) => {
      (evaluators as any[]).forEach((evaluator: any, evaluatorIndex: number) => {
        const pageBreak = (candidateIndex > 0 || evaluatorIndex > 0) ? '<div style="page-break-before: always;"></div>' : '';
        
        allContent += `
          ${pageBreak}
          <div class="evaluation-form">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; margin-bottom: 0;">
              <tbody>
                <tr>
                  <td colspan="2" style="border: 1px solid #333; padding: 8px; text-align: right; font-size: 12px;">
                    구분 : ${candidate.category || candidate.department}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border: 1px solid #333; padding: 16px; text-align: center; font-size: 18px; font-weight: bold;">
                    ${candidate.name} ${currentTemplate.title.replace("제공기관 선정 심의회", "")}
                  </td>
                </tr>
              </tbody>
            </table>
            
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #333;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">
                    구분 (${currentTemplate.sections.reduce((sum: any, section: any) => sum + section.items.reduce((itemSum: any, item: any) => itemSum + item.points, 0), 0)}점)
                  </th>
                  <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">세부 항목</th>
                  ${columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => 
                    `<th style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold; width: 60px;">${column.title}</th>`
                  ).join('')}
                </tr>
              </thead>
              <tbody>
                ${currentTemplate.sections.flatMap((section: any) => 
                  section.items.map((item: any, itemIndex: number) => `
                    <tr>
                      ${itemIndex === 0 ? `
                        <td rowspan="${section.items.length}" style="border: 1px solid #333; padding: 12px; font-weight: bold; background-color: #eff6ff; text-align: center; vertical-align: middle;">
                          <div style="font-weight: bold; font-size: 12px;">${section.id}. ${section.title}</div>
                          <div style="font-size: 10px; color: #666; margin-top: 4px; text-align: center;">
                            (${calculateSectionScore(section)}점)
                          </div>
                        </td>
                      ` : ''}
                      <td style="border: 1px solid #333; padding: 8px; font-size: 12px;">
                        ${itemIndex + 1}. ${item.text}
                      </td>
                      ${columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => `
                        <td style="border: 1px solid #333; padding: 8px; text-align: center; vertical-align: middle; font-size: 11px;">
                          ${column.id === 'points' ? `${item[column.id]}점` : 
                            column.id === 'score' ? '' : 
                            item[column.id] || ''}
                        </td>
                      `).join('')}
                    </tr>
                  `)
                ).join('')}
                <tr style="background-color: #f3f4f6; font-weight: bold;">
                  <td style="border: 1px solid #333; padding: 12px; text-align: center;">합계</td>
                  <td style="border: 1px solid #333; padding: 12px;"></td>
                  ${columnConfig.filter(col => col.visible && !['section', 'item'].includes(col.id)).map(column => `
                    <td style="border: 1px solid #333; padding: 8px; text-align: center; vertical-align: middle;">
                      ${column.id === 'points' ? 
                        `${currentTemplate.sections.reduce((sum: any, section: any) => sum + section.items.reduce((itemSum: any, item: any) => itemSum + item.points, 0), 0)}점` : 
                        column.id === 'score' ? '점' : ''}
                    </td>
                  `).join('')}
                </tr>
              </tbody>
            </table>
          </div>
        `;
      });
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>전체 평가표 인쇄</title>
          <style>
            @media print {
              @page { 
                size: A4; 
                margin: 25mm 15mm 15mm 15mm; 
              }
              body { 
                font-family: 'Malgun Gothic', sans-serif; 
                margin: 0; 
                padding: 0; 
              }
              .evaluation-form {
                page-break-after: always;
              }
              .evaluation-form:last-child {
                page-break-after: avoid;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
              }
              th, td { 
                border: 1px solid #333; 
                text-align: center; 
                vertical-align: middle; 
                word-break: keep-all; 
              }
            }
          </style>
        </head>
        <body>
          ${allContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const printByEvaluator = (evaluatorId: number) => {
    const evaluator = (evaluators as any[]).find((e: any) => e.id === evaluatorId);
    if (!evaluator) return;
    
    toast({ title: "알림", description: `${evaluator.name} 평가위원의 모든 평가표를 인쇄합니다.` });
    // 구현 예정
  };

  const printByCandidate = (candidateId: number) => {
    const candidate = (candidates as any[]).find((c: any) => c.id === candidateId);
    if (!candidate) return;
    
    toast({ title: "알림", description: `${candidate.name} 평가대상의 모든 평가표를 인쇄합니다.` });
    // 구현 예정
  };

  // 필터링 및 정렬 로직
  const filterAndSortResults = (data: any[]) => {
    return data
      .filter((result: any) => {
        const matchesSearch = 
          result.candidate?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.candidate?.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.candidate?.category?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || 
          (statusFilter === "completed" && result.completedEvaluations === result.evaluatorCount) ||
          (statusFilter === "inProgress" && result.completedEvaluations > 0 && result.completedEvaluations < result.evaluatorCount) ||
          (statusFilter === "notStarted" && result.completedEvaluations === 0);
        
        return matchesSearch && matchesStatus;
      })
      .sort((a: any, b: any) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        if (sortField === "totalScore" || sortField === "percentage") {
          aValue = aValue || 0;
          bValue = bValue || 0;
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }
        
        if (sortField === "candidateName") {
          aValue = a.candidate?.name || "";
          bValue = b.candidate?.name || "";
          return sortDirection === "asc" 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (sortField === "completionStatus") {
          const aCompleted = a.completedEvaluations === a.evaluatorCount;
          const bCompleted = b.completedEvaluations === b.evaluatorCount;
          return sortDirection === "asc" 
            ? (aCompleted ? 1 : -1)
            : (aCompleted ? -1 : 1);
        }
        
        return 0;
      });
  };

  const filteredAndSortedResults = filterAndSortResults(results);

  // 페이지네이션 로직
  const totalPages = Math.ceil(filteredAndSortedResults.length / itemsPerPage);
  const paginatedResults = filteredAndSortedResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 정렬 핸들러
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // 검색/필터 리셋
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const handleExportResults = async () => {
    try {
      const response = await fetch("/api/admin/export-results", {
        method: "GET",
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `평가결과_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({ title: "성공", description: "결과가 다운로드되었습니다." });
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      toast({ title: "오류", description: "결과 내보내기에 실패했습니다.", variant: "destructive" });
    }
  };

  if (resultsLoading || progressLoading) {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">결과 관리</h1>
            <p className="text-lg text-gray-600">평가 결과를 조회하고 분석할 수 있습니다.</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleExportResults} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              결과 내보내기
            </Button>
          </div>
        </div>

        <Tabs defaultValue="results" className="space-y-6">
          <TabsList>
            <TabsTrigger value="results">최종 결과</TabsTrigger>
            <TabsTrigger value="progress">진행 현황</TabsTrigger>
            <TabsTrigger value="templates">평가표 템플릿</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span>후보자별 최종 결과</span>
                </CardTitle>
                <CardDescription>
                  모든 평가가 완료된 후보자들의 최종 점수입니다.
                  {filteredAndSortedResults.length !== results.length && 
                    ` (검색 결과: ${filteredAndSortedResults.length}명)`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 검색 및 필터 영역 */}
                <div className="mb-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* 검색 */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="후보자명, 부서, 구분으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* 상태 필터 */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="상태" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 상태</SelectItem>
                        <SelectItem value="completed">완료</SelectItem>
                        <SelectItem value="inProgress">진행중</SelectItem>
                        <SelectItem value="notStarted">미시작</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* 필터 리셋 */}
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

                {/* 테이블 */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("candidateName")}
                        >
                          <div className="flex items-center gap-2">
                            후보자
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>소속/부서</TableHead>
                        <TableHead>구분</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("totalScore")}
                        >
                          <div className="flex items-center gap-2">
                            최종 점수
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("percentage")}
                        >
                          <div className="flex items-center gap-2">
                            완료율
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>평가 현황</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("completionStatus")}
                        >
                          <div className="flex items-center gap-2">
                            상태
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedResults.map((result: any) => (
                        <TableRow key={result.candidate.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold">{result.candidate.name}</div>
                              {result.candidate.position && (
                                <div className="text-sm text-gray-500">{result.candidate.position}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{result.candidate.department || "정보 없음"}</TableCell>
                          <TableCell>{result.candidate.category || "정보 없음"}</TableCell>
                          <TableCell>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {result.totalScore.toFixed(1)}점
                              </div>
                              <div className="text-sm text-gray-500">
                                {result.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {result.completedEvaluations}/{result.evaluatorCount}
                              </div>
                              <div className="text-xs text-gray-500">
                                평가자 {result.evaluatorCount}명 중
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={(result.completedEvaluations / result.evaluatorCount) * 100} 
                                className="h-2 flex-1"
                              />
                              <span className="text-xs text-gray-500">
                                {Math.round((result.completedEvaluations / result.evaluatorCount) * 100)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={result.completedEvaluations === result.evaluatorCount ? "default" : 
                                result.completedEvaluations > 0 ? "secondary" : "destructive"}
                              className="px-2 py-1"
                            >
                              {result.completedEvaluations === result.evaluatorCount ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  완료
                                </div>
                              ) : result.completedEvaluations > 0 ? (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  진행중
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  미시작
                                </div>
                              )}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
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
                {paginatedResults.length === 0 && (
                  <div className="text-center py-12">
                    <Trophy className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {filteredAndSortedResults.length === 0 ? "검색 결과가 없습니다" : "아직 완료된 평가 결과가 없습니다"}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {filteredAndSortedResults.length === 0 
                        ? "다른 검색어나 필터를 시도해보세요."
                        : "평가가 진행되면 결과가 여기에 표시됩니다."
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>평가자별 진행 현황</span>
                  </CardTitle>
                  <CardDescription>
                    각 평가자의 평가 완료 현황입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {progress.map((evaluator: any) => (
                      <div key={evaluator.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{evaluator.name}</h4>
                            <p className="text-sm text-gray-600">{evaluator.department}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {evaluator.completed}/{evaluator.total}
                            </div>
                            <div className="text-xs text-gray-500">
                              {evaluator.progress.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <Progress value={evaluator.progress} className="h-2" />
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>진행률</span>
                          <Badge 
                            variant={evaluator.progress === 100 ? "default" : 
                              evaluator.progress > 0 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {evaluator.progress === 100 ? "완료" : 
                              evaluator.progress > 0 ? "진행중" : "미시작"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {progress.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        등록된 평가자가 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>전체 진행률</span>
                  </CardTitle>
                  <CardDescription>
                    시스템 전체의 평가 진행 현황을 확인할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {progress.length > 0 ? 
                          (progress.reduce((sum: number, p: any) => sum + p.progress, 0) / progress.length).toFixed(1)
                          : 0
                        }%
                      </div>
                      <p className="text-gray-600">전체 평균 완료율</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-semibold text-green-600">
                          {progress.filter((p: any) => p.progress === 100).length}
                        </div>
                        <p className="text-sm text-gray-600">완료된 평가자</p>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-2xl font-semibold text-orange-600">
                          {progress.filter((p: any) => p.progress > 0 && p.progress < 100).length}
                        </div>
                        <p className="text-sm text-gray-600">진행중인 평가자</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">평가 진행 현황</span>
                        <span className="text-sm text-gray-500">
                          {progress.filter((p: any) => p.progress > 0).length}/{progress.length}명
                        </span>
                      </div>
                      <Progress 
                        value={progress.length > 0 ? 
                          (progress.filter((p: any) => p.progress > 0).length / progress.length) * 100 : 0
                        } 
                        className="h-3"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="templates">
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

                  {/* 평가위원 및 평가대상 선택 */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-bold mb-3 text-blue-800">평가위원 및 평가대상 선택</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium mb-2 text-gray-700">평가위원 선택</label>
                        <select
                          value={selectedEvaluator || ''}
                          onChange={(e) => setSelectedEvaluator(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full text-sm border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">평가위원을 선택하세요</option>
                          {(evaluators as any[]).map((evaluator: any) => (
                            <option key={evaluator.id} value={evaluator.id}>
                              {evaluator.name} ({evaluator.department})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-2 text-gray-700">평가대상 선택</label>
                        <select
                          value={selectedCandidate || ''}
                          onChange={(e) => setSelectedCandidate(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full text-sm border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">평가대상을 선택하세요</option>
                          {(candidates as any[]).map((candidate: any) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name} ({candidate.department})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 개선된 인쇄 옵션 */}
                    <div className="mt-4 space-y-3">
                      {/* 전체 배치 인쇄 */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-blue-800">전체 배치 인쇄</div>
                          <div className="text-xs text-gray-600">모든 평가위원 × 모든 평가대상 ({(candidates as any[]).length}명 × {(evaluators as any[]).length}명 = {(candidates as any[]).length * (evaluators as any[]).length}페이지)</div>
                        </div>
                        <Button 
                          onClick={printAllCombinations}
                          variant="default"
                          size="sm"
                          disabled={(candidates as any[]).length === 0 || (evaluators as any[]).length === 0}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          전체 인쇄
                        </Button>
                      </div>

                      {/* 추후 확장용: 개별 선택 인쇄 옵션들 */}
                      {((candidates as any[]).length > 0 && (evaluators as any[]).length > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                          {/* 평가위원별 인쇄 */}
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="font-medium text-sm text-gray-700 mb-2">평가위원별 일괄 인쇄</div>
                            <div className="text-xs text-gray-500 mb-2">특정 평가위원의 모든 평가표</div>
                            <select 
                              className="w-full text-xs border rounded px-2 py-1 bg-white mb-2"
                              onChange={(e) => e.target.value && printByEvaluator(parseInt(e.target.value))}
                              defaultValue=""
                            >
                              <option value="">평가위원 선택</option>
                              {(evaluators as any[]).map((evaluator: any) => (
                                <option key={evaluator.id} value={evaluator.id}>
                                  {evaluator.name} ({(candidates as any[]).length}페이지)
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 평가대상별 인쇄 */}
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="font-medium text-sm text-gray-700 mb-2">평가대상별 일괄 인쇄</div>
                            <div className="text-xs text-gray-500 mb-2">특정 평가대상의 모든 평가표</div>
                            <select 
                              className="w-full text-xs border rounded px-2 py-1 bg-white mb-2"
                              onChange={(e) => e.target.value && printByCandidate(parseInt(e.target.value))}
                              defaultValue=""
                            >
                              <option value="">평가대상 선택</option>
                              {(candidates as any[]).map((candidate: any) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name} ({(evaluators as any[]).length}페이지)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* 인쇄 팁 */}
                      <div className="text-xs text-gray-600 p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                        <span className="text-orange-600 font-medium">💡 인쇄 팁:</span> 브라우저 인쇄 설정에서 '머리글 및 바닥글' 옵션을 해제하면 더 깨끗한 출력이 가능합니다
                      </div>
                    </div>
                  </div>

                  {/* 평가위원 정보 편집 (편집 모드에서만 표시) */}
                  {isEditing && (
                    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h3 className="text-sm font-bold mb-3 text-yellow-800">수동 평가위원 정보 입력</h3>
                      <div className="text-xs text-yellow-700 mb-3">
                        위에서 평가위원을 선택하지 않은 경우 수동으로 입력할 수 있습니다.
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1">이름</label>
                          <Input
                            value={evaluator.name}
                            onChange={(e) => setEvaluator(prev => ({ ...prev, name: e.target.value }))}
                            className="text-sm"
                            placeholder="평가위원 이름"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">직책</label>
                          <Input
                            value={evaluator.position}
                            onChange={(e) => setEvaluator(prev => ({ ...prev, position: e.target.value }))}
                            className="text-sm"
                            placeholder="직책"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">소속기관</label>
                          <Input
                            value={evaluator.department}
                            onChange={(e) => setEvaluator(prev => ({ ...prev, department: e.target.value }))}
                            className="text-sm"
                            placeholder="소속기관"
                          />
                        </div>
                      </div>
                    </div>
                  )}

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

                  {/* 인쇄용 영역 */}
                  <div id="template-print-area">
                    {/* 제목과 구분 정보 표 */}
                    <div className="overflow-x-auto mb-0">
                      <table className="w-full border-collapse border border-gray-400 text-sm">
                        <tbody>
                          <tr>
                            <td colSpan={2} className="border-t border-l border-r border-gray-400 p-2 text-sm text-right">
                              {selectedCandidateInfo && (
                                <span>구분 : {selectedCandidateInfo.category || selectedCandidateInfo.department}</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="border-l border-r border-b border-gray-400 p-4 text-center text-lg font-bold title">
                              {selectedCandidateInfo ? getDynamicTitle() : currentTemplate.title}
                            </td>
                          </tr>
                        </tbody>
                      </table>
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
                                              value={item[column.id] || (column.type === 'number' ? 0 : '')}
                                              onChange={(e) => updateItem(section.id, item.id, column.id, column.type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value)}
                                              className="text-xs text-center w-12 mx-auto"
                                            />
                                          </div>
                                        )
                                      ) : (
                                        <span className="text-xs">
                                          {column.id === 'points' ? `${item[column.id]}점` : 
                                           column.id === 'score' ? item[column.id] :
                                           item[column.id]}
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
                                {column.id === 'points' ? (
                                  `${currentTemplate.sections.reduce((sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + item.points, 0), 0)}점`
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