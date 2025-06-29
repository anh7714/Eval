import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface Evaluator {
  id: number;
  name: string;
  department: string;
}

interface Candidate {
  id: number;
  name: string;
  department: string;
  position: string;
  category: string;
}

interface EvaluationCategory {
  id: number;
  category_code: string;
  category_name: string;
  description: string;
}

interface EvaluationItem {
  id: number;
  category_id: number;
  item_code: string;
  item_name: string;
  description: string;
  max_score: number;
  weight: number;
  sort_order: number;
  category: EvaluationCategory;
}

interface Score {
  item_id: number;
  score: number;
  max_score: number;
  comments: string;
}

const EvaluationForm = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  
  const [evaluator, setEvaluator] = useState<Evaluator | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [categories, setCategories] = useState<EvaluationCategory[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [scores, setScores] = useState<{ [key: number]: Score }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [generalComment, setGeneralComment] = useState("");
  const [showSavedModal, setShowSavedModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [candidateId]);

  useEffect(() => {
    if (evaluator && candidateId) {
      fetchData();
    }
  }, [evaluator, candidateId]);

  const checkAuth = () => {
    const evaluatorData = localStorage.getItem("evaluator");
    if (!evaluatorData) {
      navigate("/evaluator/login");
      return;
    }
    setEvaluator(JSON.parse(evaluatorData));
  };

  const fetchData = async () => {
    if (!candidateId) return;

    try {
      // 평가 대상자 정보 조회
      const { data: candidateData, error: candidateError } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (candidateError) throw candidateError;
      setCandidate(candidateData);

      // 평가 카테고리 조회
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("evaluation_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // 평가 항목 조회
      const { data: itemsData, error: itemsError } = await supabase
        .from("evaluation_items")
        .select(`*, category:evaluation_categories(*)`)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // 기존 점수 조회 (evaluator가 있을 때만)
      if (evaluator) {
        const { data: scoresData, error: scoresError } = await supabase
          .from("scores")
          .select("*")
          .eq("evaluator_id", evaluator.id)
          .eq("candidate_id", candidateId);

        if (scoresError) throw scoresError;
        const scoresMap: { [key: number]: Score } = {};
        let lastComment = "";
        scoresData?.forEach((score, idx) => {
          scoresMap[score.item_id] = {
            item_id: score.item_id,
            score: score.score,
            max_score: score.max_score,
            comments: score.comments || "",
          };
          if (idx === scoresData.length - 1) {
            lastComment = score.comments || "";
          }
        });
        setScores(scoresMap);
        setGeneralComment(lastComment);
      }
    } catch (error) {
      console.error("데이터 조회 실패:", error);
      alert("데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (itemId: number, field: keyof Score, value: any) => {
    const currentScore = scores[itemId] || {
      item_id: itemId,
      score: 0,
      max_score: items.find(item => item.id === itemId)?.max_score || 100,
      comments: "",
    };

    setScores({
      ...scores,
      [itemId]: {
        ...currentScore,
        [field]: value,
      },
    });
  };

  const calculateProgress = () => {
    const totalItems = items.length;
    const completedItems = Object.keys(scores).length;
    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  };

  const saveScores = async (isFinal: boolean = false) => {
    if (!evaluator || !candidateId) return;

    setSaving(true);
    try {
      const scoreEntries = Object.values(scores);
      const totalItems = items.length;
      const completedItems = isFinal ? totalItems : Object.keys(scores).length;
      const progressPercentage = isFinal ? 100 : calculateProgress();
      // generalComment를 마지막 항목의 comments로 저장
      const scoresToSave = scoreEntries.map((score, idx) => ({
        evaluator_id: evaluator.id,
        candidate_id: parseInt(candidateId),
        item_id: score.item_id,
        score: score.score,
        max_score: score.max_score,
        comments: (idx === scoreEntries.length - 1) ? (generalComment || "") : (score.comments || ""),
        is_final: isFinal,
      }));

      // 점수 저장 (upsert로 중복 방지)
      const { error: scoresError } = await supabase
        .from("scores")
        .upsert(scoresToSave, { onConflict: "evaluator_id,candidate_id,item_id" });

      if (scoresError) throw scoresError;

      // 진행 상황 업데이트
      const { error: progressError, data: progressData } = await supabase
        .from("evaluation_progress")
        .upsert({
          evaluator_id: evaluator.id,
          candidate_id: parseInt(candidateId),
          total_items: totalItems,
          completed_items: completedItems,
          progress_percentage: progressPercentage,
          is_submitted: isFinal,
          submitted_at: isFinal ? new Date().toISOString() : null,
        }, { onConflict: "evaluator_id,candidate_id" });

      if (progressError) {
        console.error("진행상황 저장 에러:", progressError);
        throw progressError;
      }
      console.log("진행상황 저장 결과:", progressData);

      if (isFinal) {
        alert("평가가 완료되었습니다.");
        navigate("/evaluator/dashboard");
      } else {
        setShowSavedModal(true);
      }
    } catch (error) {
      console.error("점수 저장 실패:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteClick = (e: React.FormEvent) => {
    e.preventDefault();
    // 모든 항목 미평가 시에도 모달로 안내
    if (Object.keys(scores).length < items.length) {
      setPendingSubmit(true);
    } else {
      setShowCompleteModal(true);
    }
  };

  const handleModalConfirm = async () => {
    setShowCompleteModal(false);
    setPendingSubmit(false);
    if (pendingSubmit) {
      // 임시저장(미완료 상태)
      await saveScores(false);
      navigate("/evaluator/dashboard");
    } else {
      // 최종 제출(완료 상태)
      await saveScores(true);
      navigate("/evaluator/dashboard");
    }
  };

  const handleModalCancel = () => {
    setShowCompleteModal(false);
    setPendingSubmit(false);
  };

  useEffect(() => {
    setProgress(calculateProgress());
  }, [scores, items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">평가 대상자를 찾을 수 없습니다.</h2>
          <button
            onClick={() => navigate("/evaluator/dashboard")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto">
        {/* 상단 제목 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">평가 입력</h1>
          <p className="text-gray-500 text-sm">
            평가위원: <span className="font-semibold">{evaluator?.name}</span> &nbsp;|&nbsp; 대상자: <span className="font-semibold">{candidate?.name}</span>
          </p>
        </div>

        {/* 평가 카드 */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          {/* 평가 항목들 */}
          <div className="space-y-6">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="flex-1 text-gray-800 font-medium">{item.item_name}</div>
                <input
                  type="number"
                  min={0}
                  max={item.max_score}
                  value={scores[item.id]?.score || ""}
                  onChange={e => handleScoreChange(item.id, "score", parseInt(e.target.value) || 0)}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-right focus:ring-2 focus:ring-blue-400"
                  placeholder="0"
                />
                <span className="text-gray-400 text-sm">/ {item.max_score}점</span>
              </div>
            ))}
          </div>

          {/* 기타 의견 */}
          <div className="mt-8">
            <label className="block text-gray-700 font-medium mb-2">기타 의견 <span className="text-gray-400">(최대 300자)</span></label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 h-24 resize-none focus:ring-2 focus:ring-blue-400"
              maxLength={300}
              value={generalComment}
              onChange={e => setGeneralComment(e.target.value)}
              placeholder="기타 의견을 입력하세요..."
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={() => navigate('/evaluator/dashboard')}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              목록으로
            </button>
            <button
              type="button"
              onClick={() => saveScores(false)}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition"
            >
              임시 저장
            </button>
            <button
              type="button"
              onClick={handleCompleteClick}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              평가 완료
            </button>
          </div>
        </div>
      </div>

      {/* 커스텀 모달: 평가 완료/미완료 */}
      {(showCompleteModal || pendingSubmit) && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-xl w-full">
            <h2 className="text-lg font-bold mb-2">평가를 완료하시겠습니까?</h2>
            <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">
              {pendingSubmit
                ? "모든 항목을 평가하지 않았습니다. 그래도 제출하시겠습니까?"
                : "'평가 완료'를 누르면 더 이상 수정할 수 없습니다. 제출하시겠습니까?"}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={handleModalCancel} className="px-4 py-2 rounded border">취소</button>
              <button onClick={handleModalConfirm} className="px-4 py-2 rounded bg-blue-600 text-white">평가 완료</button>
            </div>
          </div>
        </div>
      )}
      {/* 커스텀 모달: 임시저장 안내 */}
      {showSavedModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-xl w-full">
            <h2 className="text-lg font-bold mb-2">임시 저장되었습니다.</h2>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowSavedModal(false)} className="px-4 py-2 rounded bg-blue-600 text-white">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationForm; 