from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    app_crypto_key: str
    jwt_minutos: int = 60
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()