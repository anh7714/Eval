import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminNav from "@/components/layout/admin-nav";
import { Trophy, Medal, Award, Download, FileText, Users, GraduationCap } from "lucide-react";

interface ResultItem {
  candidateId: number;
  candidateName: string;
  department: string;
  position: string;
  totalScore: number;
  evaluationCount: number;
  rank: number;
  averageScore: string;
}

export default function AdminResults() {
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/admin/results"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/statistics"],
  });

  const handleExcelDownload = () => {
    // TODO: Implement Excel download functionality
    console.log("Downloading Excel report...");
  };

  const handlePdfDownload = () => {
    // TODO: Implement PDF download functionality
    console.log("Downloading PDF report...");
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-600" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-600" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-600" />;
      default:
        return <span className="text-lg font-medium text-slate-600">{rank}</span>;
    }
  };

  const getGradeLabel = (averageScore: number) => {
    if (averageScore >= 90) return { label: "최우수", className: "bg-yellow-100 text-yellow-800" };
    if (averageScore >= 80) return { label: "우수", className: "bg-emerald-100 text-emerald-800" };
    if (averageScore >= 70) return { label: "양호", className: "bg-blue-100 text-blue-800" };
    return { label: "보통", className: "bg-slate-100 text-slate-800" };
  };

  if (resultsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminNav />
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
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">평가 결과 관리</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            전체 평가위원의 채점 결과를 종합하여 공정하게 집계된 최종 순위입니다.
          </p>
          <div className="mt-6 inline-flex px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            평가 완료: <span className="font-semibold ml-1">{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid gap-6 md:grid-cols-4 mb-12">
          <Card className="gov-card text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-blue-700 mb-2">{stats?.totalCandidates || 0}</div>
              <div className="text-sm text-slate-600">전체 평가 대상자</div>
            </CardContent>
          </Card>
          <Card className="gov-card text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-emerald-600 mb-2">{stats?.activeEvaluators || 0}</div>
              <div className="text-sm text-slate-600">참여 평가위원</div>
            </CardContent>
          </Card>
          <Card className="gov-card text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-amber-600 mb-2">{stats?.totalCategories || 0}</div>
              <div className="text-sm text-slate-600">평가 카테고리</div>
            </CardContent>
          </Card>
          <Card className="gov-card text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {results?.length > 0 
                  ? (results.reduce((sum: number, item: ResultItem) => sum + parseFloat(item.averageScore), 0) / results.length).toFixed(1)
                  : "0.0"
                }
              </div>
              <div className="text-sm text-slate-600">평균 점수</div>
            </CardContent>
          </Card>
        </div>

        {/* Rankings Table */}
        <Card className="gov-card">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-slate-900">최종 순위</CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleExcelDownload} className="gov-btn-secondary">
                  <Download className="w-4 h-4 mr-2" />
                  엑셀 다운로드
                </Button>
                <Button onClick={handlePdfDownload} className="gov-btn-secondary">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF 다운로드
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-center">순위</th>
                    <th>성명</th>
                    <th>소속</th>
                    <th>직책</th>
                    <th className="text-center">총점</th>
                    <th className="text-center">평균</th>
                    <th className="text-center">등급</th>
                  </tr>
                </thead>
                <tbody>
                  {results?.map((result: ResultItem) => {
                    const grade = getGradeLabel(parseFloat(result.averageScore));
                    return (
                      <tr key={result.candidateId}>
                        <td className="text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center">
                              {getRankIcon(result.rank)}
                            </div>
                            {result.rank <= 3 && (
                              <span className="ml-2 font-bold text-lg">{result.rank}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold text-slate-900">{result.candidateName}</div>
                        </td>
                        <td className="text-slate-600">{result.department}</td>
                        <td className="text-slate-600">{result.position}</td>
                        <td className="text-center">
                          <span className="text-lg font-bold text-slate-900">{result.totalScore}</span>
                        </td>
                        <td className="text-center">
                          <span className="text-slate-700">{result.averageScore}</span>
                        </td>
                        <td className="text-center">
                          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${grade.className}`}>
                            {grade.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(!results || results.length === 0) && (
              <div className="p-8 text-center text-slate-500">
                <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>아직 평가 결과가 없습니다.</p>
                <p className="text-sm mt-2">평가위원들이 채점을 완료하면 결과가 표시됩니다.</p>
              </div>
            )}
            {results && results.length > 0 && (
              <div className="p-4 bg-slate-50 text-center text-sm text-slate-600">
                총 <span className="font-semibold">{results.length}</span>명의 평가 대상자
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
