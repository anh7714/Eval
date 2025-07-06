import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Download,
  Upload,
  Save,
  Edit3,
  Trash2,
  Printer,
  FileText
} from "lucide-react";

export default function EvaluationItemsPage() {
  const [viewMode, setViewMode] = useState<'template' | 'management'>('template');
  const [isEditing, setIsEditing] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 평가표 템플릿 데이터
  const [currentTemplate, setCurrentTemplate] = useState({
    title: "제3기관 선정 심사표 평가표",
    subtitle: "제3기관 선정을 위한 종합 평가",
    sections: [
      {
        id: 1,
        category: "A. 기관운영역량",
        totalPoints: 35,
        items: [
          { id: 1, text: "돌봄SOS 사업 운영 계획서 및 목표", type: "정량", points: 20, score: 0 },
          { id: 2, text: "신청 월 점검 계획 진행", type: "정량", points: 5, score: 0 },
          { id: 3, text: "기관 운영 기간", type: "정량", points: 5, score: 0 },
          { id: 4, text: "조직구성", type: "정량", points: 5, score: 0 }
        ]
      },
      {
        id: 2,
        category: "B. 인력운영",
        totalPoints: 20,
        items: [
          { id: 5, text: "사업 운영 종사자 및 담당자의 업무역량", type: "정량", points: 5, score: 0 }
        ]
      }
    ]
  });

  // 컬럼 설정
  const [columns, setColumns] = useState([
    { id: 'category', name: '구분', visible: true, required: true },
    { id: 'text', name: '세부 항목', visible: true, required: true },
    { id: 'type', name: '유형', visible: true, required: false },
    { id: 'points', name: '배점', visible: true, required: false },
    { id: 'score', name: '평가점수', visible: true, required: false }
  ]);

  // 카테고리와 평가항목 데이터 가져오기
  const { data: categories } = useQuery({
    queryKey: ['/api/admin/categories'],
    enabled: false // 템플릿 모드에서는 불필요
  });

  const { data: items } = useQuery({
    queryKey: ['/api/admin/evaluation-items'],
    enabled: false // 템플릿 모드에서는 불필요
  });

  // 총 배점 계산
  const calculateTotalPoints = () => {
    return currentTemplate.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + item.points, 0), 0
    );
  };

  // 총 점수 계산
  const calculateTotalScore = () => {
    return currentTemplate.sections.reduce((sum, section) => 
      sum + section.items.reduce((itemSum, item) => itemSum + item.score, 0), 0
    );
  };

  // 컬럼 추가
  const addColumn = () => {
    if (newColumnName.trim()) {
      const newColumn = {
        id: `custom_${Date.now()}`,
        name: newColumnName.trim(),
        visible: true,
        required: false
      };
      setColumns([...columns, newColumn]);
      setNewColumnName('');
    }
  };

  // 컬럼 설정 업데이트
  const updateColumnConfig = (columnId: string, field: string, value: any) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, [field]: value } : col
    ));
  };

  // 컬럼 삭제
  const deleteColumn = (columnId: string) => {
    setColumns(columns.filter(col => col.id !== columnId));
  };

  // 항목 업데이트
  const updateItem = (sectionId: number, itemId: number, field: string, value: any) => {
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

  // 점수 업데이트
  const updateScore = (sectionId: number, itemId: number, score: number) => {
    updateItem(sectionId, itemId, 'score', score);
  };

  // 엑셀 다운로드
  const downloadExcel = () => {
    toast({
      title: "다운로드 시작",
      description: "평가표 엑셀 파일을 다운로드합니다."
    });
  };

  // 인쇄 기능
  const handlePrint = () => {
    window.print();
  };

  // 개별 인쇄
  const handleIndividualPrint = () => {
    toast({
      title: "개별 인쇄",
      description: "개별 심사표를 인쇄합니다."
    });
  };

  // 배치 인쇄
  const handleBatchPrint = () => {
    toast({
      title: "배치 인쇄",
      description: "모든 심사표를 배치 인쇄합니다."
    });
  };

  // 평가항목으로 내보내기
  const exportToEvaluationItems = async () => {
    try {
      // 카테고리 생성
      for (const section of currentTemplate.sections) {
        await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: section.category,
            type: 'category',
            isActive: true,
            sortOrder: section.id
          })
        });
      }

      // 평가항목 생성
      for (const section of currentTemplate.sections) {
        for (const item of section.items) {
          await fetch('/api/admin/evaluation-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: item.text,
              points: item.points,
              categoryId: section.id,
              isActive: true,
              sortOrder: item.id
            })
          });
        }
      }

      toast({
        title: "내보내기 완료",
        description: "평가표 템플릿이 평가항목으로 성공적으로 내보내졌습니다."
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "내보내기 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
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
            <Button size="sm" variant="outline">
              엑셀 업로드
            </Button>
            <Button size="sm" variant="outline" onClick={downloadExcel}>
              엑셀 다운로드
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
              <div className="text-center text-base text-gray-600">
                {currentTemplate.subtitle}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 제목과 구분 정보 표 */}
                <div className="overflow-x-auto mb-0">
                  <table className="min-w-full border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 px-4 py-2 text-center font-bold">
                          {currentTemplate.title}
                        </th>
                        {columns.filter(col => col.visible && col.id !== 'category' && col.id !== 'text').map((column) => (
                          <th key={column.id} className="border border-gray-400 px-2 py-2 text-center font-bold text-sm">
                            {column.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-400 px-4 py-2 text-center">구분</td>
                        {columns.filter(col => col.visible && col.id !== 'category' && col.id !== 'text').map((column) => (
                          <td key={column.id} className="border border-gray-400 px-2 py-2 text-center text-sm">
                            {column.id === 'type' ? '유형' : 
                             column.id === 'points' ? '배점' : 
                             column.id === 'score' ? '평가점수' : 
                             column.name}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 평가 항목 표 */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-400">
                    <tbody>
                      {currentTemplate.sections.map((section, sectionIndex) => (
                        <React.Fragment key={section.id}>
                          {/* 카테고리 헤더 */}
                          <tr className="bg-gray-100">
                            <td className="border border-gray-400 px-3 py-2 text-center font-bold text-sm w-24">
                              {section.category}
                              <div className="text-xs text-gray-600 mt-1">
                                ({section.totalPoints}점)
                              </div>
                            </td>
                            <td className="border border-gray-400 px-4 py-2 text-sm font-medium">
                              세부 항목
                            </td>
                            {columns.filter(col => col.visible && col.id !== 'category' && col.id !== 'text').map((column) => (
                              <td key={column.id} className="border border-gray-400 px-2 py-2 text-center text-sm font-medium">
                                {column.id === 'type' ? '유형' : 
                                 column.id === 'points' ? '배점' : 
                                 column.id === 'score' ? '평가점수' : 
                                 column.name}
                              </td>
                            ))}
                          </tr>
                          {/* 항목들 */}
                          {section.items.map((item, itemIndex) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              {itemIndex === 0 && (
                                <td className="border border-gray-400 px-3 py-2 text-center font-bold text-sm bg-gray-50 align-middle" 
                                    rowSpan={section.items.length}>
                                  {section.category}
                                  <div className="text-xs text-gray-600 mt-1">
                                    ({section.totalPoints}점)
                                  </div>
                                </td>
                              )}
                              <td className="border border-gray-400 px-4 py-2 text-sm">
                                {`${itemIndex + 1}. ${item.text}`}
                              </td>
                              {columns.filter(col => col.visible && col.id !== 'category' && col.id !== 'text').map((column) => (
                                <td key={column.id} className="border border-gray-400 px-2 py-2 text-center align-middle">
                                  {column.id === 'score' ? (
                                    <div className="flex justify-center items-center">
                                      <input
                                        type="number"
                                        value={item.score}
                                        onChange={(e) => updateScore(section.id, item.id, parseInt(e.target.value) || 0)}
                                        max={item.points}
                                        min={0}
                                        className="text-xs text-center w-16 mx-auto"
                                      />
                                    </div>
                                  ) : (
                                    <div className="text-xs text-center">
                                      {item[column.id as keyof typeof item]}
                                    </div>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {/* 총계 행 */}
                      <tr className="bg-gray-200 font-bold">
                        <td className="border border-gray-400 px-4 py-3 text-center" colSpan={2}>총계</td>
                        {columns.filter(col => col.visible && col.id !== 'category' && col.id !== 'text').map((column) => (
                          <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                            {column.id === 'points' ? `${calculateTotalPoints()}점` : 
                             column.id === 'score' ? `${calculateTotalScore()}점` : 
                             ''}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // 관리 모드 - 평가표 템플릿 기능만 표시
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-2xl font-bold">
                  {currentTemplate.title}
                </CardTitle>
                <div className="text-center text-base text-gray-600">
                  {currentTemplate.subtitle}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 템플릿 제어 버튼들 */}
                  <div className="flex justify-center space-x-2 mb-4">
                    <Button
                      onClick={() => setIsEditing(!isEditing)}
                      size="sm"
                      variant="outline"
                      className="flex items-center space-x-1"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>{isEditing ? '완료' : '편집'}</span>
                    </Button>
                    <Button
                      onClick={() => setShowJsonPreview(!showJsonPreview)}
                      size="sm"
                      variant="outline"
                      className="flex items-center space-x-1"
                    >
                      <FileText className="h-4 w-4" />
                      <span>JSON 저장</span>
                    </Button>
                    <Button
                      onClick={downloadExcel}
                      size="sm"
                      variant="outline"
                      className="flex items-center space-x-1"
                    >
                      <Download className="h-4 w-4" />
                      <span>Excel 저장</span>
                    </Button>
                    <Button
                      onClick={handlePrint}
                      size="sm"
                      variant="outline"
                      className="flex items-center space-x-1"
                    >
                      <Printer className="h-4 w-4" />
                      <span>인쇄</span>
                    </Button>
                    <Button
                      onClick={handleIndividualPrint}
                      size="sm"
                      variant="outline"
                      className="flex items-center space-x-1"
                    >
                      <Printer className="h-4 w-4" />
                      <span>개별 인쇄</span>
                    </Button>
                    <Button
                      onClick={handleBatchPrint}
                      size="sm"
                      variant="outline"
                      className="flex items-center space-x-1"
                    >
                      <Printer className="h-4 w-4" />
                      <span>배치 인쇄</span>
                    </Button>
                    <Button
                      onClick={exportToEvaluationItems}
                      size="sm"
                      variant="default"
                      className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Save className="h-4 w-4" />
                      <span>평가항목으로 내보내기</span>
                    </Button>
                  </div>

                  {/* 컬럼 설정 */}
                  {isEditing && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">컬럼 설정</h4>
                      <div className="flex space-x-2 mb-2">
                        <input
                          type="text"
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          placeholder="새 컬럼 이름"
                          className="text-sm border rounded px-2 py-1"
                        />
                        <Button
                          onClick={addColumn}
                          size="sm"
                          variant="outline"
                          className="flex items-center space-x-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>컬럼 추가</span>
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {columns.map((column) => (
                          <div key={column.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={column.name}
                                onChange={(e) => updateColumnConfig(column.id, 'name', e.target.value)}
                                className="text-xs border rounded px-1 py-1"
                              />
                              <label className="flex items-center space-x-1">
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 평가표 템플릿 */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-400">
                      <tbody>
                        {currentTemplate.sections.map((section, sectionIndex) => (
                          <React.Fragment key={section.id}>
                            {/* 항목들 */}
                            {section.items.map((item, itemIndex) => (
                              <tr key={item.id} className="hover:bg-gray-50">
                                {itemIndex === 0 && (
                                  <td className="border border-gray-400 px-3 py-2 text-center font-bold text-sm bg-gray-50 align-middle" 
                                      rowSpan={section.items.length}>
                                    {section.category}
                                    <div className="text-xs text-gray-600 mt-1">
                                      ({section.totalPoints}점)
                                    </div>
                                  </td>
                                )}
                                <td className="border border-gray-400 px-4 py-2 text-sm">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={item.text}
                                      onChange={(e) => updateItem(section.id, item.id, 'text', e.target.value)}
                                      className="w-full text-sm border rounded px-2 py-1"
                                    />
                                  ) : (
                                    `${itemIndex + 1}. ${item.text}`
                                  )}
                                </td>
                                {columns.filter(col => col.visible && col.id !== 'category' && col.id !== 'text').map((column) => (
                                  <td key={column.id} className="border border-gray-400 px-2 py-2 text-center align-middle">
                                    {column.id === 'score' && !isEditing ? (
                                      <div className="flex justify-center items-center">
                                        <input
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
                                          <input
                                            type="number"
                                            value={item[column.id as keyof typeof item] as number}
                                            onChange={(e) => updateItem(section.id, item.id, column.id, parseInt(e.target.value) || 0)}
                                            className="text-xs text-center w-16 mx-auto border rounded px-1 py-1"
                                          />
                                        </div>
                                      )
                                    ) : (
                                      <div className="text-xs text-center">
                                        {item[column.id as keyof typeof item]}
                                      </div>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                        {/* 총계 행 */}
                        <tr className="bg-gray-200 font-bold">
                          <td className="border border-gray-400 px-4 py-3 text-center" colSpan={2}>총계</td>
                          {columns.filter(col => col.visible && col.id !== 'category' && col.id !== 'text').map((column) => (
                            <td key={column.id} className="border border-gray-400 px-2 py-3 text-center">
                              {column.id === 'points' ? `${calculateTotalPoints()}점` : 
                               column.id === 'score' ? `${calculateTotalScore()}점` : 
                               ''}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}