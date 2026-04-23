from schemas.game import DiscoverPostResponse
from services.discover_service import create_discover_post, delete_discover_post, list_discover_posts


def create_post(user_id: int, author: str, title: str, category: str, quiz: dict) -> DiscoverPostResponse:
    post = create_discover_post(user_id=user_id, author=author, title=title, category=category, quiz=quiz)
    return DiscoverPostResponse.model_validate(post)


def get_posts() -> list[DiscoverPostResponse]:
    posts = list_discover_posts()
    return [DiscoverPostResponse.model_validate(item) for item in posts]


def delete_post(user_id: int, post_id: int) -> None:
    delete_discover_post(user_id=user_id, post_id=post_id)
