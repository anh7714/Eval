import { useQuery } from "@tanstack/react-query";
import { Shield, Users, BarChart3 } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  const { data: config } = useQuery({
    queryKey: ["/api/system/config"],
  });

  return (
    <div className="page" style={{ backgroundColor: 'var(--tblr-body-bg)' }}>
      <div className="container-xl" style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 1rem' }}>
        {/* Page Header */}
        <div className="page-header">
          <div className="text-center">
            <div className="tblr-d-flex justify-center tblr-mb-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(32, 107, 196, 0.1)', border: '2px solid rgba(32, 107, 196, 0.2)' }}>
                <Shield className="h-10 w-10" style={{ color: 'var(--tblr-primary)' }} />
              </div>
            </div>
            <h1 className="page-title text-center" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
              {(config as any)?.evaluationTitle || "종합평가시스템"}
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto" style={{ fontSize: '16px', lineHeight: '1.6' }}>
              공정하고 투명한 평가 프로세스를 통해 우수한 인재를 선발합니다. 
              체계적인 평가 관리와 실시간 진행 상황을 확인하세요.
            </p>
          </div>
        </div>

        {/* Main Cards */}
        <div className="tblr-row tblr-g-4 tblr-mb-4" style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -0.75rem' }}>
          <div className="tblr-col-lg-4" style={{ padding: '0 0.75rem', flex: '0 0 33.333333%', maxWidth: '33.333333%' }}>
            <Link href="/admin/login">
              <div className="tblr-card">
                <div className="tblr-card-body text-center">
                  <div className="tblr-d-flex justify-center tblr-mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors duration-200">
                      <Shield className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="tblr-card-title justify-center tblr-mb-3" style={{ fontSize: '1.25rem' }}>관리자</h3>
                  <p className="text-slate-600" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                    시스템 전체를 관리하고<br />
                    평가 설정을 구성합니다
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="tblr-col-lg-4" style={{ padding: '0 0.75rem', flex: '0 0 33.333333%', maxWidth: '33.333333%' }}>
            <Link href="/evaluator/login">
              <div className="tblr-card">
                <div className="tblr-card-body text-center">
                  <div className="tblr-d-flex justify-center tblr-mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 border border-green-100 hover:bg-green-100 transition-colors duration-200">
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="tblr-card-title justify-center tblr-mb-3" style={{ fontSize: '1.25rem' }}>평가자</h3>
                  <p className="text-slate-600" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                    후보자를 평가하고<br />
                    결과를 입력합니다
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="tblr-col-lg-4" style={{ padding: '0 0.75rem', flex: '0 0 33.333333%', maxWidth: '33.333333%' }}>
            <Link href="/results">
              <div className="tblr-card">
                <div className="tblr-card-body text-center">
                  <div className="tblr-d-flex justify-center tblr-mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors duration-200">
                      <BarChart3 className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                  <h3 className="tblr-card-title justify-center tblr-mb-3" style={{ fontSize: '1.25rem' }}>결과 조회</h3>
                  <p className="text-slate-600" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                    평가 결과 및 통계를<br />
                    실시간으로 확인합니다
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center tblr-mt-3">
          <p className="tblr-text-muted tblr-small">
            안전하고 신뢰할 수 있는 평가 시스템으로 공정한 선발을 지원합니다
          </p>
        </div>
      </div>
    </div>
  );
}