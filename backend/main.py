"""
FastAPI backend for the PAO Document Search application.
"""

import logging
import mimetypes
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from config import DOC_FOLDER, MAX_RESULTS
from indexer import init_db, run_index
from search import get_document_by_id, last_index_time, search_documents, get_all_topics, get_all_document_types
from corrections import export_documents_csv, import_corrections_csv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PAO Document Search", version="1.0.0")

# Allow Vite dev server (port 5173) during development; tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Initialise database tables on startup
@app.on_event("startup")
def startup():
    init_db()
    logger.info("Database initialised. DOC_FOLDER: %s", DOC_FOLDER)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    query: str
    limit: int = MAX_RESULTS
    topic_filter: Optional[str] = None  # Optional topic name to filter results
    doc_type_filter: Optional[str] = None  # Optional document type to filter results


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.get("/api/status")
def status():
    return {
        "status": "ok",
        "doc_folder": str(DOC_FOLDER),
        "doc_folder_exists": DOC_FOLDER.exists(),
        "last_indexed": last_index_time(),
    }


@app.post("/api/index")
def trigger_index(background_tasks: BackgroundTasks):
    """
    Kick off a document index run. Runs in the background so the HTTP response
    returns immediately; poll /api/status for the updated last_indexed timestamp.
    """
    if not DOC_FOLDER.exists():
        raise HTTPException(
            status_code=400,
            detail=f"DOC_FOLDER does not exist: {DOC_FOLDER}. "
                   "Set the DOC_FOLDER environment variable to the correct path.",
        )
    background_tasks.add_task(_run_index_task)
    return {"message": "Indexing started", "doc_folder": str(DOC_FOLDER)}


def _run_index_task():
    try:
        result = run_index()
        logger.info("Background index finished: %s", result)
    except Exception as e:
        logger.error("Background index failed: %s", e)


@app.post("/api/search")
def search(req: SearchRequest):
    # Allow empty query if filters are provided, otherwise require query
    has_filters = req.topic_filter or req.doc_type_filter
    if not req.query.strip() and not has_filters:
        raise HTTPException(status_code=400, detail="Provide a query or select filters.")
    
    results = search_documents(
        query=req.query.strip() if req.query.strip() else None,
        limit=req.limit,
        topic_filter=req.topic_filter,
        doc_type_filter=req.doc_type_filter,
    )
    return {"query": req.query or "", "total": len(results), "results": results}


@app.get("/api/topics")
def get_topics(doc_type_filter: Optional[str] = None):
    """Return all available topics/categories with document counts.
    If doc_type_filter is provided, counts are filtered to that document type only.
    """
    topics = get_all_topics(doc_type_filter=doc_type_filter)
    return {"topics": topics}


@app.get("/api/document-types")
def get_document_types(topic_filter: Optional[str] = None):
    """Return all available document types with document counts.
    If topic_filter is provided, counts are filtered to that topic only.
    """
    doc_types = get_all_document_types(topic_filter=topic_filter)
    return {"doc_types": doc_types}


@app.get("/api/export-corrections")
def export_corrections():
    """Export all documents with current and manual types as CSV."""
    csv_content = export_documents_csv()
    if not csv_content:
        raise HTTPException(status_code=500, detail="Failed to export documents")
    
    return {
        "filename": "document_corrections.csv",
        "content": csv_content
    }


class CorrectionsImport(BaseModel):
    file_content: str


@app.post("/api/import-corrections")
def import_corrections(data: CorrectionsImport):
    """Import corrected document types from CSV."""
    result = import_corrections_csv(data.file_content)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/api/document/{doc_id}")
def document_meta(doc_id: str):
    doc = get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@app.get("/api/preview/{doc_id}")
def preview(doc_id: str):
    """Serve the raw document file for in-browser rendering."""
    doc = get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    file_path = Path(doc["filepath"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File no longer exists on disk.")

    # Ensure the file is within DOC_FOLDER to prevent path traversal
    try:
        file_path.resolve().relative_to(DOC_FOLDER.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied.")

    media_type, _ = mimetypes.guess_type(str(file_path))
    if media_type is None:
        media_type = "application/octet-stream"

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=file_path.name,
    )


# ---------------------------------------------------------------------------
# Serve built React frontend (production)
# ---------------------------------------------------------------------------
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")
