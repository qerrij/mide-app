from fastapi import HTTPException, status


class CustomHTTPException(HTTPException):
    def __init__(self, status_code: int, detail: str = None):
        super().__init__(status_code=status_code, detail=detail)


class UserAlreadyExistsException(CustomHTTPException):
    def __init__(self, detail: str = "User already exists"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class InvalidCredentialsException(CustomHTTPException):
    def __init__(self, detail: str = "Invalid username or password"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class InactiveUserException(CustomHTTPException):
    def __init__(self, detail: str = "Inactive user"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)