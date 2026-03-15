from neo4j import AsyncGraphDatabase
from app.config import settings


class Neo4jDB:
    _driver = None

    @classmethod
    async def get_driver(cls):
        if cls._driver is None:
            cls._driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            )
        return cls._driver

    @classmethod
    async def close(cls):
        if cls._driver:
            await cls._driver.close()
            cls._driver = None

    @classmethod
    async def execute_query(cls, query: str, params: dict = None):
        driver = await cls.get_driver()
        async with driver.session() as session:
            result = await session.run(query, params or {})
            return [record.data() async for record in result]

    @classmethod
    async def verify_connection(cls):
        try:
            await cls.execute_query("RETURN 1 AS ok")
            return True
        except Exception as e:
            raise ConnectionError(f"Neo4j 연결 실패: {e}")
