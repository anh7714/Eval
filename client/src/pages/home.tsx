import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ClipboardList, 
  Shield, 
  BarChart3,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  const { data: config } = useQuery({
    queryKey: ["/api/system/config"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/system/stats"],
  });

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Pretendard GOV, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
      {/* Main Content - Simplified 3-card layout */}
      <main className="container mx-auto px-6 py-16">
        {/* Page Title Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6" style={{ fontSize: '2.5rem', lineHeight: '1.5', letterSpacing: '0.5px' }}>
            {(config as any)?.systemName || "적극행정 우수공무원 선발"}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed" style={{ fontSize: '1.25rem', lineHeight: '1.6' }}>
            구조화된 평가 기준으로 공정하고 객관적인 평가를 실시합니다
          </p>
        </div>

        {/* 3-Card Layout - Clean and Simple */}
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {/* Evaluation Card */}
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                <ClipboardList className="h-10 w-10 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-3" style={{ fontSize: '1.5rem', lineHeight: '1.5' }}>
                평가 실시
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg leading-relaxed" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
                구조화된 평가 기준으로 공정하고 객관적인 평가를 실시합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-8">
              <Link href="/evaluator/login" className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-medium rounded-lg" style={{ fontSize: '1.125rem' }}>
                  평가 시작하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Management Card */}
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <Shield className="h-10 w-10 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-3" style={{ fontSize: '1.5rem', lineHeight: '1.5' }}>
                시스템 관리
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg leading-relaxed" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
                평가자, 후보자, 평가 기준을 체계적으로 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-8">
              <Link href="/admin/login" className="block">
                <Button 
                  variant="outline" 
                  className="w-full border-gray-300 hover:bg-gray-50 text-gray-700 py-4 text-lg font-medium rounded-lg" 
                  style={{ fontSize: '1.125rem' }}
                >
                  관리자 로그인
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Results Analysis Card */}
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <BarChart3 className="h-10 w-10 text-gray-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-3" style={{ fontSize: '1.5rem', lineHeight: '1.5' }}>
                결과 분석
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg leading-relaxed" style={{ fontSize: '1.125rem', lineHeight: '1.6' }}>
                상세한 통계와 분석으로 평가 결과를 확인합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-8">
              <Link href="/results" className="block">
                <Button 
                  variant="outline" 
                  className="w-full border-gray-300 hover:bg-gray-50 text-gray-700 py-4 text-lg font-medium rounded-lg" 
                  style={{ fontSize: '1.125rem' }}
                >
                  결과 확인하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}