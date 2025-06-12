# models.py
from pydantic import BaseModel
from typing import Optional

# Pydantic model for a Page in the notebook
class PageBase(BaseModel):
    title: str
    content: str

# Model for creating a new page (inherits from PageBase)
class PageCreate(PageBase):
    pass

# Model for a Page as stored/retrieved, including its ID
class Page(PageBase):
    id: str

    class Config:
        from_attributes = True # updated from orm_mode = True
