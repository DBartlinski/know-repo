"""
Document corrections: manage manual document type overrides via CSV
"""

import csv
import io
import sqlite3
from datetime import datetime, timezone
from typing import Optional

from config import DB_PATH
from indexer import get_connection


def export_documents_csv() -> str:
    """Export all documents with their auto-detected and manual types as CSV."""
    if not DB_PATH.exists():
        return ""
    
    conn = get_connection()
    try:
        # Get all documents with their auto-detected types
        rows = conn.execute("""
            SELECT 
                d.id,
                d.filename,
                d.title,
                dt.doc_type as auto_type,
                COALESCE(dc.manual_type, '') as manual_type,
                COALESCE(dc.notes, '') as notes,
                COALESCE(dc.updated_at, '') as corrected_date
            FROM documents d
            LEFT JOIN document_types dt ON d.id = dt.doc_id
            LEFT JOIN document_corrections dc ON d.id = dc.doc_id
            ORDER BY d.filename
        """).fetchall()
    finally:
        conn.close()
    
    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "doc_id", "filename", "title", "auto_detected_type", 
        "manual_type", "notes", "corrected_date"
    ])
    
    for row in rows:
        writer.writerow([
            row["id"],
            row["filename"],
            row["title"],
            row["auto_type"],
            row["manual_type"],
            row["notes"],
            row["corrected_date"]
        ])
    
    return output.getvalue()


def import_corrections_csv(csv_content: str) -> dict:
    """Import corrections from CSV and update document_corrections table."""
    if not DB_PATH.exists():
        return {"error": "Database not found"}
    
    conn = get_connection()
    try:
        reader = csv.DictReader(io.StringIO(csv_content))
        updated = 0
        errors = []
        now = datetime.now(timezone.utc).isoformat()
        
        for row_num, row in enumerate(reader, start=2):  # Start at 2 (skip header)
            doc_id = row.get("doc_id", "").strip()
            manual_type = row.get("manual_type", "").strip()
            notes = row.get("notes", "").strip()
            
            if not doc_id:
                errors.append(f"Row {row_num}: Missing doc_id")
                continue
            
            # Check if document exists
            exists = conn.execute(
                "SELECT id FROM documents WHERE id = ?", (doc_id,)
            ).fetchone()
            
            if not exists:
                errors.append(f"Row {row_num}: Document {doc_id} not found")
                continue
            
            # Only update if manual_type is provided
            if manual_type:
                conn.execute(
                    """INSERT OR REPLACE INTO document_corrections 
                       (doc_id, manual_type, notes, updated_at) 
                       VALUES (?, ?, ?, ?)""",
                    (doc_id, manual_type, notes, now)
                )
                updated += 1
        
        conn.commit()
        
        return {
            "success": True,
            "updated": updated,
            "errors": errors
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()


def get_document_type_with_override(doc_id: str) -> str:
    """Get document type, using manual override if available."""
    if not DB_PATH.exists():
        return "Unknown"
    
    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT COALESCE(dc.manual_type, dt.doc_type, 'Other-Misc Documents') as doc_type
            FROM documents d
            LEFT JOIN document_corrections dc ON d.id = dc.doc_id
            LEFT JOIN document_types dt ON d.id = dt.doc_id
            WHERE d.id = ?
            LIMIT 1
        """, (doc_id,)).fetchone()
    finally:
        conn.close()
    
    return row["doc_type"] if row else "Unknown"
