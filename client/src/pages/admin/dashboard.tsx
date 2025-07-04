import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, FileText, TrendingUp, Database, Download } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/statistics"],
  });



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="text-lg text-slate-600 dark:text-slate-300">시스템 데이터를 불러오는 중입니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            시스템 관리
          </div>
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            관리자 대시보드
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            평가 시스템의 전체 현황을 확인하고 관리합니다
          </p>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {(stats as any)?.totalEvaluators || 0}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-1">전체 평가자</p>
              <Badge variant="secondary" className="text-xs">
                활성 {(stats as any)?.activeEvaluators || 0}명
              </Badge>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {(stats as any)?.totalCandidates || 0}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-1">전체 후보자</p>
              <Badge variant="secondary" className="text-xs">
                평가 대상
              </Badge>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {(stats as any)?.totalEvaluationItems || 0}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-1">평가 항목</p>
              <Badge variant="secondary" className="text-xs">
                {(stats as any)?.totalCategories || 0}개 카테고리
              </Badge>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {(stats as any)?.completionRate || 0}%
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-1">전체 완료율</p>
              <Badge 
                variant={((stats as any)?.completionRate || 0) >= 80 ? "default" : "secondary"} 
                className="text-xs"
              >
                {((stats as any)?.completionRate || 0) >= 80 ? '우수' : '진행중'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Supabase Migration Section */}
        <div className="mt-12">
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-200">
                <Database className="w-6 h-6" />
                Supabase 데이터 마이그레이션
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                <p className="mb-2">현재 파일 기반 저장소를 사용 중입니다. 다중 컴퓨터 접근을 위해 Supabase 데이터베이스로 마이그레이션할 수 있습니다.</p>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2">마이그레이션 단계:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>아래 버튼으로 SQL 파일 다운로드</li>
                    <li>Supabase 대시보드 → SQL Editor에서 실행</li>
                    <li>DATABASE_URL 환경변수 확인</li>
                    <li>시스템 재시작</li>
                  </ol>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/export-sql');
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'supabase_migration.sql';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } else {
                        console.error('SQL 내보내기 실패');
                      }
                    } catch (error) {
                      console.error('SQL 내보내기 오류:', error);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  SQL 파일 다운로드
                </Button>
                
                <Badge variant="outline" className="px-3 py-1">
                  파일 기반 모드
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}