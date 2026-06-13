from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.websockets import router as websockets_router

app = FastAPI(
    title=settings.PROJECT_NAME
)

# Set all CORS enabled origins
# if settings.BACKEND_CORS_ORIGINS:
#     app.add_middleware(
#         CORSMiddleware,
#         #allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
#         allow_origins=["*"],
#         allow_credentials=True,
#         allow_methods=["*"],
#         allow_headers=["*"],
#     )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(documents_router, prefix="/documents", tags=["documents"])
app.include_router(websockets_router, prefix="/ws", tags=["websockets"])

@app.get("/")
async def root():
    return {"message": "Welcome to Google Docs Clone FastAPI Backend"}
