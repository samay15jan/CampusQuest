"""Frozen EfficientNetV2 image embeddings and cosine-similarity gallery.

The model is a feature extractor only; the small dataset is not used to train a
neural network. Gallery files are references, and can be added at any time.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any
import io
import json

import numpy as np
from PIL import Image, ImageOps

IMG_SIZE = 224
UNKNOWN_LABEL = "_other"


def open_image(source: Any) -> Image.Image:
    """Open a path, bytes object, or PIL image as upright RGB."""
    if isinstance(source, Image.Image):
        return ImageOps.exif_transpose(source).convert("RGB")
    if isinstance(source, (bytes, bytearray)):
        source = io.BytesIO(source)
    with Image.open(source) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


def load_image(source: Any, size: int = IMG_SIZE) -> np.ndarray:
    """Resize RGB pixels to EfficientNetV2's expected 0..255 float input."""
    image = open_image(source).resize((size, size), Image.Resampling.BILINEAR)
    return np.asarray(image, dtype=np.float32)


def l2_normalize(vectors: np.ndarray) -> np.ndarray:
    vectors = np.asarray(vectors, dtype=np.float32)
    if not np.isfinite(vectors).all():
        raise ValueError("Embeddings contain non-finite values")
    norms = np.linalg.norm(vectors, axis=-1, keepdims=True)
    if np.any(norms <= 1e-12):
        raise ValueError("Embeddings must have non-zero norm")
    return vectors / norms


def create_encoder(weights: str = "imagenet"):
    """Return a frozen EfficientNetV2B0 global-average-pooled encoder."""
    import tensorflow as tf

    base = tf.keras.applications.EfficientNetV2B0(
        include_top=False, weights=weights, pooling="avg", include_preprocessing=True
    )
    base.trainable = False
    return base


def embed_images(model: Any, images: list[Any] | tuple[Any, ...], batch_size: int = 32) -> np.ndarray:
    if not images:
        return np.empty((0, int(model.output_shape[-1])), dtype=np.float32)
    pixels = np.stack([load_image(item) for item in images])
    vectors = model.predict(pixels, batch_size=batch_size, verbose=0)
    return l2_normalize(vectors)


def build_gallery(model: Any, photos_dir: str | Path, batch_size: int = 32) -> dict[str, Any]:
    """Embed image files under photos_dir/<territory>/; ignore placeholder files."""
    root = Path(photos_dir)
    paths = sorted(p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    labels = [p.parent.name for p in paths]
    if not paths:
        raise ValueError(f"No supported images found under {root}")
    embeddings = embed_images(model, paths, batch_size=batch_size)
    return {"embeddings": embeddings, "labels": np.asarray(labels), "paths": [str(p) for p in paths]}


def predict_image(
    model: Any,
    gallery: dict[str, Any],
    image: Any,
    *,
    min_similarity: float = 0.65,
    min_margin: float = 0.04,
    top_k: int = 3,
    unknown_label: str = UNKNOWN_LABEL,
) -> dict[str, Any]:
    """Return top class mean-of-best-reference cosine scores and accept/reject.

    Similarity and margin are ranking signals, not calibrated probabilities.
    """
    vectors = np.asarray(gallery["embeddings"], dtype=np.float32)
    labels = np.asarray(gallery["labels"]).astype(str)
    if vectors.ndim != 2 or len(vectors) != len(labels) or not len(labels):
        raise ValueError("Gallery must contain matching non-empty 2D embeddings and labels")
    if not np.isfinite(vectors).all() or not labels.size or any(not label.strip() for label in labels):
        raise ValueError("Gallery contains invalid embeddings or labels")
    vectors = l2_normalize(vectors)
    query = embed_images(model, [image])[0]
    if query.ndim != 1 or vectors.shape[1] != query.shape[0]:
        raise ValueError("Query embedding does not match gallery dimensions")
    similarities = np.clip(vectors @ query, -1.0, 1.0)
    names = sorted(set(labels))
    scores = {}
    for name in names:
        class_sims = np.sort(similarities[labels == name])[::-1]
        scores[name] = float(np.mean(class_sims[: min(3, len(class_sims))]))
    ranked = sorted(scores, key=scores.get, reverse=True)
    best = ranked[0]
    second_score = scores[ranked[1]] if len(ranked) > 1 else -1.0
    margin = scores[best] - second_score
    accepted = best != unknown_label and scores[best] >= min_similarity and margin >= min_margin
    predictions = [{"label": name, "similarity": scores[name]} for name in ranked[: max(1, top_k)]]
    status = "matched" if accepted else ("unknown" if best == unknown_label else "uncertain")
    return {
        "predictedTerritory": best if accepted else None,
        "accepted": bool(accepted),
        "recognized": bool(accepted),
        "status": status,
        "message": "Territory matched" if accepted else ("Unknown location" if status == "unknown" else "Image match is uncertain"),
        "similarity": scores[best],
        "margin": float(margin),
        "predictions": predictions,
    }


def save_gallery(gallery: dict[str, Any], path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(path, embeddings=np.asarray(gallery["embeddings"], dtype=np.float32),
                        labels=np.asarray(gallery["labels"]).astype(str),
                        paths=np.asarray(gallery.get("paths", []), dtype=str))


def load_gallery(path: str | Path) -> dict[str, Any]:
    with np.load(path, allow_pickle=False) as data:
        return {"embeddings": data["embeddings"], "labels": data["labels"], "paths": data["paths"].tolist()}


def save_thresholds(path: str | Path, *, min_similarity: float, min_margin: float) -> None:
    Path(path).write_text(json.dumps({"min_similarity": min_similarity, "min_margin": min_margin}, indent=2), encoding="utf-8")
