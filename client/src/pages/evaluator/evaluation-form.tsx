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

  // 사전점수 데이터 가져오기
  const { data: presetScores = [], isLoading: presetScoresLoading } = useQuery({
    queryKey: ["/api/evaluator/preset-scores", candidateId],
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
      } else {
        // 기존 점수가 없다면 사전점수 적용
        initializePresetScores();
      }
    },
  });

  // 사전점수 초기화 함수
  const initializePresetScores = () => {
    if (presetScores && presetScores.length > 0) {
      const scoresMap: { [key: number]: Score } = {};
      presetScores.forEach((preset: any) => {
        if (preset.apply_preset) {
          scoresMap[preset.evaluation_item_id] = {
            itemId: preset.evaluation_item_id,
            score: preset.preset_score,
            comments: "",
          };
        }
      });
      setScores(prev => ({
        ...prev,
        ...scoresMap,
      }));
    }
  };

  // 사전점수 데이터가 로드되면 초기화
  useEffect(() => {
    if (presetScores && presetScores.length > 0 && Object.keys(scores).length === 0) {
      initializePresetScores();
    }
  }, [presetScores]);

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

  // 사전점수 적용 여부 확인 함수
  const isPresetScoreApplied = (itemId: number) => {
    return presetScores.some((preset: any) => 
      preset.evaluation_item_id === itemId && preset.apply_preset
    );
  };

  const handleScoreChange = (itemId: number, field: 'score' | 'comments', value: string | number) => {
    // 사전점수가 적용된 항목의 점수는 수정 불가
    if (field === 'score' && isPresetScoreApplied(itemId)) {
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

  if (candidateLoading || itemsLoading || scoresLoading) {
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
  const categorizedItems = items.reduce((acc: any, item: EvaluationItem) => {
    const categoryName = item.category.categoryName;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {});

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

        {/* 평가 항목들 */}
        <div className="space-y-8">
          {Object.entries(categorizedItems).map(([categoryName, categoryItems]: [string, any]) => (
            <Card key={categoryName}>
              <CardHeader>
                <CardTitle className="text-xl">{categoryName}</CardTitle>
                <CardDescription>
                  {categoryItems.length}개의 평가 항목
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {categoryItems.map((item: EvaluationItem, index: number) => (
                    <div key={item.id} className="space-y-4">
                      {index > 0 && <Separator />}
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{item.itemName}</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {item.itemCode} · 최대 {item.maxScore}점 · 가중치 {item.weight}
                            </p>
                            {item.description && (
                              <p className="text-sm text-gray-500">{item.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              점수 (0 ~ {item.maxScore}점)
                              {isPresetScoreApplied(item.id) && (
                                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  사전점수 적용
                                </span>
                              )}
                            </label>
                            <Input
                              type="number"
                              min="0"
                              max={item.maxScore}
                              value={scores[item.id]?.score || ""}
                              onChange={(e) => handleScoreChange(
                                item.id, 
                                'score', 
                                Math.min(Math.max(0, parseInt(e.target.value) || 0), item.maxScore)
                              )}
                              placeholder="점수 입력"
                              disabled={submission?.isSubmitted || isPresetScoreApplied(item.id)}
                              className={isPresetScoreApplied(item.id) ? "bg-gray-100 text-gray-600" : ""}
                            />
                            <div className="flex mt-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    isPresetScoreApplied(item.id) 
                                      ? "text-gray-400" 
                                      : "cursor-pointer"
                                  } ${
                                    scores[item.id]?.score >= (star * item.maxScore / 5)
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  }`}
                                  onClick={() => !submission?.isSubmitted && !isPresetScoreApplied(item.id) && handleScoreChange(
                                    item.id, 
                                    'score', 
                                    Math.round(star * item.maxScore / 5)
                                  )}
                                />
                              ))}
                            </div>
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
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
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