from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
import os
import json

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://resume-matcher-dusky.vercel.app"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze")
async def analyze_resume(
    resume_text: str = Form(...),
    job_description: str = Form(...)
):
    prompt = f"""
You are an expert technical recruiter and AI career advisor.

Analyze the following resume against the job description and return ONLY a JSON object with no extra text, no markdown, no backticks.

Resume:
{resume_text}

Job Description:
{job_description}

Return this exact JSON structure:
{{
  "match_score": <number between 0 and 100>,
  "matched_skills": [<list of skills found in both resume and job description>],
  "missing_skills": [<list of skills required in job but missing from resume>],
  "strengths": "<one paragraph about candidate strengths>",
  "recommendation": "<one paragraph of honest advice for the candidate>"
}}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    raw = response.text.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    result = json.loads(raw)

    return result