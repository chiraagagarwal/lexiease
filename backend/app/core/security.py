import os
import logging
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth
from firebase_admin import credentials
from app.core.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Initialize Firebase Admin
try:
    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if cred_path and not os.path.isabs(cred_path) and not os.path.exists(cred_path):
        candidate = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), cred_path)
        if os.path.exists(candidate):
            cred_path = candidate

    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # Default initialization (might fail if not in GCP or no creds)
        if not settings.TESTING:
            try:
                firebase_admin.initialize_app()
            except Exception:
                logger.warning("Could not initialize default Firebase Admin credentials")
except ValueError:
    # Already initialized
    pass



def verify_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Requires an authenticated user with a verified Firebase token.
    Anonymous guests and invalid tokens are denied access to private user data.
    """
    token = credentials.credentials

    # In testing environment only, allow mock tokens for automated test isolation
    if settings.TESTING:
        if token.startswith("mock_token_anon_") or token == "test_mock_anon_guest" or token == "guest_access":
            raise HTTPException(
                status_code=403,
                detail="Anonymous guest access not permitted for private user profile. Authentication required."
            )
        if token.startswith("mock_token_") or token.startswith("test_mock_user_"):
            uid = token.replace("test_mock_user_", "").replace("mock_token_", "")
            return {"uid": uid, "email": "test@example.com", "is_guest": False, "firebase": {"sign_in_provider": "password"}}

    try:
        decoded_token = auth.verify_id_token(token)
        is_anonymous = decoded_token.get("firebase", {}).get("sign_in_provider") == "anonymous"
        if is_anonymous:
            raise HTTPException(
                status_code=403,
                detail="Anonymous guest access not permitted for private user profile. Authentication required."
            )
        return {**decoded_token, "is_guest": False}
    except HTTPException:
        raise
    except Exception as e:
        logger.debug("Token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


def verify_guest_or_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Allows either a verified anonymous Firebase user token or a verified authenticated user token.
    Used for public assistive AI and OCR endpoints. Arbitrary static/mock tokens are rejected in production.
    """
    token = credentials.credentials

    # In testing environment only, allow mock tokens for automated tests
    if settings.TESTING:
        if token.startswith("mock_token_anon_") or token == "test_mock_anon_guest" or token == "guest_access":
            return {"uid": "guest_test", "is_guest": True, "firebase": {"sign_in_provider": "anonymous"}}
        if token.startswith("mock_token_") or token.startswith("test_mock_user_"):
            uid = token.replace("test_mock_user_", "").replace("mock_token_", "")
            return {"uid": uid, "email": "test@example.com", "is_guest": False, "firebase": {"sign_in_provider": "password"}}

    try:
        decoded_token = auth.verify_id_token(token)
        is_anonymous = decoded_token.get("firebase", {}).get("sign_in_provider") == "anonymous"
        return {**decoded_token, "is_guest": is_anonymous}
    except Exception as e:
        logger.debug("Token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


# Alias verify_token to verify_user for backward compatibility
verify_token = verify_user
