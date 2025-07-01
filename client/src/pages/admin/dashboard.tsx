import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, FileText, Target, BarChart3, Settings, TrendingUp, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/statistics"],
  });

  const menuItems = [
    { 
      id: "evaluators", 
      label: "평가자 관리", 
      icon: Users, 
      description: "평가자 추가, 수정, 삭제 및 권한 관리",
      href: "/admin/evaluators",
      color: "text-blue-600 bg-blue-50"
    },
    { 
      id: "candidates", 
      label: "후보자 관리", 
      icon: UserCheck, 
      description: "후보자 정보 관리 및 평가 배정",
      href: "/admin/candidates",
      color: "text-green-600 bg-green-50"
    },
    { 
      id: "items", 
      label: "평가항목 관리", 
      icon: FileText, 
      description: "평가 기준 및 항목 설정, 가중치 조정",
      href: "/admin/evaluation-items",
      color: "text-purple-600 bg-purple-50"
    },
    { 
      id: "results", 
      label: "결과 관리", 
      icon: BarChart3, 
      description: "평가 결과 조회, 분석 및 리포트 생성",
      href: "/admin/results",
      color: "text-orange-600 bg-orange-50"
    },
    { 
      id: "settings", 
      label: "시스템 설정", 
      icon: Settings, 
      description: "시스템 환경 설정 및 기본값 관리",
      href: "/admin/settings",
      color: "text-gray-600 bg-gray-50"
    },
  ];

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

        {/* Management Menu */}
        <div className="text-center mb-8">
          <div className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            관리 기능
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            시스템 관리
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.href}>
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
                      {item.label}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}