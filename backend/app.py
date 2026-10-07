"""Local EMA production studio. Metadata in SQLite, source media stays immutable."""

from __future__ import annotations
import contextlib
import hashlib
import io
import json
import logging
import math
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tempfile
import threading
import time
import uuid
import wave
import zipfile
from datetime import datetime, timezone
from typing import Literal

import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, model_validator
from PIL import Image, UnidentifiedImageError
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("EMA_DATA_DIR", ROOT / "data")).resolve()
for directory in ["audio", "media", "renders", "manifests"]:
    (DATA / directory).mkdir(parents=True, exist_ok=True)
DB = DATA / "studio.sqlite3"
LOCK = threading.RLock()
STOP = threading.Event()
RENDER_PROCESS = None
RATES = (48000, 24000, 16000, 8000)
MODEL = {
    "status": "loading",
    "device": os.environ.get("EMA_DEVICE", "cpu"),
    "error": None,
}
LOG = logging.getLogger("ema-studio")


def now():
    return datetime.now(timezone.utc).isoformat()


def uid():
    return uuid.uuid4().hex


def query(sql, args=(), *, one=False):
    with LOCK, sqlite3.connect(DB, timeout=30) as conn:
        conn.row_factory = sqlite3.Row
        result = conn.execute(sql, args)
        rows = result.fetchall()
        return (dict(rows[0]) if rows else None) if one else [dict(r) for r in rows]


def init_db():
    with LOCK, sqlite3.connect(DB) as conn:
        conn.executescript("""
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS takes(id TEXT PRIMARY KEY, project_id TEXT, paragraph_id TEXT, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY, project_id TEXT, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, project_id TEXT, kind TEXT, status TEXT, created_at TEXT, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
        INSERT OR IGNORE INTO settings VALUES('paused','false');
        """)
        # Do not pretend partially completed work finished or silently rerun it.
        rows = conn.execute(
            "SELECT id,data FROM jobs WHERE status='running'"
        ).fetchall()
        for job_id, raw in rows:
            data = json.loads(raw)
            data.update(
                status="interrupted",
                error="Servis yeniden başlatıldı. İşi yeniden deneyebilirsiniz.",
            )
            conn.execute(
                "UPDATE jobs SET status=?,data=? WHERE id=?",
                ("interrupted", json.dumps(data), job_id),
            )


init_db()


def raw_project(pid):
    row = query("SELECT data FROM projects WHERE id=?", (pid,), one=True)
    if not row:
        raise HTTPException(404, "Proje bulunamadı.")
    return json.loads(row["data"])


def require_idle_project(pid):
    if query(
        "SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')",
        (pid,),
        one=True,
    ):
        raise HTTPException(
            409,
            "Bu projede bekleyen veya çalışan işler var. "
            "Silmeden önce bekleyen işleri iptal edin ve çalışan işlerin "
            "tamamlanmasını bekleyin.",
        )


@contextlib.contextmanager
def staged_deletion(paths):
    """Hold stored files until the metadata transaction commits; restore on error."""
    staging = None
    moved = []
    restored = True
    try:
        staging = Path(tempfile.mkdtemp(prefix=".delete-", dir=DATA))
        for path in paths:
            if not path.exists() and not path.is_symlink():
                continue
            if path.is_dir():
                raise OSError("Expected a stored file, found a directory")
            target = staging / path.relative_to(DATA)
            target.parent.mkdir(parents=True, exist_ok=True)
            path.rename(target)
            moved.append((path, target))
        yield
    except BaseException as exc:
        LOG.exception("Deletion failed; restoring stored files")
        for path, target in reversed(moved):
            try:
                target.rename(path)
            except OSError:
                # Preserve this directory if restore itself fails; never discard
                # the only remaining copy of a file whose DB record still exists.
                restored = False
                LOG.exception("File restore failed; retained staging: %s", staging)
        if isinstance(exc, OSError):
            raise HTTPException(
                500,
                "Dosyalar silinemedi. Veri klasörünün erişim izinlerini kontrol edip "
                "yeniden deneyin.",
            ) from exc
        if isinstance(exc, sqlite3.Error):
            raise HTTPException(
                500, "Proje kayıtları silinemedi. Yeniden deneyin."
            ) from exc
        raise
    finally:
        if staging and restored:
            try:
                shutil.rmtree(staging)
            except OSError:
                # Once committed, cleanup errors must not resurrect DB records.
                LOG.exception("Deletion staging cleanup failed: %s", staging)


def save_project(project):
    project["updated_at"] = now()
    query(
        "INSERT OR REPLACE INTO projects VALUES(?,?)",
        (project["id"], json.dumps(project, ensure_ascii=False)),
    )


def effective(project, paragraph):
    settings = {
        k: paragraph.get(k) if paragraph.get(k) is not None else project[k]
        for k in ["speed", "seed", "sample_rate"]
    }
    if paragraph.get("seed_mode") == "random":
        settings["seed"] = None
    if paragraph.get("seed_mode") == "fixed":
        settings["seed"] = paragraph.get("seed") or 0
    return settings


def fingerprint(text, settings):
    return hashlib.sha256(
        json.dumps(
            {"text": text.strip(), **settings}, sort_keys=True, ensure_ascii=False
        ).encode()
    ).hexdigest()


def project_view(pid):
    with LOCK:
        project = raw_project(pid)
        takes = [
            json.loads(r["data"])
            for r in query("SELECT data FROM takes WHERE project_id=?", (pid,))
        ]
        jobs = [
            json.loads(r["data"])
            for r in query(
                "SELECT data FROM jobs WHERE project_id=? ORDER BY created_at DESC",
                (pid,),
            )
        ]
        assets = [
            json.loads(r["data"])
            for r in query("SELECT data FROM assets WHERE project_id=?", (pid,))
        ]
        for paragraph in project["paragraphs"]:
            paragraph["takes"] = [
                t for t in takes if t["paragraph_id"] == paragraph["id"]
            ]
            chosen = next(
                (
                    t
                    for t in paragraph["takes"]
                    if t["id"] == paragraph.get("selected_take")
                ),
                None,
            )
            paragraph["stale"] = bool(
                chosen
                and chosen["fingerprint"]
                != fingerprint(paragraph["text"], effective(project, paragraph))
            )
            active = next(
                (
                    j
                    for j in jobs
                    if j.get("paragraph_id") == paragraph["id"]
                    and j["status"] in ["queued", "running"]
                ),
                None,
            )
            # Jobs are newest first: surface a failed/interrupted generation
            # until a newer take exists for the paragraph.
            latest = next(
                (j for j in jobs if j.get("paragraph_id") == paragraph["id"]), None
            )
            newest_take = max((t["created_at"] for t in paragraph["takes"]), default="")
            failed = (
                latest
                if latest
                and latest["status"] in ["failed", "interrupted"]
                and latest["created_at"] > newest_take
                else None
            )
            paragraph["error"] = failed.get("error") if failed else None
            paragraph["status"] = (
                active["status"]
                if active
                else failed["status"]
                if failed
                else ("stale" if paragraph["stale"] else "ready" if chosen else "empty")
            )
        project.update(assets=assets, jobs=jobs, all_takes=takes)
        return project


class Settings(BaseModel):
    speed: float = Field(default=1, ge=0.25, le=4, allow_inf_nan=False)
    seed: int | None = Field(default=None, ge=0, le=2**53 - 1)
    sample_rate: Literal[48000, 24000, 16000, 8000] = 48000


class NewProject(BaseModel):
    name: str = Field(default="İsimsiz proje", min_length=1, max_length=120)
    text: str = Field(default="", max_length=200000)


class ProjectPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    speed: float | None = Field(default=None, ge=0.25, le=4, allow_inf_nan=False)
    seed: int | None = Field(default=None, ge=0, le=2**53 - 1)
    sample_rate: Literal[48000, 24000, 16000, 8000] | None = None


class ParagraphPatch(BaseModel):
    seed_mode: Literal["inherit", "random", "fixed"] | None = None
    text: str | None = Field(default=None, max_length=20000)
    speed: float | None = Field(default=None, ge=0.25, le=4, allow_inf_nan=False)
    seed: int | None = Field(default=None, ge=0, le=2**53 - 1)
    sample_rate: Literal[48000, 24000, 16000, 8000] | None = None
    selected_take: str | None = None


