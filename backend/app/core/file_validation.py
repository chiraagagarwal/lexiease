"""
File content validation utilities for verifying magic bytes and MIME signatures.
Ensures uploaded files match their declared extensions and prevents malformed
or mismatched payloads from being processed by downstream AI or OCR services.
"""
from typing import Tuple, Optional

# Magic byte signatures
PDF_MAGIC = b"%PDF-"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
JPEG_MAGIC = b"\xff\xd8\xff"
RIFF_MAGIC = b"RIFF"
WEBP_MAGIC = b"WEBP"

SUPPORTED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "webp"}


def detect_content_type(content: bytes) -> Optional[str]:
    """
    Detects file content type based on standard magic byte signatures.
    Returns detected extension format ('pdf', 'png', 'jpg', 'webp') or None if unrecognized.
    """
    if not content or len(content) < 4:
        return None

    if content.startswith(PDF_MAGIC):
        return "pdf"
    if content.startswith(PNG_MAGIC):
        return "png"
    if content.startswith(JPEG_MAGIC):
        return "jpg"
    if len(content) >= 12 and content[:4] == RIFF_MAGIC and content[8:12] == WEBP_MAGIC:
        return "webp"

    return None


def validate_assessment_file(
    filename: str,
    content: bytes,
    max_size_bytes: int = 5 * 1024 * 1024
) -> Tuple[bool, str, str]:
    """
    Validates an uploaded assessment file by size, extension, and content magic bytes.
    Returns: (is_valid: bool, mime_type: str, error_message: str)
    """
    if not content or len(content) == 0:
        return False, "", "Uploaded assessment file is empty"

    if len(content) > max_size_bytes:
        max_mb = max_size_bytes // (1024 * 1024)
        return False, "", f"Assessment document exceeds maximum allowed size of {max_mb}MB"

    name = (filename or "").lower()
    ext = name.split(".")[-1] if "." in name else ""

    if ext not in SUPPORTED_EXTENSIONS:
        return (
            False,
            "",
            f"Unsupported file extension '.{ext}'. Supported formats are: PDF, PNG, JPG, JPEG, and WebP"
        )

    detected = detect_content_type(content)
    if not detected:
        return (
            False,
            "",
            "Malformed or unrecognized file content. File header does not match any supported document or image format"
        )

    # Check for extension / content mismatch (normalize jpeg -> jpg)
    ext_normalized = "jpg" if ext == "jpeg" else ext
    if detected != ext_normalized:
        return (
            False,
            "",
            f"Content mismatch: Declared extension '.{ext}' does not match actual file signature (detected: '{detected}')"
        )

    mime_type = "application/pdf" if detected == "pdf" else f"image/{detected}"
    return True, mime_type, ""


def validate_document_file(
    filename: str,
    content: bytes,
    is_guest: bool = False
) -> Tuple[bool, str, str]:
    """
    Validates an uploaded OCR document file by size (10MB guest / 25MB user),
    extension, and content magic bytes.
    Returns: (is_valid: bool, mime_type: str, error_message: str)
    """
    if not content or len(content) == 0:
        return False, "", "Uploaded file is empty"

    max_size_bytes = 10 * 1024 * 1024 if is_guest else 25 * 1024 * 1024
    if len(content) > max_size_bytes:
        max_mb = max_size_bytes // (1024 * 1024)
        role = "Guest" if is_guest else "User"
        return False, "", f"{role} document upload exceeds maximum allowed size ({max_mb}MB)"

    name = (filename or "").lower()
    ext = name.split(".")[-1] if "." in name else ""

    if ext not in SUPPORTED_EXTENSIONS:
        return (
            False,
            "",
            f"Unsupported file format '.{ext}'. Supported formats are: PDF, PNG, JPG, JPEG, and WebP"
        )

    detected = detect_content_type(content)
    if not detected:
        return (
            False,
            "",
            "Malformed or unrecognized file content. File header does not match any supported document or image format (PDF, PNG, JPG, WebP)"
        )

    ext_normalized = "jpg" if ext == "jpeg" else ext
    if detected != ext_normalized:
        return (
            False,
            "",
            f"Content mismatch: Declared extension '.{ext}' does not match actual file signature (detected: '{detected}')"
        )

    mime_type = "application/pdf" if detected == "pdf" else f"image/{detected}"
    return True, mime_type, ""
