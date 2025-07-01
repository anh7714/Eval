import { useState, useEffect } from 'react';
import { testSupabaseConnection } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SupabaseTestProps {
  onConnectionSuccess?: () => void;
}

export function SupabaseTest({ onConnectionSuccess }: SupabaseTestProps) {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [data, setData] = useState<any>(null);

  const handleTest = async () => {
    setStatus('testing');
    setMessage('Supabase 연결을 테스트하고 있습니다...');
    
    const result = await testSupabaseConnection();
    
    if (result.success) {
      setStatus('success');
      setMessage('Supabase 연결 성공! 데이터베이스가 준비되었습니다.');
      setData(result.data);
      onConnectionSuccess?.();
    } else {
      setStatus('error');
      const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error 
        ? (result.error as any).message 
        : '알 수 없는 오류';
      setMessage(`연결 실패: ${errorMessage}`);
    }
  };

  useEffect(() => {
    // 자동으로 연결 테스트 실행
    handleTest();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'testing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'testing':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200';
    }
  };

  return (
    <Card className={`w-full max-w-2xl mx-auto ${getStatusColor()}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Supabase 데이터베이스 연결 상태
        </CardTitle>
        <CardDescription>
          프론트엔드에서 Supabase 데이터베이스로 직접 연결을 시도합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={`text-sm ${
          status === 'success' ? 'text-green-700' :
          status === 'error' ? 'text-red-700' :
          'text-gray-700'
        }`}>
          {message}
        </p>
        
        {data && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <p className="text-xs text-gray-600 mb-2">데이터베이스 응답:</p>
            <pre className="text-xs text-gray-800 overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={handleTest} 
            disabled={status === 'testing'}
            variant={status === 'success' ? 'outline' : 'default'}
          >
            {status === 'testing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                테스트 중...
              </>
            ) : (
              '다시 테스트'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}