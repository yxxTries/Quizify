from fastapi import APIRouter, Depends

from controllers import discover_controller
from middleware.auth_middleware import CurrentUser
from middleware.rate_limit import rate_limit
from schemas.game import DiscoverPostRequest, DiscoverPostResponse, DiscoverPostsListResponse

router = APIRouter(prefix="/discover", tags=["discover"])


@router.get("", response_model=DiscoverPostsListResponse)
def list_discover_posts():
    posts = discover_controller.get_posts()
    return DiscoverPostsListResponse(posts=posts)


@router.post(
    "",
    response_model=DiscoverPostResponse,
    dependencies=[Depends(rate_limit(limit=6, window_seconds=600))],
)
def create_discover_post(request: DiscoverPostRequest, current_user: CurrentUser):
    return discover_controller.create_post(
        user_id=current_user["id"],
        author=current_user["username"],
        title=request.title,
        category=request.category,
        quiz=request.quiz,
    )


@router.delete("/{post_id}")
def delete_discover_post(post_id: int, current_user: CurrentUser):
    discover_controller.delete_post(user_id=current_user["id"], post_id=post_id)
    return {"status": "success"}
