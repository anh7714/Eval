import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, User, FileText, ClipboardList, ArrowRight, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function EvaluatorDashboard() {
  const { data: progress, isLoading } = useQuery({
    queryKey: ["/api/evaluator/progress"],
  });

  const { data: evaluator } = useQuery({
    queryKey: ["/api/evaluator/profile"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="body-large text-gray-600">평가 데이터를 불러오는 중입니다</p>
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
            <div className="page-pretitle">평가 시스템</div>
            <h1 className="page-title">평가자 대시보드</h1>
            <p className="text-muted" style={{ fontSize: '1.125rem', marginTop: '1rem' }}>
              안녕하세요, <span className="fw-bold">{(evaluator as any)?.name || "평가자"}</span>님
            </p>
          </div>
        </div>
        
        {/* Progress Cards */}
        <div className="row g-4 mb-5">
          <div className="col-lg-4">
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
                      <CheckCircle style={{ width: '1.5rem', height: '1.5rem', color: 'var(--tblr-primary)' }} />
                    </div>
                  </div>
                </div>
                <h3 className="card-title mb-2" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                  {(progress as any)?.progress || 0}%
                </h3>
                <div className="progress mb-2" style={{ height: '0.5rem' }}>
                  <div 
                    className="progress-bar bg-primary" 
                    style={{ width: `${(progress as any)?.progress || 0}%` }}
                  ></div>
                </div>
                <p className="text-muted" style={{ fontSize: '1rem' }}>전체 진행률</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
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
                      <FileText style={{ width: '1.5rem', height: '1.5rem', color: 'var(--tblr-success)' }} />
                    </div>
                  </div>
                </div>
                <h3 className="card-title mb-2" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                  {(progress as any)?.completed || 0}
                </h3>
                <p className="text-muted" style={{ fontSize: '1rem' }}>
                  완료된 평가 / {(progress as any)?.total || 0}
                </p>
                <small className="text-success">완료됨</small>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
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
                      <Clock style={{ width: '1.5rem', height: '1.5rem', color: 'var(--tblr-warning)' }} />
                    </div>
                  </div>
                </div>
                <h3 className="card-title mb-2" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                  {((progress as any)?.total || 0) - ((progress as any)?.completed || 0)}
                </h3>
                <p className="text-muted" style={{ fontSize: '1rem' }}>남은 평가</p>
                <small className="text-warning">대기 중</small>
              </div>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        <div className="page-header">
          <div className="page-pretitle">평가 대상</div>
          <h2 className="page-title" style={{ fontSize: '1.5rem' }}>후보자 목록</h2>
          <p className="text-muted" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>
            각 후보자를 클릭하여 평가를 시작하거나 결과를 확인하세요
          </p>
        </div>

        <div className="row g-4">
          {(progress as any)?.candidates?.map((candidate: any) => (
            <div key={candidate.id} className="col-lg-6">
              <div className="card card-link">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: 'rgba(32, 107, 196, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <User style={{ width: '1.25rem', height: '1.25rem', color: 'var(--tblr-primary)' }} />
                      </div>
                    </div>
                    <div className="flex-fill">
                      <h3 className="card-title mb-1" style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                        {candidate.name}
                      </h3>
                      <p className="text-muted mb-2" style={{ fontSize: '0.875rem' }}>
                        {candidate.department} · {candidate.position}
                      </p>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${candidate.is_submitted ? 'bg-success' : 'bg-warning'}`}>
                          {candidate.is_submitted ? "평가 완료" : "평가 필요"}
                        </span>
                        <Link href={`/evaluator/evaluation/${candidate.id}`}>
                          <button className={`btn btn-sm ${candidate.is_submitted ? 'btn-outline-primary' : 'btn-primary'}`}>
                            {candidate.is_submitted ? "결과 보기" : "평가하기"}
                            <ArrowRight style={{ width: '1rem', height: '1rem', marginLeft: '0.5rem' }} />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )) || (
            <div className="col-12">
              <div className="empty">
                <div className="empty-img">
                  <User style={{ width: '4rem', height: '4rem', color: 'var(--tblr-muted)' }} />
                </div>
                <p className="empty-title">평가할 후보자가 없습니다</p>
                <p className="empty-subtitle text-muted">
                  관리자가 평가 대상자를 배정할 때까지 기다려주세요
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}