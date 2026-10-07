import io, os, tempfile, wave
from types import SimpleNamespace

os.environ["EMA_SKIP_MODEL"] = "1"
os.environ["EMA_DATA_DIR"] = tempfile.mkdtemp(prefix="ema-test-import-")
import pytest
import numpy as np
from fastapi.testclient import TestClient
import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(app, "DATA", tmp_path)
    monkeypatch.setattr(app, "DB", tmp_path / "studio.sqlite3")
    for d in ("audio", "media", "renders", "manifests"):
        (tmp_path / d).mkdir()
    app.init_db()
    with TestClient(app.app) as c:
        yield c


class FakeTTS:
    def say(self, text, speed, seed, sample_rate):
        return SimpleNamespace(
            audio=np.ones(sample_rate // 2, dtype=np.float32) * 0.2,
            sample_rate=sample_rate,
            duration=0.5,
            seed=seed if seed is not None else 123,
        )


def project(c, text="Merhaba.\n\nDünya."):
    r = c.post("/api/projects", json={"name": "Test", "text": text})
    assert r.status_code == 200
    return r.json()


def generate(c, p):
    r = c.post(f"/api/projects/{p['id']}/generate", json={})
    assert r.status_code == 200
    return r.json()


def finish(jobs):
    for j in jobs:
        app.synthesize(FakeTTS(), j)


def fetch(c, p):
    return c.get(f"/api/projects/{p['id']}").json()


def test_late_result_cannot_select_outdated_audio(client):
    p = project(client)
    j = generate(client, p)[0]
    client.patch(
        f"/api/projects/{p['id']}/paragraphs/{p['paragraphs'][0]['id']}",
        json={"text": "Değişti."},
    )
    finish([j])
    p = fetch(client, p)
    assert p["paragraphs"][0]["selected_take"] is None
    assert p["paragraphs"][0]["takes"][0]["text"] == "Merhaba."
    assert app.job_by_id(j["id"])["status"] == "completed"


def test_versions_preserved_and_changed_settings_mark_stale(client):
    p = project(client, "Merhaba.")
    finish(generate(client, p))
    p = fetch(client, p)
    first = p["paragraphs"][0]["selected_take"]
    client.patch(f"/api/projects/{p['id']}", json={"speed": 1.25})
    p = fetch(client, p)
    assert p["paragraphs"][0]["stale"]
    finish(generate(client, p))
    p = fetch(client, p)
    assert (
        len(p["paragraphs"][0]["takes"]) == 2
        and p["paragraphs"][0]["selected_take"] != first
        and not p["paragraphs"][0]["stale"]
    )


def test_duplicate_queue_cancel_retry_pause(client):
    p = project(client)
    jobs = generate(client, p)
    assert client.post(f"/api/projects/{p['id']}/generate", json={}).status_code == 400
    assert (
        client.post(f"/api/jobs/{jobs[0]['id']}/cancel").json()["status"] == "cancelled"
    )
    assert client.post(f"/api/jobs/{jobs[0]['id']}/retry").json()["status"] == "queued"
    assert client.post("/api/queue", json={"paused": True}).json()["paused"]


def test_export_resamples_and_orders_audio_with_exact_gap(client):
    p = project(client)
    client.patch(
        f"/api/projects/{p['id']}/paragraphs/{p['paragraphs'][1]['id']}",
        json={"sample_rate": 8000},
    )
    finish(generate(client, p))
    r = client.get(f"/api/projects/{p['id']}/export?rate=24000&gap=0.25")
    assert r.status_code == 200
    with wave.open(io.BytesIO(r.content)) as w:
        assert (
            w.getframerate() == 24000
            and w.getnframes() == 30000
            and w.getnchannels() == 1
        )
    import zipfile

    r = client.get(f"/api/projects/{p['id']}/export?format=zip")
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        assert z.namelist() == ["001.wav", "002.wav"]


def test_paragraph_can_override_fixed_seed_with_random(client):
    p = project(client)
    client.patch(f"/api/projects/{p['id']}", json={"seed": 42})
    client.patch(
        f"/api/projects/{p['id']}/paragraphs/{p['paragraphs'][0]['id']}",
        json={"seed_mode": "random"},
    )
    jobs = generate(client, p)
    assert jobs[0]["settings"]["seed"] is None and jobs[1]["settings"]["seed"] == 42


def test_split_merge_and_cross_paragraph_take_rejection(client):
    p = project(client, "Merhaba dünya.")
    pid = p["id"]
    paragraph = p["paragraphs"][0]["id"]
    p = client.post(
        f"/api/projects/{pid}/paragraphs/{paragraph}/split", json={"offset": 7}
    ).json()
    assert [x["text"] for x in p["paragraphs"]] == ["Merhaba", "dünya."]
    finish(generate(client, p))
    p = fetch(client, p)
    assert (
        client.patch(
            f"/api/projects/{pid}/paragraphs/{paragraph}",
            json={"selected_take": p["paragraphs"][1]["selected_take"]},
        ).status_code
        == 400
    )
    p = client.post(
        f"/api/projects/{pid}/paragraphs/{p['paragraphs'][1]['id']}/merge"
    ).json()
    assert len(p["paragraphs"]) == 1 and p["paragraphs"][0]["stale"]
    assert (
        client.put(
            f"/api/projects/{pid}/order", json={"ids": [paragraph, paragraph]}
        ).status_code
        == 400
    )


def test_montage_pins_old_take_and_render_snapshot(client):
    p = project(client, "Merhaba.")
    finish(generate(client, p))
    p = fetch(client, p)
    take = p["paragraphs"][0]["selected_take"]
    clip = {
        "id": "clip1",
        "source_id": take,
        "kind": "audio",
        "label": "Ses",
        "start": 0,
        "duration": 0.5,
    }
    assert (
        client.put(
            f"/api/projects/{p['id']}/timeline",
            json={"aspect": "16:9", "clips": [clip]},
        ).status_code
        == 200
    )
    render = client.post(f"/api/projects/{p['id']}/render").json()
    finish(generate(client, p))
    current = fetch(client, p)
    assert current["timeline"]["clips"][0]["source_id"] == take
    assert render["composition"]["clips"][0]["src"].endswith(take + ".wav")


def test_timeline_range_overlap_foreign_source_validation(client):
    p = project(client, "Merhaba.")
    finish(generate(client, p))
    p = fetch(client, p)
    take = p["paragraphs"][0]["selected_take"]
    clip = {
        "id": "a",
        "source_id": take,
        "kind": "audio",
        "label": "Ses",
        "start": 0,
        "duration": 1,
    }
    assert (
        client.put(
            f"/api/projects/{p['id']}/timeline", json={"clips": [clip]}
        ).status_code
        == 400
    )
    clip["duration"] = 0.5
    assert (
        client.put(
            f"/api/projects/{p['id']}/timeline",
            json={"clips": [clip, {**clip, "id": "b", "start": 0.1}]},
        ).status_code
        == 400
    )
    other = project(client)
    assert (
        client.put(
            f"/api/projects/{other['id']}/timeline", json={"clips": [clip]}
        ).status_code
        == 400
    )


def test_restart_recovers_running_without_replaying_queued(client):
    p = project(client)
    jobs = generate(client, p)
    app.update_job(jobs[0], status="running")
    app.init_db()
    assert (
        app.job_by_id(jobs[0]["id"])["status"] == "interrupted"
        and app.job_by_id(jobs[1]["id"])["status"] == "queued"
    )


def test_missing_audio_invalid_media_cleanup(client):
    p = project(client)
    assert client.get(f"/api/projects/{p['id']}/export").status_code == 400
    assert (
        client.post(
            f"/api/projects/{p['id']}/assets",
            files={"file": ("bad.png", b"invalid", "image/png")},
        ).status_code
        == 400
    )
    assert not list((app.DATA / "media").iterdir())
    assert client.get("/api/files/audio/missing.wav").status_code == 404


def test_external_origin_and_invalid_model_settings(client):
    assert (
        client.post(
            "/api/projects",
            json={"name": "x"},
            headers={"Origin": "https://untrusted.example"},
        ).status_code
        == 403
    )
    p = project(client)
    assert (
        client.patch(f"/api/projects/{p['id']}", json={"speed": 0}).status_code == 422
    )
    assert (
        client.patch(
            f"/api/projects/{p['id']}", json={"sample_rate": 44100}
        ).status_code
        == 422
    )
    assert (
        client.patch(f"/api/projects/{p['id']}", json={"speed": None}).status_code
        == 400
    )


def test_retry_cannot_duplicate_active_paragraph(client):
    p = project(client, "Merhaba.")
    old = generate(client, p)[0]
    client.post(f"/api/jobs/{old['id']}/cancel")
    newer = generate(client, p)[0]
    assert client.post(f"/api/jobs/{old['id']}/retry").status_code == 409
    assert app.job_by_id(newer["id"])["status"] == "queued"


def test_deleted_paragraph_retains_audio_for_saved_montage(client):
    p = project(client, "Merhaba.")
    finish(generate(client, p))
    p = fetch(client, p)
    take = p["paragraphs"][0]["selected_take"]
    clip = {
        "id": "clip",
        "source_id": take,
        "kind": "audio",
        "label": "Ses",
        "start": 0,
        "duration": 0.5,
    }
    client.put(f"/api/projects/{p['id']}/timeline", json={"clips": [clip]})
    client.delete(f"/api/projects/{p['id']}/paragraphs/{p['paragraphs'][0]['id']}")
    current = fetch(client, p)
    assert not current["paragraphs"] and current["all_takes"][0]["id"] == take
    r = client.post(f"/api/projects/{p['id']}/render")
    assert r.status_code == 200 and r.json()["composition"]["clips"][0]["src"].endswith(
        take + ".wav"
    )


def png_bytes():
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (64, 64), (200, 150, 90)).save(buf, "PNG")
    return buf.getvalue()


