import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Save, Send, ArrowLeft, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EvaluationItem {
  id: number;
  itemCode: string;
  itemName: string;
  description: string;
  maxScore: number;
  weight: number;
  category: {
    id: number;
    categoryName: string;
    categoryCode: string;
  };
}

interface Score {
  itemId: number;
  score: number;
  comments: string;
}

export default function EvaluationForm() {
  const { candidateId } = useParams();
  const [, setLocation] = useLocation();
  const [scores, setScores] = useState<{ [key: number]: Score }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: candidate, isLoading: candidateLoading } = useQuery({
    queryKey: ["/api/evaluator/candidate", candidateId],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/evaluator/evaluation-items"],
  });

  // 관리자 템플릿 데이터 가져오기 (실시간 반영)
  const { data: adminTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ["/api/admin/templates/default"],
    refetchInterval: 1000, // 1초마다 갱신하여 실시간 반영
  });

  // 사전점수 데이터 가져오기
  const { data: presetScores = [], isLoading: presetLoading } = useQuery({
    queryKey: ["/api/admin/candidate-preset-scores", candidateId],
    enabled: !!candidateId,
  });

  const { data: existingScores, isLoading: scoresLoading } = useQuery({
    queryKey: ["/api/evaluator/scores", candidateId],
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const scoresMap: { [key: number]: Score } = {};
        data.forEach((score: any) => {
          scoresMap[score.itemId] = {
            itemId: score.itemId,
            score: score.score,
            comments: score.comments || "",
          };
        });
        setScores(scoresMap);
      }
    },
  });

  const { data: submission } = useQuery({
    queryKey: ["/api/evaluator/submission", candidateId],
  });

  const saveScoreMutation = useMutation({
    mutationFn: async (scoreData: Score) => {
      const response = await fetch("/api/evaluator/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: parseInt(candidateId as string),
          ...scoreData,
        }),
      });
      if (!response.ok) throw new Error("Failed to save score");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/scores", candidateId] });
    },
  });

  const submitEvaluationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/evaluator/submit/${candidateId}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to submit evaluation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/submission", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluator/progress"] });
      toast({ title: "성공", description: "평가가 제출되었습니다." });
      setLocation("/evaluator/dashboard");
    },
    onError: () => {
      toast({ title: "오류", description: "평가 제출에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleScoreChange = (itemId: number, field: 'score' | 'comments', value: string | number) => {
    // 사전점수가 적용된 항목인지 확인
    const presetScore = presetScores.find(ps => 
      ps.evaluation_item_id === itemId && 
      ps.candidate_id === parseInt(candidateId as string) && 
      ps.apply_preset
    );
    
    // 사전점수가 적용된 항목은 수정 불가
    if (presetScore && field === 'score') {
      toast({ 
        title: "수정 불가", 
        description: "사전점수가 적용된 항목은 수정할 수 없습니다.", 
        variant: "destructive" 
      });
      return;
    }

    const newScore = {
      ...scores[itemId],
      itemId,
      [field]: value,
    };
    
    setScores(prev => ({
      ...prev,
      [itemId]: newScore,
    }));

    // 자동 저장
    saveScoreMutation.mutate(newScore);
  };

  // 사전점수가 적용된 항목인지 확인하는 함수
  const isPresetApplied = (itemId: number) => {
    return presetScores.some(ps => 
      ps.evaluation_item_id === itemId && 
      ps.candidate_id === parseInt(candidateId as string) && 
      ps.apply_preset
    );
  };

  // 사전점수 값 가져오기
  const getPresetScore = (itemId: number) => {
    const presetScore = presetScores.find(ps => 
      ps.evaluation_item_id === itemId && 
      ps.candidate_id === parseInt(candidateId as string) && 
      ps.apply_preset
    );
    return presetScore?.preset_score || 0;
  };

  const handleSubmit = () => {
    const requiredItems = items.filter((item: EvaluationItem) => item.category);
    const completedItems = requiredItems.filter((item: EvaluationItem) => 
      scores[item.id] && scores[item.id].score !== undefined && scores[item.id].score >= 0
    );

    if (completedItems.length < requiredItems.length) {
      toast({
        title: "평가 미완료",
        description: "모든 평가 항목을 완료해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    submitEvaluationMutation.mutate();
  };

  const getProgress = () => {
    if (items.length === 0) return 0;
    const completedItems = items.filter((item: EvaluationItem) => 
      scores[item.id] && scores[item.id].score !== undefined && scores[item.id].score >= 0
    );
    return (completedItems.length / items.length) * 100;
  };

  const getTotalScore = () => {
    let total = 0;
    let maxTotal = 0;
    
    items.forEach((item: EvaluationItem) => {
      maxTotal += item.maxScore * item.weight;
      if (scores[item.id] && scores[item.id].score !== undefined) {
        total += scores[item.id].score * item.weight;
      }
    });
    
    return { total, maxTotal };
  };

  // 사전점수가 설정된 항목들을 scores에 자동으로 추가
  useEffect(() => {
    if (presetScores && candidateId) {
      const newScores = { ...scores };
      let updated = false;
      
      presetScores.forEach(ps => {
        if (ps.apply_preset && ps.candidate_id === parseInt(candidateId as string)) {
          // 기존 scores에 해당 항목이 없거나, 사전점수와 다른 경우에만 업데이트
          if (!newScores[ps.evaluation_item_id] || newScores[ps.evaluation_item_id].score !== ps.preset_score) {
            newScores[ps.evaluation_item_id] = {
              itemId: ps.evaluation_item_id,
              score: ps.preset_score,
              comments: newScores[ps.evaluation_item_id]?.comments || ""
            };
            updated = true;
          }
        }
      });
      
      if (updated) {
        setScores(newScores);
      }
    }
  }, [presetScores, candidateId]);

  if (candidateLoading || itemsLoading || scoresLoading || templateLoading || presetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">평가 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const progress = getProgress();
  const { total, maxTotal } = getTotalScore();
  
  // 관리자 템플릿이 있으면 템플릿 구조를 사용하고, 없으면 기존 방식 사용
  const useTemplate = adminTemplate && adminTemplate.sections;
  
  // 템플릿과 실제 평가항목 매칭 개선
  const getMatchingItem = (sectionIndex: number, itemIndex: number) => {
    // 전체 항목 중에서 템플릿 순서와 매칭되는 항목 찾기
    const globalItemIndex = (adminTemplate?.sections || []).slice(0, sectionIndex).reduce((sum, s) => sum + (s.items?.length || 0), 0) + itemIndex;
    
    // 카테고리별로 정렬된 items에서 해당 인덱스의 항목 반환
    const sortedItems = [...items].sort((a, b) => {
      if (a.category?.id !== b.category?.id) {
        return (a.category?.id || 0) - (b.category?.id || 0);
      }
      return a.id - b.id;
    });
    
    return sortedItems[globalItemIndex];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setLocation("/evaluator/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{candidate?.name} 평가</h1>
              <p className="text-lg text-gray-600">
                {candidate?.department} · {candidate?.position}
              </p>
            </div>
          </div>
          <div className="text-right">
            {submission?.isSubmitted && (
              <Badge variant="default" className="mb-2">
                제출 완료
              </Badge>
            )}
            <div className="text-sm text-gray-500">
              진행률: {progress.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* 진행률 카드 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>평가 진행률</CardTitle>
            <CardDescription>
              {items.length}개 항목 중 {items.filter((item: EvaluationItem) => 
                scores[item.id] && scores[item.id].score !== undefined
              ).length}개 완료
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="mb-4" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>현재 점수: {total.toFixed(1)}점</span>
              <span>최대 점수: {maxTotal.toFixed(1)}점</span>
            </div>
          </CardContent>
        </Card>

        {/* 평가 항목들 - 관리자 템플릿 구조 사용 */}
        <div className="space-y-8">
          {useTemplate ? (
            /* 관리자 템플릿을 사용한 심사표 구조 */
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">{adminTemplate.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-center w-32">구분 ({adminTemplate.totalScore}점)</th>
                        <th className="border border-gray-300 px-4 py-2 text-center flex-1">세부 항목</th>
                        <th className="border border-gray-300 px-4 py-2 text-center w-16">유형</th>
                        <th className="border border-gray-300 px-4 py-2 text-center w-16">배점</th>
                        <th className="border border-gray-300 px-4 py-2 text-center w-20">평가점수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminTemplate.sections || []).flatMap((section, sectionIndex) => 
                        (section.items || []).map((templateItem, itemIndex) => {
                          // 개선된 매칭 로직 사용
                          const matchingItem = getMatchingItem(sectionIndex, itemIndex);
                          const actualItemId = matchingItem?.id;
                          const isPreset = actualItemId && isPresetApplied(actualItemId);
                          const presetScore = actualItemId ? getPresetScore(actualItemId) : 0;
                          const currentScore = actualItemId ? (scores[actualItemId]?.score || 0) : 0;
                          const displayScore = isPreset ? presetScore : currentScore;
                          
                          return (
                            <tr key={`${section.id}-${itemIndex}`} className={isPreset ? "bg-gray-100" : ""}>
                              {itemIndex === 0 && (
                                <td 
                                  className="border border-gray-300 px-4 py-2 text-center font-medium bg-gray-50 align-middle"
                                  rowSpan={(section.items || []).length}
                                >
                                  <div className="font-bold">{section.title}</div>
                                  <div className="text-sm text-gray-600 mt-1">({section.totalPoints || 0}점)</div>
                                </td>
                              )}
                              <td className="border border-gray-300 px-4 py-2">
                                {templateItem.text}
                              </td>
                              <td className="border border-gray-300 px-2 py-2 text-center">
                                {templateItem.type}
                              </td>
                              <td className="border border-gray-300 px-2 py-2 text-center">
                                {templateItem.points}점
                              </td>
                              <td className="border border-gray-300 px-2 py-2 text-center">
                                {actualItemId ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    max={templateItem.points}
                                    value={isPreset ? presetScore : (scores[actualItemId]?.score || "")}
                                    onChange={(e) => actualItemId && handleScoreChange(
                                      actualItemId, 
                                      'score', 
                                      Math.min(Math.max(0, parseInt(e.target.value) || 0), templateItem.points)
                                    )}
                                    className={`w-16 text-center ${isPreset ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                                    disabled={submission?.isSubmitted || isPreset}
                                    placeholder="점수"
                                    title={isPreset ? "사전점수가 적용된 항목입니다" : "점수를 입력하세요"}
                                  />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                      <tr className="bg-yellow-50 font-bold">
                        <td className="border border-gray-300 px-4 py-2 text-center" colSpan={3}>
                          합계
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center">
                          {adminTemplate.totalScore}점
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center">
                          {total.toFixed(0)}점
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* 기존 방식의 평가 항목 표시 */
            items.map((item: EvaluationItem) => {
              const isPreset = isPresetApplied(item.id);
              const presetScore = getPresetScore(item.id);
              
              return (
                <Card key={item.id} className={isPreset ? "bg-gray-50 border-gray-300" : ""}>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {item.itemName}
                      {isPreset && (
                        <Badge variant="secondary" className="text-xs">
                          사전점수 적용
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {item.itemCode} · 최대 {item.maxScore}점 · 가중치 {item.weight}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          점수 (0 ~ {item.maxScore}점)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max={item.maxScore}
                          value={isPreset ? presetScore : (scores[item.id]?.score || "")}
                          onChange={(e) => handleScoreChange(
                            item.id, 
                            'score', 
                            Math.min(Math.max(0, parseInt(e.target.value) || 0), item.maxScore)
                          )}
                          placeholder="점수 입력"
                          disabled={submission?.isSubmitted || isPreset}
                          className={isPreset ? 'bg-gray-200 cursor-not-allowed' : ''}
                          title={isPreset ? "사전점수가 적용된 항목입니다" : "점수를 입력하세요"}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          평가 의견
                        </label>
                        <Textarea
                          value={scores[item.id]?.comments || ""}
                          onChange={(e) => handleScoreChange(item.id, 'comments', e.target.value)}
                          placeholder="평가에 대한 의견을 작성해주세요"
                          rows={3}
                          disabled={submission?.isSubmitted}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* 제출 버튼 */}
        {!submission?.isSubmitted && (
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">평가 완료</h3>
                  <p className="text-sm text-gray-600">
                    모든 항목을 평가한 후 제출해주세요. 제출 후에는 수정할 수 없습니다.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={progress < 100 || isSubmitting}
                    className="px-8"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? "제출 중..." : "평가 제출"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {submission?.isSubmitted && (
          <Card className="mt-8 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-green-600 mb-2">
                  <Send className="h-8 w-8 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-green-800">평가가 완료되었습니다</h3>
                <p className="text-sm text-green-600">
                  {submission.submittedAt && `제출일: ${new Date(submission.submittedAt).toLocaleString()}`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}