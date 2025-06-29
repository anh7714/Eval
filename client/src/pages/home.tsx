import { Link } from "wouter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-slate-900">종합평가시스템</h1>
              </div>
            </div>
            <nav className="flex space-x-8">
              <Link href="/admin/login" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-slate-900 hover:text-blue-600">
                관리자 로그인
              </Link>
              <Link href="/evaluator/login" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-slate-900 hover:text-blue-600">
                평가위원 로그인
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            종합평가시스템
          </h2>
          <p className="mt-6 text-xl leading-8 text-slate-600">
            공정하고 투명한 평가를 위한 디지털 평가 플랫폼
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link 
              href="/admin/login"
              className="gov-btn-primary"
            >
              관리자 로그인
            </Link>
            <Link 
              href="/evaluator/login"
              className="gov-btn-secondary"
            >
              평가위원 로그인
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="gov-card p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">체계적 관리</h3>
            <p className="text-slate-600">평가위원, 평가대상, 평가항목을 체계적으로 관리하고 운영할 수 있습니다.</p>
          </div>

          <div className="gov-card p-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">실시간 현황</h3>
            <p className="text-slate-600">평가 진행 현황을 실시간으로 모니터링하고 관리할 수 있습니다.</p>
          </div>

          <div className="gov-card p-6">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">결과 출력</h3>
            <p className="text-slate-600">평가 결과를 종합하여 정확하고 투명한 결과 보고서를 생성합니다.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-600">
            <p>&copy; 2025 종합평가시스템. 모든 권리 보유.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}