from pydantic import BaseModel, Field


class SaveGameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=50)
    quiz: dict


class PinGameRequest(BaseModel):
    pinned: bool


class GameResponse(BaseModel):
    id: int
    title: str
    category: str
    plays: int
    pinned: bool
    updated_at: str
    questions_count: int
    quiz: dict


class GamesListResponse(BaseModel):
    games: list[GameResponse]
