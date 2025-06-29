import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProgressBar from "@/components/ui/progress-bar";
import { useAuth } from "@/lib/auth";
import { Clock, Play, Eye, CheckCircle } from "lucide-react";

interface Candidate {
  id: number;
  name: string;
  department: string;
  position: string;
  category?: string;
  description?: string;
}

export default function EvaluatorDashboard() {
  const { evaluator } = useAuth();
  
  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["/api/candidates/active"],
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/evaluations/progress"],
  });

  // Mock evaluation status for candidates - In real app, this would come from API
  const getEvaluationStatus = (candidateId: number) => {
    // This is mock data - in real implementation, get from API
    const mockStatuses = [
      { candidateId: 1, status: "completed", progress: 100 },
      { candidateId: 2, status: "in_progress", progress: 67 },
      { candidateId: 3, status: "pending", progress: 0 },
    ];
    
    return mockStatuses.find(s => s.candidateId === candidateId) || { status: "pending", progress: 0 };
  };

  if (candidatesLoading || progressLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
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
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <Card className="gov-card mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  안녕하세요, <span className="text-blue-700">{evaluator?.name}</span>님
                </h1>
                <p className="text-slate-600">
                  {evaluator?.department} · 
                  평가 진행률: <span className="text-blue-700 font-semibold">{progress?.progress || 0}%</span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600 mb-1">전체 평가 현황</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-900">{progress?.completed || 0}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-lg text-slate-600">{progress?.total || 0}</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar value={progress?.progress || 0} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Filter Tabs - Simulated for design purposes */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
            <button className="flex-1 py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-md transition-colors">
              전체 <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-xs">{candidates?.length || 0}</span>
            </button>
            <button className="flex-1 py-2 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              미시작 <span className="ml-1 bg-slate-200 px-1.5 py-0.5 rounded text-xs">
                {candidates?.filter((c: Candidate) => getEvaluationStatus(c.id).status === "pending").length || 0}
              </span>
            </button>
            <button className="flex-1 py-2 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              완료 <span className="ml-1 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-xs">
                {candidates?.filter((c: Candidate) => getEvaluationStatus(c.id).status === "completed").length || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Evaluation Candidates Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {candidates?.map((candidate: Candidate) => {
            const status = getEvaluationStatus(candidate.id);
            return (
              <Card key={candidate.id} className="gov-card hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{candidate.name}</h3>
                      <p className="text-sm text-slate-600">{candidate.department} · {candidate.position}</p>
                      {candidate.description && (
                        <p className="text-xs text-slate-500 mt-1">{candidate.description}</p>
                      )}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      status.status === "completed" ? "gov-badge-completed" :
                      status.status === "in_progress" ? "gov-badge-progress" : "gov-badge-pending"
                    }`}>
                      {status.status === "completed" ? "완료" :
                       status.status === "in_progress" ? "진행중" : "미시작"}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-xs text-slate-600 mb-2">평가 진행률</div>
                    <ProgressBar value={status.progress} className="h-2" />
                    <div className="text-xs text-slate-600 mt-1">
                      {status.status === "completed" ? "모든 항목 완료" :
                       status.status === "in_progress" ? "일부 항목 완료" : "평가 시작 전"}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600 flex items-center">
                      {status.status === "completed" ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          완료됨
                        </>
                      ) : status.status === "in_progress" ? (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          진행중
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          시작 대기
                        </>
                      )}
                    </div>
                    
                    {status.status === "completed" ? (
                      <Button size="sm" variant="outline" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        결과 보기
                      </Button>
                    ) : (
                      <Link href={`/evaluator/evaluation/${candidate.id}`}>
                        <Button size="sm" className="gov-btn-primary text-xs">
                          {status.status === "in_progress" ? "계속하기" : "시작하기"}
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {(!candidates || candidates.length === 0) && (
          <Card className="gov-card">
            <CardContent className="p-8 text-center text-slate-500">
              <Play className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p>현재 평가 가능한 대상자가 없습니다.</p>
              <p className="text-sm mt-2">관리자가 평가 대상자를 등록하면 여기에 표시됩니다.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
