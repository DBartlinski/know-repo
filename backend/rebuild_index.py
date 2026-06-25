import sqlite3
import os

# Drop and recreate the database
db_path = 'documents.db'
if os.path.exists(db_path):
    os.remove(db_path)
    print(f"Deleted old {db_path}")

from indexer import init_db, run_index
init_db()
print("Database initialized with correct schema")

result = run_index()
print(f"Reindex complete: {result}")

# Test the FTS table
c = sqlite3.connect(db_path)
test = c.execute("SELECT COUNT(*) FROM documents_fts").fetchone()[0]
c.close()
print(f"FTS5 table contains {test} rows")
