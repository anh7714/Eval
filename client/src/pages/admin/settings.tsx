import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import AdminNav from "@/components/layout/admin-nav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Save, Eye, EyeOff, Lock } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    evaluationTitle: "",
    isEvaluationActive: true,
    allowPublicResults: false,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/system/config"],
    onSuccess: (data) => {
      if (data) {
        setFormData({
          evaluationTitle: data.evaluationTitle || "",
          isEvaluationActive: data.isEvaluationActive || true,
          allowPublicResults: data.allowPublicResults || false,
        });
      }
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/system/config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/config"] });
      toast({ title: "성공", description: "시스템 설정이 저장되었습니다." });
    },
    onError: (error: Error) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.evaluationTitle) {
      toast({
        title: "입력 오류",
        description: "시스템 제목을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    updateConfigMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminNav />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="loading-spinner w-8 h-8"></div>
            <span className="ml-3 text-slate-600">데이터를 불러오는 중...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">시스템 설정</h1>
          <p className="text-slate-600">전체 시스템의 기본 설정을 관리합니다.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* System Configuration */}
          <Card className="gov-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                기본 설정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="evaluationTitle">시스템 제목 *</Label>
                  <Input
                    id="evaluationTitle"
                    value={formData.evaluationTitle}
                    onChange={(e) => setFormData({ ...formData, evaluationTitle: e.target.value })}
                    placeholder="예: 종합평가시스템"
                    className="gov-input"
                    disabled={updateConfigMutation.isPending}
                  />
                  <p className="text-xs text-slate-500">
                    웹사이트 헤더와 페이지에 표시되는 시스템 제목입니다.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="isEvaluationActive" className="text-base">평가 시스템 활성화</Label>
                      <p className="text-sm text-slate-500">
                        비활성화하면 평가위원이 로그인할 수 없습니다.
                      </p>
                    </div>
                    <Switch
                      id="isEvaluationActive"
                      checked={formData.isEvaluationActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isEvaluationActive: checked })}
                      disabled={updateConfigMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allowPublicResults" className="text-base">공개 결과 조회 허용</Label>
                      <p className="text-sm text-slate-500">
                        활성화하면 누구나 평가 결과를 조회할 수 있습니다.
                      </p>
                    </div>
                    <Switch
                      id="allowPublicResults"
                      checked={formData.allowPublicResults}
                      onCheckedChange={(checked) => setFormData({ ...formData, allowPublicResults: checked })}
                      disabled={updateConfigMutation.isPending}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gov-btn-primary"
                  disabled={updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="loading-spinner w-4 h-4 mr-2"></div>
                      저장 중...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="w-4 h-4 mr-2" />
                      설정 저장
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="gov-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                시스템 상태
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${formData.isEvaluationActive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium">평가 시스템</span>
                  </div>
                  <span className={`text-sm font-medium ${formData.isEvaluationActive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formData.isEvaluationActive ? '활성' : '비활성'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${formData.allowPublicResults ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                    <span className="font-medium">공개 결과</span>
                  </div>
                  <span className={`text-sm font-medium ${formData.allowPublicResults ? 'text-blue-600' : 'text-slate-600'}`}>
                    {formData.allowPublicResults ? '공개' : '비공개'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-4">현재 설정 요약</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">시스템 제목:</span>
                    <span className="font-medium">{formData.evaluationTitle || "미설정"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">평가 시스템:</span>
                    <span className={`font-medium ${formData.isEvaluationActive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formData.isEvaluationActive ? '활성화됨' : '비활성화됨'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">결과 공개:</span>
                    <span className={`font-medium ${formData.allowPublicResults ? 'text-blue-600' : 'text-slate-600'}`}>
                      {formData.allowPublicResults ? '허용됨' : '제한됨'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card className="gov-card md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                보안 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">접근 권한 관리</h3>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>• 관리자는 모든 기능에 접근할 수 있습니다.</p>
                    <p>• 평가위원은 할당된 평가 대상자만 채점할 수 있습니다.</p>
                    <p>• 일반 사용자는 공개 설정에 따라 결과만 조회 가능합니다.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">데이터 보안</h3>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>• 모든 평가 데이터는 암호화되어 저장됩니다.</p>
                    <p>• 세션 기반 인증으로 보안을 강화합니다.</p>
                    <p>• 평가 제출 후 수정이 불가능합니다.</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">중요 알림</p>
                    <p>운영 환경에서는 반드시 강력한 비밀번호를 사용하고, 정기적으로 백업을 수행하세요.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
