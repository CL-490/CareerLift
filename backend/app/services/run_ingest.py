import asyncio
from backend.app.services.job_ingest import JobIngest

async def main():
    count = await JobIngest.ingest_jobs("Software Engineer")
    print("Inserted Job:", count)
if __name__ == "__main__":
    asyncio.run(main())