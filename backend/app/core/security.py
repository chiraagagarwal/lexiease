from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth
from firebase_admin import credentials
from app.core.config import settings

security = HTTPBearer()

# Initialize Firebase Admin
try:
    if settings.FIREBASE_CREDENTIALS_PATH:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
    else:
        # Default initialization (might fail if not in GCP or no creds)
        if not settings.TESTING:
            firebase_admin.initialize_app()
except ValueError:
    # Already initialized
    pass

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    if settings.TESTING and token.startswith("mock_token_"):
        # Strict testing bypass
        return {"uid": token.replace("mock_token_", ""), "email": "test@example.com"}
    
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