def test_truncated_and_corrupt_png_are_rejected_and_cleaned(client):
    p = project(client)
    good = png_bytes()
    corrupt_crc = bytearray(good)
    corrupt_crc[good.index(b"IDAT") + 6] ^= 0xFF  # image data no longer matches its CRC
    for body in (good[: len(good) // 2], bytes(corrupt_crc)):
        r = client.post(
            f"/api/projects/{p['id']}/assets",
            files={"file": ("bad.png", body, "image/png")},
        )
        assert r.status_code == 400
        assert r.json()["detail"] == "Medya dosyası geçersiz veya okunamadı."
    assert not list((app.DATA / "media").iterdir())
    ok = client.post(
        f"/api/projects/{p['id']}/assets",
        files={"file": ("ok.png", good, "image/png")},
    )
    assert ok.status_code == 200 and ok.json()["width"] == 64


def test_clip_shorter_than_one_frame_is_rejected(client):
    p = project(client)
    asset = client.post(
        f"/api/projects/{p['id']}/assets",
        files={"file": ("ok.png", png_bytes(), "image/png")},
    ).json()
    clip = {
        "id": "a",
        "source_id": asset["id"],
        "kind": "image",
        "label": "Görsel",
        "start": 0,
        "duration": 0.015625,
    }
    url = f"/api/projects/{p['id']}/timeline"
    assert client.put(url, json={"clips": [clip]}).status_code == 422
    clip["duration"] = 1 / 30
    assert client.put(url, json={"clips": [clip]}).status_code == 200


def test_failed_generation_is_visible_until_a_newer_take(client):
    p = project(client, "Merhaba.")
    job = generate(client, p)[0]
    app.update_job(job, status="failed", error="Model hatası")
    paragraph = fetch(client, p)["paragraphs"][0]
    assert paragraph["status"] == "failed" and paragraph["error"] == "Model hatası"
    assert client.post(f"/api/jobs/{job['id']}/retry").status_code == 200
    assert fetch(client, p)["paragraphs"][0]["status"] == "queued"
    finish([app.job_by_id(job["id"])])
    paragraph = fetch(client, p)["paragraphs"][0]
    assert paragraph["status"] == "ready" and paragraph["error"] is None


def test_render_jobs_do_not_wait_for_the_model(client):
    p = project(client, "Merhaba.")
    tts_job = generate(client, p)[0]
    render_job = {
        "id": "render-1",
        "project_id": p["id"],
        "kind": "render",
        "status": "queued",
        "created_at": app.now(),
        "progress": 0,
        "error": None,
        "label": "Test — MP4",
    }
    app.query(
        "INSERT INTO jobs VALUES(?,?,?,?,?,?)",
        (
            render_job["id"],
            p["id"],
            "render",
            "queued",
            render_job["created_at"],
            app.json.dumps(render_job),
        ),
    )
    # Model unavailable: the older TTS job is skipped, the render job runs.
    assert app.next_job(model_ready=False)["id"] == "render-1"
    assert app.next_job(model_ready=True)["id"] == tts_job["id"]
