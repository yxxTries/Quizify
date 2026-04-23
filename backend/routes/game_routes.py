from fastapi import APIRouter

from controllers import game_controller
from middleware.auth_middleware import CurrentUser
from schemas.game import GameResponse, GamesListResponse, PinGameRequest, SaveGameRequest, ChangeGameCategoryRequest

router = APIRouter(prefix="/games", tags=["games"])


@router.get("", response_model=GamesListResponse)
def list_games(current_user: CurrentUser):
    games = game_controller.get_games(user_id=current_user["id"])
    return GamesListResponse(games=games)


@router.post("", response_model=GameResponse)
def create_game(request: SaveGameRequest, current_user: CurrentUser):
    return game_controller.save_game(
        user_id=current_user["id"],
        title=request.title,
        category=request.category,
        quiz=request.quiz,
    )


@router.patch("/{game_id}/pin", response_model=GameResponse)
def pin_game(game_id: int, request: PinGameRequest, current_user: CurrentUser):
    return game_controller.update_game_pin(user_id=current_user["id"], game_id=game_id, pinned=request.pinned)


@router.delete("/{game_id}")
def delete_game(game_id: int, current_user: CurrentUser):
    game_controller.delete_user_game(user_id=current_user["id"], game_id=game_id)
    return {"status": "success"}

@router.patch("/{game_id}/category", response_model=GameResponse)
def change_category(game_id: int, request: ChangeGameCategoryRequest, current_user: CurrentUser):
    return game_controller.update_category(user_id=current_user["id"], game_id=game_id, category=request.category)
