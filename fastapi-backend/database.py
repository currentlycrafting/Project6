# database.py
import sqlite3
from typing import List, Optional
from models import Page, PageCreate # Import Page and PageCreate
import uuid
import os

# Define the path for the SQLite database file
DATABASE_FILE = "notebook.db" # Changed database file name

def get_db_connection():
    """Establishes and returns a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row  # This allows accessing columns by name
    return conn

def create_table():
    """Creates the 'pages' table if it doesn't already exist."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pages (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL
            )
        """)
        conn.commit()
    finally:
        conn.close()

# --- Database Operations ---

def create_page_db_internal(page_title: str, page_content: str) -> Page:
    """
    Internal function to create a page, used by both API and seeding.
    Commits the transaction.
    """
    conn = get_db_connection()
    new_id = str(uuid.uuid4())
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO pages (id, title, content) VALUES (?, ?, ?)",
            (new_id, page_title, page_content)
        )
        conn.commit()
        return Page(id=new_id, title=page_title, content=page_content)
    finally:
        conn.close()

def seed_database():
    """Seeds the database with initial data if it's empty."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM pages")
        count = cursor.fetchone()[0]
        if count == 0:
            print("Seeding database with initial pages...")
            create_page_db_internal("Welcome to your Notebook", "This is your first page! You can add new pages, edit existing ones, or delete them. Explore the tabs above!")
            create_page_db_internal("My Daily Thoughts", "Today was a productive day. I managed to finish all my tasks before noon. Feeling good!")
            create_page_db_internal("Grocery List", "Milk, Eggs, Bread, Butter, Coffee, Apples, Bananas")
            print("Database seeded.")
    finally:
        conn.close()


# Call create_table and seed_database when database.py is imported
create_table()
seed_database()


def get_all_pages() -> List[Page]:
    """Retrieves all pages from the database."""
    conn = get_db_connection()
    pages = []
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, content FROM pages ORDER BY title COLLATE NOCASE") # Order by title for consistency
        for row in cursor.fetchall():
            pages.append(Page(id=row['id'], title=row['title'], content=row['content']))
    finally:
        conn.close()
    return pages

def get_page_by_id(page_id: str) -> Optional[Page]:
    """Retrieves a single page by its ID."""
    conn = get_db_connection()
    page = None
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, content FROM pages WHERE id = ?", (page_id,))
        row = cursor.fetchone()
        if row:
            page = Page(id=row['id'], title=row['title'], content=row['content'])
    finally:
        conn.close()
    return page

def create_page_db(page_data: PageCreate) -> Page:
    """Creates a new page from a PageCreate model."""
    return create_page_db_internal(page_data.title, page_data.content)


def update_page_db(page_id: str, new_title: str, new_content: str) -> Optional[Page]:
    """Updates the title and content of an existing page by ID."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE pages SET title = ?, content = ? WHERE id = ?",
            (new_title, new_content, page_id)
        )
        conn.commit()
        if cursor.rowcount > 0: # Check if any row was updated
            return Page(id=page_id, title=new_title, content=new_content) # Return the updated page
        return None # Page not found
    finally:
        conn.close()

def delete_page_db(page_id: str) -> bool:
    """Deletes a page from the database by ID. Returns True if deleted, False if not found."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM pages WHERE id = ?", (page_id,))
        conn.commit()
        return cursor.rowcount > 0 # True if a row was deleted, False otherwise
    finally:
        conn.close()