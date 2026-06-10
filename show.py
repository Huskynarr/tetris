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


class GameWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="Tetris - Mathematisch Interaktiv")
        self.set_decorated(False)
        self.fullscreen()

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


if __name__ == "__main__":
    win = GameWindow()
    win.show_all()
    Gtk.main()
