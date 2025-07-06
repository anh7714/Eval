import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, User, ArrowRight, Eye, Edit3 } from "lucide-react";
import { Link } from "wouter";

interface CandidateResult {
  candidate: {
    id: number;
    name: string;
    department: string;
    position: string;
    category: string;
  };
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  evaluatorCount: number;
  completedEvaluations: number;
  averageScore: number;
  rank: number;
  isCompleted: boolean;
  progress: number;
}

export default function EvaluatorEvaluationPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: progress } = useQuery({
    queryKey: ["/api/evaluator/progress"],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/admin/categories"],
  });

  // 평가위원에게 할당된 후보자 목록을 가져오기
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ["/api/evaluator/candidates"],
  });

  // 필터링된 결과 계산
  const filteredResults = React.useMemo(() => {
    if (!candidates || !Array.isArray(candidates)) return [];
    
    return candidates.filter((candidate: any) => {
      const categoryMatch = selectedCategory === "all" || candidate.category === selectedCategory;
      // 임시로 모든 상태를 "미시작"으로 설정
      const statusMatch = selectedStatus === "all" || selectedStatus === "incomplete";
      
      return categoryMatch && statusMatch && candidate.isActive;
    }).map((candidate: any, index: number) => ({
      candidate: {
        id: candidate.id,
        name: candidate.name,
        department: candidate.department || candidate.category?.split(' > ')[0] || '미분류',
        position: candidate.position || candidate.category?.split(' > ')[1] || '미설정',
        category: candidate.category || '미분류'
      },
      rank: index + 1,
      isCompleted: false, // 임시로 모두 미완료로 설정
      progress: 0, // 임시로 모두 0%로 설정
      totalScore: 0,
      maxPossibleScore: 100,
      percentage: 0,
      evaluatorCount: 1,
      completedEvaluations: 0,
      averageScore: 0
    }));
  }, [candidates, selectedCategory, selectedStatus]);

  const getStatusBadge = (result: CandidateResult) => {
    if (result.isCompleted) {
      return <Badge variant="default" className="bg-green-100 text-green-800">완료</Badge>;
    } else if (result.progress > 0) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">진행중</Badge>;
    } else {
      return <Badge variant="outline" className="bg-gray-100 text-gray-600">미시작</Badge>;
    }
  };

  const getProgressBar = (result: CandidateResult) => {
    const progressValue = result.progress || 0;
    let colorClass = "bg-gray-200";
    
    if (progressValue === 100) {
      colorClass = "bg-green-500";
    } else if (progressValue > 0) {
      colorClass = "bg-yellow-500";
    }
    
    return (
      <div className="w-full">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>{progressValue}%</span>
        </div>
        <Progress value={progressValue} className={`h-2 ${colorClass}`} />
      </div>
    );
  };

  if (candidatesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">평가 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 페이지 헤더 */}
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">평가하기</h1>
          <p className="text-lg text-gray-600 mt-2">
            평가대상별 상세 점수와 평가 진행 상황을 확인하고 평가를 수행하세요.
          </p>
        </div>

        {/* 필터 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>평가 관리</span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">구분:</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 카테고리</SelectItem>
                      {(categories as any).map((category: any) => (
                        <SelectItem key={category.id} value={category.categoryName}>
                          {category.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">상태:</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="in-progress">진행중</SelectItem>
                      <SelectItem value="incomplete">미완료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">순위</TableHead>
                    <TableHead className="text-center">구분</TableHead>
                    <TableHead className="text-center">세부구분</TableHead>
                    <TableHead>기관명(성명)</TableHead>
                    <TableHead className="text-center">진행상태</TableHead>
                    <TableHead className="text-center">진행상황</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                    <TableHead className="text-center">평가</TableHead>
                    <TableHead className="text-center">결과확인</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.length > 0 ? (
                    filteredResults.map((result: CandidateResult, index: number) => (
                      <TableRow key={result.candidate.id}>
                        <TableCell className="text-center font-medium">
                          {result.rank || index + 1}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{result.candidate.category}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm text-gray-600">{result.candidate.department}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{result.candidate.name}</div>
                            <div className="text-sm text-gray-600">{result.candidate.position}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(result)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="w-24 mx-auto">
                            {getProgressBar(result)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {result.isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Link href={`/evaluator/evaluate/${result.candidate.id}`}>
                            <Button size="sm" variant="outline" className="flex items-center space-x-1">
                              <Edit3 className="h-3 w-3" />
                              <span>{result.isCompleted ? "수정" : "평가"}</span>
                            </Button>
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="ghost" className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>결과확인</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">평가 대상이 없습니다.</p>
                        <p className="text-sm text-gray-400 mt-2">관리자가 평가대상을 등록하면 여기에 표시됩니다.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}