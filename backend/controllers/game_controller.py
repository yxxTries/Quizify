from schemas.game import GameResponse
from services.game_service import create_game, list_games, set_game_pinned, delete_game_for_user, update_game_category


def save_game(user_id: int, title: str, category: str, quiz: dict) -> GameResponse:
    game = create_game(user_id=user_id, title=title, category=category, quiz=quiz)
    return GameResponse.model_validate(game)


def get_games(user_id: int) -> list[GameResponse]:
    games = list_games(user_id=user_id)
    return [GameResponse.model_validate(item) for item in games]


def update_game_pin(user_id: int, game_id: int, pinned: bool) -> GameResponse:
    game = set_game_pinned(user_id=user_id, game_id=game_id, pinned=pinned)
    return GameResponse.model_validate(game)


def delete_user_game(user_id: int, game_id: int) -> None:
    delete_game_for_user(user_id=user_id, game_id=game_id)


def update_category(user_id: int, game_id: int, category: str) -> GameResponse:
    game = update_game_category(user_id=user_id, game_id=game_id, category=category)
    return GameResponse.model_validate(game)
