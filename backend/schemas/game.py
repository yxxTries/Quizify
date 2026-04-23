from pydantic import BaseModel, Field


class SaveGameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=50)
    quiz: dict


class PinGameRequest(BaseModel):
    pinned: bool


class ChangeGameCategoryRequest(BaseModel):
    category: str = Field(min_length=1, max_length=50)


class DiscoverPostRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=50)
    quiz: dict


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


class DiscoverPostResponse(BaseModel):
    id: int
    user_id: int
    title: str
    category: str
    author: str
    plays: int
    rating: float
    difficulty: str
    estimated_time: str
    created_at: str
    updated_at: str
    questions_count: int
    quiz: dict


class DiscoverPostsListResponse(BaseModel):
    posts: list[DiscoverPostResponse]
