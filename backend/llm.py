import json
import os
import re

from google import genai
from google.genai import types

MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

SYSTEM_PROMPT = """You are an expert resume writer and ATS specialist.
Tailor the candidate's resume to the job description.

STRICT RULES:
- NEVER invent employers, job titles, dates, degrees, skills, or metrics that are not in the resume.
- Only rephrase, reorder, and emphasize existing content.
- Use job description keywords naturally where they truthfully apply.
- Keep bullets concise and start each with a strong action verb.
- Keywords the candidate lacks go ONLY in "missing_keywords", never in the resume body.
- "highlighted_skills" must be a subset of "skills" that match the job description.
- "match_score" is an integer from 0 to 100 for how well the ORIGINAL resume fits the job.
- "changes_summary" is 3 to 5 short sentences describing what you changed.

Return ONLY valid JSON in exactly this schema:
{
  "name": "string",
  "contact": "string",
  "summary": "string",
  "skills": ["string"],
  "highlighted_skills": ["string"],
  "experience": [
    {"title": "string", "company": "string", "dates": "string", "bullets": ["string"]}
  ],
  "education": ["string"],
  "other_sections": [{"heading": "string", "items": ["string"]}],
  "missing_keywords": ["string"],
  "match_score": 0,
  "changes_summary": ["string"]
}"""


def _clean(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return text


def customize(jd: str, resume_text: str) -> dict:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    prompt = f"{SYSTEM_PROMPT}\n\nJOB DESCRIPTION:\n{jd}\n\nRESUME:\n{resume_text}"

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )
    data = json.loads(_clean(response.text))

    data.setdefault("skills", [])
    data.setdefault("highlighted_skills", [])
    data.setdefault("experience", [])
    data.setdefault("education", [])
    data.setdefault("other_sections", [])
    data.setdefault("missing_keywords", [])
    data.setdefault("changes_summary", [])
    data.setdefault("match_score", 0)
    return data