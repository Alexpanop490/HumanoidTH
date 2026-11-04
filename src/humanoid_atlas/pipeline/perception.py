from humanoid_atlas.models import PerspectiveAnnotation


THEME_RULES = [
    ("job_displacement", ["replace jobs", "job", "แรงงาน", "ตกงาน"]),
    ("healthcare_and_eldercare_trust", ["hospital", "elder", "care", "ผู้สูงอายุ", "โรงพยาบาล"]),
    ("education_and_learning", ["school", "student", "education", "university", "เรียน"]),
    ("privacy_and_surveillance", ["privacy", "surveillance", "camera", "ข้อมูลส่วนตัว"]),
    ("safety_and_reliability", ["safe", "reliability", "risk", "accident", "ปลอดภัย"]),
    ("national_innovation", ["innovation", "startup", "thai-made", "national", "นวัตกรรม"]),
    ("entertainment_and_novelty", ["festival", "expo", "demo", "cute", "show", "นิทรรศการ"]),
]
POSITIVE = ["help", "benefit", "support", "innovation", "assist", "improve", "ช่วย", "ดี"]
NEGATIVE = ["risk", "replace", "concern", "privacy", "unsafe", "expensive", "กังวล", "แพง"]


def annotate(title: str, excerpt: str) -> PerspectiveAnnotation:
    text = f"{title} {excerpt}".lower()
    if len(text.strip()) < 20:
        return PerspectiveAnnotation(confidence=0.2, method="abstain_thin_evidence")
    theme = "unclear"
    for candidate, terms in THEME_RULES:
        if any(term in text for term in terms):
            theme = candidate
            break
    pos = any(term in text for term in POSITIVE)
    neg = any(term in text for term in NEGATIVE)
    sentiment = "mixed" if pos and neg else "positive" if pos else "negative" if neg else "neutral"
    stance = "cautious_supportive" if pos and neg else "supportive" if pos else "skeptical" if neg else "neutral"
    confidence = 0.72 if theme != "unclear" else 0.45
    evidence = excerpt[:240] or title[:240]
    return PerspectiveAnnotation(
        stance=stance,
        sentiment=sentiment,
        perception_theme=theme,
        target_entity="humanoid/social robots in Thailand",
        evidence_excerpt=evidence,
        confidence=confidence,
    )
