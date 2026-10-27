import os
import re
from typing import List, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI

app = FastAPI(title="AI Agent API", version="1.0.0")

# Local development origins. Set FRONTEND_ORIGIN in deployment to your frontend URL.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
frontend_origin = os.getenv("FRONTEND_ORIGIN")
if frontend_origin:
    origins.append(frontend_origin.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

MAX_LENGTH = 100

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_LENGTH)

class ChatRequest(BaseModel):
    message: str = Field(max_length=5000)
    history: List[Message] = Field(default_factory=list, max_length=20)

class ChatResponse(BaseModel):
    answer: str

@app.get("/")
def root():
    return {"status": "ok", "message": "AI Agent API is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    prompt = request.message.strip()

    if not prompt:
        raise HTTPException(status_code=400, detail="Please enter a question.")
    if len(prompt) > MAX_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Input is too long. Maximum allowed length is {MAX_LENGTH} characters."
        )
    if not any(char.isalnum() for char in prompt):
        raise HTTPException(
            status_code=400,
            detail="Please enter meaningful text using letters or numbers."
        )

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="The AI service is not configured. Please contact the administrator.")

    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )

        messages = [{
            "role": "system",
            "content": (
                "You are a helpful AI assistant. Give clear, accurate, "
                "easy-to-understand answers. Use examples for technical "
                "questions when useful."
            ),
        }]

        # Include only the most recent conversation turns.
        for item in request.history[-20:]:
            content = item.content.strip()
            if content and len(content) <= MAX_LENGTH:
                messages.append({"role": item.role, "content": content})

        messages.append({"role": "user", "content": prompt})

        response = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
            messages=messages,
            max_tokens=1000,
        )
        answer = response.choices[0].message.content
        if not answer:
            raise HTTPException(status_code=502, detail="The AI returned an empty response.")
        return ChatResponse(answer=answer)

    except HTTPException:
        raise
    except Exception as exc:
        message = str(exc)
        if "401" in message:
            raise HTTPException(status_code=502, detail="The AI service rejected its API key. Check the server configuration.")
        if "404" in message:
            raise HTTPException(status_code=502, detail="The selected AI model is unavailable. Check GROQ_MODEL.")
        if "429" in message:
            raise HTTPException(status_code=503, detail="The AI service is busy or rate-limited. Please try again later.")
        raise HTTPException(status_code=502, detail="The AI service could not generate a response. Please try again.")
