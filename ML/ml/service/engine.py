"""Model and gallery lifecycle for the inference API."""
from __future__ import annotations

from pathlib import Path
import threading
from typing import Any

import numpy as np

from embedding import create_encoder, load_gallery, l2_normalize, predict_image


class RecognitionEngine:
    def __init__(self, model: Any, gallery: dict[str, Any], min_similarity: float, min_margin: float):
        self.model = model
        self.gallery = gallery
        self.min_similarity = min_similarity
        self.min_margin = min_margin
        self._model_lock = threading.Lock()

    @classmethod
    def load(cls, gallery_path: str | Path, *, min_similarity: float, min_margin: float) -> "RecognitionEngine":
        path = Path(gallery_path)
        if not path.is_file():
            raise FileNotFoundError(f"Gallery file is missing: {path}")
        gallery = load_gallery(path)
        embeddings = np.asarray(gallery.get("embeddings"), dtype=np.float32)
        labels = np.asarray(gallery.get("labels"))
        if embeddings.ndim != 2 or not len(embeddings) or len(embeddings) != len(labels):
            raise ValueError("Gallery has invalid or empty embeddings/labels")
        if not np.isfinite(embeddings).all():
            raise ValueError("Gallery embeddings contain non-finite values")
        if not len(labels) or any(not str(label).strip() for label in labels):
            raise ValueError("Gallery labels are empty or invalid")
        gallery["embeddings"] = l2_normalize(embeddings)
        gallery["labels"] = labels.astype(str)
        model = create_encoder(weights="imagenet")
        if embeddings.shape[1] != int(model.output_shape[-1]):
            raise ValueError("Gallery embedding size does not match the configured encoder")
        return cls(model, gallery, min_similarity, min_margin)

    def predict(self, image_bytes: bytes) -> dict[str, Any]:
        with self._model_lock:
            return predict_image(
                self.model,
                self.gallery,
                image_bytes,
                min_similarity=self.min_similarity,
                min_margin=self.min_margin,
                top_k=3,
            )
