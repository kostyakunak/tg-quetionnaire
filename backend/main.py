from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, ValidationError
from typing import List, Optional, Dict, Any
import asyncio
import asyncpg
import os
import hashlib
import hmac
import json
import logging
import requests
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="5chairs Web Onboarding API")

# Add validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"❌ Validation error on {request.method} {request.url}")
    logger.error(f"❌ Validation errors: {exc.errors()}")
    logger.error(f"❌ Request body: {await request.body()}")
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

# CORS middleware (tighten for production via env)
ALLOWED_ORIGINS = os.getenv("FRONTEND_ORIGIN")
if ALLOWED_ORIGINS:
    allowed = [ALLOWED_ORIGINS]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
else:
    # dev fallback - НЕ ИСПОЛЬЗОВАТЬ В ПРОДАКШЕНЕ!
    allowed = ["*"]
    allow_methods = ["*"]
    allow_headers = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_credentials=True,
    allow_methods=allow_methods,
    allow_headers=allow_headers,
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    if request.url.path == "/api/submit":
        logger.info(f"🔍 Входящий запрос: {request.method} {request.url}")
        logger.info(f"🔍 Headers: {dict(request.headers)}")
        
        # Read body for logging
        body = await request.body()
        logger.info(f"🔍 Body: {body.decode('utf-8')[:500]}...")  # First 500 chars
        
        # Create new request with same body
        from starlette.requests import Request
        from starlette.responses import Response
        
        async def receive():
            return {"type": "http.request", "body": body}
        
        request._receive = receive
    
    response = await call_next(request)
    return response

"""
Environment configuration
"""
# Optional test mode to simplify local runs (no strict Telegram auth, DB optional)
TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
BOT_TOKEN = os.getenv("BOT_TOKEN", "your_bot_token_here")
BOT_USERNAME = os.getenv("BOT_USERNAME", "fivechairs_bot")

# Pydantic models
class QuestionOption(BaseModel):
    id: int
    option_text: str

class Question(BaseModel):
    id: int
    text: str
    instruction: Optional[str] = None
    question_type: str = "text"
    allow_other: bool = False
    options: List[QuestionOption] = []

