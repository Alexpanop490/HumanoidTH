ROBOT_TERMS = {
    "robot", "robotics", "humanoid", "android", "social robot", "service robot", "companion robot",
    "eldercare", "hospital robot", "หุ่นยนต์", "ดินสอ", "embodied ai", "hri", "telepresence"
}
THAILAND_TERMS = {"thailand", "thai", "bangkok", "chiang mai", "chulalongkorn", "mahidol", "ประเทศไทย", "ไทย", "กรุงเทพ"}
REJECT_TERMS = {"chatgpt", "chatbot only", "industrial arm"}


def classify_text(title: str, excerpt: str = "") -> dict:
    text = f"{title} {excerpt}".lower()
    robot_hit = any(term in text for term in ROBOT_TERMS)
    thailand_hit = any(term in text for term in THAILAND_TERMS)
    reject_hit = any(term in text for term in REJECT_TERMS) and not robot_hit
    if robot_hit and thailand_hit:
        return {"status": "accepted", "reason": "Robot/embodied-AI relevance with Thailand connection.", "confidence": 0.82}
    if reject_hit or (not robot_hit and not thailand_hit):
        return {"status": "rejected", "reason": "No clear humanoid/social robotics and Thailand connection.", "confidence": 0.74}
    return {"status": "uncertain", "reason": "Thin evidence; needs human review.", "confidence": 0.46}
