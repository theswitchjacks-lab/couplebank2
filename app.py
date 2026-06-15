from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__, static_folder="static", static_url_path="/static")


DATA_FILE = "records.json"


# -----------------------------
# JSON 読み込み
# -----------------------------
def load_records():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


# -----------------------------
# JSON 保存
# -----------------------------
def save_records(records):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


# -----------------------------
# メイン画面（★ current_month を渡す）
# -----------------------------
@app.route("/")
def index():
    current_month = datetime.now().strftime("%Y-%m")
    return render_template("index.html", current_month=current_month)


# -----------------------------
# 月ごとの集計ページ（不要なら削除してもOK）
# -----------------------------
@app.route("/stats")
def stats():
    records = load_records()
    return render_template("stats.html", records=records)


# -----------------------------
# 履歴取得（AJAX）
# -----------------------------
@app.route("/api/records")
def api_get_records():
    return jsonify(load_records())


# -----------------------------
# 新規追加（AJAX）
# -----------------------------
@app.route("/api/add", methods=["POST"])
def api_add_record():
    data = request.json
    records = load_records()

    record = {
        "id": int(datetime.now().timestamp() * 1000),  # ★ 固有IDを付与
        "type": data.get("type", "saving"),
        "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
        "title": data.get("title", ""),
        "takeru": int(data.get("takeru", 0)),
        "miyuu": int(data.get("miyuu", 0)),
        "shared": int(data.get("shared", 0)),
        "reflect": bool(data.get("reflect", True)),
        "memo": data.get("memo", "")
    }


    records.insert(0, record)
    save_records(records)

    return jsonify({"status": "ok"})


# -----------------------------
# 削除（AJAX）
# -----------------------------
@app.route("/api/delete/<int:id>", methods=["POST"])
def api_delete_record(id):
    records = load_records()

    # id が一致しないものだけ残す
    new_records = [r for r in records if r.get("id") != id]

    # 削除が成功したか判定
    if len(new_records) != len(records):
        save_records(new_records)
        return jsonify({"status": "ok"})
    else:
        return jsonify({"status": "error"})

# -----------------------------
# 編集保存（AJAX）
# -----------------------------
@app.route("/api/save", methods=["POST"])
def api_save_record():
    data = request.json
    index = data.get("index")
    record = data.get("record")

    records = load_records()

    if 0 <= index < len(records):
        records[index] = {
            "type": record.get("type"),
            "date": record.get("date"),
            "title": record.get("title"),
            "takeru": int(record.get("takeru", 0)),
            "miyuu": int(record.get("miyuu", 0)),
            "shared": int(record.get("shared", 0)),
            "reflect": bool(record.get("reflect", True)),
            "memo": record.get("memo", "")
        }

        save_records(records)
        return jsonify({"status": "ok"})
    else:
        return jsonify({"status": "error"})


# -----------------------------
# Flask 起動
# -----------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