class TelegramAuth(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

class Answer(BaseModel):
    question_id: int
    type: str
    value: str

class Profile(BaseModel):
    name: Optional[str] = None
    surname: str = "-"
    age: Optional[int] = Field(None, ge=18, le=100)

class Source(BaseModel):
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    gclid: Optional[str] = None
    fbclid: Optional[str] = None

class SubmitRequest(BaseModel):
    telegram_auth: TelegramAuth
    answers: List[Answer]
    profile: Profile
    source: Optional[Source] = None

# Database connection pool
pool = None

async def verify_bot_configuration():
    """Проверяет соответствие BOT_TOKEN и BOT_USERNAME при запуске"""
    try:
        if not BOT_TOKEN or BOT_TOKEN == "your_bot_token_here":
            logger.warning("BOT_TOKEN не настроен или использует значение по умолчанию")
            return
        
        # Получаем информацию о боте через Telegram API
        response = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getMe", timeout=5)
        if response.status_code != 200:
            logger.error(f"Не удалось получить информацию о боте: {response.status_code}")
            return
            
        bot_info = response.json()
        if not bot_info.get("ok"):
            logger.error(f"Ошибка Telegram API: {bot_info}")
            return
            
        real_username = bot_info["result"]["username"]
        expected_username = BOT_USERNAME.replace("@", "").lower()
        real_username_lower = real_username.lower()
        
        logger.info(f"BOT_USERNAME из конфига: {BOT_USERNAME}")
        logger.info(f"Реальный username бота: @{real_username}")
        
        if real_username_lower != expected_username:
            logger.error(f"❌ НЕСООТВЕТСТВИЕ: BOT_USERNAME ({BOT_USERNAME}) ≠ token.username (@{real_username})")
            logger.error("Исправьте BOT_TOKEN или BOT_USERNAME в переменных окружения")
        else:
            logger.info(f"✅ Токен и юзернейм соответствуют: @{real_username}")
            
    except Exception as e:
        logger.error(f"Ошибка при проверке конфигурации бота: {e}")

async def get_db_pool():
    """Create a connection pool if DATABASE_URL is provided.

    In TEST_MODE the DB is optional; we only create a pool when URL is set.
    """
    global pool
    if pool is None and DATABASE_URL:
        pool = await asyncpg.create_pool(DATABASE_URL)
    return pool

async def get_db():
    pool = await get_db_pool()
    # If no DB configured, yield None so endpoints can fallback to demo/mocks
    if not pool:
        yield None
        return
    async with pool.acquire() as connection:
        yield connection

def get_demo_questions() -> list:
    """Demo questions for local/test runs when DB is unavailable."""
    return [
        {
            "id": 1,
            "text": "Что тебя сейчас вдохновляет?",
            "instruction": "Один короткий ответ — от сердца",
            "question_type": "text",
            "allow_other": False,
            "options": [],
        },
        {
            "id": 2,
            "text": "Как ты обычно проводишь выходные?",
            "instruction": "Выбери то, что ближе всего тебе",
            "question_type": "single_choice",
            "allow_other": True,
            "options": [
                {"id": 1, "option_text": "Активно: спорт, прогулки, путешествия"},
                {"id": 2, "option_text": "Творчески: музеи, театры, мастер-классы"},
                {"id": 3, "option_text": "Уютно: дома с книгой или фильмом"},
                {"id": 4, "option_text": "Социально: встречи с друзьями, мероприятия"},
            ],
        },
    ]

# Telegram auth validation
def validate_telegram_auth(auth_data: TelegramAuth) -> bool:
    """Validate Telegram Login Widget authentication data"""
    try:
        logger.info(f"Validating Telegram auth for user {auth_data.id}")
        logger.info(f"Received auth data: {auth_data.dict()}")
        
        # Create data string for validation
        data_check_arr = []
        for key, value in auth_data.dict().items():
            if key != 'hash' and value is not None:
                data_check_arr.append(f"{key}={value}")
        
        data_check_arr.sort()
        data_check_string = '\n'.join(data_check_arr)
        logger.info(f"Data check string: {data_check_string}")
        logger.info(f"Data check string (repr): {repr(data_check_string)}")
        
        # Create secret key
        secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
        logger.info(f"Using BOT_TOKEN: {BOT_TOKEN[:10]}...")
        logger.info(f"Full BOT_TOKEN length: {len(BOT_TOKEN)}")
        logger.info(f"BOT_TOKEN (repr): {repr(BOT_TOKEN)}")
        
        # Calculate hash with SHA256 of token (correct method)
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        logger.info(f"Calculated hash: {calculated_hash}")
        logger.info(f"Received hash: {auth_data.hash}")
        logger.info(f"Hash comparison: {calculated_hash == auth_data.hash}")
        
        is_valid = calculated_hash == auth_data.hash
        logger.info(f"Hash validation result: {is_valid}")
        
        if not is_valid:
            logger.error("❌ Telegram auth validation FAILED")
            logger.error(f"Expected hash: {calculated_hash}")
            logger.error(f"Received hash: {auth_data.hash}")
            logger.error(f"Data string: {data_check_string}")
        else:
            logger.info("✅ Telegram auth validation SUCCESS")
        
        return is_valid
    except Exception as e:
        logger.error(f"Telegram auth validation error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

# API Routes
@app.get("/api/questions", response_model=List[Question])
async def get_questions(db=Depends(get_db)):
    """Get active questions with options"""
    try:
        logger.info("🔍 API /questions called")
        
        # Fallback to demo when DB isn't available
        if db is None:
            logger.warning("⚠️ Database not available, using demo questions")
            demo = get_demo_questions()
            questions = []
            for q in demo:
                options = [
                    QuestionOption(id=opt["id"], option_text=opt["option_text"]) for opt in q.get("options", [])
                ]
                questions.append(
                    Question(
                        id=q["id"],
                        text=q["text"],
                        instruction=q.get("instruction"),
                        question_type=q.get("question_type", "text"),
                        allow_other=q.get("allow_other", False),
                        options=options,
                    )
                )
            logger.info(f"📋 Returning {len(questions)} demo questions")
            return questions

        logger.info("🗄️ Database available, fetching questions from DB")
        
        # Get questions
        questions_query = """
            SELECT id, text, instruction, question_type, allow_other, display_order
            FROM questions 
            WHERE COALESCE(active, true) = true
            ORDER BY display_order
        """
        questions_rows = await db.fetch(questions_query)
        logger.info(f"📊 Found {len(questions_rows)} questions in database")
        
        if len(questions_rows) == 0:
            logger.warning("⚠️ No questions found in database, falling back to demo")
            demo = get_demo_questions()
            questions = []
            for q in demo:
                options = [
                    QuestionOption(id=opt["id"], option_text=opt["option_text"]) for opt in q.get("options", [])
                ]
                questions.append(
                    Question(
                        id=q["id"],
                        text=q["text"],
                        instruction=q.get("instruction"),
                        question_type=q.get("question_type", "text"),
                        allow_other=q.get("allow_other", False),
                        options=options,
                    )
                )
            logger.info(f"📋 Returning {len(questions)} demo questions as fallback")
            return questions
        
        questions = []
        for q_row in questions_rows:
            logger.info(f"📝 Processing question {q_row['id']}: {q_row['text'][:50]}...")
            
            # Нормализация типа вопроса
            row_type = (q_row['question_type'] or 'text').lower().replace(' ', '_').replace('-', '_')
            if row_type in ('single','one','radio'):
                row_type = 'single_choice'
            elif row_type in ('multiple','multi','checkbox','multiple_select'):
                row_type = 'multiple_choice'
            elif row_type not in ('text','single_choice','multiple_choice'):
                row_type = 'text'

            # Get options for this question
            options_query = """
                SELECT id, option_text
                FROM question_options
                WHERE question_id = $1
                  AND COALESCE(active, true) = true
                  AND option_text IS NOT NULL
                  AND TRIM(option_text) <> ''
                ORDER BY display_order
            """
            options_rows = await db.fetch(options_query, q_row['id'])
            logger.info(f"📋 Found {len(options_rows)} options for question {q_row['id']}")
            
            options = [
                QuestionOption(id=opt['id'], option_text=opt['option_text'])
                for opt in options_rows
            ]

            # Если choice без опций — в текст
            if row_type in ('single_choice','multiple_choice') and not options:
                logger.info(f"🔄 Converting question {q_row['id']} from {row_type} to text (no options)")
                row_type = 'text'
            
            question = Question(
                id=q_row['id'],
                text=q_row['text'],
                instruction=q_row['instruction'],
                question_type=row_type,
                allow_other=q_row['allow_other'] or False,
                options=options
            )
            questions.append(question)
        
        logger.info(f"✅ Returning {len(questions)} questions from database")
        return questions
    
    except Exception as e:
        logger.error(f"❌ Error fetching questions: {e}")
        logger.error(f"❌ Error type: {type(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to fetch questions")

@app.post("/api/submit")
async def submit_form(request: SubmitRequest, db=Depends(get_db)):
    """Submit completed form with Telegram authentication"""
    try:
        logger.info(f"📥 Получен запрос submit от пользователя {request.telegram_auth.id}")
        logger.info(f"📊 Данные запроса: answers={len(request.answers)}, profile={request.profile.name if request.profile else 'None'}")
        # Validate Telegram authentication (skip in TEST_MODE)
        if not TEST_MODE:
            logger.info(f"Validating Telegram auth for user {request.telegram_auth.id}")
            if not validate_telegram_auth(request.telegram_auth):
                logger.error(f"Telegram auth validation failed for user {request.telegram_auth.id}")
                raise HTTPException(status_code=401, detail="Invalid Telegram authentication")
            logger.info(f"Telegram auth validation successful for user {request.telegram_auth.id}")
        else:
            logger.info(f"TEST_MODE: Skipping Telegram auth validation for user {request.telegram_auth.id}")
        
        # Check auth date (should be recent)
        if not TEST_MODE:
            current_time = datetime.now().timestamp()
            auth_age = current_time - request.telegram_auth.auth_date
            logger.info(f"Current server time: {current_time}")
            logger.info(f"Auth date from Telegram: {request.telegram_auth.auth_date}")
            logger.info(f"Auth age: {auth_age} seconds (max 86400)")
            
            # Check if auth_date is in the future (clock skew issue)
            if request.telegram_auth.auth_date > current_time + 300:  # 5 minutes tolerance
                logger.error(f"Auth date is in the future! Server time: {current_time}, Auth date: {request.telegram_auth.auth_date}")
                raise HTTPException(status_code=401, detail="Invalid authentication timestamp")
            elif auth_age > 86400:  # 24 hours
                logger.error(f"Authentication expired for user {request.telegram_auth.id}")
                raise HTTPException(status_code=401, detail="Authentication expired")
        
        telegram_id = request.telegram_auth.id
        username = request.telegram_auth.username
        
        # Use Telegram data if profile is not provided or incomplete
        user_name = request.profile.name or request.telegram_auth.first_name or 'Пользователь'
        user_surname = request.profile.surname or request.telegram_auth.last_name or '-'
        user_age = request.profile.age or 25  # Default age if not provided
        
        logger.info(f"📝 User profile: name={user_name}, surname={user_surname}, age={user_age}")
        
        user_id: Any = telegram_id
        if db is not None:
            # Upsert user when DB available
            user_query = """
                INSERT INTO users (id, username, name, surname, age, registration_date, status)
                VALUES ($1, $2, $3, $4, $5, NOW(), 'active')
                ON CONFLICT (id) DO UPDATE SET
                    username = EXCLUDED.username,
                    name = EXCLUDED.name,
                    surname = EXCLUDED.surname,
                    age = EXCLUDED.age
                RETURNING id
            """
            user_id = await db.fetchval(
                user_query,
                telegram_id,
                username,
                user_name,
                user_surname,
                user_age,
            )
        
        # Save answers if DB is available; otherwise, just log
        if db is not None:
            for answer in request.answers:
                # Format answer based on type
                if answer.type == "text":
                    answer_text = answer.value
                elif answer.type == "single_choice":
                    answer_text = answer.value
                elif answer.type == "multiple_choice":
                    answer_text = answer.value
                else:
                    answer_text = str(answer.value)
                
                # Upsert answer
                answer_query = """
                    INSERT INTO user_answers (user_id, question_id, answer, answered_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (user_id, question_id) DO UPDATE SET
                        answer = EXCLUDED.answer,
                        answered_at = EXCLUDED.answered_at
                """
                await db.execute(answer_query, user_id, answer.question_id, answer_text)
        else:
            logger.info(
                f"TEST_MODE or no DB: received answers for user {user_id}: "
                + json.dumps([a.dict() for a in request.answers], ensure_ascii=False)
            )
        
        # Log UTM parameters if provided
        if request.source:
            utm_data = request.source.dict(exclude_none=True)
            if utm_data:
                # You can store UTM data in a separate table or in user settings
                logger.info(f"UTM data for user {user_id}: {utm_data}")
        
        logger.info(f"Successfully processed submission for user {user_id}")
        return {"ok": True, "user_id": user_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing submission: {e}")
        raise HTTPException(status_code=500, detail="Failed to process submission")

@app.get("/api/bot-info")
async def get_bot_info():
    """Get bot information including bot_id"""
    try:
        if not BOT_TOKEN or BOT_TOKEN == "your_bot_token_here":
            raise HTTPException(status_code=500, detail="BOT_TOKEN not configured")
        
        # Extract bot_id from BOT_TOKEN (format: "123456789:ABCdef...")
        bot_id = BOT_TOKEN.split(':')[0]
        
        return {
            "bot_id": bot_id,
            "bot_username": BOT_USERNAME,
            "bot_token_configured": BOT_TOKEN != "your_bot_token_here"
        }
    except Exception as e:
        logger.error(f"Error getting bot info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bot info")

@app.get("/api/telegram/login")
async def telegram_login(request: Request):
    """Handle Telegram Login Widget authentication"""
    try:
        logger.info(f"🔐 Telegram login request: {request.url}")
        
        # Get query parameters from Telegram widget
        query_params = dict(request.query_params)
        logger.info(f"📋 Query params: {query_params}")
        
        # Extract required fields
        telegram_id = query_params.get("id")
        first_name = query_params.get("first_name")
        username = query_params.get("username")
        photo_url = query_params.get("photo_url")
        auth_date = query_params.get("auth_date")
        hash_param = query_params.get("hash")
        
        if not all([telegram_id, first_name, auth_date, hash_param]):
            logger.error("❌ Missing required Telegram auth parameters")
            raise HTTPException(status_code=400, detail="Missing required parameters")
        
        # Create TelegramAuth object for validation
        telegram_auth = TelegramAuth(
            id=int(telegram_id),
            first_name=first_name,
            username=username,
            photo_url=photo_url,
            auth_date=int(auth_date),
            hash=hash_param
        )
        
        # Validate Telegram authentication (skip in TEST_MODE)
        if not TEST_MODE:
            logger.info(f"🔍 Validating Telegram auth for user {telegram_id}")
            if not validate_telegram_auth(telegram_auth):
                logger.error(f"❌ Telegram auth validation failed for user {telegram_id}")
                raise HTTPException(status_code=401, detail="Invalid Telegram authentication")
            logger.info(f"✅ Telegram auth validation successful for user {telegram_id}")
        else:
            logger.info(f"🧪 TEST_MODE: Skipping Telegram auth validation for user {telegram_id}")
        
        # Check auth date (should be recent)
        if not TEST_MODE:
            current_time = datetime.now().timestamp()
            auth_age = current_time - telegram_auth.auth_date
            logger.info(f"⏰ Auth age: {auth_age} seconds")
            
            # Check if auth_date is in the future (clock skew issue)
            if telegram_auth.auth_date > current_time + 300:  # 5 minutes tolerance
                logger.error(f"❌ Auth date is in the future! Server: {current_time}, Auth: {telegram_auth.auth_date}")
                raise HTTPException(status_code=401, detail="Invalid authentication timestamp")
            elif auth_age > 86400:  # 24 hours
                logger.error(f"❌ Authentication expired for user {telegram_id}")
                raise HTTPException(status_code=401, detail="Authentication expired")
        
        # Redirect to frontend with success parameter and user data
        frontend_url = os.getenv("FRONTEND_ORIGIN", "https://5chairs.app")
        
        # Encode Telegram auth data as JSON
        import base64
        auth_data_json = json.dumps(telegram_auth.dict())
        auth_data_encoded = base64.b64encode(auth_data_json.encode()).decode()
        
        redirect_url = f"{frontend_url}/questionnaire#tg=ok&tgAuthResult={auth_data_encoded}"
        
        logger.info(f"🔄 Redirecting to: {redirect_url}")
        logger.info(f"📱 Encoded auth data: {auth_data_encoded}")
        
        return RedirectResponse(url=redirect_url, status_code=302)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in Telegram login: {e}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/continue")
async def get_continue_link():
    """Get link to continue in Telegram bot"""
    return {
        "bot_link": f"https://t.me/{BOT_USERNAME}?start=web",
        "bot_username": BOT_USERNAME,
        "message": "Выбери удобную дату для встречи"
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Serve static files (for production) — mount dist relative to backend folder
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DIST_DIR = os.path.normpath(os.path.join(_BASE_DIR, "..", "dist"))
_ASSETS_DIR = os.path.join(_DIST_DIR, "assets")

logger.info(f"Looking for dist directory at: {_DIST_DIR}")
logger.info(f"Dist directory exists: {os.path.exists(_DIST_DIR)}")

if os.path.exists(_DIST_DIR):
    logger.info("Mounting static files from dist/")
    
    # 1) ассеты отдельным маунтом
    if os.path.exists(_ASSETS_DIR):
        app.mount("/assets", StaticFiles(directory=_ASSETS_DIR), name="assets")
        logger.info("Mounted /assets directory")
    
    # 2) лендинг: /
    @app.get("/", include_in_schema=False)
    def landing():
        return FileResponse(os.path.join(_DIST_DIR, "index.html"))
    
    # 3) анкета: /questionnaire (+ со слэшем, + любые вложенные подпути анкеты, если появятся)
    @app.get("/questionnaire", include_in_schema=False)
    @app.get("/questionnaire/", include_in_schema=False)
    @app.get("/questionnaire/{_:path}", include_in_schema=False)
    def questionnaire(_=""):
        path = os.path.join(_DIST_DIR, "questionnaire.html")
        if os.path.exists(path):
            return FileResponse(path)
        else:
            raise HTTPException(status_code=404, detail="Questionnaire page not found")
    
    logger.info("Mounted landing and questionnaire routes")
else:
    logger.warning("Dist directory not found! Frontend will not be served.")

if __name__ == "__main__":
    import uvicorn
    import asyncio
    
    # Проверяем конфигурацию бота при запуске
    asyncio.run(verify_bot_configuration())
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)