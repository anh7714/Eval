import { useQuery } from "@tanstack/react-query";
import { Shield, Users, BarChart3 } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  const { data: config } = useQuery({
    queryKey: ["/api/system/config"],
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-display mb-6">
            {(config as any)?.evaluationTitle || "2025년 상반기 적극행정 우수공무원 선발"}
          </h1>
          <p className="text-body-large max-w-2xl mx-auto">
            정확하고 효율적인 채점 및 집계 시스템
          </p>
        </div>

        {/* Main Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href="/evaluator/login">
            <div className="tblr-card card-interactive card-feature group">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-heading-3 mb-4">평가 위원</h3>
              <p className="text-body mb-6">
                채점을 진행하고 결과를 제출합니다.
              </p>
              <div className="inline-flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                이동하기
                <BarChart3 className="ml-2 h-4 w-4" />
              </div>
            </div>
          </Link>

          <Link href="/admin/login">
            <div className="tblr-card card-interactive card-feature group">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-heading-3 mb-4">관리자</h3>
              <p className="text-body mb-6">
                시스템 설정을 관리하고 결과를 집계합니다.
              </p>
              <div className="inline-flex items-center text-green-600 font-medium group-hover:text-green-700">
                이동하기
                <BarChart3 className="ml-2 h-4 w-4" />
              </div>
            </div>
          </Link>

          <Link href="/results">
            <div className="tblr-card card-interactive card-feature group">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                </div>
              </div>
              <h3 className="text-heading-3 mb-4">채점 결과</h3>
              <p className="text-body mb-6">
                종합 채점 결과를 확인합니다.
              </p>
              <div className="inline-flex items-center text-orange-600 font-medium group-hover:text-orange-700">
                이동하기
                <BarChart3 className="ml-2 h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}