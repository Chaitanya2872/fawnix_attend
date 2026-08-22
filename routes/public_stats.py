"""
Public (unauthenticated) marketing statistics endpoint.

This blueprint intentionally has NO auth decorators: it only ever returns
company-wide aggregates produced by services.public_stats_service, which is
built to be PII-free (no names, no emails, no per-employee rows).

It powers the live counters on the public marketing surfaces:
  - /            (overview / home page)
  - /product-tour
  - the admin login "preview" card

Contract:
  GET /api/public/stats           -> cached aggregate snapshot (60s TTL)
  GET /api/public/stats?refresh=1 -> bypass the cache once

The response is always HTTP 200 with a `success` envelope. If the database is
unreachable the payload contains {"available": false}, letting the frontend
fall back to its static copy instead of showing an error state.
"""

import logging

from flask import Blueprint, jsonify, request

from services.public_stats_service import get_public_stats

logger = logging.getLogger(__name__)

public_stats_bp = Blueprint("public_stats", __name__)

_TRUTHY = {"1", "true", "yes", "on"}


@public_stats_bp.route("/stats", methods=["GET"])
def public_stats():
    """Return cached, aggregate-only workforce stats for public pages."""
    force_refresh = str(request.args.get("refresh", "")).strip().lower() in _TRUTHY

    try:
        payload = get_public_stats(force_refresh=force_refresh)
    except Exception as exc:  # pragma: no cover - defensive, service never raises
        logger.warning("public stats endpoint failed: %s", exc)
        payload = {
            "available": False,
            "message": "Live metrics are temporarily unavailable",
        }

    response = jsonify({"success": True, "data": payload})

    # Let browsers/CDNs hold the snapshot briefly; matches the service TTL.
    cache_seconds = int(payload.get("cache_seconds") or 60)
    if payload.get("available"):
        response.headers["Cache-Control"] = f"public, max-age={cache_seconds}"
    else:
        response.headers["Cache-Control"] = "no-store"

    return response, 200


@public_stats_bp.route("/health", methods=["GET"])
def public_stats_health():
    """Tiny liveness probe for the public surface."""
    payload = get_public_stats()
    return (
        jsonify(
            {
                "success": True,
                "data": {
                    "available": bool(payload.get("available")),
                    "generated_at": payload.get("generated_at"),
                    "stale": bool(payload.get("stale")),
                },
            }
        ),
        200,
    )
