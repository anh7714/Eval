import { useState } from "react";
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
      href: "/admin/evaluators" 
    },
    { 
      id: "candidates", 
      label: "후보자 관리", 
      icon: UserCheck, 
      description: "후보자 정보 관리 및 평가 배정",
      href: "/admin/candidates" 
    },
    { 
      id: "items", 
      label: "평가항목 관리", 
      icon: FileText, 
      description: "평가 기준 및 항목 설정, 가중치 조정",
      href: "/admin/evaluation-items" 
    },
    { 
      id: "results", 
      label: "결과 관리", 
      icon: BarChart3, 
      description: "평가 결과 조회, 분석 및 리포트 생성",
      href: "/admin/results" 
    },
    { 
      id: "settings", 
      label: "시스템 설정", 
      icon: Settings, 
      description: "시스템 환경 설정 및 기본값 관리",
      href: "/admin/settings" 
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="body-large text-gray-600">시스템 데이터를 불러오는 중입니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="h2 text-gray-900">
                관리자 대시보드
              </h1>
              <p className="body-medium text-gray-600">
                평가 시스템의 전체 현황을 확인하고 관리합니다
              </p>
            </div>
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="krds-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <Badge className="krds-badge-info text-xs">
                  활성 {stats?.activeEvaluators || 0}명
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">{stats?.totalEvaluators || 0}</h3>
                <p className="text-sm text-gray-600">전체 평가자</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="krds-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 border border-green-100">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <Badge className="krds-badge-success text-xs">
                  평가 대상
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">{stats?.totalCandidates || 0}</h3>
                <p className="text-sm text-gray-600">전체 후보자</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="krds-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 border border-purple-100">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <Badge className="krds-badge-warning text-xs">
                  {stats?.totalCategories || 0}개 카테고리
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">{stats?.totalEvaluationItems || 0}</h3>
                <p className="text-sm text-gray-600">평가 항목</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="krds-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 border border-orange-100">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <Badge className={`text-xs ${(stats?.completionRate || 0) >= 80 ? 'krds-badge-success' : 'krds-badge-warning'}`}>
                  진행률
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">{stats?.completionRate || 0}%</h3>
                <p className="text-sm text-gray-600">전체 완료율</p>
              </div>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
}