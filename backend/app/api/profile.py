from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Dict, Any, Optional
from app.db.database import get_session
from app.core.security import verify_token
from app.models import User, ReadingProfile
from pydantic import BaseModel
from datetime import datetime, timezone

router = APIRouter()

class ProfileUpdateRequest(BaseModel):
    preferences: Dict[str, Any]
    calibration_answers: Optional[Dict[str, str]] = None

@router.get("/")
def get_profile(token_data: dict = Depends(verify_token), session: Session = Depends(get_session)):
    uid = token_data.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token data")

    # Idempotent user creation
    statement = select(User).where(User.firebase_uid == uid)
    user = session.exec(statement).first()
    
    if not user:
        user = User(firebase_uid=uid, email=token_data.get("email"))
        session.add(user)
        session.commit()
        session.refresh(user)

    # Fetch or create profile
    profile_statement = select(ReadingProfile).where(ReadingProfile.user_id == user.id)
    profile = session.exec(profile_statement).first()

    if not profile:
        profile = ReadingProfile(user_id=user.id, preferences={})
        session.add(profile)
        session.commit()
        session.refresh(profile)

    return {
        "id": profile.id,
        "user_id": user.firebase_uid,
        "preferences": profile.preferences,
        "calibrationAnswers": profile.calibration_answers,
        "calibratedAt": profile.calibrated_at.isoformat() if profile.calibrated_at else None,
        "updatedAt": profile.updated_at.isoformat()
    }

@router.put("/")
def update_profile(request: ProfileUpdateRequest, token_data: dict = Depends(verify_token), session: Session = Depends(get_session)):
    uid = token_data.get("uid")
    
    statement = select(User).where(User.firebase_uid == uid)
    user = session.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile_statement = select(ReadingProfile).where(ReadingProfile.user_id == user.id)
    profile = session.exec(profile_statement).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Update fields
    if request.preferences is not None:
        profile.preferences = request.preferences
    if request.calibration_answers is not None:
        profile.calibration_answers = request.calibration_answers
        profile.calibrated_at = datetime.now(timezone.utc)
        
    profile.updated_at = datetime.now(timezone.utc)
    
    session.add(profile)
    session.commit()
    session.refresh(profile)
    
    return {
        "id": profile.id,
        "user_id": user.firebase_uid,
        "preferences": profile.preferences,
        "calibrationAnswers": profile.calibration_answers,
        "calibratedAt": profile.calibrated_at.isoformat() if profile.calibrated_at else None,
        "updatedAt": profile.updated_at.isoformat()
    }
