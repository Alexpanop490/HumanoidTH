from humanoid_atlas.db.migrate import init_db
from humanoid_atlas.pipeline.graph_metrics import rebuild_graph_cache
from humanoid_atlas.pipeline.perception import annotate
from humanoid_atlas.pipeline.relevance import classify_text


def test_relevance_classifier_outputs_expected_states():
    assert classify_text("Dinsaw robot in Thailand hospital", "")["status"] == "accepted"
    assert classify_text("Generic cloud chatbot launch", "")["status"] == "rejected"
    assert classify_text("AI robot", "")["status"] == "uncertain"


def test_perspective_abstains_on_thin_evidence():
    result = annotate("", "")
    assert result.method == "abstain_thin_evidence"
    assert result.confidence < 0.3


def test_graph_empty_state():
    init_db()
    graph = rebuild_graph_cache()
    assert graph["node_count"] == 0
    assert graph["edge_count"] == 0
