import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EvaluationItemManagement() {
  const [activeTab, setActiveTab] = useState("items");
  const [savedEvaluationTemplate, setSavedEvaluationTemplate] = useState(null);
  const { toast } = useToast();

  // localStorage에서 저장된 템플릿 불러오기
  useState(() => {
    const saved = localStorage.getItem('evaluationTemplate');
    if (saved) {
      try {
        setSavedEvaluationTemplate(JSON.parse(saved));
      } catch (error) {
        console.error('템플릿 로드 실패:', error);
      }
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">평가항목 관리</h1>
            <p className="text-lg text-gray-600">평가표 템플릿에서 저장된 평가 항목을 관리합니다.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items">평가 항목</TabsTrigger>
            <TabsTrigger value="template">평가표 템플릿</TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">평가 항목</h2>
                <div className="text-sm text-gray-500">
                  평가표 템플릿에서 저장된 평가 항목을 확인합니다
                </div>
              </div>

              {savedEvaluationTemplate ? (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">{savedEvaluationTemplate.title}</CardTitle>
                        <CardDescription>
                          저장일: {new Date(savedEvaluationTemplate.savedAt).toLocaleString('ko-KR')} 
                          | 총 배점: {savedEvaluationTemplate.totalPoints}점
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => setActiveTab("template")}
                        variant="outline"
                        size="sm"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        템플릿 편집
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {savedEvaluationTemplate.sections.map((section: any) => (
                        <div key={section.id} className="border rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-3 text-blue-700">
                            {section.id}. {section.title} ({section.items.reduce((sum: number, item: any) => sum + (item.points || 0), 0)}점)
                          </h3>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">세부 항목</th>
                                  {savedEvaluationTemplate.columnConfig
                                    .filter((col: any) => col.visible && !['section', 'item'].includes(col.id))
                                    .map((col: any) => (
                                      <th key={col.id} className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">
                                        {col.title}
                                      </th>
                                    ))}
                                </tr>
                              </thead>
                              <tbody>
                                {section.items.map((item: any, index: number) => (
                                  <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-3 py-2 text-sm">
                                      {index + 1}. {item.text}
                                    </td>
                                    {savedEvaluationTemplate.columnConfig
                                      .filter((col: any) => col.visible && !['section', 'item'].includes(col.id))
                                      .map((col: any) => (
                                        <td key={col.id} className="border border-gray-300 px-3 py-2 text-center text-sm">
                                          {col.id === 'points' || col.id === 'score' 
                                            ? `${item[col.id] || 0}점`
                                            : item[col.id] || ''
                                          }
                                        </td>
                                      ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                      
                      {/* 합계 행 */}
                      <div className="border-t-2 border-gray-400 pt-4">
                        <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
                          <span className="text-lg font-bold">합계</span>
                          <span className="text-xl font-bold text-blue-600">
                            {savedEvaluationTemplate.totalPoints}점
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">저장된 평가항목이 없습니다</h3>
                      <p className="text-gray-500 mb-6">
                        평가표 템플릿에서 평가표를 작성한 후 "평가항목으로 저장" 버튼을 눌러주세요.
                      </p>
                      <Button
                        onClick={() => setActiveTab("template")}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        평가표 템플릿으로 이동
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="template">
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">평가표 템플릿</h3>
                    <p className="text-gray-500 mb-6">
                      평가표 템플릿 기능은 별도 페이지에서 제공됩니다.
                    </p>
                    <Button
                      onClick={() => window.location.href = '/admin/evaluation-template'}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      평가표 템플릿 페이지로 이동
                    </Button>
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