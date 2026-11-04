from pydantic import BaseModel, Field, HttpUrl


class NormalizedSource(BaseModel):
    source_type: str
    title: str
    url: str
    excerpt: str = ""
    published_at: str | None = None
    author: str | None = None
    platform: str | None = None
    metadata: dict = Field(default_factory=dict)


class PerspectiveAnnotation(BaseModel):
    stance: str = "unclear"
    sentiment: str = "unclear"
    perception_theme: str = "unclear"
    target_entity: str = "humanoid/social robotics"
    evidence_excerpt: str = ""
    confidence: float = 0.5
    method: str = "rules_with_evidence"


class SubmissionForm(BaseModel):
    submission_type: str
    title: str
    url: HttpUrl | None = None
    notes: str = ""
    submitter_name: str = ""
    submitter_contact: str = ""
