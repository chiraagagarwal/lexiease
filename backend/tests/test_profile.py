import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from app.main import app
from app.db.database import get_session
from app.core.config import settings
from app.models import User, ReadingProfile

# Use in-memory SQLite for testing
sqlite_url = "sqlite:///:memory:"
from sqlalchemy.pool import StaticPool
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False}, poolclass=StaticPool)

def get_session_override():
    with Session(engine) as session:
        yield session

app.dependency_overrides[get_session] = get_session_override

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    # Set testing mode
    settings.TESTING = True
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)

def test_unauthenticated_request():
    response = client.get("/api/profile/")
    assert response.status_code == 401 # Missing token

def test_invalid_token():
    response = client.get("/api/profile/", headers={"Authorization": "Bearer invalid_token"})
    assert response.status_code == 401

def test_get_profile_creates_user_and_profile():
    # Token matches bypass "mock_token_123"
    response = client.get("/api/profile/", headers={"Authorization": "Bearer mock_token_testuser"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["preferences"] == {}
    
    # Check db
    with Session(engine) as session:
        user = session.query(User).first()
        assert user.firebase_uid == "testuser"
        profile = session.query(ReadingProfile).first()
        assert profile.user_id == user.id

def test_update_profile():
    # First get to create user
    client.get("/api/profile/", headers={"Authorization": "Bearer mock_token_testuser"})
    
    # Update profile
    new_prefs = {"font": "Arial", "fontSize": 18}
    update_data = {"preferences": new_prefs}
    response = client.put("/api/profile/", headers={"Authorization": "Bearer mock_token_testuser"}, json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["preferences"]["font"] == "Arial"

def test_user_isolation():
    client.get("/api/profile/", headers={"Authorization": "Bearer mock_token_user1"})
    client.put("/api/profile/", headers={"Authorization": "Bearer mock_token_user1"}, json={"preferences": {"font": "Comic Sans"}})
    
    client.get("/api/profile/", headers={"Authorization": "Bearer mock_token_user2"})
    
    # Check user2 didn't get user1's preferences
    response2 = client.get("/api/profile/", headers={"Authorization": "Bearer mock_token_user2"})
    assert response2.json()["preferences"] == {}
    
    # Check user1 still has their preferences
    response1 = client.get("/api/profile/", headers={"Authorization": "Bearer mock_token_user1"})
    assert response1.json()["preferences"]["font"] == "Comic Sans"
