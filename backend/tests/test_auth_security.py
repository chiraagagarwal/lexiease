import pytest
from app.core.config import settings
from app.core.rate_limiter import limiter
from io import BytesIO

@pytest.fixture(autouse=True)
def reset_rate_limiter():
    limiter.reset()
    yield
    limiter.reset()

def test_anonymous_guest_cannot_access_user_profile(client):
    """Anonymous guests must be forbidden (403) from accessing private user profile data."""
    response = client.get("/api/profile/", headers={"Authorization": "Bearer test_mock_anon_guest"})
    assert response.status_code == 403
    assert "Anonymous guest access not permitted" in response.json()["detail"]

def test_anonymous_guest_cannot_update_user_profile(client):
    """Anonymous guests must be forbidden (403) from updating private user profile data."""
    response = client.put(
        "/api/profile/",
        headers={"Authorization": "Bearer test_mock_anon_guest"},
        json={"preferences": {"font": "Lexend"}}
    )
    assert response.status_code == 403
    assert "Anonymous guest access not permitted" in response.json()["detail"]

def test_invalid_tokens_rejected_on_all_endpoints(client):
    """Invalid or malformed tokens must return 401 Unauthorized."""
    response_profile = client.get("/api/profile/", headers={"Authorization": "Bearer bad_token_123"})
    assert response_profile.status_code == 401

    response_ai = client.post(
        "/api/ai/simplify",
        headers={"Authorization": "Bearer bad_token_123"},
        json={"text": "Hello world"}
    )
    assert response_ai.status_code == 401

