#!/usr/bin/env python3
import sys
from pathlib import Path

import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk
gi.require_version('WebKit2', '4.1')
from gi.repository import WebKit2

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
        
        html_file = Path(__file__).resolve().parent / 'index.html'
        self.webview.load_uri(html_file.as_uri())

        self.btn_close = Gtk.Button()
        self.btn_close.set_halign(Gtk.Align.END)
        self.btn_close.set_valign(Gtk.Align.START)
        self.btn_close.set_label('X')
        self.btn_close.connect('clicked', Gtk.main_quit)

        # Wrap webview in a scrolled window to support touch-scrolling
        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scrolled.set_kinetic_scrolling(True)
        scrolled.add(self.webview)

        overlay = Gtk.Overlay()
        overlay.add(scrolled)
        overlay.add_overlay(self.btn_close)

        self.add(overlay)
        self.connect('destroy', Gtk.main_quit)

if __name__ == "__main__":
    win = GameWindow()
    win.show_all()
    Gtk.main()
