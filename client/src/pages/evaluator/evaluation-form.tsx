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
import { UseQueryOptions } from "@tanstack/react-query";
import React from "react"; // Added missing import

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

  const { data: items = [], isLoading: itemsLoading } = useQuery<any[]>({
    queryKey: ["/api/evaluator/evaluation-items"],
  } as UseQueryOptions<any[], Error>);

  // 1. items에 type(정량/정성) 필드 동기화
  const itemsWithType = items.map((item: any) => ({
    ...item,
    type: item.isQuantitative ? '정량' : '정성',
  }));

  // 관리자 템플릿 데이터 가져오기 (실시간 반영)
  const { data: adminTemplate, isLoading: templateLoading } = useQuery<any>({
    queryKey: ["/api/admin/templates/default"],
    refetchInterval: 1000, // 1초마다 갱신하여 실시간 반영
  } as UseQueryOptions<any, Error>);

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
  
  // 점수 매핑을 위한 code→score 맵 생성 (강화된 버전)
  const scoreByCode: { [code: string]: any } = {};
  scores && Object.values(scores).forEach((s: any) => {
    if (s && s.itemCode) {
      scoreByCode[s.itemCode] = s;
    } else if (s && s.itemId) {
      // itemId로 평가항목 찾아서 code 매핑
      const item = items.find((item: any) => item.id === s.itemId);
      if (item && item.code) {
        scoreByCode[item.code] = { ...s, itemCode: item.code };
      }
    }
  });
  
  // 사전점수도 code로 매핑 (강화된 버전)
  const presetScoreByCode: { [code: string]: any } = {};
  presetScores && presetScores.forEach((ps: any) => {
    if (ps && ps.item_code) {
      presetScoreByCode[ps.item_code] = ps;
    } else if (ps && ps.evaluation_item_id) {
      // evaluation_item_id로 평가항목 찾아서 code 매핑
      const item = items.find((item: any) => item.id === ps.evaluation_item_id);
      if (item && item.code) {
        presetScoreByCode[item.code] = { ...ps, item_code: item.code };
      }
    }
  });

  // 1. 템플릿 구조만으로 렌더링 (구분, 합계 포함)
  const renderTable = () => {
    if (!adminTemplate || !adminTemplate.sections) return null;
    let sectionAlpha = 'A'.charCodeAt(0);
    let totalScore = 0;
    return (
      <table className="w-full border mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">구분</th>
            <th className="border px-2 py-1">세부 항목</th>
            <th className="border px-2 py-1">유형</th>
            <th className="border px-2 py-1">배점</th>
            <th className="border px-2 py-1">평가점수</th>
          </tr>
        </thead>
        <tbody>
          {adminTemplate.sections.map((section: any, sectionIdx: number) => {
            const sectionLabel = section.label || String.fromCharCode(sectionAlpha + sectionIdx);
            return (
              <React.Fragment key={section.id || sectionIdx}>
                {section.items.map((item: any, idx: number) => {
                  const code = item.code;
                  const scoreObj = scoreByCode[code];
                  const presetObj = presetScoreByCode[code];
                  const isPreset = !!(presetObj && presetObj.preset_score !== undefined && presetObj.apply_preset);
                  const displayScore = isPreset ? presetObj.preset_score : (scoreObj ? scoreObj.score : '');
                  totalScore += Number(displayScore) || 0;
                  return (
                    <tr key={code}>
                      {idx === 0 && (
                        <td className="border px-2 py-1 text-center font-bold bg-gray-50 align-middle" rowSpan={section.items.length}>
                          {sectionLabel}. {section.title}<br />({section.totalPoints}점)
                        </td>
                      )}
                      <td className="border px-2 py-1">{item.text}</td>
                      <td className="border px-2 py-1 text-center">{item.type}</td>
                      <td className="border px-2 py-1 text-center">{item.points}점</td>
                      <td className="border px-2 py-1 text-center">
                        <input
                          type="number"
                          min={0}
                          max={item.points}
                          value={displayScore}
                          onChange={e => {
                            if (isPreset) return;
                            handleScoreChange(code, 'score', Math.min(Math.max(0, parseInt(e.target.value) || 0), item.points));
                          }}
                          className={`w-16 text-center ${isPreset ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
                          disabled={isPreset}
                        />
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
          {/* 합계 행 */}
          <tr className="bg-yellow-50 font-bold">
            <td className="border px-2 py-2 text-center" colSpan={4}>총계</td>
            <td className="border px-2 py-2 text-center">{adminTemplate.totalScore}점</td>
          </tr>
        </tbody>
      </table>
    );
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
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">평가위원 심사표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4">
                <h2 className="font-bold text-xl mb-4">평가위원 심사표</h2>
                <div className="overflow-x-auto">
                  {renderTable()}
                </div>
              </div>
            </CardContent>
          </Card>
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