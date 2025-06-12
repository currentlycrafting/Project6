# routes.py
from fastapi import APIRouter, HTTPException
from typing import List
from models import Page, PageCreate
import database as db_operations # Alias database.py for clarity

# Import pipeline from transformers for NLP tasks
from transformers import pipeline

router = APIRouter()
sentiment_analyzer = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")


# --- API Endpoints for Pages ---

@router.get("/pages/", response_model=List[Page])
async def get_all_pages_api():
    """Retrieve all pages from the database."""
    return db_operations.get_all_pages()

@router.get("/pages/{page_id}", response_model=Page)
async def get_page_by_id_api(page_id: str):
    """Retrieve a single page by its ID."""
    page = db_operations.get_page_by_id(page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

@router.post("/pages/", response_model=Page, status_code=201)
async def create_page_api(page: PageCreate):
    """Create a new page in the database."""
    new_page = db_operations.create_page_db(page)
    return new_page

@router.put("/pages/{page_id}", response_model=Page)
async def update_page_api(page_id: str, page: PageCreate):
    """Update an existing page's title and content by ID."""
    updated_page = db_operations.update_page_db(page_id, page.title, page.content)
    if updated_page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    return updated_page

@router.delete("/pages/{page_id}", status_code=204)
async def delete_page_api(page_id: str):
    """Delete a page by its ID."""
    if not db_operations.delete_page_db(page_id):
        raise HTTPException(status_code=404, detail="Page not found")
    return {"message": "Page deleted successfully"}


# --- API Endpoint for general Sentiment Analysis using Hugging Face ---

@router.post("/analyze-sentiment/")
async def analyze_sentiment(data: dict):
    """
    Performs sentiment analysis on the provided text using a pre-trained Hugging Face model.
    """
    text = data.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided for sentiment analysis.")

    # Perform sentiment analysis using the Hugging Face pipeline
    # The pipeline returns a list of dictionaries, e.g., [{'label': 'POSITIVE', 'score': 0.999}]
    result = sentiment_analyzer(text)

    # Extract the sentiment label and score
    sentiment_label = result[0]['label']
    sentiment_score = result[0]['score']

    return {"text": text, "sentiment": sentiment_label, "score": sentiment_score}


# --- ML Endpoint: Sentiment Analysis using Page Getters (Updated for Hugging Face) ---

@router.post("/analyze-page-sentiment/{page_id}")
async def analyze_page_sentiment(page_id: str):
    """
    Retrieves a page by ID and performs sentiment analysis on its content
    using a pre-trained Hugging Face model.
    """
    # Use the existing getter function to retrieve the page
    page = db_operations.get_page_by_id(page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")

    text_to_analyze = page.content # Get the content of the retrieved page

    if not text_to_analyze:
        return {"page_id": page_id, "sentiment": "Neutral", "score": 0.5, "message": "Page content is empty, sentiment is neutral."}

    # Perform sentiment analysis using the Hugging Face pipeline
    result = sentiment_analyzer(text_to_analyze)

    # Extract the sentiment label and score
    sentiment_label = result[0]['label']
    sentiment_score = result[0]['score']

    return {"page_id": page_id, "text_analyzed": text_to_analyze, "sentiment": sentiment_label, "score": sentiment_score}