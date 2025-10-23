"""Neo4j database connection and management."""

from typing import Optional
from contextlib import asynccontextmanager
from neo4j import GraphDatabase, AsyncGraphDatabase
from neo4j import AsyncDriver

from .config import settings


class Neo4jConnection:
    """Neo4j database connection manager."""

    def __init__(self):
        """Initialize the connection manager."""
        self._driver: Optional[AsyncDriver] = None

    async def connect(self):
        """Establish connection to Neo4j database."""
        if not self._driver:
            self._driver = AsyncGraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password),
                max_connection_lifetime=3600,
                max_connection_pool_size=50,
                connection_acquisition_timeout=60.0,
            )
            # Verify connectivity
            await self._driver.verify_connectivity()
            print(f"Connected to Neo4j at {settings.neo4j_uri}")

    async def close(self):
        """Close the database connection."""
        if self._driver:
            await self._driver.close()
            self._driver = None
            print("Closed Neo4j connection")

    @property
    def driver(self) -> AsyncDriver:
        """Get the Neo4j driver instance."""
        if not self._driver:
            raise RuntimeError("Database connection not established. Call connect() first.")
        return self._driver

    @asynccontextmanager
    async def session(self, database: str = "neo4j"):
        """Create a database session context manager."""
        async with self.driver.session(database=database) as session:
            yield session


# Global database instance
neo4j_db = Neo4jConnection()


async def get_db():
    """Dependency for getting database session."""
    async with neo4j_db.session() as session:
        yield session
