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

        {/* 3-Card Layout - 가로형 구조화 디자인 */}
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Evaluation Card - Primary Action */}
          <Card className="krds-card krds-card-primary group">
            <CardContent className="p-8">
              <div className="horizontal-card-layout">
                <div className="flex-shrink-0">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 border border-blue-100 group-hover:bg-blue-100 transition-colors duration-200">
                    <ClipboardList className="h-10 w-10 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <CardTitle className="h3 text-gray-900 mb-3">
                    평가 실시
                  </CardTitle>
                  <CardDescription className="body-large text-gray-600 leading-relaxed mb-6">
                    구조화된 평가 기준으로 공정하고 객관적인 평가를 실시합니다
                  </CardDescription>
                </div>
                <div className="flex-shrink-0">
                  <Link href="/evaluator/login">
                    <Button className="krds-button-primary px-8">
                      평가 시작하기
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Management Card - Secondary Action */}
          <Card className="krds-card krds-card-secondary group">
            <CardContent className="p-8">
              <div className="horizontal-card-layout">
                <div className="flex-shrink-0">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 border border-gray-100 group-hover:bg-gray-100 transition-colors duration-200">
                    <Shield className="h-10 w-10 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <CardTitle className="h3 text-gray-900 mb-3">
                    시스템 관리
                  </CardTitle>
                  <CardDescription className="body-large text-gray-600 leading-relaxed mb-6">
                    평가자, 후보자, 평가 기준을 체계적으로 관리합니다
                  </CardDescription>
                </div>
                <div className="flex-shrink-0">
                  <Link href="/admin/login">
                    <Button className="krds-button-secondary px-8">
                      관리자 로그인
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Analysis Card - Tertiary Action */}
          <Card className="krds-card krds-card-tertiary group">
            <CardContent className="p-8">
              <div className="horizontal-card-layout">
                <div className="flex-shrink-0">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 border border-gray-100 group-hover:bg-gray-100 transition-colors duration-200">
                    <BarChart3 className="h-10 w-10 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <CardTitle className="h3 text-gray-900 mb-3">
                    결과 분석
                  </CardTitle>
                  <CardDescription className="body-large text-gray-600 leading-relaxed mb-6">
                    상세한 통계와 분석으로 평가 결과를 확인합니다
                  </CardDescription>
                </div>
                <div className="flex-shrink-0">
                  <Link href="/results">
                    <Button className="krds-button-secondary px-8">
                      결과 확인하기
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}