import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.user import User
from app.dependencies.db import get_db
from uuid import UUID

security = HTTPBearer()

SUPABASE_PROJECT_ID = os.environ["SUPABASE_PROJECT_ID"]
SUPABASE_ISSUER = f"https://{SUPABASE_PROJECT_ID}.supabase.co/auth/v1"
SUPABASE_JWKS_URL = f"{SUPABASE_ISSUER}/.well-known/jwks.json"

jwks_client = PyJWKClient(SUPABASE_JWKS_URL)

def me(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            issuer=SUPABASE_ISSUER,
        )

    except (jwt.PyJWKClientError, jwt.InvalidTokenError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not verify token: {str(e)}",
        )


    return {
        "id": payload["sub"],
        "email": payload.get("email"),
        "role": payload.get("role", "authenticated"),
    }

async def require_admin(
    user: User = Depends(me),
    db = Depends(get_db),
) -> User:
    # Look up app role from your profiles table
    row = await db.fetchrow(
        "SELECT role FROM profiles WHERE id = $1",
        UUID(user["id"]),
    )

    if row is None or row["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return user
