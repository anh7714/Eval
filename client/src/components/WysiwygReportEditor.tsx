import React, { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Table from '@editorjs/table';
import Paragraph from '@editorjs/paragraph';
import Quote from '@editorjs/quote';
import Marker from '@editorjs/marker';
import Checklist from '@editorjs/checklist';
import Code from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';
import Raw from '@editorjs/raw';
import Image from '@editorjs/image';
import Link from '@editorjs/link';
import Embed from '@editorjs/embed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save, Download, Upload, Eye, FileText, Plus, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 데이터 바인딩 태그 목록
const dataBindingTags = [
  { tag: '{{평가대상명}}', description: '평가대상의 이름' },
  { tag: '{{평가대상기관}}', description: '평가대상의 소속기관' },
  { tag: '{{평가대상직책}}', description: '평가대상의 직책' },
  { tag: '{{평가대상구분}}', description: '평가대상의 구분' },
  { tag: '{{평가대상세부구분}}', description: '평가대상의 세부구분' },
  { tag: '{{평가대상순위}}', description: '평가대상의 순위' },
  { tag: '{{평가대상총점}}', description: '평가대상의 총점' },
  { tag: '{{평가대상득점률}}', description: '평가대상의 득점률' },
  { tag: '{{평가대상평균점수}}', description: '평가대상의 평균점수' },
  { tag: '{{평가대상선정여부}}', description: '평가대상의 선정여부' },
  { tag: '{{평가위원명}}', description: '평가위원의 이름' },
  { tag: '{{평가위원기관}}', description: '평가위원의 소속기관' },
  { tag: '{{평가위원이메일}}', description: '평가위원의 이메일' },
  { tag: '{{평가위원진행률}}', description: '평가위원의 진행률' },
  { tag: '{{평가위원완료수}}', description: '평가위원의 완료수' },
  { tag: '{{평가항목명}}', description: '평가항목의 이름' },
  { tag: '{{평가항목점수}}', description: '평가항목의 점수' },
  { tag: '{{평가항목만점}}', description: '평가항목의 만점' },
  { tag: '{{평가항목코멘트}}', description: '평가항목의 코멘트' },
  { tag: '{{현재날짜}}', description: '현재 날짜' },
  { tag: '{{현재시간}}', description: '현재 시간' },
];

interface WysiwygReportEditorProps {
  template: any;
  setTemplate: (template: any) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function WysiwygReportEditor({ 
  template, 
  setTemplate, 
  onSave, 
  isSaving 
}: WysiwygReportEditorProps) {
  const editorRef = useRef<EditorJS>();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [showDataBindingDialog, setShowDataBindingDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const { toast } = useToast();

  // Editor.js 초기화
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const initEditor = async () => {
      try {
        const editor = new EditorJS({
          holder: editorContainerRef.current,
          placeholder: '보고서 템플릿을 작성하세요...',
          tools: {
            header: {
              class: Header,
              config: {
                placeholder: '제목을 입력하세요',
                levels: [1, 2, 3, 4, 5, 6],
                defaultLevel: 2
              }
            },
            list: {
              class: List,
              inlineToolbar: true,
              config: {
                defaultStyle: 'unordered'
              }
            },
            table: {
              class: Table,
              inlineToolbar: true,
              config: {
                rows: 2,
                cols: 3,
              },
            },
            paragraph: {
              class: Paragraph,
              inlineToolbar: true,
            },
            quote: {
              class: Quote,
              inlineToolbar: true,
              config: {
                quotePlaceholder: '인용문을 입력하세요',
                captionPlaceholder: '출처를 입력하세요',
              },
            },
            marker: {
              class: Marker,
              shortcut: 'CMD+SHIFT+M'
            },
            checklist: {
              class: Checklist,
              inlineToolbar: true,
            },
            code: Code,
            delimiter: Delimiter,
            raw: Raw,
            image: {
              class: Image,
              config: {
                endpoints: {
                  byFile: '/api/upload-image',
                  byUrl: '/api/fetch-image',
                }
              }
            },
            link: {
              class: Link,
              config: {
                endpoint: '/api/fetch-link',
              }
            },
            embed: {
              class: Embed,
              config: {
                services: {
                  youtube: true,
                  coub: true
                }
              }
            }
          },
          data: template?.editorData || {
            blocks: [
              {
                type: 'header',
                data: {
                  text: template?.title || '보고서 제목',
                  level: 1
                }
              },
              {
                type: 'paragraph',
                data: {
                  text: '보고서 내용을 작성하세요. 데이터 바인딩 태그를 사용하여 동적 데이터를 삽입할 수 있습니다.'
                }
              }
            ]
          },
          onChange: async () => {
            if (editor && isEditorReady) {
              const outputData = await editor.save();
              setTemplate({
                ...template,
                editorData: outputData,
                title: template?.title || '보고서 제목'
              });
            }
          },
          onReady: () => {
            setIsEditorReady(true);
          }
        });

        editorRef.current = editor;
      } catch (error) {
        console.error('Editor.js 초기화 오류:', error);
        toast({
          title: "에디터 초기화 실패",
          description: "에디터를 초기화하는 중 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    };

    initEditor();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, []);

  // 데이터 바인딩 태그 삽입
  const insertDataBindingTag = (tag: string) => {
    if (editorRef.current && isEditorReady) {
      editorRef.current.blocks.insert('paragraph', { text: tag });
      setShowDataBindingDialog(false);
    }
  };

  // 템플릿 저장
  const handleSave = async () => {
    if (editorRef.current && isEditorReady) {
      try {
        const outputData = await editorRef.current.save();
        // 이전 구조/필드가 남지 않도록 필요한 필드만 저장
        setTemplate({
          title: template?.title || '보고서 제목',
          editorData: outputData
        });
        onSave();
        toast({
          title: "템플릿 저장 완료",
          description: "템플릿이 성공적으로 저장되었습니다.",
        });
      } catch (error) {
        console.error('템플릿 저장 오류:', error);
        toast({
          title: "템플릿 저장 실패",
          description: "템플릿 저장 중 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    }
  };

  // 템플릿 다운로드
  const handleDownload = () => {
    if (template?.editorData) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", (template?.title || 'report_template') + ".json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      toast({
        title: "템플릿 다운로드 완료",
        description: "템플릿이 성공적으로 다운로드되었습니다.",
      });
    }
  };

  // 템플릿 업로드
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const uploadedTemplate = JSON.parse(e.target?.result as string);
          setTemplate(uploadedTemplate);
          toast({
            title: "템플릿 업로드 완료",
            description: "템플릿이 성공적으로 업로드되었습니다.",
          });
        } catch (error) {
          toast({
            title: "템플릿 업로드 실패",
            description: "올바른 템플릿 파일이 아닙니다.",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    }
  };

  // 미리보기 생성
  const generatePreview = async () => {
    if (editorRef.current && isEditorReady) {
      try {
        const outputData = await editorRef.current.save();
        // 데이터 바인딩 태그를 샘플 데이터로 치환
        let previewText = JSON.stringify(outputData, null, 2);
        dataBindingTags.forEach(({ tag }) => {
          const sampleValue = tag.replace('{{', '').replace('}}', '');
          previewText = previewText.replace(new RegExp(tag, 'g'), `[${sampleValue}]`);
        });
        setPreviewContent(previewText);
        setShowPreview(true);
      } catch (error) {
        console.error('미리보기 생성 오류:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 제목 편집 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">보고서 제목</label>
        <Input
          value={template?.title || ''}
          onChange={(e) => setTemplate({ ...template, title: e.target.value })}
          placeholder="보고서 제목을 입력하세요"
        />
      </div>

      {/* 도구 버튼들 */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setShowDataBindingDialog(true)}
          variant="outline"
          size="sm"
        >
          <FileText className="h-4 w-4 mr-2" />
          데이터 바인딩 태그
        </Button>
        <Button
          onClick={generatePreview}
          variant="outline"
          size="sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          미리보기
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          size="sm"
        >
          <Download className="h-4 w-4 mr-2" />
          템플릿 다운로드
        </Button>
        <div className="relative">
          <input
            type="file"
            accept=".json"
            onChange={handleUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            템플릿 업로드
          </Button>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? '저장 중...' : '템플릿 저장'}
        </Button>
      </div>

      {/* 에디터 컨테이너 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            WYSIWYG 에디터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={editorContainerRef}
            className="min-h-[500px] border rounded-lg p-4"
          />
        </CardContent>
      </Card>

      {/* 데이터 바인딩 태그 다이얼로그 */}
      <Dialog open={showDataBindingDialog} onOpenChange={setShowDataBindingDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>데이터 바인딩 태그</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataBindingTags.map(({ tag, description }) => (
              <div
                key={tag}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => insertDataBindingTag(tag)}
              >
                <Badge variant="secondary" className="mb-2">
                  {tag}
                </Badge>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 미리보기 다이얼로그 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>템플릿 미리보기</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap">{previewContent}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 