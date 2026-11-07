from youtube_converter import ingest_youtube
import yt_dlp

if __name__ == "__main__":
    # กำหนด Query แบบเดียวกับต้นฉบับ
    query_text = "Thailand Humanoid robotics"
    
    print(f"กำลังค้นหาและดึงลิงก์ด้วยคำค้นหา: '{query_text}'...")
    result = ingest_youtube(query=query_text, limit=5)
    
    # ดึงจำนวนรายการอย่างปลอดภัย ถ้าไม่มีคีย์ 'sources' ให้แสดงตามจำนวนของลิงก์ในลิสต์แทน
    total_sources = result.get('sources', len(result.get('links', [])))
    
    print(f"\nดึงข้อมูลสำเร็จทั้งหมด {total_sources} รายการ:\n")
    
    # วนลูปดึงข้อมูลจากลิสต์ในคีย์ 'links'
    for idx, item in enumerate(result.get("links", []), start=1):
        print(f"{idx}. {item.get('title', 'ไม่มีชื่อคลิป')}")
        print(f"   Link: {item.get('url', 'ไม่มีลิงก์')}")
        print(f"   Author: {item.get('author', 'ไม่ระบุผู้แต่ง')}\n")

        Youtube_url = item.get('url','ไม่มีลิงก์')
        
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]/best[ext=mp4]/best',
            'merge_output_fomat': 'mp4',
            'outtmpl':'videos/%(title)s.%(ext)s',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([Youtube_url])
from youtube_converter import ingest_youtube
import yt_dlp

if __name__ == "__main__":
    # กำหนด Query แบบเดียวกับต้นฉบับ
    query_text = "Thailand Humanoid robotics"
    
    print(f"กำลังค้นหาและดึงลิงก์ด้วยคำค้นหา: '{query_text}'...")
    result = ingest_youtube(query=query_text, limit=5)
    
    # ดึงจำนวนรายการอย่างปลอดภัย ถ้าไม่มีคีย์ 'sources' ให้แสดงตามจำนวนของลิงก์ในลิสต์แทน
    total_sources = result.get('sources', len(result.get('links', [])))
    
    print(f"\nดึงข้อมูลสำเร็จทั้งหมด {total_sources} รายการ:\n")
    
    # วนลูปดึงข้อมูลจากลิสต์ในคีย์ 'links'
    for idx, item in enumerate(result.get("links", []), start=1):
        print(f"{idx}. {item.get('title', 'ไม่มีชื่อคลิป')}")
        print(f"   Link: {item.get('url', 'ไม่มีลิงก์')}")
        print(f"   Author: {item.get('author', 'ไม่ระบุผู้แต่ง')}\n")

        Youtube_url = item.get('url','ไม่มีลิงก์')
        