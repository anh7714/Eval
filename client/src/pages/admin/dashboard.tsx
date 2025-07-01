import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, FileText, TrendingUp } from "lucide-react";

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


      </div>
    </div>
  );
}