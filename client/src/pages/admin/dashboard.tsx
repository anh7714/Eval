import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminNav from "@/components/layout/admin-nav";
import ProgressBar from "@/components/ui/progress-bar";
import { Users, GraduationCap, ClipboardList, Percent, Download, RefreshCw } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/statistics"],
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/admin/progress"],
  });

  if (statsLoading || progressLoading) {
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
      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">관리자 대시보드</h1>
          <p className="text-slate-600">시스템 전반의 현황을 확인하고 관리할 수 있습니다.</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="gov-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{stats?.totalEvaluators || 0}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">등록된 평가위원</h3>
              <p className="text-xs text-emerald-600 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                활성 상태: {stats?.activeEvaluators || 0}명
              </p>
            </CardContent>
          </Card>

          <Card className="gov-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{stats?.totalCandidates || 0}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">평가 대상자</h3>
              <p className="text-xs text-blue-600 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                평가 대상 등록
              </p>
            </CardContent>
          </Card>

          <Card className="gov-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{stats?.totalEvaluationItems || 0}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">평가 항목</h3>
              <p className="text-xs text-slate-600 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM14 9a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2z" />
                </svg>
                카테고리: {stats?.totalCategories || 0}개
              </p>
            </CardContent>
          </Card>

          <Card className="gov-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Percent className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{stats?.completionRate || 0}%</span>
              </div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">전체 진행률</h3>
              <ProgressBar value={stats?.completionRate || 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Progress Table */}
        <Card className="gov-card">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-900">평가 진행 현황</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gov-btn-secondary">
                  <Download className="w-4 h-4 mr-2" />
                  엑셀 다운로드
                </Button>
                <Button variant="outline" size="sm" className="gov-btn-primary">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>평가위원</th>
                    <th>부서</th>
                    <th className="text-center">완료</th>
                    <th className="text-center">진행률</th>
                    <th className="text-center">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {progress?.map((evaluator: any) => (
                    <tr key={evaluator.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {evaluator.name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900">{evaluator.name}</span>
                        </div>
                      </td>
                      <td className="text-slate-600">{evaluator.department}</td>
                      <td className="text-center">
                        <span className="text-lg font-semibold text-slate-900">
                          {evaluator.completed}/{evaluator.total}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <ProgressBar value={evaluator.progress} className="w-16" />
                          <span className="text-sm font-medium text-slate-600">{evaluator.progress}%</span>
                        </div>
                      </td>
                      <td className="text-center">
                        {evaluator.progress === 100 ? (
                          <span className="gov-badge-completed">완료</span>
                        ) : evaluator.progress > 0 ? (
                          <span className="gov-badge-progress">진행중</span>
                        ) : (
                          <span className="gov-badge-pending">미시작</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!progress || progress.length === 0) && (
              <div className="p-8 text-center text-slate-500">
                등록된 평가위원이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
