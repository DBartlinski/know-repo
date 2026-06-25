"""
Search module: runs BM25-ranked FTS5 queries against the document index
and returns results with contextual snippets.
"""

import re
import sqlite3
from typing import Optional

from config import DB_PATH, MAX_RESULTS, SNIPPET_LENGTH, PREDEFINED_TOPICS, TOPIC_MIN_COUNT
from indexer import get_connection


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

_STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "has", "he", "in", "is", "it", "its", "of", "on", "or", "that",
    "the", "to", "was", "were", "will", "with", "i", "we", "you",
    "this", "have", "had", "not", "but", "they", "their", "been",
    "do", "does", "did", "our", "can", "would", "could", "should",
}


def _tokenize_query(query: str) -> list[str]:
    """Extract meaningful tokens from a free-text query."""
    tokens = re.findall(r"\b[a-zA-Z0-9''-]+\b", query.lower())
    return [t for t in tokens if t not in _STOP_WORDS and len(t) > 1]


def _build_fts5_query(tokens: list[str]) -> str:
    """
    Build an FTS5 query string.
    Uses OR-matching so partial results are returned; BM25 ranking handles
    relevance ordering. Each token is quoted to avoid FTS5 syntax errors.
    """
    escaped = [f'"{t}"' for t in tokens]
    return " OR ".join(escaped)


def _make_snippet(content: str, tokens: list[str], length: int = SNIPPET_LENGTH) -> str:
    """
    Extract a contextual snippet from content around the first token match.
    Returns a plain-text excerpt.
    """
    if not content or not tokens:
        return content[:length] if content else ""

    lower = content.lower()
    best_pos = len(content)
    for token in tokens:
        idx = lower.find(token)
        if idx != -1 and idx < best_pos:
            best_pos = idx

    if best_pos == len(content):
        return content[:length]

    half = length // 2
    start = max(0, best_pos - half)
    end = min(len(content), best_pos + half)
    snippet = content[start:end].strip()
    if start > 0:
        snippet = "…" + snippet
    if end < len(content):
        snippet = snippet + "…"
    return snippet


# ---------------------------------------------------------------------------
# Main search function
# ---------------------------------------------------------------------------

def search_documents(
    query: Optional[str] = None,
    limit: int = MAX_RESULTS,
    topic_filter: Optional[str] = None,
    doc_type_filter: Optional[str] = None,
) -> list[dict]:
    """
    Search the indexed documents using FTS5 BM25 ranking, or by filters only if no query.
    
    Args:
        query: Optional search query string (None for filter-only results)
        limit: Maximum number of results to return
        topic_filter: Optional topic name to filter results
        doc_type_filter: Optional document type to filter results
    
    Returns a list of result dicts ordered by relevance (or filename if no query):
        id, filename, filepath, filetype, title, author, filesize,
        indexed_at, score, snippet
    """
    if not DB_PATH.exists():
        return []

    tokens = _tokenize_query(query) if query else []
    if not tokens and not topic_filter and not doc_type_filter:
        return []  # No query tokens and no filters

    fts_query = _build_fts5_query(tokens) if tokens else None

    conn = get_connection()
    try:
        if fts_query:
            # Build FTS5 query with optional filters
            sql = """
                SELECT DISTINCT
                    d.id,
                    d.filename,
                    d.filepath,
                    d.filetype,
                    d.title,
                    d.author,
                    d.filesize,
                    d.indexed_at,
                    bm25(documents_fts) AS score,
                    f.content
                FROM documents_fts f
                JOIN documents d ON d.id = f.doc_id
            """
            
            params = [fts_query]
            if topic_filter:
                sql += " JOIN document_topics dt ON d.id = dt.doc_id"
                params.append(topic_filter)
            if doc_type_filter:
                sql += " JOIN document_types dty ON d.id = dty.doc_id"
                params.append(doc_type_filter)
            
            where_parts = ["documents_fts MATCH ?"]
            if topic_filter:
                where_parts.append("dt.topic = ?")
            if doc_type_filter:
                where_parts.append("dty.doc_type = ?")
            
            sql += " WHERE " + " AND ".join(where_parts)
            sql += " ORDER BY score LIMIT ?"
            params.append(limit * 2)
            
            rows = conn.execute(sql, params).fetchall()
        else:
            # Filter-only query (no FTS5 search)
            sql = """
                SELECT DISTINCT
                    d.id,
                    d.filename,
                    d.filepath,
                    d.filetype,
                    d.title,
                    d.author,
                    d.filesize,
                    d.indexed_at,
                    0 AS score,
                    '' AS content
                FROM documents d
            """
            
            params = []
            where_parts = []
            
            if topic_filter:
                sql += " JOIN document_topics dt ON d.id = dt.doc_id"
                where_parts.append("dt.topic = ?")
                params.append(topic_filter)
            
            if doc_type_filter:
                sql += " JOIN document_types dty ON d.id = dty.doc_id"
                where_parts.append("dty.doc_type = ?")
                params.append(doc_type_filter)
            
            if where_parts:
                sql += " WHERE " + " AND ".join(where_parts)
            
            sql += " ORDER BY d.filename LIMIT ?"
            params.append(limit * 2)
            
            rows = conn.execute(sql, params).fetchall()
    except sqlite3.OperationalError:
        return []
    finally:
        conn.close()

    results = []
    seen_ids = set()
    for row in rows:
        doc_id = row["id"]
        # Skip if already added (keep first/best result per document)
        if doc_id in seen_ids:
            continue
        seen_ids.add(doc_id)
        
        results.append({
            "id": doc_id,
            "filename": row["filename"],
            "filepath": row["filepath"],
            "filetype": row["filetype"],
            "title": row["title"] or row["filename"],
            "author": row["author"] or "",
            "filesize": row["filesize"],
            "indexed_at": row["indexed_at"],
            "score": abs(row["score"]),
            "snippet": _make_snippet(row["content"] or "", tokens),
            "query_tokens": tokens,
        })
        
        # Stop when we have enough unique documents
        if len(results) >= limit:
            break

    return results


