"""
AI 분석 모듈
Google Gemini API를 활용한 카드 이벤트 구조화 분석
"""

import google.generativeai as genai
import json
import os
from typing import Dict, Optional
from dotenv import load_dotenv
import time

# 환경 변수 로드
load_dotenv()

# Gemini API 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class CardEventAnalyzer:
    """카드 이벤트 AI 분석기"""
    
    def __init__(self):
        """Gemini 2.5 Flash 모델 초기화"""
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.system_prompt = """
당신은 **카드 산업 전문 애널리스트**입니다.
신한카드, 삼성카드, 현대카드, KB국민카드 등 국내 주요 카드사의 마케팅 전략을 분석하는 전문가로서,
경쟁사 이벤트를 분석하여 우리 회사의 전략에 인사이트를 제공해야 합니다.

**임무**:
주어진 카드 이벤트 텍스트를 분석하여 아래 JSON 스키마로 정확하게 변환하세요.

**출력 형식 (반드시 JSON만 출력)**:
{
  "company": "카드사명 (예: 신한카드, 삼성카드, 현대카드, KB국민카드)",
  "category": "카테고리 (쇼핑/여행/식음료/교통/문화/생활/금융/통신/기타 중 선택)",
  "title": "이벤트 제목",
  "period": "이벤트 기간 (예: 2026.02.01~2026.03.31)",
  "benefit_type": "혜택 유형 (할인/캐시백/포인트적립/무이자할부/사은품/기타 중 선택)",
  "benefit_value": "혜택 금액 또는 비율 (예: 10%, 5000원, 최대 3만원)",
  "conditions": "참여 조건 요약 (최소 결제금액, 대상카드, 제외사항 등)",
  "target_segment": "타겟 고객층 (20대/30대/40대 이상/전연령/프리미엄/일반 등)",
  "threat_level": "우리 카드사 입장에서의 경쟁 위협도 평가 (High/Mid/Low 중 선택)",
  "one_line_summary": "이벤트를 한 줄로 요약 (마케터가 빠르게 파악할 수 있도록)"
}

**중요**:
- 반드시 유효한 JSON 형식으로만 응답하세요.
- 추가 설명이나 마크다운 코드 블록(```)을 사용하지 마세요.
- 정보가 불확실하면 "정보 없음" 또는 "미확인"으로 표기하세요.
- threat_level 판단 기준:
  * High: 파격적인 혜택, 넓은 타겟층, 장기간 프로모션
  * Mid: 일반적인 수준의 혜택, 특정 타겟층, 중기간 프로모션
  * Low: 소규모 혜택, 제한적 타겟, 단기 프로모션
"""
    
    def analyze_event(self, raw_text: str, url: str = "") -> Optional[Dict]:
        """
        원본 텍스트를 분석하여 구조화된 데이터 반환
        
        Args:
            raw_text: 크롤링한 원본 텍스트
            url: 이벤트 URL
        
        Returns:
            dict: 구조화된 이벤트 데이터 또는 None
        """
        if not GEMINI_API_KEY:
            print("❌ GEMINI_API_KEY가 설정되지 않았습니다.")
            return None
        
        if not raw_text or len(raw_text) < 20:
            print("⚠️  분석할 텍스트가 너무 짧습니다.")
            return None
        
        try:
            # 프롬프트 구성
            user_prompt = f"""
아래는 카드사 이벤트 페이지에서 추출한 텍스트입니다.
이를 분석하여 JSON 형식으로 구조화하세요.

[이벤트 URL]
{url}

[원본 텍스트]
{raw_text[:3000]}  # 토큰 제한 고려하여 최대 3000자까지만

[출력 요구사항]
- 반드시 유효한 JSON만 출력
- 코드 블록(```) 사용 금지
- 추가 설명 금지
"""
            
            # Gemini API 호출
            print(f"🤖 Gemini API 분석 중... (URL: {url[:50]}...)")
            response = self.model.generate_content(
                f"{self.system_prompt}\n\n{user_prompt}",
                generation_config={
                    "temperature": 0.3,  # 일관성을 위해 낮은 temperature
                    "top_p": 0.8,
                    "top_k": 40,
                    "max_output_tokens": 1024,
                }
            )
            
            # 응답 파싱
            result_text = response.text.strip()
            
            # 마크다운 코드 블록 제거 (혹시 모를 경우 대비)
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()
            
            # JSON 파싱
            parsed_data = json.loads(result_text)
            
            # URL 추가
            parsed_data["url"] = url
            parsed_data["raw_text"] = raw_text[:1000]  # 원본 일부 저장
            
            print(f"✅ 분석 완료: {parsed_data.get('title', '제목 없음')}")
            return parsed_data
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
            print(f"응답 내용: {response.text[:200]}")
            return None
        except Exception as e:
            print(f"❌ 분석 중 오류 발생: {e}")
            return None
    
    def batch_analyze(self, text_list: list, delay: float = 2.0) -> list:
        """
        여러 이벤트를 배치로 분석 (API 호출 제한 고려)
        
        Args:
            text_list: [(url, raw_text), ...] 형태의 리스트
            delay: API 호출 간 대기 시간 (초)
        
        Returns:
            list: 분석된 이벤트 데이터 리스트
        """
        results = []
        
        for idx, (url, raw_text) in enumerate(text_list, 1):
            print(f"\n[{idx}/{len(text_list)}] 분석 중...")
            
            result = self.analyze_event(raw_text, url)
            if result:
                results.append(result)
            
            # API Rate Limit 방지를 위한 대기
            if idx < len(text_list):
                time.sleep(delay)
        
        print(f"\n✅ 총 {len(results)}개 이벤트 분석 완료")
        return results


def test_analyzer():
    """테스트용 함수"""
    sample_text = """
    신한카드 X 스타벅스 특별 프로모션
    
    기간: 2026년 2월 1일 ~ 2026년 2월 28일
    혜택: 스타벅스 5만원 이상 결제 시 5,000원 즉시 할인
    대상: 신한카드 Deep Dream 카드 소지자
    조건: 
    - 이벤트 기간 내 1회 한정
    - 일부 매장 제외 (고속도로 휴게소, 백화점 내 매장)
    - 모바일 상품권 결제 제외
    
    신한카드로 즐기는 프리미엄 커피 혜택!
    """
    
    analyzer = CardEventAnalyzer()
    result = analyzer.analyze_event(sample_text, "https://example.com/event/123")
    
    if result:
        print("\n=== 분석 결과 ===")
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    test_analyzer()
