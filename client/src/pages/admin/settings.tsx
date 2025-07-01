import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Settings as SettingsIcon, Shield, Database, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SystemSettings() {
  const [systemConfig, setSystemConfig] = useState({
    systemName: "",
    description: "",
    adminEmail: "",
    maxEvaluators: "",
    maxCandidates: "",
    evaluationDeadline: "",
    allowPartialSubmission: false,
    enableNotifications: true,
  });

  const [adminPassword, setAdminPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/admin/system-config"],
  });

  // Update systemConfig when data is loaded
  useEffect(() => {
    if (config) {
      setSystemConfig({
        systemName: (config as any).systemName || "",
        description: (config as any).description || "",
        adminEmail: (config as any).adminEmail || "",
        maxEvaluators: (config as any).maxEvaluators?.toString() || "",
        maxCandidates: (config as any).maxCandidates?.toString() || "",
        evaluationDeadline: (config as any).evaluationDeadline || "",
        allowPartialSubmission: (config as any).allowPartialSubmission || false,
        enableNotifications: (config as any).enableNotifications || true,
      });
    }
  }, [config]);

  const updateConfigMutation = useMutation({
    mutationFn: async (config: typeof systemConfig) => {
      const response = await fetch("/api/admin/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...config,
          maxEvaluators: parseInt(config.maxEvaluators) || null,
          maxCandidates: parseInt(config.maxCandidates) || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to update config");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-config"] });
      toast({ title: "성공", description: "시스템 설정이 저장되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "설정 저장에 실패했습니다.", variant: "destructive" });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (passwords: typeof adminPassword) => {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(passwords),
      });
      if (!response.ok) throw new Error("Failed to change password");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "성공", description: "비밀번호가 변경되었습니다." });
      setAdminPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: () => {
      toast({ title: "오류", description: "비밀번호 변경에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigMutation.mutate(systemConfig);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword.newPassword !== adminPassword.confirmPassword) {
      toast({ title: "오류", description: "새 비밀번호가 일치하지 않습니다.", variant: "destructive" });
      return;
    }
    updatePasswordMutation.mutate(adminPassword);
  };

  const resetDatabase = async () => {
    if (confirm("정말로 데이터베이스를 초기화하시겠습니까? 모든 데이터가 삭제됩니다.")) {
      try {
        const response = await fetch("/api/admin/reset-database", {
          method: "POST",
        });
        if (response.ok) {
          toast({ title: "성공", description: "데이터베이스가 초기화되었습니다." });
          window.location.reload();
        } else {
          throw new Error("Reset failed");
        }
      } catch (error) {
        toast({ title: "오류", description: "데이터베이스 초기화에 실패했습니다.", variant: "destructive" });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">시스템 설정</h1>
          <p className="text-lg text-gray-600">평가 시스템의 전반적인 설정을 관리할 수 있습니다.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">일반 설정</TabsTrigger>
            <TabsTrigger value="security">보안 설정</TabsTrigger>
            <TabsTrigger value="database">데이터베이스</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <SettingsIcon className="h-5 w-5" />
                  <span>일반 설정</span>
                </CardTitle>
                <CardDescription>
                  시스템의 기본 정보와 평가 관련 설정을 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConfigSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="systemName">시스템 이름</Label>
                      <Input
                        id="systemName"
                        value={systemConfig.systemName}
                        onChange={(e) => setSystemConfig({ ...systemConfig, systemName: e.target.value })}
                        placeholder="평가 시스템"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">관리자 이메일</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={systemConfig.adminEmail}
                        onChange={(e) => setSystemConfig({ ...systemConfig, adminEmail: e.target.value })}
                        placeholder="admin@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxEvaluators">최대 평가자 수</Label>
                      <Input
                        id="maxEvaluators"
                        type="number"
                        value={systemConfig.maxEvaluators}
                        onChange={(e) => setSystemConfig({ ...systemConfig, maxEvaluators: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxCandidates">최대 후보자 수</Label>
                      <Input
                        id="maxCandidates"
                        type="number"
                        value={systemConfig.maxCandidates}
                        onChange={(e) => setSystemConfig({ ...systemConfig, maxCandidates: e.target.value })}
                        placeholder="500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="evaluationDeadline">평가 마감일</Label>
                      <Input
                        id="evaluationDeadline"
                        type="date"
                        value={systemConfig.evaluationDeadline}
                        onChange={(e) => setSystemConfig({ ...systemConfig, evaluationDeadline: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">시스템 설명</Label>
                    <Textarea
                      id="description"
                      value={systemConfig.description}
                      onChange={(e) => setSystemConfig({ ...systemConfig, description: e.target.value })}
                      placeholder="평가 시스템에 대한 설명을 입력하세요"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>부분 제출 허용</Label>
                        <p className="text-sm text-gray-500">평가자가 모든 항목을 완료하지 않아도 제출할 수 있습니다</p>
                      </div>
                      <Switch
                        checked={systemConfig.allowPartialSubmission}
                        onCheckedChange={(checked) => 
                          setSystemConfig({ ...systemConfig, allowPartialSubmission: checked })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>알림 기능</Label>
                        <p className="text-sm text-gray-500">평가 관련 알림을 활성화합니다</p>
                      </div>
                      <Switch
                        checked={systemConfig.enableNotifications}
                        onCheckedChange={(checked) => 
                          setSystemConfig({ ...systemConfig, enableNotifications: checked })
                        }
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={updateConfigMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateConfigMutation.isPending ? "저장 중..." : "설정 저장"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>보안 설정</span>
                </CardTitle>
                <CardDescription>
                  관리자 계정 및 보안 관련 설정을 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">현재 비밀번호</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={adminPassword.currentPassword}
                        onChange={(e) => setAdminPassword({ ...adminPassword, currentPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">새 비밀번호</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={adminPassword.newPassword}
                        onChange={(e) => setAdminPassword({ ...adminPassword, newPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={adminPassword.confirmPassword}
                        onChange={(e) => setAdminPassword({ ...adminPassword, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={updatePasswordMutation.isPending}>
                    <Shield className="h-4 w-4 mr-2" />
                    {updatePasswordMutation.isPending ? "변경 중..." : "비밀번호 변경"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>데이터베이스 관리</span>
                </CardTitle>
                <CardDescription>
                  데이터베이스 백업, 복원 및 초기화 기능입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">위험 구역</h3>
                    <p className="text-red-700 mb-4">
                      아래 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={resetDatabase}
                      className="w-full"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      데이터베이스 초기화
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" disabled>
                      <Download className="h-4 w-4 mr-2" />
                      데이터 백업 (준비 중)
                    </Button>
                    <Button variant="outline" disabled>
                      <Upload className="h-4 w-4 mr-2" />
                      데이터 복원 (준비 중)
                    </Button>
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