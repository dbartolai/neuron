from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
import os

security = HTTPBearer()

SUPABASE_PROJECT_ID = os.environ["SUPABASE_PROJECT_ID"]

SUPABASE_ISSUER = f"https://{SUPABASE_PROJECT_ID}.supabase.co/auth/v1"
SUPABASE_JWKS_URL = f"{SUPABASE_ISSUER}/certs"

jwks_client = PyJWKClient(SUPABASE_JWKS_URL)


def me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience="authenticated",
            issuer=SUPABASE_ISSUER,
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    return {
        "id": payload["sub"],
        "email": payload.get("email"),
        "role": payload.get("role", "authenticated"),
    }
