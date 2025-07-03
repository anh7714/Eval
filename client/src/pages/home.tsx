import { useQuery } from "@tanstack/react-query";
import { Shield, Users, BarChart3, Database } from "lucide-react";
import { Link } from "wouter";
import { SupabaseTest } from "@/components/SupabaseTest";

export default function HomePage() {
  const { data: config } = useQuery({
    queryKey: ["/api/system/config"],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-6">
            {(config as any)?.evaluationTitle || "종합평가시스템"}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            체계적이고 투명한 평가 시스템으로 공정한 선발을 지원합니다
          </p>
        </div>

        {/* Main Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Evaluator Card */}
          <Link href="/evaluator/login">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 text-center hover:shadow-xl transition-all duration-300 cursor-pointer group h-52 flex flex-col justify-between">
              <div>
                <div className="bg-blue-100 dark:bg-blue-900/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
                  평가 위원
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                시스템 설정을 관리하고 평가 결과를 집계합니다.
              </p>
            </div>
          </Link>

          {/* Admin Card */}
          <Link href="/admin/login">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 text-center hover:shadow-xl transition-all duration-300 cursor-pointer group h-52 flex flex-col justify-between">
              <div>
                <div className="bg-green-100 dark:bg-green-900/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
                  관리자
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                시스템 설정을 관리하고 평가 결과를 집계합니다.
              </p>
            </div>
          </Link>

          {/* Results Card */}
          <Link href="/results">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 text-center hover:shadow-xl transition-all duration-300 cursor-pointer group h-52 flex flex-col justify-between">
              <div>
                <div className="bg-orange-100 dark:bg-orange-900/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
                  채점 결과
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                시스템 설정을 관리하고 평가 결과를 집계합니다.
              </p>
            </div>
          </Link>
        </div>

        {/* Database Connection Test - Hidden from UI, kept for development */}
        {false && (
          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                데이터베이스 연결 상태
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Supabase 데이터베이스 연결을 확인합니다
              </p>
            </div>
            <SupabaseTest />
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-slate-500 dark:text-slate-400">
            안전하고 신뢰할 수 있는 평가 시스템
          </p>
        </div>
      </div>
    </div>
  );
}