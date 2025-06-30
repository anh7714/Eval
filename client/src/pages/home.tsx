import { useQuery } from "@tanstack/react-query";
import { Shield, Users, BarChart3 } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  const { data: config } = useQuery({
    queryKey: ["/api/system/config"],
  });

  return (
    <div className="page" style={{ backgroundColor: 'var(--tblr-body-bg)' }}>
      <div className="container-xl">
        {/* Page Header */}
        <div className="page-header" style={{ padding: '3rem 0 2rem' }}>
          <div className="text-center">
            <div className="page-pretitle">평가 시스템</div>
            <h1 className="page-title">
              {(config as any)?.evaluationTitle || "종합평가시스템"}
            </h1>
            <p className="text-muted" style={{ fontSize: '1.125rem', marginTop: '1rem', maxWidth: '600px', margin: '1rem auto 0' }}>
              체계적이고 투명한 평가 시스템으로 공정한 선발을 지원합니다
            </p>
          </div>
        </div>

        {/* Main Cards */}
        <div className="row g-4">
          <div className="col-lg-4">
            <Link href="/evaluator/login">
              <div className="card">
                <div className="card-body text-center">
                  <div className="mb-4">
                    <div className="d-flex justify-content-center">
                      <div style={{
                        width: '4.5rem',
                        height: '4.5rem',
                        backgroundColor: 'rgba(32, 107, 196, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Users style={{ width: '2rem', height: '2rem', color: 'var(--tblr-primary)' }} />
                      </div>
                    </div>
                  </div>
                  <h3 className="card-title justify-content-center mb-3">평가 위원</h3>
                  <p className="text-muted" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                    채점을 진행하고 결과를 제출합니다.
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="col-lg-4">
            <Link href="/admin/login">
              <div className="card">
                <div className="card-body text-center">
                  <div className="mb-4">
                    <div className="d-flex justify-content-center">
                      <div style={{
                        width: '4.5rem',
                        height: '4.5rem',
                        backgroundColor: 'rgba(47, 179, 68, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Shield style={{ width: '2rem', height: '2rem', color: 'var(--tblr-success)' }} />
                      </div>
                    </div>
                  </div>
                  <h3 className="card-title justify-content-center mb-3">관리자</h3>
                  <p className="text-muted" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                    시스템 설정을 관리하고 결과를 집계합니다.
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="col-lg-4">
            <Link href="/results">
              <div className="card">
                <div className="card-body text-center">
                  <div className="mb-4">
                    <div className="d-flex justify-content-center">
                      <div style={{
                        width: '4.5rem',
                        height: '4.5rem',
                        backgroundColor: 'rgba(245, 159, 0, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <BarChart3 style={{ width: '2rem', height: '2rem', color: 'var(--tblr-warning)' }} />
                      </div>
                    </div>
                  </div>
                  <h3 className="card-title justify-content-center mb-3">채점 결과</h3>
                  <p className="text-muted" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                    종합 채점 결과를 확인합니다.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-5">
          <p className="text-muted small">
            안전하고 신뢰할 수 있는 평가 시스템
          </p>
        </div>
      </div>
    </div>
  );
}