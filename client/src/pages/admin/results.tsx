import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Upload, Download, Save, X, Printer, Edit3, RefreshCw, FileText, Settings, Trophy, Users, BarChart3, ArrowUpDown, Search, Filter, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@supabase/supabase-js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { CSVLink } from 'react-csv';
import WysiwygReportEditor from "@/components/WysiwygReportEditor";

// Supabase 클라이언트 설정
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://bqgbppdppkhsqkekqrui.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZ2JwcGRwcGtoc3FrZWtxcnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTY5MDAsImV4cCI6MjA2NjkzMjkwMH0.dRlTpr_LuIofkxWuW5mv8m0rUNzztgEpzwkGbIHQQTc'
);

// 1. 데이터 소스별 키 목록 정의 (컴포넌트 상단에 추가)
// keyOptions 타입 정의
const keyOptions: Record<string, { key: string; label: string }[]> = {
  candidates: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '기관명' },
    { key: 'department', label: '소속기관' },
    { key: 'position', label: '직책' },
    { key: 'mainCategory', label: '구분' },
    { key: 'subCategory', label: '세부구분' },
    { key: 'rank', label: '순위' },
    { key: 'totalScore', label: '총점' },
    { key: 'percentage', label: '득점률' },
    { key: 'averageScore', label: '평균점수' },
    { key: 'status', label: '선정여부' }, // 선정여부(가상컬럼)
    { key: 'empty', label: '빈셀' }, // 빈셀용
  ],
  evaluators: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '이름' },
    { key: 'department', label: '소속기관' },
    { key: 'email', label: '이메일' },
    { key: 'progress', label: '진행률' },
    { key: 'completedCount', label: '완료수' },
    { key: 'empty', label: '빈셀' }, // 빈셀용
  ],
  results: [
    { key: 'candidateId', label: '후보자ID' },
    { key: 'evaluatorId', label: '평가위원ID' },
    { key: 'itemId', label: '평가항목ID' },
    { key: 'score', label: '점수' },
    { key: 'maxScore', label: '만점' },
    { key: 'comments', label: '코멘트' },
    { key: 'empty', label: '빈셀' }, // 빈셀용
  ]
};

// --- Visual DynamicReportTemplateEditor Component ---
type DynamicReportTemplateEditorProps = {
  template: any;
  setTemplate: (t: any) => void;
  onSave: () => void;
  isSaving: boolean;
};

