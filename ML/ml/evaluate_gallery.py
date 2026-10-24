"""Evaluate the gallery against the campus dataset's held-out validation photos.

The validation photos are kept outside ``photos/`` so they cannot leak into the
reference gallery. This small split is a diagnostic, not a reliable accuracy
estimate for every CampusQuest territory or real-world camera condition.
"""
from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from embedding import create_encoder, load_gallery, predict_image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--labels", type=Path, default=ROOT / "evaluation" / "campus_dataset" / "labels.csv")
    parser.add_argument("--gallery", type=Path, default=ROOT / "data" / "gallery.npz")
    parser.add_argument("--min-similarity", type=float, default=0.65)
    parser.add_argument("--min-margin", type=float, default=0.04)
    args = parser.parse_args()
    if not args.labels.is_file():
        raise SystemExit(f"Validation labels not found: {args.labels}")
    if not args.gallery.is_file():
        raise SystemExit(f"Gallery not found: {args.gallery}; build it before evaluation.")

    model = create_encoder(weights="imagenet")
    gallery = load_gallery(args.gallery)
    rows = list(csv.DictReader(args.labels.open(newline="", encoding="utf-8")))
    if not rows:
        raise SystemExit("Validation set is empty.")

    total = top1 = top3 = accepted = accepted_correct = 0
    class_stats: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    score_sum = 0.0
    for row in rows:
        image_path = ROOT / row["path"]
        if not image_path.is_file():
            raise SystemExit(f"Validation image is missing: {image_path}")
        expected = row["label"]
        result = predict_image(
            model,
            gallery,
            image_path,
            min_similarity=args.min_similarity,
            min_margin=args.min_margin,
            top_k=3,
        )
        ranked = [item["label"] for item in result["predictions"]]
        correct = bool(ranked and ranked[0] == expected)
        total += 1
        top1 += int(correct)
        top3 += int(expected in ranked)
        score_sum += float(result["similarity"])
        class_stats[expected][0] += int(correct)
        class_stats[expected][1] += 1
        if result["accepted"]:
            accepted += 1
            accepted_correct += int(result["predictedTerritory"] == expected)
        print(
            f"expected={expected}\tpredicted={result['predictedTerritory'] or 'REJECT'}"
            f"\ttop1={ranked[0] if ranked else 'NONE'}\tsimilarity={result['similarity']:.3f}"
        )

    print(f"\nTop-1 correct: {top1}/{total} ({top1 / total:.1%})")
    print(f"Top-3 contains correct label: {top3}/{total} ({top3 / total:.1%})")
    print(f"Mean best-class similarity: {score_sum / total:.3f} (not accuracy or probability)")
    print(f"Accepted by current thresholds: {accepted}/{total} ({accepted / total:.1%})")
    if accepted:
        print(f"Correct among accepted: {accepted_correct}/{accepted} ({accepted_correct / accepted:.1%})")
    print("\nPer-label top-1:")
    for label, (hits, count) in sorted(class_stats.items()):
        print(f"  {label}: {hits}/{count} ({hits / count:.1%})")
    print("\nThis set has only 15 photos; use the numbers for diagnosis, not as a production accuracy claim.")


if __name__ == "__main__":
    main()
