import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ProgressBar from "@/components/ui/progress-bar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Save, Check, Clock, ArrowLeft } from "lucide-react";

interface EvaluationCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  order: number;
}

interface EvaluationItem {
  id: number;
  categoryId: number;
  code: string;
  name: string;
  description?: string;
  maxScore: number;
  weight: string;
  order: number;
  categoryName: string;
}

interface Candidate {
  id: number;
  name: string;
  department: string;
  position: string;
  description?: string;
}

interface EvaluationScore {
  itemId: number;
  score: number;
  comment: string;
}

export default function EvaluationForm() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { evaluator } = useAuth();
  const candidateId = parseInt(params.candidateId || "0");

  const [scores, setScores] = useState<Record<number, EvaluationScore>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data: candidate, isLoading: candidateLoading } = useQuery({
    queryKey: ["/api/candidates", candidateId],
    enabled: !!candidateId,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories/active"],
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/evaluation-items/active"],
  });

  const { data: existingEvaluations } = useQuery({
    queryKey: ["/api/evaluations/my"],
    onSuccess: (data) => {
      // Pre-populate form with existing scores
      const candidateEvaluations = data?.filter((e: any) => e.candidateId === candidateId) || [];
      const existingScores: Record<number, EvaluationScore> = {};
      
      candidateEvaluations.forEach((evaluation: any) => {
        existingScores[evaluation.itemId] = {
          itemId: evaluation.itemId,
          score: parseFloat(evaluation.score) || 0,
          comment: evaluation.comment || "",
        };
      });
      
      setScores(existingScores);
    },
  });

  const saveEvaluationMutation = useMutation({
    mutationFn: async (evaluation: any) => {
      const response = await apiRequest("POST", "/api/evaluations", evaluation);
      return response.json();
    },
    onSuccess: () => {
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations/my"] });
    },
    onError: (error: Error) => {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
    },
  });

  const submitEvaluationMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const response = await apiRequest("POST", `/api/evaluations/submit/${candidateId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "제출 완료", description: "평가가 성공적으로 제출되었습니다." });
      navigate("/evaluator/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "제출 실패", description: error.message, variant: "destructive" });
    },
  });

  const updateScore = (itemId: number, field: 'score' | 'comment', value: string | number) => {
    setScores(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        itemId,
        [field]: field === 'score' ? Number(value) : value,
        comment: prev[itemId]?.comment || "",
        score: prev[itemId]?.score || 0,
      }
    }));
  };

  const handleSaveTemporary = async () => {
    if (!evaluator) return;

    const evaluationsToSave = Object.values(scores).filter(score => 
      score.score > 0 || score.comment.trim()
    );

    for (const evaluation of evaluationsToSave) {
      await saveEvaluationMutation.mutateAsync({
        candidateId,
        itemId: evaluation.itemId,
        score: evaluation.score,
        comment: evaluation.comment,
        isSubmitted: false,
      });
    }

    toast({ title: "임시 저장 완료", description: "작성한 내용이 저장되었습니다." });
  };

  const handleSubmitEvaluation = async () => {
    if (!evaluator || !items) return;

    // Check if all items have scores
    const requiredItems = items.filter((item: EvaluationItem) => item.isActive);
    const missingItems = requiredItems.filter((item: EvaluationItem) => 
      !scores[item.id] || scores[item.id].score <= 0
    );

    if (missingItems.length > 0) {
      toast({
        title: "평가 미완료",
        description: `${missingItems.length}개의 항목이 평가되지 않았습니다.`,
        variant: "destructive"
      });
      return;
    }

    // Save all evaluations as submitted
    for (const evaluation of Object.values(scores)) {
      await saveEvaluationMutation.mutateAsync({
        candidateId,
        itemId: evaluation.itemId,
        score: evaluation.score,
        comment: evaluation.comment,
        isSubmitted: true,
      });
    }

    // Submit the evaluation
    submitEvaluationMutation.mutate(candidateId);
  };

  const getProgress = () => {
    if (!items) return 0;
    const totalItems = items.filter((item: EvaluationItem) => item.isActive).length;
    const completedItems = Object.values(scores).filter(score => score.score > 0).length;
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const getTotalScore = () => {
    return Object.values(scores).reduce((total, score) => total + score.score, 0);
  };

  const getMaxPossibleScore = () => {
    if (!items) return 0;
    return items.reduce((total: number, item: EvaluationItem) => total + item.maxScore, 0);
  };

  // Group items by category
  const groupedItems = categories?.reduce((acc: any, category: EvaluationCategory) => {
    acc[category.id] = {
      category,
      items: items?.filter((item: EvaluationItem) => item.categoryId === category.id) || []
    };
    return acc;
  }, {}) || {};

  if (candidateLoading || categoriesLoading || itemsLoading) {
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
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <Card className="gov-card mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/evaluator/dashboard")}
                  className="p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    {candidate?.name} 평가
                  </h1>
                  <p className="text-slate-600">
                    {candidate?.department} · {candidate?.position}
                  </p>
                  {candidate?.description && (
                    <p className="text-sm text-slate-500 mt-1">{candidate.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600 mb-1">진행률</div>
                <div className="text-2xl font-bold text-blue-700">{getProgress()}%</div>
              </div>
            </div>
            <ProgressBar value={getProgress()} className="h-3" />
          </CardContent>
        </Card>

        {/* Evaluation Categories */}
        <div className="space-y-8">
          {Object.values(groupedItems).map(({ category, items: categoryItems }: any) => (
            <Card key={category.id} className="gov-card">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold">
                    {category.code}
                  </span>
                  {category.name}
                  <span className="text-sm font-normal text-slate-500">
                    (총 {categoryItems.reduce((sum: number, item: EvaluationItem) => sum + item.maxScore, 0)}점)
                  </span>
                </CardTitle>
                {category.description && (
                  <p className="text-slate-600 mt-2">{category.description}</p>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {categoryItems.map((item: EvaluationItem) => {
                  const currentScore = scores[item.id] || { score: 0, comment: "" };
                  return (
                    <div key={item.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-2">
                            {item.code}. {item.name}
                            <span className="text-sm font-normal text-slate-500 ml-2">
                              ({item.maxScore}점)
                            </span>
                          </h3>
                          {item.description && (
                            <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                        <div className="ml-4">
                          {currentScore.score > 0 ? (
                            <span className="gov-badge-completed">완료</span>
                          ) : (
                            <span className="gov-badge-pending">미평가</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor={`score-${item.id}`} className="text-sm font-medium text-slate-700 mb-2 block">
                            점수 입력
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`score-${item.id}`}
                              type="number"
                              min="0"
                              max={item.maxScore}
                              value={currentScore.score || ""}
                              onChange={(e) => updateScore(item.id, 'score', e.target.value)}
                              className="w-20 gov-input"
                              placeholder="0"
                            />
                            <span className="text-sm text-slate-600">/ {item.maxScore}점</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`comment-${item.id}`} className="text-sm font-medium text-slate-700 mb-2 block">
                            평가 의견
                          </Label>
                          <Textarea
                            id={`comment-${item.id}`}
                            rows={3}
                            value={currentScore.comment || ""}
                            onChange={(e) => updateScore(item.id, 'comment', e.target.value)}
                            className="gov-input text-sm"
                            placeholder="평가 근거나 의견을 입력하세요..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <Card className="gov-card mt-8 sticky bottom-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSaveTemporary}
                  disabled={saveEvaluationMutation.isPending}
                  className="gov-btn-secondary"
                >
                  {saveEvaluationMutation.isPending ? (
                    <>
                      <div className="loading-spinner w-4 h-4 mr-2"></div>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      임시 저장
                    </>
                  )}
                </Button>
                {lastSaved && (
                  <div className="text-sm text-slate-600 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    마지막 저장: {lastSaved.toLocaleTimeString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-slate-600">현재 총점:</div>
                  <div className="text-lg font-bold text-blue-700">
                    {getTotalScore()}/{getMaxPossibleScore()}점
                  </div>
                </div>
                <Button
                  onClick={handleSubmitEvaluation}
                  disabled={submitEvaluationMutation.isPending || getProgress() < 100}
                  className="gov-btn-primary"
                >
                  {submitEvaluationMutation.isPending ? (
                    <>
                      <div className="loading-spinner w-4 h-4 mr-2"></div>
                      제출 중...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      평가 완료
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
