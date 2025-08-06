# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router # Import the APIRouter instance from routes.py

# Initialize FastAPI app
app = FastAPI(
    title="Machine Learning Sentiment API",
    description="A CRUD API for managing pages and performing sentiment analysis.",
    version="1.0.0"
)

origins = [
    "http://localhost:3000",  # Default React development server port
    "http://127.0.0.1:3000",  # Common localhost variant
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the API router
app.include_router(router)
