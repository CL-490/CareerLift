"""Application configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application
    app_name: str = "CareerLift"
    app_version: str = "0.1.0"
    debug: bool = False

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password123"

    # Ollama
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "gpt-oss:20b-cloud"
    ollama_api_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Job Finder API Keys
    usajobs_api_key: str = ""
    usajobs_email: str = ""
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""


settings = Settings()
