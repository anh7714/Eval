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
        <div className="page-header">
          <div className="text-center">
            <div className="page-pretitle">평가 시스템</div>
            <h1 className="page-title">
              {(config as any)?.evaluationTitle || "종합평가시스템"}
            </h1>
          </div>
        </div>

        {/* Main Cards */}
        <div className="row g-4">
          <div className="col-lg-4">
            <Link href="/evaluator/login">
              <div className="card">
                <div className="card-body text-center">
                  <div className="mb-3">
                    <div className="d-flex justify-content-center">
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: 'rgba(32, 107, 196, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Users className="h-6 w-6" style={{ color: 'var(--tblr-primary)' }} />
                      </div>
                    </div>
                  </div>
                  <h3 className="card-title justify-content-center mb-2">평가 위원</h3>
                  <p className="text-muted" style={{ fontSize: '0.875rem' }}>
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
                  <div className="mb-3">
                    <div className="d-flex justify-content-center">
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: 'rgba(47, 179, 68, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Shield className="h-6 w-6" style={{ color: 'var(--tblr-success)' }} />
                      </div>
                    </div>
                  </div>
                  <h3 className="card-title justify-content-center mb-2">관리자</h3>
                  <p className="text-muted" style={{ fontSize: '0.875rem' }}>
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
                  <div className="mb-3">
                    <div className="d-flex justify-content-center">
                      <div style={{
                        width: '3rem',
                        height: '3rem',
                        backgroundColor: 'rgba(245, 159, 0, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <BarChart3 className="h-6 w-6" style={{ color: 'var(--tblr-warning)' }} />
                      </div>
                    </div>
                  </div>
                  <h3 className="card-title justify-content-center mb-2">채점 결과</h3>
                  <p className="text-muted" style={{ fontSize: '0.875rem' }}>
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