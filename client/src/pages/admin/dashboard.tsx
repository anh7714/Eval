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
    <div className="page" style={{ backgroundColor: 'var(--tblr-body-bg)' }}>
      <div className="container-xl">
        {/* Header Section */}
        <div className="page-header">
          <div className="text-center">
            <div className="page-pretitle">시스템 관리</div>
            <h1 className="page-title">관리자 대시보드</h1>
            <p className="text-muted" style={{ fontSize: '1.125rem', marginTop: '1rem' }}>
              평가 시스템의 전체 현황을 확인하고 관리합니다
            </p>
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className="row g-4 mb-5">
          <div className="col-lg-3">
            <div className="card">
              <div className="card-body text-center">
                <div className="mb-3">
                  <div className="d-flex justify-content-center">
                    <div style={{
                      width: '3.5rem',
                      height: '3.5rem',
                      backgroundColor: 'rgba(32, 107, 196, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Users style={{ width: '1.5rem', height: '1.5rem', color: 'var(--tblr-primary)' }} />
                    </div>
                  </div>
                </div>
                <h3 className="card-title mb-2" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                  {(stats as any)?.totalEvaluators || 0}
                </h3>
                <p className="text-muted" style={{ fontSize: '1rem' }}>전체 평가자</p>
                <small className="text-primary">활성 {(stats as any)?.activeEvaluators || 0}명</small>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3">
            <div className="card">
              <div className="card-body text-center">
                <div className="mb-3">
                  <div className="d-flex justify-content-center">
                    <div style={{
                      width: '3.5rem',
                      height: '3.5rem',
                      backgroundColor: 'rgba(47, 179, 68, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <UserCheck style={{ width: '1.5rem', height: '1.5rem', color: 'var(--tblr-success)' }} />
                    </div>
                  </div>
                </div>
                <h3 className="card-title mb-2" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                  {(stats as any)?.totalCandidates || 0}
                </h3>
                <p className="text-muted" style={{ fontSize: '1rem' }}>전체 후보자</p>
                <small className="text-success">평가 대상</small>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3">
            <div className="card">
              <div className="card-body text-center">
                <div className="mb-3">
                  <div className="d-flex justify-content-center">
                    <div style={{
                      width: '3.5rem',
                      height: '3.5rem',
                      backgroundColor: 'rgba(130, 87, 229, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileText style={{ width: '1.5rem', height: '1.5rem', color: 'var(--tblr-purple)' }} />
                    </div>
                  </div>
                </div>
                <h3 className="card-title mb-2" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                  {(stats as any)?.totalEvaluationItems || 0}
                </h3>
                <p className="text-muted" style={{ fontSize: '1rem' }}>평가 항목</p>
                <small className="text-purple">{(stats as any)?.totalCategories || 0}개 카테고리</small>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3">
            <div className="card">
              <div className="card-body text-center">
                <div className="mb-3">
                  <div className="d-flex justify-content-center">
                    <div style={{
                      width: '3.5rem',
                      height: '3.5rem',
                      backgroundColor: 'rgba(245, 159, 0, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <TrendingUp style={{ width: '1.5rem', height: '1.5rem', color: 'var(--tblr-warning)' }} />
                    </div>
                  </div>
                </div>
                <h3 className="card-title mb-2" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                  {(stats as any)?.completionRate || 0}%
                </h3>
                <p className="text-muted" style={{ fontSize: '1rem' }}>전체 완료율</p>
                <small className={((stats as any)?.completionRate || 0) >= 80 ? 'text-success' : 'text-warning'}>
                  {((stats as any)?.completionRate || 0) >= 80 ? '우수' : '진행중'}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Management Menu */}
        <div className="page-header">
          <div className="page-pretitle">관리 기능</div>
          <h2 className="page-title" style={{ fontSize: '1.5rem' }}>시스템 관리</h2>
        </div>
        
        <div className="row g-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="col-lg-4">
                <Link href={item.href}>
                  <div className="card card-link card-link-pop" style={{ cursor: 'pointer' }}>
                    <div className="card-body text-center">
                      <div className="mb-3">
                        <div className="d-flex justify-content-center">
                          <div style={{
                            width: '4rem',
                            height: '4rem',
                            backgroundColor: 'rgba(32, 107, 196, 0.08)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Icon style={{ width: '2rem', height: '2rem', color: 'var(--tblr-primary)' }} />
                          </div>
                        </div>
                      </div>
                      <h3 className="card-title mb-2" style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                        {item.label}
                      </h3>
                      <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}