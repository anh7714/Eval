import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ SUPABASE_URL and SUPABASE_ANON_KEY are required");
  console.error("Please create a .env file with your Supabase credentials:");
  console.error("SUPABASE_URL=your_supabase_url");
  console.error("SUPABASE_ANON_KEY=your_supabase_anon_key");
  console.error("");
  console.error("Or set them as environment variables:");
  console.error("$env:SUPABASE_URL='your_supabase_url'");
  console.error("$env:SUPABASE_ANON_KEY='your_supabase_anon_key'");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 기본 템플릿 데이터 (관리자 심사표 구조)
const defaultTemplate = {
  title: "제공기관 선정 심의회 평가표",
  totalScore: 100,
  sections: [
    {
      id: "section1",
      title: "기관수행",
      totalPoints: 40,
      items: [
        {
          code: "ORG_001",
          text: "기관의 사업계획 및 추진체계",
          type: "정성",
          points: 15
        },
        {
          code: "ORG_002", 
          text: "기관의 인력 및 조직체계",
          type: "정성",
          points: 15
        },
        {
          code: "ORG_003",
          text: "기관의 재정 및 시설현황",
          type: "정성", 
          points: 10
        }
      ]
    },
    {
      id: "section2",
      title: "서비스품질",
      totalPoints: 35,
      items: [
        {
          code: "SVC_001",
          text: "서비스 제공 능력 및 품질",
          type: "정성",
          points: 20
        },
        {
          code: "SVC_002",
          text: "서비스 개선 및 혁신 노력",
          type: "정성",
          points: 15
        }
      ]
    },
    {
      id: "section3", 
      title: "사회적가치",
      totalPoints: 25,
      items: [
        {
          code: "SOC_001",
          text: "사회적 가치 창출 및 기여도",
          type: "정성",
          points: 15
        },
        {
          code: "SOC_002",
          text: "지역사회 연계 및 협력",
          type: "정성",
          points: 10
        }
      ]
    }
  ]
};

// 평가항목 동기화 함수
async function syncEvaluationItems() {
  try {
    console.log("🔄 평가항목 동기화 시작...");
    
    // 1. 기존 평가항목 조회
    const { data: existingItems, error: fetchError } = await supabase
      .from('evaluation_items')
      .select('*');
    
    if (fetchError) {
      console.error("❌ 기존 평가항목 조회 실패:", fetchError);
      return;
    }
    
    console.log(`📊 기존 평가항목 수: ${existingItems?.length || 0}`);
    
    // 2. 카테고리 조회 또는 생성
    const categories = [];
    for (const section of defaultTemplate.sections) {
      const { data: existingCategory, error: categoryError } = await supabase
        .from('evaluation_categories')
        .select('*')
        .eq('name', section.title)
        .single();
      
      if (categoryError && categoryError.code !== 'PGRST116') {
        console.error(`❌ 카테고리 조회 실패 (${section.title}):`, categoryError);
        continue;
      }
      
      let categoryId;
      if (!existingCategory) {
        // 새 카테고리 생성
        const { data: newCategory, error: createError } = await supabase
          .from('evaluation_categories')
          .insert({
            name: section.title,
            type: 'evaluation',
            description: `${section.title} 평가 항목`,
            sort_order: categories.length + 1,
            is_active: true
          })
          .select()
          .single();
        
        if (createError) {
          console.error(`❌ 카테고리 생성 실패 (${section.title}):`, createError);
          continue;
        }
        
        categoryId = newCategory.id;
        console.log(`✅ 카테고리 생성: ${section.title} (ID: ${categoryId})`);
      } else {
        categoryId = existingCategory.id;
        console.log(`✅ 기존 카테고리 사용: ${section.title} (ID: ${categoryId})`);
      }
      
      categories.push({ id: categoryId, name: section.title });
    }
    
    // 3. 평가항목 동기화
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const section of defaultTemplate.sections) {
      const category = categories.find(c => c.name === section.title);
      if (!category) continue;
      
      for (const item of section.items) {
        // 기존 항목 확인
        const existingItem = existingItems?.find(ei => ei.code === item.code);
        
        if (existingItem) {
          // 기존 항목 업데이트
          const { error: updateError } = await supabase
            .from('evaluation_items')
            .update({
              name: item.text,
              description: item.text,
              max_score: item.points,
              weight: 1.0,
              is_quantitative: item.type === '정량',
              sort_order: existingItem.sort_order,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingItem.id);
          
          if (updateError) {
            console.error(`❌ 평가항목 업데이트 실패 (${item.code}):`, updateError);
          } else {
            updatedCount++;
            console.log(`✅ 평가항목 업데이트: ${item.code} - ${item.text}`);
          }
        } else {
          // 새 항목 생성
          const { error: createError } = await supabase
            .from('evaluation_items')
            .insert({
              category_id: category.id,
              code: item.code,
              name: item.text,
              description: item.text,
              max_score: item.points,
              weight: 1.0,
              sort_order: createdCount + updatedCount + 1,
              is_active: true,
              is_quantitative: item.type === '정량',
              has_preset_scores: false
            });
          
          if (createError) {
            console.error(`❌ 평가항목 생성 실패 (${item.code}):`, createError);
          } else {
            createdCount++;
            console.log(`✅ 평가항목 생성: ${item.code} - ${item.text}`);
          }
        }
      }
    }
    
    console.log(`🎉 평가항목 동기화 완료: 생성 ${createdCount}개, 업데이트 ${updatedCount}개`);
    
  } catch (error) {
    console.error("❌ 평가항목 동기화 실패:", error);
  }
}

// 템플릿 동기화 함수
async function syncEvaluationTemplate() {
  try {
    console.log("🔄 평가 템플릿 동기화 시작...");
    
    // 기존 기본 템플릿 확인
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('evaluation_templates')
      .select('*')
      .eq('is_default', true)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("❌ 기존 템플릿 조회 실패:", fetchError);
      return;
    }
    
    if (existingTemplate) {
      // 기존 템플릿 업데이트
      const { error: updateError } = await supabase
        .from('evaluation_templates')
        .update({
          name: "기본 평가 템플릿",
          title: defaultTemplate.title,
          description: "제공기관 선정 심의회 기본 평가 템플릿",
          template_data: defaultTemplate,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTemplate.id);
      
      if (updateError) {
        console.error("❌ 템플릿 업데이트 실패:", updateError);
      } else {
        console.log("✅ 템플릿 업데이트 완료");
      }
    } else {
      // 새 템플릿 생성
      const { error: createError } = await supabase
        .from('evaluation_templates')
        .insert({
          name: "기본 평가 템플릿",
          title: defaultTemplate.title,
          description: "제공기관 선정 심의회 기본 평가 템플릿",
          template_data: defaultTemplate,
          is_active: true,
          is_default: true
        });
      
      if (createError) {
        console.error("❌ 템플릿 생성 실패:", createError);
      } else {
        console.log("✅ 템플릿 생성 완료");
      }
    }
    
  } catch (error) {
    console.error("❌ 템플릿 동기화 실패:", error);
  }
}

// 메인 동기화 함수
async function syncAll() {
  try {
    console.log("🚀 데이터 동기화 시작...");
    
    // 1. 평가항목 동기화
    await syncEvaluationItems();
    
    // 2. 템플릿 동기화
    await syncEvaluationTemplate();
    
    console.log("🎉 모든 데이터 동기화 완료!");
    
  } catch (error) {
    console.error("❌ 데이터 동기화 실패:", error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  syncAll();
}

export { syncAll, syncEvaluationItems, syncEvaluationTemplate }; 