def test_authenticated_user_access(client):
    """Authenticated users can access and manage their own profile data."""
    response = client.get("/api/profile/", headers={"Authorization": "Bearer test_mock_user_alice"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "alice"

def test_valid_guest_access_allowed_on_ai_endpoints(client):
    """Anonymous guest token is recognized on AI and document endpoints without 401/403."""
    response = client.get(
        "/api/document/tasks/task_guest_test_id",
        headers={"Authorization": "Bearer test_mock_anon_guest"}
    )
    # Task not found (404), but NOT 401 Unauthorized or 403 Forbidden
    assert response.status_code not in (401, 403)

def test_guest_request_limit_enforced(client):
    """Guests submitting text over 5,000 characters are rejected with 400 Bad Request."""
    long_text = "word " * 1100  # > 5,500 characters
    response = client.post(
        "/api/ai/simplify",
        headers={"Authorization": "Bearer test_mock_anon_guest"},
        json={"text": long_text}
    )
    assert response.status_code == 400
    assert "Guest simplification request exceeds maximum allowed length" in response.json()["detail"]

def test_assessment_magic_bytes_validation(client):
    """Assessment upload validates actual file magic bytes and detects mismatches."""
    headers = {"Authorization": "Bearer test_mock_anon_guest"}

    # 1. Unsupported extension
    fake_exe = BytesIO(b"MZ\x90\x00binary content")
    res_unsupported = client.post(
        "/api/ai/analyze-assessment",
        headers=headers,
        files={"file": ("malicious.exe", fake_exe, "application/octet-stream")}
    )
    assert res_unsupported.status_code == 400
    assert "Unsupported file extension" in res_unsupported.json()["detail"]

    # 2. Mismatched content: declared .pdf but contains PNG magic bytes
    mismatched_png = BytesIO(b"\x89PNG\r\n\x1a\nfake png stream")
    res_mismatched = client.post(
        "/api/ai/analyze-assessment",
        headers=headers,
        files={"file": ("report.pdf", mismatched_png, "application/pdf")}
    )
    assert res_mismatched.status_code == 400
    assert "Content mismatch" in res_mismatched.json()["detail"]

    # 3. Malformed/garbage file content
    garbage_pdf = BytesIO(b"garbage content without pdf header")
    res_garbage = client.post(
        "/api/ai/analyze-assessment",
        headers=headers,
        files={"file": ("corrupted.pdf", garbage_pdf, "application/pdf")}
    )
    assert res_garbage.status_code == 400
    assert "Malformed or unrecognized file content" in res_garbage.json()["detail"]

    # 4. Valid PDF magic bytes
    valid_pdf = BytesIO(b"%PDF-1.4 authentic pdf content")
    res_valid = client.post(
        "/api/ai/analyze-assessment",
        headers=headers,
        files={"file": ("report.pdf", valid_pdf, "application/pdf")}
    )
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert "recommendations" in data
    assert "is_fallback" in data
    assert data["is_fallback"] is True  # In test environment without GEMINI_API_KEY, correctly marks is_fallback

def test_assessment_transparent_fallback_field(client):
    """When AI provider is unconfigured/fails, response explicitly declares is_fallback=True."""
    headers = {"Authorization": "Bearer test_mock_anon_guest"}
    valid_png = BytesIO(b"\x89PNG\r\n\x1a\nvalid png bytes")
    res = client.post(
        "/api/ai/analyze-assessment",
        headers=headers,
        files={"file": ("scan.png", valid_png, "image/png")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_fallback"] is True
    assert "Standard Accommodation" in data["extractedNotes"][0]

def test_rate_limiter_throttles_excessive_requests(client):
    """When a client exceeds allowed requests per minute, returns 429 with Retry-After header."""
    headers = {"Authorization": "Bearer test_mock_anon_guest"}

    # Configure tight limit for this test
    original_limit = settings.RATE_LIMIT_GUEST_AI_PER_MINUTE
    settings.RATE_LIMIT_GUEST_AI_PER_MINUTE = 3
    try:
        valid_pdf = lambda: BytesIO(b"%PDF-1.4 sample content")

        # 3 requests allowed
        for _ in range(3):
            r = client.post(
                "/api/ai/analyze-assessment",
                headers=headers,
                files={"file": ("report.pdf", valid_pdf(), "application/pdf")}
            )
            assert r.status_code == 200

        # 4th request must be throttled with 429
        r_throttled = client.post(
            "/api/ai/analyze-assessment",
            headers=headers,
            files={"file": ("report.pdf", valid_pdf(), "application/pdf")}
        )
        assert r_throttled.status_code == 429
        assert "Rate limit exceeded" in r_throttled.json()["detail"]
        assert "Retry-After" in r_throttled.headers
        assert int(r_throttled.headers["Retry-After"]) > 0
    finally:
        settings.RATE_LIMIT_GUEST_AI_PER_MINUTE = original_limit

def test_production_mode_rejects_arbitrary_mock_and_static_tokens(client):
    """When TESTING is False (production), arbitrary mock tokens and old static tokens must be rejected."""
    settings.TESTING = False
    try:
        response_mock = client.get("/api/profile/", headers={"Authorization": "Bearer mock_token_attacker"})
        assert response_mock.status_code == 401

        response_static = client.post(
            "/api/ai/simplify",
            headers={"Authorization": "Bearer guest_access"},
            json={"text": "Hello world"}
        )
        assert response_static.status_code == 401
    finally:
        settings.TESTING = True

def test_document_parse_file_signature_validation(client):
    """Document upload endpoint validates file magic bytes and rejects malformed/mismatched files."""
    headers = {"Authorization": "Bearer test_mock_anon_guest"}

    # 1. Reject malformed / disguised file (plain text named .pdf)
    bad_pdf = BytesIO(b"This is just plain text without PDF header")
    r_bad = client.post(
        "/api/document/parse",
        headers=headers,
        files={"file": ("fake.pdf", bad_pdf, "application/pdf")}
    )
    assert r_bad.status_code == 400
    assert "Malformed or unrecognized file content" in r_bad.json()["detail"]

    # 2. Reject extension / content mismatch (PNG bytes named .pdf)
    png_as_pdf = BytesIO(b"\x89PNG\r\n\x1a\nfake png data")
    r_mismatch = client.post(
        "/api/document/parse",
        headers=headers,
        files={"file": ("mismatch.pdf", png_as_pdf, "application/pdf")}
    )
    assert r_mismatch.status_code == 400
    assert "Content mismatch" in r_mismatch.json()["detail"]

    # 3. Reject empty file
    empty_file = BytesIO(b"")
    r_empty = client.post(
        "/api/document/parse",
        headers=headers,
        files={"file": ("empty.pdf", empty_file, "application/pdf")}
    )
    assert r_empty.status_code == 400
    assert "Uploaded file is empty" in r_empty.json()["detail"]

    # 4. Accept genuine PDF with valid magic bytes
    genuine_pdf = BytesIO(b"%PDF-1.4 sample genuine document")
    r_valid = client.post(
        "/api/document/parse",
        headers=headers,
        files={"file": ("lesson.pdf", genuine_pdf, "application/pdf")}
    )
    assert r_valid.status_code == 200
    assert "task_id" in r_valid.json()

def test_document_parse_rate_limiting(client):
    """Document upload endpoint enforces server-side rate limits."""
    headers = {"Authorization": "Bearer test_mock_anon_guest"}
    original_limit = settings.RATE_LIMIT_GUEST_AI_PER_MINUTE
    settings.RATE_LIMIT_GUEST_AI_PER_MINUTE = 2

    try:
        genuine_pdf = lambda: BytesIO(b"%PDF-1.4 minimal doc")

        # 2 requests allowed
        for _ in range(2):
            r = client.post(
                "/api/document/parse",
                headers=headers,
                files={"file": ("doc.pdf", genuine_pdf(), "application/pdf")}
            )
            assert r.status_code == 200

        # 3rd request throttled with 429
        r_throttled = client.post(
            "/api/document/parse",
            headers=headers,
            files={"file": ("doc.pdf", genuine_pdf(), "application/pdf")}
        )
        assert r_throttled.status_code == 429
        assert "Rate limit exceeded" in r_throttled.json()["detail"]
        assert "Retry-After" in r_throttled.headers
    finally:
        settings.RATE_LIMIT_GUEST_AI_PER_MINUTE = original_limit
