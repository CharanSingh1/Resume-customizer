import os
import traceback

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from llm import customize
from parser import extract_text

app = FastAPI(title="Resume Customizer API")

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGIN", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_SIZE = 5 * 1024 * 1024
MIN_JD = 100


@app.get("/")
def root():
    return {"message": "Resume Customizer API is running. See /docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/customize")
async def customize_resume(jd: str = Form(...), resume: UploadFile = File(...)):
    if len(jd.strip()) < MIN_JD:
        raise HTTPException(400, f"The job description is too short. Use at least {MIN_JD} characters.")

    if not (resume.filename or "").lower().endswith((".pdf", ".docx")):
        raise HTTPException(400, "Only PDF or DOCX files are supported.")

    data = await resume.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "That file is over 5 MB. Upload a smaller one.")

    try:
        text = extract_text(resume.filename, data)
    except Exception:
        raise HTTPException(422, "Couldn't read that file. It may be corrupted.")

    if len(text) < 50:
        raise HTTPException(422, "No text found in the file. Scanned PDFs aren't supported.")

    try:
        return customize(jd, text)
    except Exception as e:
        traceback.print_exc()
        print("LLM ERROR:", repr(e))
        raise HTTPException(502, "The AI service failed. Try again in a moment.")