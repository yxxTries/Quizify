from schemas.game import GameResponse
from services.game_service import create_game, list_games, set_game_pinned


def save_game(user_id: int, title: str, category: str, quiz: dict) -> GameResponse:
    game = create_game(user_id=user_id, title=title, category=category, quiz=quiz)
    return GameResponse.model_validate(game)


def get_games(user_id: int) -> list[GameResponse]:
    games = list_games(user_id=user_id)
    return [GameResponse.model_validate(item) for item in games]


def update_game_pin(user_id: int, game_id: int, pinned: bool) -> GameResponse:
    game = set_game_pinned(user_id=user_id, game_id=game_id, pinned=pinned)
    return GameResponse.model_validate(game)
