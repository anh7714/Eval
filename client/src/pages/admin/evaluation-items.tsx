import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Download, Upload, Save, Eye, EyeOff, Settings, Printer, FileText, Edit3, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EvaluationItemManagement() {
  const [activeTab, setActiveTab] = useState("template");
  const [savedEvaluationTemplate, setSavedEvaluationTemplate] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 컬럼 설정 관리
  const [columnConfig, setColumnConfig] = useState([
    { id: 'section', title: '구분', type: 'section', visible: true, required: true, width: 'w-32' },
    { id: 'item', title: '세부 항목', type: 'text', visible: true, required: true, width: 'flex-1' },
    { id: 'type', title: '유형', type: 'select', visible: true, required: false, width: 'w-16', options: ['정량', '정성'] },
    { id: 'points', title: '배점', type: 'number', visible: true, required: true, width: 'w-16' },
    { id: 'score', title: '평가점수', type: 'number', visible: true, required: true, width: 'w-20' },
  ]);

  // 평가위원 정보
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
      },
      {
        id: 'C',
        title: '인건비관리',
        totalPoints: 10,
        items: [
          { id: 1, text: '세부사업별 프로그램 (이용자후기시)', type: '정량', points: 5, score: 0 },
          { id: 2, text: '주요 사고 예방 대책 관리 및 이용자 재이용관리', type: '정량', points: 5, score: 0 }
        ]
      },
      {
        id: 'D',
        title: '공모참여',
        totalPoints: 15,
        items: [
          { id: 1, text: '사업(총괄) 명가 결과', type: '정량', points: 15, score: 0 }
        ]
      },
      {
        id: 'E',
        title: '실적평가',
        totalPoints: 20,
        items: [
          { id: 1, text: '서비스 제공 건수(학업 기간)', type: '정량', points: 15, score: 0 },
          { id: 2, text: '세금기업 명가결과 결과 (통계배너시)', type: '정량', points: 5, score: 0 }
        ]
      }
    ]
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const fileInputRef = useRef(null);

  // 평가항목으로 저장하는 함수
  const saveToEvaluationItems = () => {
    try {
      const templateData = {
        title: currentTemplate.title,
        sections: currentTemplate.sections,
        columnConfig: columnConfig,
        totalPoints: calculateTotalPoints(),
        savedAt: new Date().toISOString()
      };
      
      // localStorage에 저장
      localStorage.setItem('evaluationTemplate', JSON.stringify(templateData));
      setSavedEvaluationTemplate(templateData);
      
      toast({
        title: "성공",
        description: "평가항목으로 저장되었습니다.",
      });
      
      // 평가항목 탭으로 이동
      setActiveTab("items");
    } catch (error) {
      toast({
        title: "오류", 
        description: "저장에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  // 계산 함수들
  const calculateSectionScore = (section) => {
    return section.items.reduce((sum, item) => sum + (item.score || 0), 0);
  };

  const calculateSectionTotalPoints = (section) => {
    return section.items.reduce((sum, item) => sum + (item.points || 0), 0);
  };

  const calculateTotalPoints = () => {
    return currentTemplate.sections.reduce((sum, section) => sum + calculateSectionTotalPoints(section), 0);
  };

  const calculateTotalScore = () => {
    return currentTemplate.sections.reduce((sum, section) => sum + calculateSectionScore(section), 0);
  };

  // 보이는 컬럼들만 필터링
  const visibleColumns = columnConfig.filter(col => col.visible);

  // 컬럼 설정 관리 함수들
  const updateColumnConfig = (columnId, field, value) => {
    setColumnConfig(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, [field]: value } : col
      )
    );
  };

  const addColumn = () => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      title: '새 컬럼',
      type: 'text',
      visible: true,
      required: false,
      width: 'w-20'
    };
    setColumnConfig(prev => [...prev, newColumn]);
    
    // 기존 데이터에 새 컬럼 필드 추가
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        items: section.items.map(item => ({
          ...item,
          [newColumn.id]: ''
        }))
      }))
    }));
  };

  const deleteColumn = (columnId) => {
    if (columnConfig.find(col => col.id === columnId)?.required) {
      toast({
        title: "경고",
        description: "필수 컬럼은 삭제할 수 없습니다.",
        variant: "destructive"
      });
      return;
    }
    
    setColumnConfig(prev => prev.filter(col => col.id !== columnId));
    
    // 기존 데이터에서 해당 컬럼 필드 제거
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        items: section.items.map(item => {
          const newItem = { ...item };
          delete newItem[columnId];
          return newItem;
        })
      }))
    }));
  };

  // 업데이트 함수들
  const updateScore = (sectionId, itemId, score) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, score: Math.min(score, item.points) } : item
              )
            }
          : section
      )
    }));
  };

  const updateItem = (sectionId, itemId, field, value) => {
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

  const updateSection = (sectionId, field, value) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    }));
  };

  // 섹션 및 항목 관리 함수들
  const addSection = () => {
    const newId = String.fromCharCode(65 + currentTemplate.sections.length);
    
    const newItem = {
      id: 1,
      text: '새 평가항목',
      type: '정량',
      points: 10,
      score: 0
    };
    
    // 커스텀 컬럼들에 대한 빈 값 추가
    columnConfig.forEach(column => {
      if (!['section', 'item', 'type', 'points', 'score'].includes(column.id)) {
        newItem[column.id] = column.type === 'number' ? 0 : '';
      }
    });
    
    setCurrentTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, {
        id: newId,
        title: '새 평가영역',
        totalPoints: 10,
        items: [newItem]
      }]
    }));
  };

  const deleteSection = (sectionId) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const addItem = (sectionId) => {
    const newItem = {
      id: Math.max(...currentTemplate.sections.find(s => s.id === sectionId).items.map(i => i.id)) + 1,
      text: '새 평가항목',
      type: '정량',
      points: 5,
      score: 0
    };
    
    // 커스텀 컬럼들에 대한 빈 값 추가
    columnConfig.forEach(column => {
      if (!['section', 'item', 'type', 'points', 'score'].includes(column.id)) {
        newItem[column.id] = column.type === 'number' ? 0 : '';
      }
    });
    
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: [...section.items, newItem]
            }
          : section
      )
    }));
  };

  const deleteItem = (sectionId, itemId) => {
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

  // localStorage에서 저장된 템플릿 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('evaluationTemplate');
    if (saved) {
      try {
        setSavedEvaluationTemplate(JSON.parse(saved));
      } catch (error) {
        console.error('템플릿 로드 실패:', error);
      }
    }
  }, []);

  // 파일 관리 함수들
  const saveTemplate = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const fileName = `평가표_${currentTemplate.title.replace(/[^\w\s]/gi, '')}_${dateStr}_${timeStr}.json`;
    
    const templateWithAll = {
      ...currentTemplate,
      evaluator: evaluator,
      columnConfig: columnConfig
    };
    
    const dataStr = JSON.stringify(templateWithAll, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
    
    toast({
      title: "성공",
      description: "템플릿이 저장되었습니다!",
    });
  };

  const loadTemplate = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const template = JSON.parse(e.target.result);
          
          if (!template.title || !template.sections || !Array.isArray(template.sections)) {
            throw new Error('올바르지 않은 템플릿 형식입니다.');
          }
          
          if (template.evaluator) {
            setEvaluator(template.evaluator);
          }
          
          if (template.columnConfig) {
            setColumnConfig(template.columnConfig);
          }
          
          setCurrentTemplate(template);
          
          toast({
            title: "성공",
            description: "템플릿이 성공적으로 불러와졌습니다!",
          });
          
        } catch (error) {
          toast({
            title: "오류",
            description: error.message,
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    }
    
    event.target.value = '';
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">평가항목 관리</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="template">평가표 템플릿</TabsTrigger>
          <TabsTrigger value="items">저장된 템플릿</TabsTrigger>
        </TabsList>

        <TabsContent value="template" className="space-y-6">
          <div className="max-w-6xl mx-auto bg-gray-50 min-h-screen">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* 헤더 */}
              <div className="flex justify-between items-center mb-8 print:mb-4">
                <div className="flex-1 text-center print:text-center">
                  <input
                    type="text"
                    value={currentTemplate.title}
                    onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                    className="text-3xl font-bold text-gray-800 bg-transparent border-b-2 border-transparent hover:border-blue-300 focus:border-blue-500 focus:outline-none transition-colors text-center w-full print:text-4xl print:font-black print:text-black print:border-none"
                    disabled={!isEditing}
                  />
                </div>
                
                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isEditing 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-4 h-4 mr-2 inline" />
                        편집 완료
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4 mr-2 inline" />
                        편집 시작
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={saveTemplate}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2 inline" />
                    템플릿 저장
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2 inline" />
                    템플릿 불러오기
                  </button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={loadTemplate}
                    className="hidden"
                  />
                  
                  <button
                    onClick={saveToEvaluationItems}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2 inline" />
                    평가항목으로 보내기
                  </button>
                </div>
              </div>

              {/* 평가표 테이블 */}
              <div className="bg-white rounded-lg overflow-hidden">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-blue-50 border-b border-gray-300">
                      {visibleColumns.map((col) => (
                        <th 
                          key={col.id} 
                          className={`${col.width} p-3 text-left font-semibold text-gray-700 border-r border-gray-300 last:border-r-0`}
                        >
                          {col.title}
                        </th>
                      ))}
                      {isEditing && (
                        <th className="w-24 p-3 text-center font-semibold text-gray-700">
                          작업
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {currentTemplate.sections.map((section, sectionIndex) => (
                      section.items.map((item, itemIndex) => (
                        <tr key={`${section.id}-${item.id}`} className="border-b border-gray-200 hover:bg-gray-50">
                          {visibleColumns.map((col) => (
                            <td key={col.id} className="p-3 border-r border-gray-200 last:border-r-0">
                              {col.id === 'section' ? (
                                itemIndex === 0 ? (
                                  <div className="font-medium text-gray-900">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={section.title}
                                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                                        className="w-full px-2 py-1 border rounded"
                                      />
                                    ) : (
                                      section.title
                                    )}
                                  </div>
                                ) : null
                              ) : col.id === 'item' ? (
                                isEditing ? (
                                  <input
                                    type="text"
                                    value={item.text}
                                    onChange={(e) => updateItem(section.id, item.id, 'text', e.target.value)}
                                    className="w-full px-2 py-1 border rounded"
                                  />
                                ) : (
                                  item.text
                                )
                              ) : col.id === 'type' ? (
                                isEditing ? (
                                  <select
                                    value={item.type}
                                    onChange={(e) => updateItem(section.id, item.id, 'type', e.target.value)}
                                    className="w-full px-2 py-1 border rounded"
                                  >
                                    <option value="정량">정량</option>
                                    <option value="정성">정성</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    item.type === '정량' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {item.type}
                                  </span>
                                )
                              ) : col.id === 'points' ? (
                                isEditing ? (
                                  <input
                                    type="number"
                                    value={item.points}
                                    onChange={(e) => updateItem(section.id, item.id, 'points', parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-1 border rounded text-center"
                                    min="0"
                                  />
                                ) : (
                                  <span className="text-center block">{item.points}</span>
                                )
                              ) : col.id === 'score' ? (
                                <input
                                  type="number"
                                  value={item.score}
                                  onChange={(e) => updateScore(section.id, item.id, parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border rounded text-center"
                                  min="0"
                                  max={item.points}
                                />
                              ) : (
                                // 커스텀 컬럼 처리
                                isEditing ? (
                                  col.type === 'number' ? (
                                    <input
                                      type="number"
                                      value={item[col.id] || 0}
                                      onChange={(e) => updateItem(section.id, item.id, col.id, parseInt(e.target.value) || 0)}
                                      className="w-full px-2 py-1 border rounded"
                                    />
                                  ) : col.type === 'select' ? (
                                    <select
                                      value={item[col.id] || ''}
                                      onChange={(e) => updateItem(section.id, item.id, col.id, e.target.value)}
                                      className="w-full px-2 py-1 border rounded"
                                    >
                                      <option value="">선택</option>
                                      {col.options?.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={item[col.id] || ''}
                                      onChange={(e) => updateItem(section.id, item.id, col.id, e.target.value)}
                                      className="w-full px-2 py-1 border rounded"
                                    />
                                  )
                                ) : (
                                  item[col.id] || ''
                                )
                              )}
                            </td>
                          ))}
                          {isEditing && (
                            <td className="p-3 text-center">
                              <button
                                onClick={() => deleteItem(section.id, item.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    ))}
                    
                    {/* 합계 행 */}
                    <tr className="bg-gray-100 border-t-2 border-gray-400 font-semibold">
                      <td className="p-3 text-center border-r border-gray-300">합계</td>
                      <td className="p-3 border-r border-gray-300"></td>
                      {visibleColumns.slice(2).map((col) => (
                        <td key={col.id} className="p-3 text-center border-r border-gray-300 last:border-r-0">
                          {col.id === 'points' ? calculateTotalPoints() : 
                           col.id === 'score' ? calculateTotalScore() : ''}
                        </td>
                      ))}
                      {isEditing && <td className="p-3"></td>}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 편집 모드 컨트롤 */}
              {isEditing && (
                <div className="mt-6 space-y-4">
                  <div className="flex gap-4">
                    <button
                      onClick={addSection}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2 inline" />
                      섹션 추가
                    </button>
                    
                    <button
                      onClick={resetScores}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      점수 초기화
                    </button>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-2">섹션별 관리</h3>
                    <div className="space-y-2">
                      {currentTemplate.sections.map((section) => (
                        <div key={section.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div>
                            <strong>{section.title}</strong> 
                            <span className="text-gray-600 ml-2">
                              ({section.items.length}개 항목, {calculateSectionTotalPoints(section)}점)
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => addItem(section.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                            >
                              <Plus className="w-3 h-3 mr-1 inline" />
                              항목 추가
                            </button>
                            <button
                              onClick={() => deleteSection(section.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                            >
                              <Trash2 className="w-3 h-3 mr-1 inline" />
                              섹션 삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                저장된 평가표 템플릿
              </CardTitle>
              <CardDescription>
                평가표 템플릿에서 저장된 완성된 평가표를 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedEvaluationTemplate ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">
                      {savedEvaluationTemplate.title}
                    </h3>
                    <p className="text-sm text-blue-600">
                      저장일: {new Date(savedEvaluationTemplate.savedAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-blue-600">
                      총 배점: {savedEvaluationTemplate.totalPoints}점
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">평가 영역</h4>
                    {savedEvaluationTemplate.sections.map((section, index) => (
                      <div key={index} className="bg-gray-50 rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{section.title}</span>
                          <Badge variant="secondary">{section.totalPoints}점</Badge>
                        </div>
                        <div className="space-y-1">
                          {section.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="text-sm text-gray-600 flex justify-between">
                              <span>{item.text}</span>
                              <span>{item.points}점</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {savedEvaluationTemplate.columnConfig && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">컬럼 설정</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {savedEvaluationTemplate.columnConfig.map((col, index) => (
                          <div key={index} className="text-sm bg-gray-50 rounded p-2">
                            <span className="font-medium">{col.title}</span>
                            <span className="text-gray-500 ml-2">({col.type})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => setActiveTab("template")}
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      편집하기
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>저장된 평가표 템플릿이 없습니다.</p>
                  <p className="text-sm mt-2">평가표 템플릿에서 "평가항목으로 보내기"를 클릭하여 템플릿을 저장하세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}