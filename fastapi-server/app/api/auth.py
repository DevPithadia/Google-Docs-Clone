from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.core import security
from app.core.config import settings
from app.schemas.user import User as UserSchema

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    idToken: str

@router.post("/google")
async def google_auth(
    auth_req: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    print("GOOGLE_CLIENT_ID =", settings.GOOGLE_CLIENT_ID)
    print("TOKEN EXISTS =", bool(auth_req.idToken))
    print("REQUEST BODY TOKEN =", auth_req.idToken)
    try:
        # Verify Google ID token
        # This preserves existing frontend compatibility
        idinfo = id_token.verify_oauth2_token(
            auth_req.idToken, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        print("IDINFO =", idinfo)

        # Extract user info from Google payload
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')

        # Find existing user by googleId
        user = db.query(User).filter(User.googleId == google_id).first()

        # If user does not exist, create a new one
        if not user:
            user = User(
                googleId=google_id,
                email=email,
                name=name,
                picture=picture
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Generate JWT token using existing logic
        access_token = security.create_access_token(subject=user.id)

        # Return token and user data in existing response structure
        return {
            "token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.picture,
            }
        }

    except ValueError:
        # Invalid token
        print("VALUE ERROR")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )
    except Exception as e:
        print(f"Google auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )
