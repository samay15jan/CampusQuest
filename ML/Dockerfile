FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip && python -m pip install -r requirements.txt

COPY embedding.py ./embedding.py
COPY ml ./ml
COPY photos ./photos
COPY evaluation ./evaluation
COPY config ./config
COPY data ./data
COPY config/entrypoint.sh ./entrypoint.sh
RUN chmod 755 ./entrypoint.sh && mkdir -p /data

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
