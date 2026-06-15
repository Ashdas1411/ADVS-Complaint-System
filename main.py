from fastapi import FastAPI
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

import models
from auth import router as auth_router
from complaints import router as complaint_router
from analytics import router as analytics_router
from routing_service import router as routing_router

app = FastAPI(title="ADVS Smart Hostel System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(complaint_router)
app.include_router(analytics_router)
app.include_router(routing_router)

app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
async def frontend():
    return FileResponse("frontend/index.html")
