"""
YouTube Adapter Module
----------------------
โมดูลสำหรับค้นหาและดึงลิงก์วิดีโอจาก YouTube Data API v3 
โดยดึง API Key จากไฟล์ .env.local และคืนค่าผลลัพธ์ในรูปแบบ Dictionary/List
"""

import os
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
import httpx

# โหลดตัวแปรสภาพแวดล้อมจาก .env.local เมื่อเรียกใช้ module
load_dotenv(dotenv_path=".env.local")


class YouTubeAdapter:
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize YouTube Adapter
        :param api_key: หากไม่ใส่ จะดึงค่า YOUTUBE_API_KEY จาก .env.local เองอัตโนมัติ
        """
        self.api_key = api_key or os.getenv("YOUTUBE_API_KEY")
        self.search_endpoint = "https://www.googleapis.com/youtube/v3/search"

    def fetch_video_links(self, query: str, limit: int = 25) -> Dict[str, Any]:
        """
        ค้นหาวิดีโอตามคำค้นหา (Query) แล้วคืนค่าข้อมูลลิงก์และเมตาดาต้า
        
        :param query: คำค้นหาวิดีโอ
        :param limit: จำนวนวิดีโอสูงสุดที่ต้องการดึง (สูงสุด 50)
        :return: Dict ที่มีโครงสร้าง {'sources': int, 'links': List[Dict]}
        """
        if not self.api_key:
            print("[YouTubeAdapter Error] ไม่พบ YOUTUBE_API_KEY ในไฟล์ .env.local")
            return {
                "sources": 0,
                "links": [],
                "error": "YOUTUBE_API_KEY_MISSING"
            }

        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": min(limit, 50),
            "key": self.api_key
        }

        try:
            response = httpx.get(self.search_endpoint, params=params, timeout=20)
            response.raise_for_status()
            data = response.json()

            video_sources: List[Dict[str, Any]] = []

            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                video_id = item.get("id", {}).get("videoId")

                if not video_id:
                    continue

                video_sources.append({
                    "source_type": "youtube",
                    "title": snippet.get("title") or "Untitled YouTube video",
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "excerpt": snippet.get("description") or "",
                    "published_at": snippet.get("publishedAt"),
                    "author": snippet.get("channelTitle"),
                    "platform": "youtube",
                    "metadata": {
                        "query": query,
                        "fetched_at": datetime.now(timezone.utc).isoformat()
                    }
                })

            return {
                "sources": len(video_sources),
                "links": video_sources
            }

        except httpx.HTTPStatusError as e:
            print(f"[YouTubeAdapter Error] HTTP Status Error: {e}")
            return {"sources": 0, "links": [], "error": str(e)}
        except Exception as e:
            print(f"[YouTubeAdapter Error] Unexpected Error: {e}")
            return {"sources": 0, "links": [], "error": str(e)}


# Convenience Function สำหรับเรียกใช้โดยตรงแบบไม่ต้องสร้าง Class instance เอง
def ingest_youtube(query: str, limit: int = 25) -> Dict[str, Any]:
    adapter = YouTubeAdapter()
    return adapter.fetch_video_links(query=query, limit=limit)