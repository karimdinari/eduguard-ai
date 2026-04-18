"""
services/file_parser.py — Extract plain text from uploaded TP files.
Supports: PDF, .ipynb notebooks, source code files, plain text.
"""

import json
from pathlib import Path

# PyMuPDF: try modern import first, then legacy `fitz` name.
_PYMUPDF_ERR: str | None = None
try:
    import pymupdf as fitz
    _PYMUPDF = True
except ImportError as e:
    _PYMUPDF_ERR = str(e)
    try:
        import fitz
        _PYMUPDF = True
        _PYMUPDF_ERR = None
    except ImportError as e2:
        _PYMUPDF = False
        _PYMUPDF_ERR = str(e2)


SUPPORTED_CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".java", ".c", ".cpp", ".h",
    ".cs", ".go", ".rs", ".rb", ".php", ".r", ".sql",
    ".sh", ".bash", ".html", ".css", ".xml", ".yaml", ".json",
}


def parse_file(filename: str, file_bytes: bytes) -> tuple[str, str]:
    """
    Given a filename and its raw bytes, return:
        (extracted_text: str, file_type: str)

    file_type is one of: "pdf" | "notebook" | "code" | "text"
    """
    suffix = Path(filename).suffix.lower()

    if suffix == ".pdf":
        return _parse_pdf(file_bytes), "pdf"

    if suffix == ".ipynb":
        return _parse_notebook(file_bytes), "notebook"

    if suffix in SUPPORTED_CODE_EXTENSIONS:
        return file_bytes.decode("utf-8", errors="replace"), "code"

    # fallback: treat as plain text
    return file_bytes.decode("utf-8", errors="replace"), "text"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_pdf(data: bytes) -> str:
    if not _PYMUPDF:
        hint = (
            "PyMuPDF is missing or failed to load (often a broken install or missing "
            "VC++ runtime on Windows). Try: pip install --upgrade pymupdf"
        )
        if _PYMUPDF_ERR:
            raise RuntimeError(f"{hint}. Import error: {_PYMUPDF_ERR}")
        raise RuntimeError(hint)
    doc = fitz.open(stream=data, filetype="pdf")
    pages = [page.get_text() for page in doc]
    return "\n\n".join(pages)


def _parse_notebook(data: bytes) -> str:
    """Extract markdown + code cells from a Jupyter notebook."""
    nb = json.loads(data.decode("utf-8", errors="replace"))
    parts = []
    for cell in nb.get("cells", []):
        cell_type = cell.get("cell_type", "")
        source = "".join(cell.get("source", []))
        if cell_type == "markdown":
            parts.append(f"[MARKDOWN]\n{source}")
        elif cell_type == "code":
            parts.append(f"[CODE]\n{source}")
    return "\n\n".join(parts)