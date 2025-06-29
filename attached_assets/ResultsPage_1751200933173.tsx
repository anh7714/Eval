import React from "react";

const ResultsPage = () => {
  return (
    <div className="min-h-screen bg-white font-pt">
      <main className="container mx-auto py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">채점 결과 집계</h1>
          <p className="mt-2 text-md text-muted-foreground">평가 대상자별 종합 점수 및 순위입니다.</p>
        </div>
        <div className="w-full max-w-[480px] mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <p className="text-center text-gray-600 text-xs">
              평가 결과 데이터가 준비되면 이곳에 표시됩니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResultsPage; 