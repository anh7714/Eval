import { useQuery } from "@tanstack/react-query";
import { Shield, Users, BarChart3 } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  const { data: config } = useQuery({
    queryKey: ["/api/system/config"],
  });

  return (
    <div className="page-container">
      <div className="main-container">
        <div className="page-header">
          <div className="pretitle">🔐 GOVERNMENT EVALUATION SYSTEM</div>
          <h1 className="main-title">
            {(config as any)?.evaluationTitle || "종합평가시스템"}
          </h1>
          <p className="body-text text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
            정부기관을 위한 전문적이고 체계적인 평가 관리 시스템으로<br />
            투명하고 효율적인 평가 프로세스를 제공합니다
          </p>
        </div>

        <div className="grid-container">
          {/* 관리자 카드 */}
          <div className="card">
            <div className="card-header">
              <div className="flex-container">
                <Shield className="icon" />
                <h3 className="card-title">👥 관리자</h3>
              </div>
            </div>
            <div className="card-body">
              <p className="body-text mb-6">
                시스템 전체를 관리하고 평가 프로세스를 설정합니다. 
                평가자와 후보자를 관리하고 결과를 분석할 수 있습니다.
              </p>
              
              <div className="flex-column mb-6">
                <div className="flex-container">
                  <span>✅</span>
                  <span className="body-text">평가자 및 후보자 관리</span>
                </div>
                <div className="flex-container">
                  <span>📄</span>
                  <span className="body-text">평가 항목 설정</span>
                </div>
                <div className="flex-container">
                  <span>📊</span>
                  <span className="body-text">결과 분석 및 리포트</span>
                </div>
                <div className="flex-container">
                  <span>⚙️</span>
                  <span className="body-text">시스템 설정</span>
                </div>
              </div>
              
              <Link href="/admin/login">
                <button className="btn btn-primary btn-full btn-lg">
                  관리자 로그인
                </button>
              </Link>
            </div>
          </div>

          {/* 평가자 카드 */}
          <div className="card">
            <div className="card-header">
              <div className="flex-container">
                <Users className="icon" />
                <h3 className="card-title">⭐ 평가자</h3>
              </div>
            </div>
            <div className="card-body">
              <p className="body-text mb-6">
                배정된 후보자들을 평가하고 점수를 입력합니다. 
                체계적인 평가 도구로 공정한 평가를 진행할 수 있습니다.
              </p>
              
              <div className="flex-column mb-6">
                <div className="flex-container">
                  <span>📝</span>
                  <span className="body-text">후보자 평가 수행</span>
                </div>
                <div className="flex-container">
                  <span>📅</span>
                  <span className="body-text">평가 진행 상황 확인</span>
                </div>
                <div className="flex-container">
                  <span>💬</span>
                  <span className="body-text">평가 의견 작성</span>
                </div>
                <div className="flex-container">
                  <span>✉️</span>
                  <span className="body-text">평가 결과 제출</span>
                </div>
              </div>
              
              <Link href="/evaluator/login">
                <button className="btn btn-primary btn-full btn-lg">
                  평가자 로그인
                </button>
              </Link>
            </div>
          </div>

          {/* 평가 결과 카드 */}
          <div className="card">
            <div className="card-header">
              <div className="flex-container">
                <BarChart3 className="icon" />
                <h3 className="card-title">📊 평가 결과</h3>
              </div>
            </div>
            <div className="card-body">
              <p className="body-text mb-6">
                완료된 평가의 결과를 확인할 수 있습니다. 
                투명하고 객관적인 평가 결과를 제공합니다.
              </p>
              
              <div className="flex-column mb-6">
                <div className="flex-container">
                  <span>📈</span>
                  <span className="body-text">종합 평가 결과</span>
                </div>
                <div className="flex-container">
                  <span>🏆</span>
                  <span className="body-text">후보자별 순위</span>
                </div>
                <div className="flex-container">
                  <span>📋</span>
                  <span className="body-text">세부 평가 내역</span>
                </div>
                <div className="flex-container">
                  <span>📊</span>
                  <span className="body-text">통계 및 분석</span>
                </div>
              </div>
              
              <Link href="/results">
                <button className="btn btn-secondary btn-full btn-lg">
                  결과 확인
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="body-text text-muted">
            본 시스템은 정부기관의 평가 업무 효율성 향상을 위해 개발되었습니다.<br />
            문의사항이 있으시면 시스템 관리자에게 연락해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}