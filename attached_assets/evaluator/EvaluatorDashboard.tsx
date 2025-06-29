import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface Evaluator {
  id: number;
  name: string;
  email: string;
  department: string;
}

interface Candidate {
  id: number;
  name: string;
  department: string;
  position: string;
  category: string;
}

interface EvaluationProgress {
  id: number;
  candidate_id: number;
  total_items: number;
  completed_items: number;
  progress_percentage: number;
  is_submitted: boolean;
  candidate: Candidate;
}

const EvaluatorDashboard = () => {
  const [evaluator, setEvaluator] = useState<Evaluator | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [progress, setProgress] = useState<EvaluationProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (evaluator) {
      fetchData();
    }
  }, [evaluator]);

  const checkAuth = () => {
    const evaluatorData = localStorage.getItem("evaluator");
    if (!evaluatorData) {
      navigate("/evaluator/login");
      return;
    }
    setEvaluator(JSON.parse(evaluatorData));
  };

  const fetchData = async () => {
    try {
      // 평가 대상자 목록 조회
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (candidatesError) throw candidatesError;
      setCandidates(candidatesData || []);

      // 평가 진행 상황 조회
      if (evaluator) {
        const { data: progressData, error: progressError } = await supabase
          .from("evaluation_progress")
          .select(`
            *,
            candidate:candidates(*)
          `)
          .eq("evaluator_id", evaluator.id);

        if (progressError) throw progressError;
        setProgress(progressData || []);
      }
    } catch (error) {
      console.error("데이터 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("evaluator");
    navigate("/evaluator/login");
  };

  const getProgressForCandidate = (candidateId: number) => {
    return progress.find(p => p.candidate_id === candidateId);
  };

  const startEvaluation = async (candidateId: number) => {
    try {
      // 기존 진행상황이 있는지 확인
      const { data: existing, error: existingError } = await supabase
        .from("evaluation_progress")
        .select("*")
        .eq("evaluator_id", evaluator?.id)
        .eq("candidate_id", candidateId)
        .eq("is_submitted", false)
        .single();
      if (!existingError && existing) {
        // 이미 임시저장된 진행상황이 있으면 바로 폼으로 이동
        navigate(`/evaluator/form/${candidateId}`);
        return;
      }
      // 평가 항목 수 조회
      const { count: totalItems } = await supabase
        .from("evaluation_items")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      // 평가 진행 상황 생성 또는 업데이트
      const { error } = await supabase
        .from("evaluation_progress")
        .upsert({
          evaluator_id: evaluator?.id,
          candidate_id: candidateId,
          total_items: totalItems || 0,
          completed_items: 0,
          progress_percentage: 0,
          is_submitted: false,
        });
      if (error) throw error;
      navigate(`/evaluator/form/${candidateId}`);
    } catch (error) {
      console.error("평가 시작 실패:", error);
      alert("평가를 시작할 수 없습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center py-8 border-b mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">평가위원 대시보드</h1>
            <p className="text-lg text-gray-500 mt-2">{evaluator?.name ? `${evaluator.name} 위원님! 환영합니다.` : '평가위원님! 환영합니다.'}</p>
          </div>
          <button onClick={handleLogout} className="border border-gray-300 rounded-md px-6 py-3 text-lg text-gray-700 hover:bg-gray-100 transition">로그아웃</button>
        </div>

        {/* 현황 */}
        <div className="flex items-center justify-center gap-10 text-xl font-bold mb-8">
          <span>총 평가 대상 <span className="font-extrabold text-blue-600 text-2xl">{candidates.length}</span></span>
          <span className="text-gray-300">|</span>
          <span>진행 중 <span className="font-extrabold text-yellow-600 text-2xl">{progress.filter(p => !p.is_submitted && p.completed_items > 0).length}</span></span>
          <span className="text-gray-300">|</span>
          <span>완료 <span className="font-extrabold text-green-600 text-2xl">{progress.filter(p => p.is_submitted).length}</span></span>
        </div>

        {/* 평가 대상자 목록 */}
        <div className="bg-white border rounded-md shadow-sm">
          <div className="flex items-center justify-between px-8 py-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">평가 대상 목록</h2>
            <span className="text-base text-gray-500 bg-gray-100 rounded px-4 py-2">완료된 평가는 수정할 수 없습니다.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-base text-gray-500">이름</th>
                  <th className="px-6 py-4 text-left text-base text-gray-500">부서</th>
                  <th className="px-6 py-4 text-left text-base text-gray-500">직급</th>
                  <th className="px-6 py-4 text-left text-base text-gray-500">진행 상황</th>
                  <th className="px-6 py-4 text-left text-base text-gray-500">상태</th>
                  <th className="px-6 py-4 text-left text-base text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => {
                  const candidateProgress = getProgressForCandidate(candidate.id);
                  const progressPercentage = candidateProgress?.progress_percentage || 0;
                  const isCompleted = candidateProgress?.is_submitted || false;
                  const hasStarted = candidateProgress && candidateProgress.completed_items > 0;
                  const isTempSaved = !isCompleted && hasStarted && progressPercentage < 100;
                  return (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-lg">{candidate.name}</td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-base">{candidate.department}</span>
                      </td>
                      <td className="px-6 py-4 text-lg">{candidate.position}</td>
                      <td className="px-6 py-4">
                        <div className="w-32 h-3 bg-gray-200 rounded">
                          <div className={`h-3 rounded ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                        <span className="ml-3 text-base text-gray-600 font-semibold">{Math.round(progressPercentage)}%</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-2 rounded text-base font-semibold ${isCompleted ? 'bg-green-100 text-green-700' : isTempSaved ? 'bg-blue-100 text-blue-700' : hasStarted ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{isCompleted ? '완료' : isTempSaved ? '임시저장' : hasStarted ? '진행 중' : '미시작'}</span>
                      </td>
                      <td className="px-6 py-4">
                        {isCompleted ? (
                          <span className="text-green-600 font-bold text-lg">평가 완료</span>
                        ) : (
                          <button onClick={() => startEvaluation(candidate.id)} className="border border-gray-300 rounded px-4 py-2 text-base text-blue-700 hover:bg-blue-50 transition font-semibold">
                            {hasStarted ? '계속하기' : '평가 시작'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluatorDashboard; 