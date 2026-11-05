"""
YouTube Adapter Module
----------------------
โมดูลสำหรับดึงข้อมูลและลิงก์วิดีโอจาก YouTube ตามฟังก์ชันต้นฉบับ
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, List
from dotenv import load_dotenv
import httpx

# โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env.local
load_dotenv(dotenv_path="/home/bob/HumanoidTH/.env")


def get_settings():
    """ดึงการตั้งค่าและ API Key จาก Environment Variables"""
    class Settings:
        youtube_api_key = os.getenv("YOUTUBE_API_KEY")
    return Settings()


def ingest_youtube(query: str, limit: int = 25) -> Dict[str, Any]:
    """
    ฟังก์ชันต้นฉบับสำหรับดึงข้อมูลและส่งต่อลิงก์วิดีโอจาก YouTube API v3
    """
    key = get_settings().youtube_api_key
    if not key:
        print("[YouTubeAdapter Error] ไม่พบ YOUTUBE_API_KEY ในไฟล์ .env.local")
        return {"sources": 0, "links": [], "missing_keys": ["YOUTUBE_API_KEY"]}
    
    response = httpx.get(
        "https://www.googleapis.com/youtube/v3/search",
        params={
            "part": "snippet", 
            "q": query, 
            "type": "video", 
            "maxResults": min(limit, 50), 
            "videoDuration": "medium",  # กำหนดให้ดึงวิดีโอที่มีความยาวปานกลาง
            "key": key
        },
        timeout=20,
    )
    response.raise_for_status()
    
    count = 0
    video_links: List[Dict[str, Any]] = []
    
    for item in response.json().get("items", []):
        snippet = item.get("snippet", {})
        video_id = item.get("id", {}).get("videoId")
        
        if not video_id:
            continue
            
        source_data = {
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
            },
        }
        
        video_links.append(source_data)
        count += 1
        
    # ส่งต่อผลลัพธ์ในรูปแบบฟังก์ชัน (คืนค่าเป็นจำนวนและรายการลิงก์ทั้งหมด)
    return {
        "sources": count,
        "links": video_links
    }