# CampusQuest Image Recognition Product

This ZIP contains a separately runnable, authenticated image-recognition service and a Node.js ES module client adapter. The service predicts which **populated reference-photo territory** best matches an uploaded image. It does not authenticate players, check GPS, grant resonators, score the game, deploy to a territory, or make any final game decision.

## Backend integration

This repository includes the CampusQuest Fastify backend and the private Python recognition service. The backend calls `POST /v1/predict` with raw image bytes and a bearer token after its existing player and GPS checks. It only approves capture when the service accepts a prediction, the predicted territory matches the selected portal (including the two reviewed aliases), and the backend threshold passes. An unavailable service or unmatched territory fails closed. The model does not authenticate players, check GPS, grant resonators, or make the final game decision.

Run the integrated stack from `backend/` after copying `.env.example` to `.env` and setting a private `INFERENCE_API_TOKEN`. Docker Compose starts the API, PostgreSQL, and recognition service on a private network; the model/gallery build can take several minutes the first time. Do not expose the recognition port or share its token with the frontend.

The current dataset is small and has no `_other` reference photos, so unknown-place rejection is not yet validated against realistic negative images. The score and margin are ranking signals, not probabilities. Do not claim a target accuracy until independent held-out photos and campus-negative examples have been collected and evaluated.

## What the supplied dataset contains

The original set has 26 photos in 8 populated folders: H Block Centre (5), Helipad (5), Gate 2A (4), Library (3), Bank (3), Megabyte (2), Raras Foodtruck (2), and Sports Complex Room (2). A second supplied dataset adds 53 training photos across 10 source labels. Its 15 validation photos are stored separately under `evaluation/campus_dataset/` and are never included in the reference gallery.

Only clear name matches were merged: `central_library` into `Library`, `megabite` into `Megabyte`, and `raras` into `Raras Foodtruck`. The remaining source labels (`e2_block`, `e3_block`, `f2_block`, `i2_block`, `j3_block`, `k2_block`, and `wall_street`) stay as separate gallery labels. The mapping is recorded in `config/campus_dataset_label_mapping.json`. Before backend integration, the backend owner must confirm that those seven names correspond to real game territories and map them to the backend's territory IDs; the ML service returns labels and cannot create game territories by itself.

Three visibly problematic reference photos are excluded by default in `config/gallery_exclude.txt`:

- `H Block Centre/H_Block_Centre_01.jpg` is a three-panel collage.
- `Bank/Bank_02.jpg` shows HDFC Bank, while the other two Bank photos show Indian Bank.
- `Helipad/Helipad_05.jpg` is a text-bearing aerial/screenshot-like image unlike the other references.

After the three existing exclusions, the gallery starts with 23 original references and adds 53 training references (76 total). The new dataset's validation split has only 15 images, so its results are useful for spotting obvious problems but are not a reliable accuracy estimate for every territory. The old labels have no held-out validation photos, and `_other` still has no examples. Similarity and margin are ranking signals, not real-world probabilities. For a stronger evaluation, collect varied phone photos across separate capture sessions, keep entire sessions out of the gallery, and collect campus-negative images for `_other`.

The ZIP includes these provided campus reference photos because they are required to generate a working gallery. Review and replace them if they should not be distributed. Do not upload personal/identifying images. Generated gallery embeddings are kept in a Docker volume and are not included in the ZIP.

## Run locally with Docker

Requirements: Docker Desktop with Docker Compose, and internet access on the first start to download EfficientNetV2B0 ImageNet weights. The model weights and built gallery are not bundled. The first container startup builds the gallery from the bundled photos and persists it in the `gallery-data` volume; later startups reuse it.

1. Extract `CampusQuest_ImageRecognition_Product.zip`.
2. In the extracted folder, copy `.env.example` to `.env`.
3. Replace `INFERENCE_API_TOKEN` with a long random secret. On Windows PowerShell, generate one with `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Keep it only in backend/service configuration; never send it to a player.
4. Start the service from that folder:

   ```powershell
   docker compose up --build -d
   ```

5. Wait for gallery generation and check readiness:

   ```powershell
   Invoke-RestMethod http://127.0.0.1:8000/healthz
   Invoke-RestMethod http://127.0.0.1:8000/readyz
   ```

   `/healthz` is a liveness check. `/readyz` returns HTTP 200 only when a gallery/model and API token are configured. On first startup, watch progress with `docker compose logs -f`.

6. Test a photo (use the exact token value from `.env`):

   ```powershell
   curl.exe -X POST "http://127.0.0.1:8000/v1/predict" `
     -H "Authorization: Bearer YOUR_TOKEN_HERE" `
     -H "Content-Type: image/jpeg" `
     --data-binary "@photos/Library/Library_01.jpg"
   ```

   A response contains `predictedTerritory` (or `null` when rejected), `accepted`, `similarity`, `margin`, and up to three `{label, similarity}` predictions. This example photo is in the gallery, so it demonstrates the API only; it is not a held-out performance test.

