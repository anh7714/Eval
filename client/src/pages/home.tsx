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

        {/* 3-Card Layout - KRDS 정부 표준 디자인 */}
        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {/* Evaluation Card - Primary Action */}
          <Card className="krds-card krds-card-primary group">
            <CardHeader className="text-center pb-6 pt-10">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 border border-blue-100 group-hover:bg-blue-100 transition-colors duration-200">
                <ClipboardList className="h-12 w-12 text-blue-600" />
              </div>
              <CardTitle className="h3 text-gray-900 mb-4">
                평가 실시
              </CardTitle>
              <CardDescription className="body-large text-gray-600 px-4 leading-relaxed">
                구조화된 평가 기준으로 공정하고 객관적인 평가를 실시합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-10 px-8">
              <Link href="/evaluator/login" className="block">
                <Button className="krds-button-primary w-full">
                  평가 시작하기
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Management Card - Secondary Action */}
          <Card className="krds-card krds-card-secondary group">
            <CardHeader className="text-center pb-6 pt-10">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gray-50 border border-gray-100 group-hover:bg-gray-100 transition-colors duration-200">
                <Shield className="h-12 w-12 text-gray-600" />
              </div>
              <CardTitle className="h3 text-gray-900 mb-4">
                시스템 관리
              </CardTitle>
              <CardDescription className="body-large text-gray-600 px-4 leading-relaxed">
                평가자, 후보자, 평가 기준을 체계적으로 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-10 px-8">
              <Link href="/admin/login" className="block">
                <Button className="krds-button-secondary w-full">
                  관리자 로그인
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Results Analysis Card - Tertiary Action */}
          <Card className="krds-card krds-card-tertiary group">
            <CardHeader className="text-center pb-6 pt-10">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gray-50 border border-gray-100 group-hover:bg-gray-100 transition-colors duration-200">
                <BarChart3 className="h-12 w-12 text-gray-600" />
              </div>
              <CardTitle className="h3 text-gray-900 mb-4">
                결과 분석
              </CardTitle>
              <CardDescription className="body-large text-gray-600 px-4 leading-relaxed">
                상세한 통계와 분석으로 평가 결과를 확인합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-10 px-8">
              <Link href="/results" className="block">
                <Button className="krds-button-secondary w-full">
                  결과 확인하기
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}