function DynamicReportTemplateEditor({ template, setTemplate, onSave, isSaving }: DynamicReportTemplateEditorProps) {
  // Helper to update a section
  const updateSection = (idx: number, newSection: any) => {
    const newSections = [...template.sections];
    newSections[idx] = newSection;
    setTemplate({ ...template, sections: newSections });
  };

  // Helper to add a new section
  const addSection = () => {
    const newSection = {
      type: 'overview',
      title: '새 섹션',
      fields: [],
      columns: [],
      dataSource: '',
      text: '',
      date: ''
    };
    setTemplate({
      ...template,
      sections: [...template.sections, newSection]
    });
  };

  // Helper to remove a section
  const removeSection = (idx: number) => {
    const newSections = template.sections.filter((_: any, i: number) => i !== idx);
    setTemplate({ ...template, sections: newSections });
  };

  // Helper to add a field to overview section
  const addField = (sectionIdx: number) => {
    const section = template.sections[sectionIdx];
    const newField = { label: '', value: '' };
    updateSection(sectionIdx, {
      ...section,
      fields: [...(section.fields || []), newField]
    });
  };

  // Helper to remove a field from overview section
  const removeField = (sectionIdx: number, fieldIdx: number) => {
    const section = template.sections[sectionIdx];
    const newFields = section.fields.filter((_: any, i: number) => i !== fieldIdx);
    updateSection(sectionIdx, { ...section, fields: newFields });
  };

  // Helper to add a column to table section
  const addColumn = (sectionIdx: number) => {
    const section = template.sections[sectionIdx];
    const newColumn = { key: '', label: '' };
    updateSection(sectionIdx, {
      ...section,
      columns: [...(section.columns || []), newColumn]
    });
  };

  // Helper to remove a column from table section
  const removeColumn = (sectionIdx: number, columnIdx: number) => {
    const section = template.sections[sectionIdx];
    const newColumns = section.columns.filter((_: any, i: number) => i !== columnIdx);
    updateSection(sectionIdx, { ...section, columns: newColumns });
  };

  // Helper to handle section type change with default values
  const handleSectionTypeChange = (sectionIdx: number, newType: string) => {
    const section = template.sections[sectionIdx];
    let newSection = { ...section, type: newType };
    
    // Add default values based on type
    switch (newType) {
      case 'overview':
        newSection = { ...newSection, fields: section.fields || [] };
        break;
      case 'table':
        newSection = { ...newSection, columns: section.columns || [], dataSource: section.dataSource || '' };
        break;
      case 'note':
        newSection = { ...newSection, text: section.text || '' };
        break;
      case 'date':
        newSection = { ...newSection, date: section.date || '' };
        break;
    }
    
    updateSection(sectionIdx, newSection);
  };

  // 템플릿 JSON 다운로드 함수
  const handleDownloadTemplate = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", (template?.title || 'report_template') + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="space-y-6">
      {/* 제목 편집 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">보고서 제목</label>
        <Input
          value={template?.title || ''}
          onChange={(e) => setTemplate({ ...(template || {}), title: e.target.value })}
          placeholder="보고서 제목을 입력하세요"
        />
      </div>
      {/* 템플릿 JSON 다운로드 버튼 */}
      <div className="flex justify-end mb-2">
        <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" /> 템플릿 JSON 다운로드
        </Button>
      </div>

      {/* 섹션 추가 버튼 - 맨 위로 이동 */}
      <div className="flex justify-center">
        <Button onClick={addSection} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          섹션 추가
        </Button>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button 
          onClick={onSave} 
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {isSaving ? '저장 중...' : '템플릿 저장'}
        </Button>
      </div>

      {/* 섹션들 */}
      <div className="space-y-4">
        {template.sections?.map((section: any, sectionIdx: number) => (
          <Card key={section.title + sectionIdx} className="border-2 border-gray-200 hover:border-blue-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Input
                    value={section.title || ''}
                    onChange={(e) => updateSection(sectionIdx, { ...section, title: e.target.value })}
                    className="w-64 font-medium"
                    placeholder="섹션 제목"
                  />
                  <Select
                    value={section.type || 'overview'}
                    onValueChange={(value) => handleSectionTypeChange(sectionIdx, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">개요</SelectItem>
                      <SelectItem value="table">표</SelectItem>
                      <SelectItem value="note">안내문구</SelectItem>
                      <SelectItem value="date">날짜</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => removeSection(sectionIdx)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* 개요 섹션 */}
              {section.type === 'overview' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">개요 항목</label>
                    <Button onClick={() => addField(sectionIdx)} size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      항목 추가
                    </Button>
                  </div>
                  {(section.fields || []).map((field: any, fieldIdx: number) => (
                    <div key={field.label + fieldIdx} className="flex space-x-2">
                      <Input
                        value={field.label || ''}
                        onChange={(e) => {
                          const newFields = [...(section.fields || [])];
                          newFields[fieldIdx] = { ...field, label: e.target.value };
                          updateSection(sectionIdx, { ...section, fields: newFields });
                        }}
                        placeholder="라벨"
                        className="flex-1"
                      />
                      <Input
                        value={field.value || ''}
                        onChange={(e) => {
                          const newFields = [...(section.fields || [])];
                          newFields[fieldIdx] = { ...field, value: e.target.value };
                          updateSection(sectionIdx, { ...section, fields: newFields });
                        }}
                        placeholder="값"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => removeField(sectionIdx, fieldIdx)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* 표 섹션 */}
              {section.type === 'table' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">데이터 소스</label>
                    <Select
                      value={section.dataSource || ''}
                      onValueChange={(value) => updateSection(sectionIdx, { ...section, dataSource: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="데이터 소스 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="candidates">평가대상</SelectItem>
                        <SelectItem value="evaluators">평가위원</SelectItem>
                        <SelectItem value="results">평가결과</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">표 컬럼</label>
                    <Button onClick={() => addColumn(sectionIdx)} size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      컬럼 추가
                    </Button>
                  </div>
                  {(section.columns || []).map((column: any, columnIdx: number) => (
                    <div key={column.key + columnIdx} className="flex space-x-2">
                      {/* 키값 드롭다운 */}
                      <Select
                        value={column.key || ''}
                        onValueChange={(value) => {
                          const newColumns = [...(section.columns || [])];
                          newColumns[columnIdx] = { ...column, key: value };
                          updateSection(sectionIdx, { ...section, columns: newColumns });
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="키 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {(keyOptions[section.dataSource] || []).map((opt: { key: string; label: string }) => (
                            <SelectItem key={opt.key} value={opt.key}>{opt.label} ({opt.key})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* 라벨 입력 */}
                      <Input
                        value={column.label || ''}
                        onChange={(e) => {
                          const newColumns = [...(section.columns || [])];
                          newColumns[columnIdx] = { ...column, label: e.target.value };
                          updateSection(sectionIdx, { ...section, columns: newColumns });
                        }}
                        placeholder="라벨"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => removeColumn(sectionIdx, columnIdx)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* 안내문구 섹션 */}
              {section.type === 'note' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">안내문구</label>
                  <textarea
                    value={section.text || ''}
                    onChange={(e) => updateSection(sectionIdx, { ...section, text: e.target.value })}
                    placeholder="안내문구를 입력하세요"
                    className="w-full p-2 border border-gray-300 rounded-md resize-y min-h-[80px]"
                  />
                </div>
              )}

              {/* 날짜 섹션 */}
              {section.type === 'date' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">날짜</label>
                  <Input
                    value={section.date || ''}
                    onChange={(e) => updateSection(sectionIdx, { ...section, date: e.target.value })}
                    placeholder="날짜를 입력하세요 (예: 2025년 7월 10일)"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

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

  // 보고서 템플릿 관련 상태
  const [reportTemplate, setReportTemplate] = useState<any>(null); // 초기값 하드코딩 제거
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // ResultsManagement 함수형 컴포넌트 내에 아래 함수를 추가
  const setMinimalReportTemplate = (template) => {
    setReportTemplate({
      title: template?.title || '보고서 제목',
      editorData: template?.editorData || {}
    });
  };

  // 최초 마운트 시 Supabase에서 템플릿 fetch
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from('report_templates')
          .select('*')
          .eq('name', 'final_report_template')
          .single();
        if (!error && data && data.template_json) {
          setReportTemplate(JSON.parse(data.template_json));
        }
      } catch (e) {
        console.error('최초 템플릿 fetch 오류:', e);
      }
    };
    fetchTemplate();
  }, []);

  const { data: results = [], isLoading: resultsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/results"],
  });

  const { data: progress = [], isLoading: progressLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/progress"],
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

  // 실시간 구독 + 폴링 백업 시스템 (보고서 템플릿용)
  useEffect(() => {
    let templateChannel: any;
    let templatePollingInterval: NodeJS.Timeout;
    let isTemplateRealtimeConnected = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupTemplateSubscription = () => {
      console.log(`🔄 보고서 템플릿 실시간 구독 시도 ${retryCount + 1}/${maxRetries}`);
      
      templateChannel = supabase
        .channel(`report-templates-${Date.now()}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'report_templates' 
          }, 
          (payload) => {
            console.log('📡 보고서 템플릿 실시간 변경:', payload.eventType);
            // 템플릿 변경 시 로컬 상태 업데이트
            if (payload.eventType === 'UPDATE' && payload.new) {
              try {
                const newTemplate = JSON.parse(payload.new.template_json);
                setReportTemplate(newTemplate);
                toast({
                  title: "템플릿 업데이트",
                  description: "다른 관리자가 템플릿을 수정했습니다.",
                });
              } catch (error) {
                console.error('템플릿 파싱 오류:', error);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 보고서 템플릿 구독 상태:', status);
          
          if (status === 'SUBSCRIBED') {
            isTemplateRealtimeConnected = true;
            retryCount = 0;
            if (templatePollingInterval) {
              clearInterval(templatePollingInterval);
            }
            console.log('✅ 보고서 템플릿 실시간 구독 성공');
          } else if (status === 'CHANNEL_ERROR') {
            isTemplateRealtimeConnected = false;
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(() => {
                console.log('🔄 보고서 템플릿 재연결 시도...');
                supabase.removeChannel(templateChannel);
                setupTemplateSubscription();
              }, 2000 * retryCount);
            } else {
              console.log('⚠️ 보고서 템플릿 실시간 연결 실패, 폴링으로 전환');
              startTemplatePolling();
            }
          }
        });
    };

    const startTemplatePolling = () => {
      if (!templatePollingInterval) {
        templatePollingInterval = setInterval(() => {
          if (!isTemplateRealtimeConnected) {
            console.log('🔄 보고서 템플릿 폴링으로 데이터 동기화');
            // 주기적으로 템플릿 상태 확인 (필요시 서버에서 최신 데이터 fetch)
          }
        }, 10000); // 10초마다 폴링
      }
    };

    setupTemplateSubscription();

    return () => {
      if (templateChannel) {
        supabase.removeChannel(templateChannel);
      }
      if (templatePollingInterval) {
        clearInterval(templatePollingInterval);
      }
    };
  }, []);

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

  // 최종 선정 심사결과보고서 템플릿 상태 및 핸들러
  const handleSaveReportTemplate = () => {
    setIsSavingTemplate(true);
    const saveTemplateToSupabase = async () => {
      try {
        // 오직 title, editorData만 저장
        const minimalTemplate = {
          title: reportTemplate?.title || '보고서 제목',
          editorData: reportTemplate?.editorData || {}
        };
        const { data, error } = await supabase
          .from('report_templates')
          .upsert([
            {
              name: 'final_report_template',
              template_json: JSON.stringify(minimalTemplate),
              updated_at: new Date().toISOString()
            }
          ], { onConflict: ['name'] });
        if (error) {
          console.error('템플릿 저장 오류:', error);
          toast({
            title: "저장 실패",
            description: "템플릿 저장 중 오류가 발생했습니다.",
            variant: "destructive",
          });
        } else {
          console.log('✅ 템플릿 저장 성공:', data);
          toast({
            title: "저장 완료",
            description: "템플릿이 성공적으로 저장되었습니다.",
          });
          // 저장 성공 후 최신 템플릿 자동 불러오기
          await handleLoadReportTemplate();
        }
      } catch (error) {
        console.error('템플릿 저장 중 예외:', error);
        toast({
          title: "저장 실패",
          description: "템플릿 저장 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsSavingTemplate(false);
      }
    };
    saveTemplateToSupabase();
  };

  const handleLoadReportTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('name', 'final_report_template')
        .single();

      if (error) {
        console.error('템플릿 로드 오류:', error);
        toast({
          title: "로드 실패",
          description: "저장된 템플릿을 찾을 수 없습니다.",
          variant: "destructive",
        });
      } else if (data) {
        try {
          const loadedTemplate = JSON.parse(data.template_json);
          setReportTemplate(loadedTemplate);
          toast({
            title: "로드 완료",
            description: "템플릿이 성공적으로 로드되었습니다.",
          });
        } catch (parseError) {
          console.error('템플릿 파싱 오류:', parseError);
          toast({
            title: "로드 실패",
            description: "템플릿 데이터 형식이 올바르지 않습니다.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('템플릿 로드 중 예외:', error);
      toast({
        title: "로드 실패",
        description: "템플릿 로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 최종 선정 상태 관리를 위한 state 추가
  const [finalSelections, setFinalSelections] = useState<{
    [key: string]: {
      candidateId: number;
      candidateName: string;
      category: string;
      subCategory: string;
      isSelected: boolean;
      averageScore: number;
    }[]
  }>({});

  // 구분-세부구분별 최종 선정 관리
  const handleFinalSelection = (candidateId: number, category: string, subCategory: string, isSelected: boolean) => {
    setFinalSelections(prev => ({
      ...prev,
      [`${category}-${subCategory}`]: prev[`${category}-${subCategory}`]?.map(item => 
        item.candidateId === candidateId 
          ? { ...item, isSelected }
          : item
      ) || []
    }));
  };

  // 최종 선정된 대상자들만 필터링
  const getFinalSelectedCandidates = () => {
    const selected: any[] = [];
    Object.values(finalSelections).forEach(categorySelections => {
      categorySelections.forEach(item => {
        if (item.isSelected) {
          selected.push(item);
        }
      });
    });
    return selected;
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
                  <span>평가대상별 최종 결과</span>
                </CardTitle>
                <CardDescription>
                  모든 평가가 완료된 평가대상들의 최종 점수입니다.
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
                        placeholder="평가대상명, 부서, 구분으로 검색..."
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
                            평가대상
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
            <div className="p-4">
              <h2 className="text-lg font-bold mb-2">평가자별 진행 현황</h2>
              <p className="text-sm text-gray-500 mb-4">각 평가자의 평가 완료 현황입니다.</p>
              <EvaluatorProgressTable />
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>최종 선정 심사결과보고서 템플릿</CardTitle>
                      <CardDescription>보고서의 구조(개요, 표, 안내문구, 서명란 등)를 자유롭게 추가/수정/삭제할 수 있습니다.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleLoadReportTemplate}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        템플릿 불러오기
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <WysiwygReportEditor
                    template={reportTemplate}
                    setTemplate={setMinimalReportTemplate}
                    onSave={handleSaveReportTemplate}
                    isSaving={isSavingTemplate}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EvaluatorProgressTable() {
  const [filter, setFilter] = useState('');
  const [selectedEvaluator, setSelectedEvaluator] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { data: progressData = [], isLoading } = useQuery({
    queryKey: ['/api/admin/evaluator-progress-advanced'],
    queryFn: async () => {
      const res = await fetch('/api/admin/evaluator-progress-advanced', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  // 필터/검색 적용
  const filtered = progressData.filter((e: any) =>
    e.name.toLowerCase().includes(filter.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(filter.toLowerCase())
  );
  // 엑셀 내보내기 데이터
  const csvData = filtered.map((e: any) => ({
    평가자: e.name,
    부서: e.department,
    진행률: `${e.progress}%`,
    완료수: e.completedCount,
    전체: e.totalCount,
    미완료대상: e.incompleteCandidates.map((c: any) => c.name).join(', ')
  }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <Input
          placeholder="평가자 이름/부서 검색"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-64"
        />
        <CSVLink data={csvData} filename="evaluator-progress.csv">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />엑셀 내보내기</Button>
        </CSVLink>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>평가자</TableHead>
            <TableHead>부서</TableHead>
            <TableHead>진행률</TableHead>
            <TableHead>완료/전체</TableHead>
            <TableHead>미완료 대상</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((e: any) => (
            <TableRow key={e.id}>
              <TableCell>{e.name}</TableCell>
              <TableCell>{e.department}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={e.progress} className="w-32" />
                  <span className="text-xs font-medium">{e.progress}%</span>
                </div>
              </TableCell>
              <TableCell>{e.completedCount} / {e.totalCount}</TableCell>
              <TableCell>
                <Button size="xs" variant="outline" onClick={() => { setSelectedEvaluator(e); setModalOpen(true); }}>
                  {e.incompleteCandidates.length > 0 ? `${e.incompleteCandidates.length}명 보기` : '없음'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white shadow-lg rounded-lg">
          <DialogHeader>
            <DialogTitle>미완료 평가대상</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedEvaluator?.incompleteCandidates?.length > 0 ? (
              <ul className="list-disc pl-5">
                {selectedEvaluator.incompleteCandidates.map((c: any) => (
                  <li key={c.id}>{c.name} <span className="text-xs text-gray-500">({c.category})</span></li>
                ))}
              </ul>
            ) : (
              <div>모든 평가대상을 완료했습니다.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}