class Texts(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def limit(self):
        if any(len(t) > 20000 for t in self.texts):
            raise ValueError("Bir paragraf en fazla 20.000 karakter olabilir.")
        return self


class Reorder(BaseModel):
    ids: list[str]


class Generate(BaseModel):
    ids: list[str] | None = None
    missing_only: bool = False


class Clip(BaseModel):
    id: str
    source_id: str
    kind: Literal["audio", "image", "video"]
    label: str = Field(max_length=160)
    start: float = Field(ge=0, le=7200, allow_inf_nan=False)
    trim: float = Field(default=0, ge=0, allow_inf_nan=False)
    # At least one 30 fps frame, so preview/render never get an empty range.
    duration: float = Field(ge=1 / 30, le=7200, allow_inf_nan=False)
    volume: float = Field(default=1, ge=0, le=2, allow_inf_nan=False)
    fit: Literal["cover", "contain"] = "cover"


class Timeline(BaseModel):
    aspect: Literal["16:9", "9:16"] = "16:9"
    clips: list[Clip] = Field(default_factory=list, max_length=500)


class QueueControl(BaseModel):
    paused: bool


def paragraph_by_id(project, paragraph_id):
    p = next((p for p in project["paragraphs"] if p["id"] == paragraph_id), None)
    if not p:
        raise HTTPException(404, "Paragraf bulunamadı.")
    return p


def new_paragraph(text):
    return {
        "id": uid(),
        "text": text,
        "speed": None,
        "seed": None,
        "sample_rate": None,
        "selected_take": None,
    }


def source(pid, source_id, kind):
    table = "takes" if kind == "audio" else "assets"
    row = query(
        f"SELECT data FROM {table} WHERE id=? AND project_id=?",
        (source_id, pid),
        one=True,
    )
    if not row:
        raise HTTPException(400, "Montaj kaynağı bu projede bulunamadı.")
    item = json.loads(row["data"])
    if kind != "audio" and item["kind"] != kind:
        raise HTTPException(400, "Medya türü uyuşmuyor.")
    return item


def validate_timeline(pid, timeline):
    seen = set()
    for clip in timeline.clips:
        if clip.id in seen:
            raise HTTPException(400, "Klip kimlikleri benzersiz olmalı.")
        seen.add(clip.id)
        item = source(pid, clip.source_id, clip.kind)
        if clip.start + clip.duration > 7200:
            raise HTTPException(400, "Montaj en fazla iki saat olabilir.")
        if clip.kind != "image" and clip.trim + clip.duration > item["duration"] + 0.04:
            raise HTTPException(400, "Klip kaynak süresinin dışına taşıyor.")
    # One lane per media type; explicit gaps are allowed, overlaps are not.
    for audio in (True, False):
        clips = sorted(
            [c for c in timeline.clips if (c.kind == "audio") == audio],
            key=lambda c: c.start,
        )
        for a, b in zip(clips, clips[1:]):
            if a.start + a.duration > b.start + 0.02:
                raise HTTPException(400, "Aynı kanalda klipler üst üste gelemez.")


def update_job(job, **values):
    job.update(values)
    query(
        "INSERT OR REPLACE INTO jobs VALUES(?,?,?,?,?,?)",
        (
            job["id"],
            job["project_id"],
            job["kind"],
            job["status"],
            job["created_at"],
            json.dumps(job, ensure_ascii=False),
        ),
    )


def job_by_id(jid):
    row = query("SELECT data FROM jobs WHERE id=?", (jid,), one=True)
    if not row:
        raise HTTPException(404, "İş bulunamadı.")
    return json.loads(row["data"])


def create_job(pid, kind, **values):
    job = {
        "id": uid(),
        "project_id": pid,
        "kind": kind,
        "status": "queued",
        "created_at": now(),
        "progress": 0,
        "error": None,
        **values,
    }
    update_job(job)
    return job


def wav_bytes(audio, rate):
    result = io.BytesIO()
    with wave.open(result, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        out.writeframes((np.clip(audio, -1, 1) * 32767).round().astype("<i2").tobytes())
    return result.getvalue()


def read_wav(path, rate):
    with wave.open(str(path), "rb") as w:
        audio = (
            np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32)
            / 32768
        )
        old_rate = w.getframerate()
    if old_rate != rate:
        divisor = math.gcd(old_rate, rate)
        audio = resample_poly(audio, rate // divisor, old_rate // divisor)
    return audio


def synthesize(tts, job):
    start = time.perf_counter()
    s = tts.say(job["text"], **job["settings"])
    if not len(s.audio):
        raise RuntimeError("Bu metinden ses üretilemedi. Metni kontrol edin.")
    take_id = uid()
    path = DATA / "audio" / f"{take_id}.wav"
    path.write_bytes(wav_bytes(s.audio, s.sample_rate))
    blocks = np.array_split(s.audio, min(100, len(s.audio)))
    peaks = [round(float(np.max(np.abs(a))), 4) for a in blocks]
    take = {
        "id": take_id,
        "paragraph_id": job["paragraph_id"],
        "text": job["text"],
        "settings": job["settings"],
        "seed": s.seed,
        "duration": s.duration,
        "sample_rate": s.sample_rate,
        "fingerprint": job["fingerprint"],
        "created_at": now(),
        "generation_seconds": round(time.perf_counter() - start, 3),
        "url": f"/api/files/audio/{take_id}.wav",
        "peaks": peaks,
    }
    with LOCK:
        query(
            "INSERT INTO takes VALUES(?,?,?,?)",
            (
                take_id,
                job["project_id"],
                job["paragraph_id"],
                json.dumps(take, ensure_ascii=False),
            ),
        )
        p = raw_project(job["project_id"])
        paragraph = next(
            (p for p in p["paragraphs"] if p["id"] == job["paragraph_id"]), None
        )
        if (
            paragraph
            and fingerprint(paragraph["text"], effective(p, paragraph))
            == job["fingerprint"]
        ):
            paragraph["selected_take"] = take_id
            save_project(p)
        update_job(
            job, status="completed", progress=1, take_id=take_id, finished_at=now()
        )


def render(job):
    global RENDER_PROCESS
    manifest = DATA / "manifests" / f"{job['id']}.json"
    output = DATA / "renders" / f"{job['id']}.mp4"
    manifest.write_text(json.dumps(job["composition"]))
    command = [
        os.environ.get("EMA_NODE_BINARY") or shutil.which("node") or "node",
        str(ROOT / "scripts/render.mjs"),
        str(manifest),
        str(output),
    ]
    proc = subprocess.Popen(
        command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    RENDER_PROCESS = proc
    tail = []
    try:
        for line in proc.stdout:
            tail.append(line.strip())
            tail = tail[-20:]
            try:
                event = json.loads(line)
                if "progress" in event:
                    update_job(job, progress=event["progress"])
            except (ValueError, TypeError):
                pass
        if proc.wait() != 0:
            (DATA / "manifests" / f"{job['id']}.log").write_text("\n".join(tail))
            raise RuntimeError(
                "Render başarısız. Kurulumdaki render tarayıcısını ve medya dosyalarını kontrol edin. Ayrıntılar yerel manifests klasöründeki iş günlüğünde."
            )
        if not output.is_file():
            raise RuntimeError("Render dosyası oluşturulamadı.")
        update_job(
            job,
            status="completed",
            progress=1,
            url=f"/api/files/renders/{job['id']}.mp4",
            finished_at=now(),
        )
    finally:
        RENDER_PROCESS = None
        if proc.poll() is None:
            proc.terminate()
            proc.wait(timeout=10)


def load_model():
    MODEL.update(status="loading", error=None)
    from ema_lightning import EMA
    import torch

    torch.set_num_threads(min(8, os.cpu_count() or 4))
    tts = EMA(device=MODEL["device"])
    MODEL.update(status="ready", error=None)
    return tts


def next_job(model_ready):
    """Oldest queued job this worker can run now.

    Render jobs never need the model, so a failed model load must not block them.
    """
    kinds = "('tts','render')" if model_ready else "('render')"
    row = query(
        f"SELECT data FROM jobs WHERE status='queued' AND kind IN {kinds} "
        "ORDER BY created_at LIMIT 1",
        one=True,
    )
    return json.loads(row["data"]) if row else None


def work():
    tts = None
    retry_model_at = 0.0
    while not STOP.is_set():
        if tts is None and time.monotonic() >= retry_model_at:
            try:
                tts = load_model()
            except Exception as exc:
                LOG.exception("Model load failed")
                MODEL.update(status="error", error=str(exc)[:1000])
                retry_model_at = time.monotonic() + 10
        try:
            if (
                query("SELECT value FROM settings WHERE key='paused'", one=True)[
                    "value"
                ]
                == "true"
            ):
                STOP.wait(0.3)
                continue
            with LOCK:
                job = next_job(tts is not None)
                if job:
                    update_job(job, status="running", started_at=now())
            if not job:
                STOP.wait(0.3)
                continue
            try:
                if job["kind"] == "tts":
                    synthesize(tts, job)
                else:
                    render(job)
            except Exception as exc:
                LOG.exception("Job failed")
                update_job(
                    job, status="failed", error=str(exc)[:3000], finished_at=now()
                )
        except Exception:
            LOG.exception("Worker loop failed")
            STOP.wait(1)


@contextlib.asynccontextmanager
async def lifespan(app):
    STOP.clear()
    if os.environ.get("EMA_SKIP_MODEL") != "1":
        thread = threading.Thread(target=work, daemon=True, name="ema-worker")
        thread.start()
    yield
    STOP.set()
    if RENDER_PROCESS and RENDER_PROCESS.poll() is None:
        RENDER_PROCESS.terminate()
    if os.environ.get("EMA_SKIP_MODEL") != "1":
        thread.join(timeout=2)


app = FastAPI(title="EMA Lightning Studio", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def local_origin(request: Request, call_next):
    origin = request.headers.get("origin")
    if (
        request.method not in ("GET", "HEAD", "OPTIONS")
        and origin
        and origin not in ("http://127.0.0.1:3000", "http://localhost:3000")
    ):
        return Response(
            "Yerel uygulama dışından değişiklik kabul edilmiyor.", status_code=403
        )
    return await call_next(request)


@app.get("/api/health")
def health():
    return {
        "model": MODEL,
        "paused": query("SELECT value FROM settings WHERE key='paused'", one=True)[
            "value"
        ]
        == "true",
        "data_path": str(DATA),
        "version": "0.1.0",
        "render_available": bool(shutil.which("node") and shutil.which("ffprobe")),
    }


@app.get("/api/projects")
def projects():
    with LOCK:
        out = []
        for row in query("SELECT id FROM projects"):
            p = project_view(row["id"])
            out.append(p)
    return sorted(out, key=lambda p: p["updated_at"], reverse=True)


@app.post("/api/projects")
def add_project(body: NewProject):
    texts = [
        t.strip() for t in body.text.replace("\r\n", "\n").split("\n\n") if t.strip()
    ]
    if any(len(t) > 20000 for t in texts) or len(texts) > 500:
        raise HTTPException(
            400, "En fazla 500 paragraf; paragraf başına 20.000 karakter."
        )
    p = {
        "id": uid(),
        "name": body.name.strip() or "İsimsiz proje",
        "created_at": now(),
        "updated_at": now(),
        **Settings().model_dump(),
        "paragraphs": [new_paragraph(t) for t in texts],
        "timeline": Timeline().model_dump(),
    }
    save_project(p)
    return project_view(p["id"])


@app.get("/api/projects/{pid}")
def get_project(pid: str):
    return project_view(pid)


@app.delete("/api/projects/{pid}")
def delete_project(pid: str):
    with LOCK:
        raw_project(pid)
        require_idle_project(pid)
        paths = []
        for row in query("SELECT id FROM takes WHERE project_id=?", (pid,)):
            paths.append(DATA / "audio" / f"{row['id']}.wav")
        for row in query("SELECT data FROM assets WHERE project_id=?", (pid,)):
            asset = json.loads(row["data"])
            paths.append(DATA / "media" / Path(asset["url"]).name)
        for row in query("SELECT id FROM jobs WHERE project_id=?", (pid,)):
            for directory, suffix in (
                ("renders", ".mp4"),
                ("manifests", ".json"),
                ("manifests", ".log"),
            ):
                paths.append(DATA / directory / f"{row['id']}{suffix}")
        with staged_deletion(paths):
            with sqlite3.connect(DB, timeout=30) as conn:
                for table in ("takes", "assets", "jobs"):
                    conn.execute(f"DELETE FROM {table} WHERE project_id=?", (pid,))
                conn.execute("DELETE FROM projects WHERE id=?", (pid,))
    return {"deleted": True, "id": pid}


@app.delete("/api/projects/{pid}/takes/{take_id}")
def delete_take(pid: str, take_id: str):
    with LOCK:
        p = raw_project(pid)
        row = query(
            "SELECT id FROM takes WHERE id=? AND project_id=?",
            (take_id, pid),
            one=True,
        )
        if not row:
            raise HTTPException(404, "Ses denemesi bulunamadı.")
        require_idle_project(pid)
        if any(
            c["kind"] == "audio" and c["source_id"] == take_id
            for c in p["timeline"]["clips"]
        ):
            raise HTTPException(
                409,
                "Bu ses denemesi montajda kullanılıyor. Silmeden önce ilgili "
                "klipleri montajdan kaldırıp kaydedin.",
            )
        for paragraph in p["paragraphs"]:
            if paragraph.get("selected_take") == take_id:
                paragraph["selected_take"] = None
        p["updated_at"] = now()
        with staged_deletion([DATA / "audio" / f"{take_id}.wav"]):
            with sqlite3.connect(DB, timeout=30) as conn:
                conn.execute(
                    "DELETE FROM takes WHERE id=? AND project_id=?", (take_id, pid)
                )
                conn.execute(
                    "UPDATE projects SET data=? WHERE id=?",
                    (json.dumps(p, ensure_ascii=False), pid),
                )
    return project_view(pid)


@app.patch("/api/projects/{pid}")
def patch_project(pid: str, body: ProjectPatch):
    changes = body.model_dump(exclude_unset=True)
    if any(changes.get(k, "valid") is None for k in ("name", "speed", "sample_rate")):
        raise HTTPException(400, "Proje varsayılanları boş olamaz.")
    with LOCK:
        p = raw_project(pid)
        p.update(changes)
        save_project(p)
    return project_view(pid)


@app.post("/api/projects/{pid}/paragraphs")
def append_paragraphs(pid: str, body: Texts):
    with LOCK:
        p = raw_project(pid)
        if len(p["paragraphs"]) + len(body.texts) > 500:
            raise HTTPException(400, "En fazla 500 paragraf.")
        p["paragraphs"].extend(new_paragraph(t) for t in body.texts)
        save_project(p)
    return project_view(pid)


@app.patch("/api/projects/{pid}/paragraphs/{paragraph_id}")
def patch_paragraph(pid: str, paragraph_id: str, body: ParagraphPatch):
    with LOCK:
        p = raw_project(pid)
        paragraph = paragraph_by_id(p, paragraph_id)
        changes = body.model_dump(exclude_unset=True)
        if changes.get("text", "valid") is None:
            raise HTTPException(400, "Metin boş değer olamaz.")
        if changes.get("selected_take"):
            take = source(pid, changes["selected_take"], "audio")
            if take["paragraph_id"] != paragraph_id:
                raise HTTPException(400, "Ses bu paragrafa ait değil.")
        paragraph.update(changes)
        save_project(p)
    return project_view(pid)


@app.delete("/api/projects/{pid}/paragraphs/{paragraph_id}")
def delete_paragraph(pid: str, paragraph_id: str):
    with LOCK:
        p = raw_project(pid)
        paragraph_by_id(p, paragraph_id)
        p["paragraphs"] = [x for x in p["paragraphs"] if x["id"] != paragraph_id]
        save_project(p)
        for row in query(
            "SELECT data FROM jobs WHERE project_id=? AND status='queued'", (pid,)
        ):
            job = json.loads(row["data"])
            if job.get("paragraph_id") == paragraph_id:
                update_job(job, status="cancelled")
    return project_view(pid)


@app.put("/api/projects/{pid}/order")
def order(pid: str, body: Reorder):
    with LOCK:
        p = raw_project(pid)
        if len(body.ids) != len(p["paragraphs"]) or set(body.ids) != {
            x["id"] for x in p["paragraphs"]
        }:
            raise HTTPException(400, "Sıralama tüm paragrafları bir kez içermeli.")
        by_id = {x["id"]: x for x in p["paragraphs"]}
        p["paragraphs"] = [by_id[i] for i in body.ids]
        save_project(p)
    return project_view(pid)


@app.post("/api/projects/{pid}/generate")
def generate(pid: str, body: Generate):
    with LOCK:
        p = project_view(pid)
        if body.ids is not None and not set(body.ids) <= {
            x["id"] for x in p["paragraphs"]
        }:
            raise HTTPException(400, "Paragraf bulunamadı.")
        jobs = []
        for paragraph in p["paragraphs"]:
            if body.ids is not None and paragraph["id"] not in body.ids:
                continue
            if not paragraph["text"].strip() or paragraph["status"] in [
                "queued",
                "running",
            ]:
                continue
            if body.missing_only and paragraph["status"] == "ready":
                continue
            settings = effective(p, paragraph)
            jobs.append(
                create_job(
                    pid,
                    "tts",
                    paragraph_id=paragraph["id"],
                    label=paragraph["text"][:70],
                    text=paragraph["text"],
                    settings=settings,
                    fingerprint=fingerprint(paragraph["text"], settings),
                )
            )
        if not jobs:
            raise HTTPException(
                400, "Üretilecek paragraf yok veya seçilen işler zaten sırada."
            )
        return jobs


@app.get("/api/jobs")
def jobs():
    return [
        json.loads(r["data"])
        for r in query("SELECT data FROM jobs ORDER BY created_at DESC LIMIT 1000")
    ]


@app.post("/api/queue")
def queue(body: QueueControl):
    query(
        "UPDATE settings SET value=? WHERE key='paused'",
        ("true" if body.paused else "false",),
    )
    return health()


@app.post("/api/jobs/{jid}/cancel")
def cancel(jid: str):
    with LOCK:
        job = job_by_id(jid)
        if job["status"] != "queued":
            raise HTTPException(409, "Yalnızca bekleyen işler iptal edilebilir.")
        update_job(job, status="cancelled")
    return job


@app.post("/api/jobs/{jid}/retry")
def retry(jid: str):
    with LOCK:
        job = job_by_id(jid)
        if job["status"] not in ("failed", "interrupted", "cancelled"):
            raise HTTPException(409, "Bu iş yeniden denenemez.")
        if job["kind"] == "tts":
            p = raw_project(job["project_id"])
            paragraph_by_id(p, job["paragraph_id"])
            for row in query(
                "SELECT data FROM jobs WHERE project_id=? AND status IN ('queued','running')",
                (job["project_id"],),
            ):
                active = json.loads(row["data"])
                if active.get("paragraph_id") == job["paragraph_id"]:
                    raise HTTPException(409, "Bu paragraf zaten üretim kuyruğunda.")
        else:
            raw_project(job["project_id"])
            for clip in job["composition"]["clips"]:
                try:
                    item = source(job["project_id"], clip["source_id"], clip["kind"])
                    path = (
                        DATA
                        / ("audio" if clip["kind"] == "audio" else "media")
                        / Path(item["url"]).name
                    )
                    if not path.is_file():
                        raise HTTPException(404)
                except HTTPException as exc:
                    raise HTTPException(
                        409,
                        "Bu renderın kaynak dosyaları silinmiş. "
                        "Montajı güncelleyip yeni bir render başlatın.",
                    ) from exc
        update_job(job, status="queued", progress=0, error=None)
    return job


@app.get("/api/files/{folder}/{filename}")
def file(folder: str, filename: str):
    if folder not in ("audio", "media", "renders") or Path(filename).name != filename:
        raise HTTPException(404)
    path = DATA / folder / filename
    if not path.is_file():
        raise HTTPException(404, "Dosya bulunamadı.")
    # Starlette FileResponse handles ranges for scrubbing media.
    return FileResponse(path, headers={"Access-Control-Allow-Origin": "*"})


@app.get("/api/projects/{pid}/export")
def export(
    pid: str,
    format: Literal["wav", "zip"] = "wav",
    rate: int = 48000,
    gap: float = 0.35,
    ids: str | None = None,
):
    if rate not in RATES:
        raise HTTPException(400, "Desteklenmeyen örnekleme frekansı.")
    if not math.isfinite(gap) or not 0 <= gap <= 10:
        raise HTTPException(400, "Sessizlik 0–10 saniye olmalı.")
    p = raw_project(pid)
    chosen = []
    for paragraph in p["paragraphs"]:
        if ids is not None and paragraph["id"] not in ids.split(","):
            continue
        if not paragraph.get("selected_take"):
            raise HTTPException(
                400, "Dışa aktarılacak her paragrafın seçili sesi olmalı."
            )
        chosen.append(source(pid, paragraph["selected_take"], "audio"))
    if not chosen:
        raise HTTPException(400, "Dışa aktarılacak ses yok.")
    if format == "zip":
        out = io.BytesIO()
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            for i, take in enumerate(chosen):
                z.write(DATA / "audio" / f"{take['id']}.wav", f"{i + 1:03d}.wav")
        return Response(
            out.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="paragraflar.zip"'},
        )
    audio = []
    for i, take in enumerate(chosen):
        if i:
            audio.append(np.zeros(round(gap * rate), np.float32))
        audio.append(read_wav(DATA / "audio" / f"{take['id']}.wav", rate))
    return Response(
        wav_bytes(np.concatenate(audio), rate),
        media_type="audio/wav",
        headers={"Content-Disposition": 'attachment; filename="proje.wav"'},
    )


@app.post("/api/projects/{pid}/assets")
def upload(pid: str, file: UploadFile = File(...)):
    raw_project(pid)
    ext = Path(file.filename or "").suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".mp4"):
        raise HTTPException(400, "PNG, JPEG veya MP4 yükleyin.")
    aid = uid()
    path = DATA / "media" / f"{aid}{ext}"
    size = 0
    try:
        with path.open("wb") as out:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > 300 * 1024 * 1024:
                    raise HTTPException(413, "Dosya en fazla 300 MB olabilir.")
                out.write(chunk)
        if ext == ".mp4":
            if not shutil.which("ffprobe"):
                raise HTTPException(503, "Video için FFmpeg/ffprobe kurulmalı.")
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_streams",
                    "-show_format",
                    "-of",
                    "json",
                    str(path),
                ],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode:
                raise HTTPException(400, "Video okunamadı.")
            meta = json.loads(result.stdout)
            video = next(
                (s for s in meta["streams"] if s["codec_type"] == "video"), None
            )
            if not video or video["codec_name"] != "h264":
                raise HTTPException(400, "İlk sürüm H.264 MP4 video kabul ediyor.")
            if any(
                s["codec_type"] == "audio" and s["codec_name"] != "aac"
                for s in meta["streams"]
            ):
                raise HTTPException(
                    400, "MP4 sesi AAC olmalı; dosyayı H.264/AAC olarak dönüştürün."
                )
            duration = float(meta["format"].get("duration", 0))
            if not math.isfinite(duration) or not 0 < duration <= 7200:
                raise HTTPException(400, "Video süresi 0–7200 saniye arasında olmalı.")
            kind = "video"
            width = video["width"]
            height = video["height"]
        else:
            with Image.open(path) as img:
                img.verify()
            # verify() misses truncated data; a full decode catches it.
            with Image.open(path) as img:
                img.load()
                width, height = img.size
            kind = "image"
            duration = 5
        asset = {
            "id": aid,
            "kind": kind,
            "name": Path(file.filename or "medya").name,
            "duration": duration,
            "width": width,
            "height": height,
            "url": f"/api/files/media/{path.name}",
            "size": size,
        }
        with LOCK:
            # A project may be deleted while the upload is being decoded.
            # Recheck before inserting, and let the error cleanup remove its file.
            raw_project(pid)
            query(
                "INSERT INTO assets VALUES(?,?,?)",
                (aid, pid, json.dumps(asset, ensure_ascii=False)),
            )
        return asset
    except HTTPException:
        path.unlink(missing_ok=True)
        raise
    except (
        UnidentifiedImageError,
        Image.DecompressionBombError,
        ValueError,
        OSError,
        SyntaxError,
        subprocess.TimeoutExpired,
    ) as e:
        path.unlink(missing_ok=True)
        raise HTTPException(400, "Medya dosyası geçersiz veya okunamadı.") from e


@app.put("/api/projects/{pid}/timeline")
def timeline(pid: str, body: Timeline):
    with LOCK:
        p = raw_project(pid)
        validate_timeline(pid, body)
        p["timeline"] = body.model_dump()
        save_project(p)
    return project_view(pid)


@app.post("/api/projects/{pid}/render")
def request_render(pid: str):
    with LOCK:
        p = raw_project(pid)
        timeline = Timeline(**p["timeline"])
        validate_timeline(pid, timeline)
        if not timeline.clips:
            raise HTTPException(400, "Önce montaja klip ekleyin.")
        clips = []
        for clip in timeline.clips:
            item = source(pid, clip.source_id, clip.kind)
            clips.append(
                {
                    **clip.model_dump(),
                    "src": f"http://127.0.0.1:{os.environ.get('EMA_BACKEND_PORT', '8010')}"
                    + item["url"],
                }
            )
        composition = {"aspect": timeline.aspect, "clips": clips}
        return create_job(
            pid, "render", label=p["name"] + " — MP4", composition=composition
        )


class SplitBody(BaseModel):
    offset: int = Field(ge=1)


@app.post("/api/projects/{pid}/paragraphs/{paragraph_id}/split")
def split_paragraph(pid: str, paragraph_id: str, body: SplitBody):
    with LOCK:
        p = raw_project(pid)
        paragraph = paragraph_by_id(p, paragraph_id)
        if len(p["paragraphs"]) >= 500:
            raise HTTPException(400, "En fazla 500 paragraf.")
        if body.offset >= len(paragraph["text"]):
            raise HTTPException(400, "Metnin içinde bir bölme noktası seçin.")
        i = p["paragraphs"].index(paragraph)
        second = new_paragraph(paragraph["text"][body.offset :].strip())
        for k in ("speed", "seed", "sample_rate", "seed_mode"):
            second[k] = paragraph.get(k)
        paragraph["text"] = paragraph["text"][: body.offset].strip()
        p["paragraphs"].insert(i + 1, second)
        save_project(p)
    return project_view(pid)


@app.post("/api/projects/{pid}/paragraphs/{paragraph_id}/merge")
def merge_paragraph(pid: str, paragraph_id: str):
    with LOCK:
        p = raw_project(pid)
        paragraph = paragraph_by_id(p, paragraph_id)
        i = p["paragraphs"].index(paragraph)
        if i == 0:
            raise HTTPException(400, "Önceki paragraf yok.")
        text = p["paragraphs"][i - 1]["text"] + " " + paragraph["text"]
        if len(text) > 20000:
            raise HTTPException(
                400, "Birleşik paragraf en fazla 20.000 karakter olabilir."
            )
        p["paragraphs"][i - 1]["text"] = text
        p["paragraphs"].pop(i)
        save_project(p)
        for row in query(
            "SELECT data FROM jobs WHERE project_id=? AND status='queued'", (pid,)
        ):
            job = json.loads(row["data"])
            if job.get("paragraph_id") == paragraph_id:
                update_job(job, status="cancelled")
    return project_view(pid)
