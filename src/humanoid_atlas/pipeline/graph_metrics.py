import json

import networkx as nx

from humanoid_atlas.db.repos import now
from humanoid_atlas.db.session import connect


def rebuild_graph_cache() -> dict:
    graph = nx.Graph()
    with connect() as conn:
        for row in conn.execute("SELECT subject, relation, object, confidence FROM triplets"):
            graph.add_edge(row["subject"], row["object"], relation=row["relation"], confidence=row["confidence"])
        payload = {
            "node_count": graph.number_of_nodes(),
            "edge_count": graph.number_of_edges(),
            "components": nx.number_connected_components(graph) if graph.number_of_nodes() else 0,
            "top_nodes": sorted(nx.degree_centrality(graph).items(), key=lambda x: x[1], reverse=True)[:10] if graph.number_of_nodes() else [],
        }
        conn.execute(
            "INSERT OR REPLACE INTO stats_cache(key,value_json,updated_at) VALUES(?,?,?)",
            ("graph_summary", json.dumps(payload), now()),
        )
    return payload