def get_document_by_id(doc_id: str) -> Optional[dict]:
    """Return metadata for a single document by its ID."""
    if not DB_PATH.exists():
        return None
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, filename, filepath, filetype, title, author, filesize, indexed_at FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
    finally:
        conn.close()

    if not row:
        return None
    return dict(row)


def get_all_topics(doc_type_filter: Optional[str] = None) -> list[dict]:
    """
    Return all topics with their document counts, sorted by count descending.
    Only includes: predefined topics + auto-discovered topics with count >= TOPIC_MIN_COUNT.
    If doc_type_filter is provided, counts reflect documents in that doc_type only.
    """
    if not DB_PATH.exists():
        return []
    conn = get_connection()
    try:
        if doc_type_filter:
            # Count documents per topic that also have the specified doc_type
            rows = conn.execute(
                """
                SELECT dt.topic, COUNT(DISTINCT dt.doc_id) as count
                FROM document_topics dt
                JOIN document_types dty ON dt.doc_id = dty.doc_id
                WHERE dty.doc_type = ?
                GROUP BY dt.topic
                ORDER BY count DESC
                """,
                (doc_type_filter,)
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT topic, COUNT(DISTINCT doc_id) as count
                FROM document_topics
                GROUP BY topic
                ORDER BY count DESC
                """
            ).fetchall()
    except sqlite3.OperationalError:
        return []
    finally:
        conn.close()
    
    # Filter: include all predefined topics + discovered topics with sufficient count
    predefined_set = set(PREDEFINED_TOPICS)
    results = []
    for row in rows:
        topic_name = row["topic"]
        count = row["count"]
        # Include if predefined OR count >= minimum threshold
        if topic_name in predefined_set or count >= TOPIC_MIN_COUNT:
            results.append({"name": topic_name, "count": count})
    
    return results


def get_all_document_types(topic_filter: Optional[str] = None) -> list[dict]:
    """Return all document types with their document counts, sorted by count descending.
    If topic_filter is provided, counts reflect documents in that topic only.
    """
    if not DB_PATH.exists():
        return []
    conn = get_connection()
    try:
        if topic_filter:
            # Count documents per doc_type that also have the specified topic
            rows = conn.execute(
                """
                SELECT dty.doc_type, COUNT(DISTINCT dty.doc_id) as count
                FROM document_types dty
                JOIN document_topics dt ON dty.doc_id = dt.doc_id
                WHERE dt.topic = ?
                GROUP BY dty.doc_type
                ORDER BY count DESC
                """,
                (topic_filter,)
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT doc_type, COUNT(DISTINCT doc_id) as count
                FROM document_types
                GROUP BY doc_type
                ORDER BY count DESC
                """
            ).fetchall()
    except sqlite3.OperationalError:
        return []
    finally:
        conn.close()
    
    return [{"name": row["doc_type"], "count": row["count"]} for row in rows]


def last_index_time() -> Optional[str]:
    """Return the timestamp of the most recent index run, or None."""
    if not DB_PATH.exists():
        return None
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT ran_at FROM index_log ORDER BY ran_at DESC LIMIT 1"
        ).fetchone()
    except sqlite3.OperationalError:
        return None
    finally:
        conn.close()
    return row["ran_at"] if row else None
