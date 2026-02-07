"""사용 가능한 Gemini 모델 확인"""
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("\n사용 가능한 Gemini 모델 목록:")
print("="*70)

for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"\n모델명: {model.name}")
        print(f"  설명: {model.display_name}")
        print(f"  지원 메서드: {model.supported_generation_methods}")

print("\n" + "="*70)
