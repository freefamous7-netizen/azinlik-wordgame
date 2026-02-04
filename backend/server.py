from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import random


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Word Game Models
class Word(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    word: str
    language: str
    difficulty: str = "medium"  # easy, medium, hard
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WordCreate(BaseModel):
    word: str
    language: str
    difficulty: str = "medium"

class Game(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    word_id: str
    target_word: str
    language: str
    guesses: List[str] = []
    game_state: str = "in_progress"  # in_progress, won, lost
    score: int = 0
    time_taken: Optional[int] = None  # in seconds
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    is_daily_challenge: bool = False

class GameCreate(BaseModel):
    player_id: str
    language: str = "en"
    is_daily_challenge: bool = False

class GuessRequest(BaseModel):
    guess: str

class GuessResponse(BaseModel):
    guess: str
    feedback: List[str]  # ["correct", "present", "absent"]
    game_state: str
    score: int
    attempts_remaining: int

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Word Game Routes
@api_router.post("/words", response_model=Word)
async def add_word(word_input: WordCreate):
    """Add a new word to the database"""
    word_obj = Word(**word_input.model_dump())
    
    # Check if word already exists
    existing = await db.words.find_one({"word": word_obj.word.lower(), "language": word_obj.language})
    if existing:
        raise HTTPException(status_code=400, detail="Word already exists")
    
    doc = word_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['word'] = doc['word'].lower()
    
    await db.words.insert_one(doc)
    return word_obj

@api_router.get("/words/{language}")
async def get_words(language: str):
    """Get all words for a language"""
    words = await db.words.find({"language": language}, {"_id": 0}).to_list(1000)
    return words

@api_router.get("/daily-word/{language}")
async def get_daily_word(language: str):
    """Get the daily challenge word for a language"""
    # Use current date as seed for consistent daily word
    today = datetime.now(timezone.utc).date()
    seed = int(today.strftime("%Y%m%d"))
    
    # Get all words for this language
    words = await db.words.find({"language": language}, {"_id": 0}).to_list(1000)
    
    if not words:
        raise HTTPException(status_code=404, detail=f"No words found for language: {language}")
    
    # Use seed to get consistent random word for the day
    random.seed(seed)
    daily_word = random.choice(words)
    
    return {
        "word_id": daily_word["id"],
        "language": language,
        "difficulty": daily_word.get("difficulty", "medium"),
        "date": today.isoformat()
    }

def check_guess(guess: str, target: str) -> List[str]:
    """Check guess against target word and return feedback"""
    feedback = ["absent"] * len(guess)
    target_chars = list(target.lower())
    guess_chars = list(guess.lower())
    
    # First pass: mark correct positions
    for i in range(len(guess_chars)):
        if guess_chars[i] == target_chars[i]:
            feedback[i] = "correct"
            target_chars[i] = None
    
    # Second pass: mark present characters
    for i in range(len(guess_chars)):
        if feedback[i] == "absent" and guess_chars[i] in target_chars:
            feedback[i] = "present"
            target_chars[target_chars.index(guess_chars[i])] = None
    
    return feedback

@api_router.post("/games", response_model=Game)
async def create_game(game_input: GameCreate):
    """Create a new game session"""
    # Get random word for the language
    if game_input.is_daily_challenge:
        daily = await get_daily_word(game_input.language)
        word = await db.words.find_one({"id": daily["word_id"]}, {"_id": 0})
    else:
        words = await db.words.find({"language": game_input.language}, {"_id": 0}).to_list(1000)
        if not words:
            raise HTTPException(status_code=404, detail=f"No words found for language: {game_input.language}")
        word = random.choice(words)
    
    game_obj = Game(
        player_id=game_input.player_id,
        word_id=word["id"],
        target_word=word["word"],
        language=game_input.language,
        is_daily_challenge=game_input.is_daily_challenge
    )
    
    doc = game_obj.model_dump()
    doc['started_at'] = doc['started_at'].isoformat()
    
    await db.games.insert_one(doc)
    
    # Don't send target_word to client
    game_dict = game_obj.model_dump()
    game_dict['target_word'] = "*" * len(game_obj.target_word)
    return Game(**game_dict)

@api_router.post("/games/{game_id}/guess", response_model=GuessResponse)
async def submit_guess(game_id: str, guess_input: GuessRequest):
    """Submit a guess for a game"""
    game = await db.games.find_one({"id": game_id}, {"_id": 0})
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["game_state"] != "in_progress":
        raise HTTPException(status_code=400, detail="Game already completed")
    
    guess = guess_input.guess.lower()
    target = game["target_word"]
    
    # Validate guess length
    if len(guess) != len(target):
        raise HTTPException(status_code=400, detail=f"Guess must be {len(target)} characters")
    
    # Check guess
    feedback = check_guess(guess, target)
    
    # Update game
    game["guesses"].append(guess)
    attempts_remaining = 6 - len(game["guesses"])
    
    # Check win condition
    if guess == target:
        game["game_state"] = "won"
        game["score"] = 100 + (attempts_remaining * 10)  # Bonus for fewer attempts
        game["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif len(game["guesses"]) >= 6:
        game["game_state"] = "lost"
        game["score"] = 0
        game["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.games.update_one({"id": game_id}, {"$set": game})
    
    return GuessResponse(
        guess=guess,
        feedback=feedback,
        game_state=game["game_state"],
        score=game["score"],
        attempts_remaining=attempts_remaining
    )

@api_router.get("/games/{game_id}")
async def get_game(game_id: str):
    """Get game details"""
    game = await db.games.find_one({"id": game_id}, {"_id": 0})
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Hide target word if game is in progress
    if game["game_state"] == "in_progress":
        game["target_word"] = "*" * len(game["target_word"])
    
    return game

@api_router.get("/scores/{player_id}")
async def get_player_scores(player_id: str):
    """Get player's game history and scores"""
    games = await db.games.find({"player_id": player_id}, {"_id": 0}).sort("started_at", -1).to_list(100)
    
    total_games = len(games)
    won_games = len([g for g in games if g["game_state"] == "won"])
    total_score = sum(g["score"] for g in games)
    
    return {
        "player_id": player_id,
        "total_games": total_games,
        "won_games": won_games,
        "win_rate": (won_games / total_games * 100) if total_games > 0 else 0,
        "total_score": total_score,
        "recent_games": games[:10]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()