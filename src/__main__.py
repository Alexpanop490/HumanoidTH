from youtube_converter import ingest_youtube


if __name__ == "__main__":
    query_text = "Thailand Humanoid robotics"

    print(f"กำลังค้นหาและดึงลิงก์ด้วยคำค้นหา: '{query_text}'...")
    result = ingest_youtube(query=query_text, limit=5)

    total_sources = result.get("sources", len(result.get("links", [])))
    print(f"\nดึงข้อมูลสำเร็จทั้งหมด {total_sources} รายการ:\n")

    for idx, item in enumerate(result.get("links", []), start=1):
        print(f"{idx}. {item.get('title', 'ไม่มีชื่อคลิป')}")
        print(f"   Link: {item.get('url', 'ไม่มีลิงก์')}")
        print(f"   Author: {item.get('author', 'ไม่ระบุผู้แต่ง')}\n")
