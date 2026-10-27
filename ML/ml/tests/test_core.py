from __future__ import annotations

from io import BytesIO
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

from embedding import l2_normalize, predict_image
from ml.build_gallery import collect_paths
from ml.service.validation import ImageInputError, validate_image_bytes


def jpeg_bytes(color=(120, 50, 30)) -> bytes:
    output = BytesIO()
    Image.new("RGB", (64, 64), color).save(output, format="JPEG")
    return output.getvalue()


class FixedEncoder:
    def predict(self, pixels, batch_size=32, verbose=0):
        return np.tile(np.array([[1.0, 0.0]], dtype=np.float32), (len(pixels), 1))


class PredictionTests(unittest.TestCase):
    def test_confident_match_is_accepted_with_top_matches(self):
        gallery = {
            "embeddings": np.array([[1.0, 0.0], [0.98, 0.2], [0.0, 1.0]], dtype=np.float32),
            "labels": np.array(["Library", "Library", "Helipad"]),
            "paths": [],
        }
        result = predict_image(FixedEncoder(), gallery, jpeg_bytes(), min_similarity=0.65, min_margin=0.04)
        self.assertTrue(result["accepted"])
        self.assertEqual(result["predictedTerritory"], "Library")
        self.assertEqual(len(result["predictions"]), 2)
        self.assertGreater(result["similarity"], 0.9)

    def test_unfamiliar_image_is_rejected_by_similarity_threshold(self):
        gallery = {"embeddings": np.array([[0.0, 1.0], [-1.0, 0.0]], dtype=np.float32),
                   "labels": np.array(["Helipad", "Library"]), "paths": []}
        result = predict_image(FixedEncoder(), gallery, jpeg_bytes(), min_similarity=0.65, min_margin=0.04)
        self.assertFalse(result["accepted"])
        self.assertIsNone(result["predictedTerritory"])

    def test_close_runner_up_is_rejected_by_margin(self):
        gallery = {"embeddings": np.array([[1.0, 0.0], [0.999, 0.045]], dtype=np.float32),
                   "labels": np.array(["Library", "Helipad"]), "paths": []}
        result = predict_image(FixedEncoder(), gallery, jpeg_bytes(), min_similarity=0.65, min_margin=0.04)
        self.assertFalse(result["accepted"])

    def test_other_class_is_never_returned_as_a_recognized_territory(self):
        gallery = {"embeddings": np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32),
                   "labels": np.array(["_other", "Library"]), "paths": []}
        result = predict_image(FixedEncoder(), gallery, jpeg_bytes(), min_similarity=0.65, min_margin=0.04)
        self.assertFalse(result["accepted"])
        self.assertIsNone(result["predictedTerritory"])
        self.assertEqual(result["status"], "unknown")

    def test_similarity_uses_normalized_gallery_vectors(self):
        gallery = {"embeddings": np.array([[50.0, 0.0], [0.0, 4.0]], dtype=np.float32),
                   "labels": np.array(["Library", "Helipad"]), "paths": []}
        result = predict_image(FixedEncoder(), gallery, jpeg_bytes(), min_similarity=0.65, min_margin=0.04)
        self.assertLessEqual(result["similarity"], 1.0)
        self.assertAlmostEqual(result["similarity"], 1.0, places=6)

    def test_zero_embedding_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "non-zero norm"):
            l2_normalize(np.zeros((1, 2), dtype=np.float32))


class UploadValidationTests(unittest.TestCase):
    def test_valid_jpeg_passes(self):
        payload = jpeg_bytes()
        self.assertEqual(validate_image_bytes(payload, "image/jpeg"), payload)

    def test_rejects_type_mismatch_and_non_image(self):
        with self.assertRaisesRegex(ImageInputError, "declared content type"):
            validate_image_bytes(jpeg_bytes(), "image/png")
        with self.assertRaisesRegex(ImageInputError, "not a safe"):
            validate_image_bytes(b"not an image", "image/jpeg")

    def test_rejects_oversized_body(self):
        with self.assertRaisesRegex(ImageInputError, "limit") as error:
            validate_image_bytes(jpeg_bytes(), "image/jpeg", max_bytes=10)
        self.assertEqual(error.exception.status_code, 413)

    def test_rejects_excessive_pixel_dimensions(self):
        with self.assertRaisesRegex(ImageInputError, "pixel limit") as error:
            validate_image_bytes(jpeg_bytes(), "image/jpeg", max_pixels=100)
        self.assertEqual(error.exception.status_code, 413)


class GallerySelectionTests(unittest.TestCase):
    def test_exclusion_manifest_omits_reviewed_bad_references(self):
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as temp:
            root = Path(temp)
            (root / "Library").mkdir()
            (root / "Library" / "one.jpg").write_bytes(jpeg_bytes())
            (root / "Library" / "two.jpg").write_bytes(jpeg_bytes())
            found = collect_paths(root, {"Library/two.jpg"})
            self.assertEqual([p.name for p in found], ["one.jpg"])


if __name__ == "__main__":
    unittest.main()