To stop the service, run `docker compose down`. To rebuild the gallery after changing references, run `docker compose down`, then `docker compose run --rm --entrypoint python campusquest-recognition -m ml.build_gallery --photos /app/photos --output /data/gallery.npz --exclude-file /app/config/gallery_exclude.txt`, then `docker compose up -d`. To force a full gallery rebuild, remove the `gallery-data` volume only if you intentionally want to discard the generated embeddings; the source photos are separate.

## API

`POST /v1/predict` accepts **raw image bytes** (not multipart form data) with `Content-Type: image/jpeg`, `image/png`, or `image/webp` and an `Authorization: Bearer <secret>` header. Maximum upload is 8 MiB by default; the decoded image must be at most 20 megapixels. The service checks token, media type, image decode, file size, and image dimensions. It returns structured JSON and does not log image bytes.

Example accepted result:

```json
{
  "predictedTerritory": "Library",
  "accepted": true,
  "similarity": 0.82,
  "margin": 0.14,
  "predictions": [
    {"label": "Library", "similarity": 0.82},
    {"label": "H Block Centre", "similarity": 0.68},
    {"label": "Helipad", "similarity": 0.41}
  ]
}
```

Values above are illustrative. The implementation never hardcodes prediction values. If the score or separation is insufficient, `accepted` is false and `predictedTerritory` is `null`. Default score/margin thresholds are configurable in `.env`, but they are **unvalidated starting values**, not calibrated confidence cutoffs. Calibrate using independent target photos and realistic negative images before use.

## Backend request path

The backend integration is implemented in `backend/src/matcher/` and `backend/src/services/resonatorService.js`. The matcher sends raw image bytes to the ML service with the bearer token. The route forwards the actual JPEG/PNG/WebP MIME type. `resonatorService` keeps authentication, GPS checks, score thresholding, territory-name matching, and deployment approval on the server. Docker Compose attaches API and model containers to the same private network and does not publish the model port.

Use the two explicit label aliases in `backend/src/matcher/labels.js` only. Labels not known to match backend portal names fail closed until the team confirms their mapping. The dependency-free `integration/image-recognition-client.mjs` remains a standalone example client; the backend uses its own authenticated matcher adapter.

## Evaluate the added dataset

The `evaluation/campus_dataset/labels.csv` file points to the 15 held-out validation photos. They are deliberately outside `photos/`; do not copy them into the gallery. After starting the Docker service and building the updated gallery, run:

```powershell
docker compose run --rm --entrypoint python campusquest-recognition -m ml.evaluate_gallery --gallery /data/gallery.npz
```

The report shows top-1 and top-3 results, rejection coverage at the configured thresholds, and the mean similarity score. A similarity such as `0.60` is not 60% accuracy or a 60% probability. Do not lower the rejection threshold just to raise that score; evaluate false accepts and missed matches on more independent photos first.

## Gallery updates

Add genuine photos to `photos/<Exact Territory Name>/`, clean the source labels, then rebuild the gallery. Empty directories do not create model classes. Review the exclusion manifest before changing it. Pretrained EfficientNetV2B0 remains frozen; the added photos expand the reference gallery, they do not fine-tune model weights. The build script downloads ImageNet weights if they are not already cached and outputs `gallery.npz` plus a manifest. Do not mix photos from different buildings in one label.

## Tests

Run the ML unit suite with Python 3.11 and Node.js 22 or later:

```powershell
python -m pip install -r requirements-test.txt
python -m unittest discover -s ml/tests -v
node --test integration/image-recognition-client.test.mjs
```

The repository also has focused backend tests for the explicit territory aliases. The database-backed end-to-end suite was not run as part of this change because it wipes its configured test database; set up a dedicated database whose name ends in `_test` before running it. Unit tests do not establish real-world model accuracy; use independent photos and negative examples for that.

## Troubleshooting

- **`/readyz` says gallery/model is missing:** inspect `docker compose logs -f`. First startup needs internet access to fetch model weights. Check disk space and the `gallery-data` volume.
- **401 from `/v1/predict`:** use `Authorization: Bearer <INFERENCE_API_TOKEN>` and verify the backend has the same secret.
- **415 or 422:** send raw JPEG/PNG/WebP bytes and the matching `Content-Type`; do not send multipart form data or a browser upload wrapper.
- **413:** reduce the image size or deliberately adjust `MAX_IMAGE_BYTES` / the pixel limit in service code.
- **Slow first start:** initial model download and gallery embedding are CPU/GPU dependent. Later starts reuse the volume.
- **Unknown/rejected output:** the current dataset is tiny, several territories are empty, and no `_other` negatives exist. Rejection is expected for uncertain images. Add clean real references and collect held-out examples before adjusting thresholds.
- **Recognition service unavailable from backend container:** `127.0.0.1` inside a container refers to that same container. Use the service DNS name on a shared private Docker network.
