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
import { Save, Send, ArrowLeft, Star, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UseQueryOptions } from "@tanstack/react-query";
import React from "react";

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

  const { data: candidateRaw, isLoading: candidateLoading } = useQuery({
    queryKey: ["/api/evaluator/candidate", candidateId],
  });
  const candidate = (candidateRaw as any) || {};

  // 🔧 수정: 평가자 전용 평가 항목 API (실시간 업데이트 강화)
  const { data: items = [], isLoading: itemsLoading } = useQuery<any[]>({
    queryKey: ["/api/evaluator/evaluation-items"],
    refetchInterval: 2000, // 2초마다 갱신
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 1000,
    cacheTime: 0, // 캐시 사용 안 함으로 실시간 반영
  } as UseQueryOptions<any[], Error>);

  // 사전점수 데이터 가져오기
  const { data: presetScores = [], isLoading: presetLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/candidate-preset-scores", candidateId],
    enabled: !!candidateId,
  } as UseQueryOptions<any[], Error>);

  const { data: existingScores, isLoading: scoresLoading } = useQuery<any[]>({
    queryKey: ["/api/evaluator/scores", candidateId],
    onSuccess: (data: any[]) => {
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
  } as UseQueryOptions<any[], Error>);

  const { data: submissionRaw, isLoading: submissionLoading } = useQuery({
    queryKey: ["/api/evaluator/submission", candidateId],
  });
  const submission = (submissionRaw as any) || {};

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
    
    items.forEach((item: any) => {
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

  // 🔧 수정: 로딩 상태 개선
  if (candidateLoading || itemsLoading || scoresLoading || presetLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="text-lg text-gray-600">
            {candidateLoading ? "평가 대상 정보를 불러오는 중..." : 
             itemsLoading ? "평가 항목을 불러오는 중..." : 
             "평가 데이터를 불러오는 중..."}
          </p>
        </div>
      </div>
    );
  }

  // 🔧 수정: 평가 항목이 없는 경우 안내 메시지
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <div className="text-6xl">📋</div>
          <h2 className="text-2xl font-bold text-gray-800">평가 항목이 설정되지 않았습니다</h2>
          <p className="text-gray-600">
            관리자에게 평가 항목 설정을 요청해주세요.
            <br />
            관리자가 평가 항목을 설정하면 자동으로 업데이트됩니다.
          </p>
          <div className="mt-6 space-x-4">
            <Button 
              onClick={() => window.location.reload()} 
              className="mr-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/evaluator/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              대시보드로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progress = getProgress();
  const { total, maxTotal } = getTotalScore();

  // 🔧 수정: 간단하고 실용적인 평가 항목 렌더링
  const renderEvaluationItems = () => {
    // 카테고리별로 그룹화
    const itemsByCategory = items.reduce((acc: any, item: any) => {
      const categoryName = item.category?.categoryName || item.categoryName || "기타";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(item);
      return acc;
    }, {});

    return Object.entries(itemsByCategory).map(([categoryName, categoryItems]: [string, any]) => (
      <Card key={categoryName} className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{categoryName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryItems.map((item: any) => {
              const isPreset = isPresetApplied(item.id);
              const currentScore = isPreset ? getPresetScore(item.id) : (scores[item.id]?.score || 0);
              const maxScore = item.maxScore || 10;
              
              return (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name || item.itemName}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {item.isQuantitative ? '정량' : '정성'}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          최대 {maxScore}점
                        </span>
                        {isPreset && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            사전점수 적용
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <Input
                        type="number"
                        min={0}
                        max={maxScore}
                        value={currentScore}
                        onChange={(e) => handleScoreChange(item.id, 'score', Math.min(Math.max(0, parseInt(e.target.value) || 0), maxScore))}
                        className={`w-20 text-center ${isPreset ? 'bg-gray-100 text-gray-600' : ''}`}
                        disabled={isPreset}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        / {maxScore}점
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      의견 (선택사항)
                    </label>
                    <Textarea
                      value={scores[item.id]?.comments || ""}
                      onChange={(e) => handleScoreChange(item.id, 'comments', e.target.value)}
                      placeholder="이 항목에 대한 의견을 입력해주세요..."
                      className="text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    ));
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
              <h1 className="text-3xl font-bold text-gray-900">{candidate?.name} 평가</h1>
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
        <div className="space-y-6">
          {renderEvaluationItems()}
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
      </div>
    </div>
  );
}