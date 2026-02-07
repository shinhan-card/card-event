"""
상세 페이지 추출 모듈.
기존 detail_extractor.py를 모듈화한 래퍼.
Playwright로 URL을 열고 마케팅 내용을 구조화한다.
"""

import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def extract_detail(url: str, wait_sec: float = 3) -> dict:
    """
    URL에서 상세 내용 추출.
    Returns: detail_extractor.extract_from_url() 결과와 동일한 dict
             + extraction_latency_ms 추가
    """
    import detail_extractor

    start = time.time()
    try:
        result = await detail_extractor.extract_from_url(url, wait_sec=wait_sec)
    except Exception as e:
        logger.warning("추출 실패 %s: %s", url[:80], str(e)[:200])
        return {
            "title": "", "period": "", "benefit_value": "", "conditions": "",
            "target_segment": "", "benefit_type": "기타", "one_line_summary": "",
            "raw_text": f"추출 실패: {str(e)[:200]}",
            "marketing_content": {}, "insights": {},
            "extraction_latency_ms": int((time.time() - start) * 1000),
        }

    result["extraction_latency_ms"] = int((time.time() - start) * 1000)
    return result
