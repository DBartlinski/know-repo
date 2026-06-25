import os
from pathlib import Path

# Path to the document library folder.
# Set the DOC_FOLDER environment variable to override, e.g.:
#   $env:DOC_FOLDER = "C:\path\to\your\documents"
DOC_FOLDER = Path(os.environ.get("DOC_FOLDER", r"C:\Users\vhacobartld\VS Code\RFIs\RFI-Docs"))

# SQLite database path (relative to this file's directory)
DB_PATH = Path(__file__).parent / "documents.db"

# Supported file extensions for indexing
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".xlsx", ".xls"}

# Maximum number of search results to return
MAX_RESULTS = 50

# Snippet length in characters (context shown around matched text)
SNIPPET_LENGTH = 300

# Predefined topics (categories)
PREDEFINED_TOPICS = [
    "Animal Research",
    "Artificial Intelligence (AI)",
    "Budget",
    "Cannabis",
    "Centers",
    "Clinical Trials",
    "Community Care",
    "Congress",
    "COVID",
    "Enterprise Transformation",
    "General ORD",
    "Mental Health",
    "Mortality Data",
    "MVP",
    "NRAC",
    "Precision Oncology",
    "Psychedelics",
    "Rural Health",
    "Spinal Cord Injury (SCI)",
    "Suicide Prevention",
    "Traumatic Brain Injury (TBI)",
    "Technology Transfer Program",
    "Toxic Exposure - MERP",
    "VA Secretary",
    "VHA USH",
    "Women's Health – Maternity and Infertility",
]

# Predefined document types
PREDEFINED_DOCUMENT_TYPES = [
    "Briefing Papers - Congress",
    "Briefing Papers - VA-VHA",
    "Briefing Papers - Other",
    "Budget Justification",
    "GAO",
    "Mandated Congressional Reports",
    "News Articles",
    "Press Releases",
    "Publications-Studies",
    "RFA",
    "RFI - Congress",
    "Slide Presentations",
    "Talking Points - Congress",
    "Testimony - Congress Speeches",
    "Talking Points - VA-VHA",
    "Talking Points - Other",
    "Other-Misc Documents",
]

# Minimum document count for auto-discovered topics to display
TOPIC_MIN_COUNT = 8
