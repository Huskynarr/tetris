#!/usr/bin/env python3
import datetime
import json
import os
import sys
from pathlib import Path

import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk
gi.require_version('WebKit2', '4.1')
from gi.repository import WebKit2

GAME_NAME = "tetris"
# Kioskweite Tages-Bestenliste: liegt im Kiosk-Hauptverzeichnis (Elternordner),
# der Launcher zeigt sie in der Sidebar an.
HIGHSCORE_FILE = Path(__file__).resolve().parent.parent / "cache" / "highscores.json"


def record_highscore(payload: str) -> None:
    """Score-Meldung aus dem WebView in cache/highscores.json anhängen."""
    try:
        rec = json.loads(payload)
        entry = {
            "game": GAME_NAME,
            "name": str(rec.get("name", ""))[:40],
            "score": int(rec.get("score", 0)),
            "date": datetime.datetime.now().isoformat(timespec="seconds"),
        }
        HIGHSCORE_FILE.parent.mkdir(parents=True, exist_ok=True)
        records = []
        if HIGHSCORE_FILE.exists():
            try:
                records = json.loads(HIGHSCORE_FILE.read_text(encoding="utf-8"))
            except Exception:
                records = []
        records.append(entry)
        records = records[-500:]
        tmp = HIGHSCORE_FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(records, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(tmp, HIGHSCORE_FILE)
    except Exception as exc:
        print(f"scorebridge: {exc}", file=sys.stderr)


import sqlite3

class GameWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="Tetris - Mathematisch Interaktiv")
        self.set_decorated(False)
        self.fullscreen()

        self.init_db()

        self.webview = WebKit2.WebView()
        settings = self.webview.get_settings()
        settings.set_enable_javascript(True)
        settings.set_enable_webgl(True)
        settings.set_enable_write_console_messages_to_stdout(True)
        settings.set_enable_smooth_scrolling(True)

        # Score-Bridge: script.js meldet Highscores per
        # window.webkit.messageHandlers.scorebridge.postMessage(...)
        ucm = self.webview.get_user_content_manager()
        ucm.register_script_message_handler('scorebridge')
        ucm.connect('script-message-received::scorebridge', self._on_score_message)

        # Local SQLite Highscores Bridge
        ucm.register_script_message_handler('highscore_bridge')
        ucm.connect('script-message-received::highscore_bridge', self.on_highscore_message)

        html_file = Path(__file__).resolve().parent / 'index.html'
        self.webview.load_uri(html_file.as_uri())

        self.btn_close = Gtk.Button()
        self.btn_close.set_halign(Gtk.Align.END)
        self.btn_close.set_valign(Gtk.Align.START)
        self.btn_close.set_label('X')
        self.btn_close.connect('clicked', Gtk.main_quit)

        overlay = Gtk.Overlay()
        overlay.add(self.webview)
        overlay.add_overlay(self.btn_close)

        self.add(overlay)
        self.connect('destroy', Gtk.main_quit)

    def _on_score_message(self, _ucm, message):
        try:
            record_highscore(message.get_js_value().to_string())
        except Exception as exc:
            print(f"scorebridge: {exc}", file=sys.stderr)

    def init_db(self):
        self.db_path = Path(__file__).resolve().parent / 'highscores.db'
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute('''
                CREATE TABLE IF NOT EXISTS highscores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    lines INTEGER NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()
            conn.close()
        except Exception as e:
            print("DB init error:", e)

    def get_scores_from_db(self):
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute('SELECT name, score, lines, timestamp FROM highscores ORDER BY score DESC LIMIT 10')
            rows = c.fetchall()
            conn.close()
            return [{'name': r[0], 'score': r[1], 'lines': r[2], 'date': r[3]} for r in rows]
        except Exception as e:
            print("DB read error:", e)
            return []

    def save_score_to_db(self, name, score, lines):
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute('INSERT INTO highscores (name, score, lines) VALUES (?, ?, ?)', (name, score, lines))
            conn.commit()
            conn.close()
        except Exception as e:
            print("DB write error:", e)

    def send_highscores(self):
        scores = self.get_scores_from_db()
        js_code = f"if (window.onHighscoresLoaded) window.onHighscoresLoaded({json.dumps(scores)});"
        self.webview.run_javascript(js_code, None, None, None)

    def on_highscore_message(self, _ucm, js_result):
        try:
            js_value = js_result.get_js_value()
            message_str = js_value.to_string()
            data = json.loads(message_str)
            action = data.get('action')
            
            if action == 'get_highscores':
                self.send_highscores()
            elif action == 'save_score':
                name = data.get('name', 'Anonym')
                score = int(data.get('score', 0))
                lines = int(data.get('lines', 0))
                self.save_score_to_db(name, score, lines)
                self.send_highscores()
        except Exception as e:
            print("Error in highscore_bridge:", e)


if __name__ == "__main__":
    win = GameWindow()
    win.show_all()
    Gtk.main()
