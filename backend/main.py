from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import timedelta
from typing import List
import logging
import traceback

import models
import schemas
from database import engine, get_db
from auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_user
)
from ai_service import get_ai_service
from config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create database tables
try:
    models.Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")
    raise

app = FastAPI(
    title="Study Abroad Assistant API",
    description="AI-powered chatbot for study abroad information",
    version="1.0.0"
)

settings = get_settings()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Custom exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with detailed error messages"""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} - Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path)
        }
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    logger.error(f"Database error: {exc} - Path: {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "message": "A database error occurred. Please try again later.",
            "status_code": 500,
            "path": str(request.url.path)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    logger.error(f"Unexpected error: {exc} - Path: {request.url.path}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "message": "An unexpected error occurred. Please try again later.",
            "status_code": 500,
            "path": str(request.url.path)
        }
    )


@app.get("/")
def read_root():
    """API root endpoint"""
    try:
        return {
            "message": "Study Abroad Assistant API",
            "version": "1.0.0",
            "status": "operational",
            "endpoints": {
                "auth": "/api/auth",
                "chat": "/api/chat",
                "docs": "/docs",
                "health": "/health"
            }
        }
    except Exception as e:
        logger.error(f"Error in root endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service unavailable"
        )


@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db = next(get_db())
        db.execute("SELECT 1")
        db.close()

        return {
            "status": "healthy",
            "database": "connected",
            "api": "operational"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unhealthy"
        )


@app.post("/api/auth/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user with comprehensive validation"""
    try:
        # Validate email format
        if not user.email or "@" not in user.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )

        # Validate password strength
        if not user.password or len(user.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )

        # Check if user already exists
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            logger.warning(f"Signup attempt with existing email: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered. Please login instead."
            )

        # Create new user
        try:
            hashed_password = get_password_hash(user.password)
            db_user = models.User(email=user.email, hashed_password=hashed_password)
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            logger.info(f"New user registered: {user.email}")
            return db_user
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account. Please try again."
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during signup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during registration. Please try again."
        )


@app.post("/api/auth/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login and get access token with proper error handling"""
    try:
        # Validate input
        if not user.email or not user.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are required"
            )

        # Authenticate user
        db_user = authenticate_user(db, user.email, user.password)
        if not db_user:
            logger.warning(f"Failed login attempt for email: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Generate token
        try:
            access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
            access_token = create_access_token(
                data={"sub": db_user.email}, expires_delta=access_token_expires
            )
            logger.info(f"User logged in successfully: {user.email}")
            return {"access_token": access_token, "token_type": "bearer"}
        except Exception as e:
            logger.error(f"Failed to create access token: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate authentication token"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login. Please try again."
        )


@app.get("/api/auth/me", response_model=schemas.User)
async def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user information"""
    try:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        return current_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user information"
        )


@app.post("/api/chat", response_model=schemas.ChatResponse)
async def chat(
        chat_request: schemas.ChatRequest,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Send a question and get an AI-powered answer with error handling"""
    try:
        # Validate input
        if not chat_request.question or not chat_request.question.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question cannot be empty"
            )

        if len(chat_request.question) > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question is too long. Please limit to 1000 characters."
            )

        # Validate country if provided
        valid_countries = ["USA", "UK", "Canada", "Australia"]
        if chat_request.country and chat_request.country not in valid_countries:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid country. Must be one of: {', '.join(valid_countries)}"
            )

        # Generate answer
        try:
            ai_service = get_ai_service()
            answer = ai_service.generate_answer(
                question=chat_request.question.strip(),
                country=chat_request.country
            )

            if not answer:
                answer = "I'm sorry, I couldn't generate an answer. Please try rephrasing your question."

        except Exception as e:
            logger.error(f"AI service error: {e}")
            answer = "I'm experiencing technical difficulties. Please try again in a moment."

        # Save to chat history
        try:
            chat_history = models.ChatHistory(
                user_id=current_user.id,
                question=chat_request.question.strip(),
                answer=answer,
                country=chat_request.country
            )
            db.add(chat_history)
            db.commit()
            logger.info(f"Chat saved for user {current_user.email}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to save chat history: {e}")
            # Don't fail the request if we can't save history

        return {
            "answer": answer,
            "country": chat_request.country
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process your question. Please try again."
        )


@app.get("/api/chat/history", response_model=List[schemas.ChatHistoryItem])
async def get_chat_history(
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db),
        limit: int = 50,
        offset: int = 0
):
    """Get chat history for the current user with pagination"""
    try:
        # Validate pagination parameters
        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit must be between 1 and 100"
            )

        if offset < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Offset must be non-negative"
            )

        # Fetch history
        try:
            history = db.query(models.ChatHistory).filter(
                models.ChatHistory.user_id == current_user.id
            ).order_by(
                models.ChatHistory.created_at.desc()
            ).offset(offset).limit(limit).all()

            logger.info(f"Fetched {len(history)} chat history items for user {current_user.email}")
            return history

        except Exception as e:
            logger.error(f"Database error fetching chat history: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch chat history"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error fetching chat history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching chat history"
        )


@app.get("/api/countries")
async def get_countries():
    """Get list of available countries with error handling"""
    try:
        from vector_search import get_vector_search
        vs = get_vector_search()
        countries = vs.get_available_countries()

        if not countries:
            logger.warning("No countries found in vector database")
            return {"countries": ["USA", "UK", "Canada", "Australia"]}

        return {"countries": countries}

    except Exception as e:
        logger.error(f"Error fetching countries: {e}")
        # Return default countries as fallback
        return {"countries": ["USA", "UK", "Canada", "Australia"]}


@app.delete("/api/chat/history/{chat_id}")
async def delete_chat_history(
        chat_id: int,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Delete a specific chat history item"""
    try:
        chat = db.query(models.ChatHistory).filter(
            models.ChatHistory.id == chat_id,
            models.ChatHistory.user_id == current_user.id
        ).first()

        if not chat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat history item not found"
            )

        try:
            db.delete(chat)
            db.commit()
            logger.info(f"Deleted chat {chat_id} for user {current_user.email}")
            return {"message": "Chat deleted successfully"}
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to delete chat: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete chat history"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error deleting chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting chat"
        )


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting Study Abroad Assistant API...")
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise
