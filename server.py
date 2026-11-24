# -*- coding: utf-8 -*-
"""BAT Hub - local launcher server (stdlib only)."""
import base64
import hashlib
import json
import mimetypes
import os
import re
import shutil
import urllib.request
import subprocess
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

TRAY_AVAILABLE = False
try:
    import pystray
    from PIL import Image, ImageDraw, ImageFont
    TRAY_AVAILABLE = True
except Exception:
    pass

WEBVIEW_AVAILABLE = False
try:
    import webview
    WEBVIEW_AVAILABLE = True
except Exception:
    pass

WIN_TITLE = "Thunder·HUB 启动台"

ROOT = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(ROOT, "app")
DATA_FILE = os.path.join(ROOT, "launcher-data.json")
ICON_DIR = os.path.join(ROOT, ".icons")
PORT = 47120

os.makedirs(ICON_DIR, exist_ok=True)


DEFAULT_CAT = {"id": "default", "name": "常用"}


def load_data():
    """Returns {"items": [...], "cats": [...]}; migrates legacy list format."""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            # 数据损坏：备份后再重置，绝不清空用户收藏
            try:
                shutil.copy2(DATA_FILE, DATA_FILE + ".bad")
            except Exception:
                pass
            data = None
    else:
        data = None
    if isinstance(data, list):  # legacy: bare item list
        data = {"items": data, "cats": [dict(DEFAULT_CAT)]}
    if not isinstance(data, dict):
        data = {"items": [], "cats": [dict(DEFAULT_CAT)]}
    data.setdefault("items", [])
    data.setdefault("cats", [dict(DEFAULT_CAT)])
    if not any(c.get("id") == "default" for c in data["cats"]):
        data["cats"].insert(0, dict(DEFAULT_CAT))
    for it in data["items"]:
        it.setdefault("cat", "default")
    return data


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_items():
    return load_data()["items"]


def save_items(items):
    data = load_data()
    data["items"] = items
    save_data(data)


def detect_kind(path):
    p = path.strip().strip('"')
    low = p.lower()
    if low.startswith(("http://", "https://")):
        return "link"
    if os.path.isdir(p):
        return "folder"
    ext = os.path.splitext(low)[1]
    if ext in (".bat", ".cmd", ".ps1", ".vbs"):
        return "script"
    if ext == ".lnk":
        return "shortcut"
    if ext == ".exe":
        return "app"
    return "file"


def new_item(name, path, cat="default"):
    return {
        "id": hashlib.md5(f"{path}{time.time()}".encode("utf-8")).hexdigest()[:10],
        "name": name.strip() or os.path.splitext(os.path.basename(path.strip().strip('"')))[0],
        "path": path.strip().strip('"'),
        "kind": detect_kind(path),
        "cat": cat or "default",
        "added": int(time.time()),
    }


def new_cat(name):
    return {
        "id": hashlib.md5(f"cat{name}{time.time()}".encode("utf-8")).hexdigest()[:8],
        "name": name.strip() or "未命名",
    }


DEFAULT_SETTINGS = {
    "start_hidden": False,   # 启动时只驻留托盘，不弹主窗口
    "hotkey": True,          # 全局热键开关
    "hotkey_combo": "alt+d", # 热键组合：修饰键+主键，如 "ctrl+shift+k"
    "close_action": "hide",  # 关闭窗口：hide=收进托盘 / quit=退出程序
    "lang": "zh",            # 界面语言：zh / en
    "onboarded": False,      # 新手引导是否已看过
}

TRAY_TEXT = {
    "zh": ("打开启动台", "退出"),
    "en": ("Open Thunder·HUB", "Quit"),
}


def load_settings():
    s = dict(DEFAULT_SETTINGS)
    s.update(load_data().get("settings") or {})
    return s


def save_setting(key, value):
    data = load_data()
    st = data.setdefault("settings", dict(DEFAULT_SETTINGS))
    st[key] = value
    save_data(data)


def startup_link_path():
    return os.path.join(
        os.environ.get("APPDATA", ""),
        r"Microsoft\Windows\Start Menu\Programs\Startup",
        "ThunderHub.lnk",
    )


def get_autostart():
    return os.path.exists(startup_link_path())


def set_autostart(enable):
    lnk = startup_link_path()
    legacy = os.path.join(os.path.dirname(lnk), "BATHub.lnk")
    if not enable:
        for p in (lnk, legacy):
            try:
                os.remove(p)
            except OSError:
                pass
        return
    # 探测无窗口解释器：pyw 启动器 > pythonw > 当前解释器
    pyw = shutil.which("pyw.exe") or shutil.which("pythonw.exe") or sys.executable
    server = os.path.join(ROOT, "server.py")
    args = "-3 " if os.path.basename(pyw).lower() == "pyw.exe" else ""
    args += f'"{server}"'
    ps = (
        "$ws = New-Object -ComObject WScript.Shell\n"
        f"$sc = $ws.CreateShortcut(\"{lnk}\")\n"
        f"$sc.TargetPath = \"{pyw}\"\n"
        f"$sc.Arguments = '{args}'\n"
        f"$sc.WorkingDirectory = \"{ROOT}\"\n"
        "$sc.WindowStyle = 7\n"
        "$sc.Save()\n"
    )
    enc = base64.b64encode(ps.encode("utf-16-le")).decode("ascii")
    subprocess.run(
        ["powershell", "-NoProfile", "-EncodedCommand", enc],
        creationflags=subprocess.CREATE_NO_WINDOW, timeout=20, check=False,
    )


def icon_cache_path(path):
    key = hashlib.md5(path.encode("utf-8")).hexdigest()
    return os.path.join(ICON_DIR, key + ".png")


def extract_icon(path):
    """Extract exe/lnk icon via PowerShell. Returns cache file path or None."""
    cache = icon_cache_path(path)
    if os.path.exists(cache):
        return cache
    low = path.lower()
    if not low.endswith((".exe", ".lnk")) or not os.path.exists(path):
        return None
    ps1 = os.path.join(ROOT, "icons.ps1")
    if not os.path.exists(ps1):
        return None
    b64 = base64.b64encode(path.encode("utf-8")).decode("ascii")
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
             "-File", ps1, b64, cache],
            creationflags=subprocess.CREATE_NO_WINDOW,
            timeout=20, check=False,
        )
    except Exception:
        return None
    return cache if os.path.exists(cache) else None


def launch(path):
    low = path.lower()
    if low.startswith(("http://", "https://")):
        webbrowser.open(path)
        return
    ext = os.path.splitext(low)[1]
    if ext == ".ps1":
        # os.startfile 会用编辑器打开 ps1 而不是执行
        subprocess.Popen(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path],
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
    elif ext == ".vbs":
        subprocess.Popen(["wscript.exe", path])
    else:
        os.startfile(path)  # noqa: S606 - local user launcher


def browse_file():
    import tkinter as tk
    from tkinter import filedialog
    r = tk.Tk()
    r.withdraw()
    r.attributes("-topmost", True)
    p = filedialog.askopenfilename(
        title="选择要收藏的程序或脚本",
        filetypes=[("可启动文件", "*.exe *.bat *.cmd *.ps1 *.lnk"),
                   ("所有文件", "*.*")],
    )
    r.destroy()
    return p or ""


class Handler(BaseHTTPRequestHandler):
    server_version = "BATHub/1.0"

    def log_message(self, *args):
        pass

    def _send(self, body, ctype="application/json; charset=utf-8", code=200):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _json(self, obj, code=200):
        self._send(json.dumps(obj, ensure_ascii=False))

    def _body(self):
        n = int(self.headers.get("Content-Length", 0))
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        u = urlparse(self.path)
        path = u.path
        if path == "/api/items":
            return self._json(load_items())
        if path == "/api/cats":
            return self._json(load_data()["cats"])
        if path == "/api/settings":
            s = load_settings()
            s["autostart"] = get_autostart()
            return self._json(s)
        if path == "/api/icon":
            p = parse_qs(u.query).get("path", [""])[0]
            cache = extract_icon(p) if p else None
            if cache:
                with open(cache, "rb") as f:
                    return self._send(f.read(), "image/png")
            return self._json({"ok": False}, 404)
        if path == "/api/tray":
            return self._json({"tray": TRAY_AVAILABLE})
        if path == "/api/shutdown":
            self._json({"ok": True})
            os._exit(0)
        # static
        if path == "/":
            path = "/index.html"
        fp = os.path.normpath(os.path.join(APP_DIR, path.lstrip("/")))
        if not fp.startswith(APP_DIR) or not os.path.isfile(fp):
            return self._json({"ok": False}, 404)
        ctype = mimetypes.guess_type(fp)[0] or "application/octet-stream"
        with open(fp, "rb") as f:
            self._send(f.read(), ctype + ("; charset=utf-8" if ctype.startswith("text/") or ctype in ("application/javascript", "image/svg+xml") else ""))

    def do_POST(self):
        u = urlparse(self.path)
        body = self._body()
        if u.path == "/api/shutdown":
            self._json({"ok": True})
            os._exit(0)
        if u.path == "/api/items":
            data = load_data()
            cat = body.get("cat") or "default"
            if not any(c["id"] == cat for c in data["cats"]):
                cat = "default"
            item = new_item(body.get("name", ""), body.get("path", ""), cat)
            data["items"].append(item)
            save_data(data)
            return self._json(item)
        if u.path == "/api/cats":
            data = load_data()
            cat = new_cat(body.get("name", ""))
            data["cats"].append(cat)
            save_data(data)
            return self._json(cat)
        if u.path == "/api/cats/rename":
            data = load_data()
            for c in data["cats"]:
                if c["id"] == body.get("id") and c["id"] != "default":
                    c["name"] = body.get("name", c["name"]).strip() or c["name"]
            save_data(data)
            return self._json({"ok": True})
        if u.path == "/api/cats/color":
            data = load_data()
            for c in data["cats"]:
                if c["id"] == body.get("id") and c["id"] != "default":
                    c["color"] = str(body.get("color", ""))[:24]
            save_data(data)
            return self._json({"ok": True})
        if u.path == "/api/cats/order":
            data = load_data()
            ids = [str(i) for i in body.get("ids", [])]
            order = {cid: n for n, cid in enumerate(ids)}
            # default 永远钉在最前，自定义分类按提交顺序排
            data["cats"].sort(
                key=lambda c: (c["id"] != "default",
                               order.get(c["id"], 999)))
            save_data(data)
            return self._json({"ok": True})
        if u.path == "/api/cats/delete":
            data = load_data()
            cid = body.get("id")
            if cid and cid != "default":
                data["cats"] = [c for c in data["cats"] if c["id"] != cid]
                for it in data["items"]:
                    if it.get("cat") == cid:
                        it["cat"] = "default"
                save_data(data)
            return self._json({"ok": True})
        if u.path == "/api/export":
            path = _file_dialog("save", "thunderhub-backup.json")
            if not path:
                return self._json({"ok": False, "cancelled": True})
            data = load_data()
            payload = {"app": "ThunderHub", "version": 1,
                       "items": data["items"], "cats": data["cats"]}
            try:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
            except OSError:
                return self._json({"ok": False, "error": "write_failed"})
            return self._json({"ok": True, "path": path})
        if u.path == "/api/import":
            path = _file_dialog("open")
            if not path:
                return self._json({"ok": False, "cancelled": True})
            try:
                with open(path, encoding="utf-8") as f:
                    payload = json.load(f)
                items = payload["items"]
                cats = payload["cats"]
                assert isinstance(items, list) and isinstance(cats, list)
            except Exception:
                return self._json({"ok": False, "error": "bad_file"})
            # 导入前自动备份当前数据
            try:
                shutil.copyfile(DATA_FILE, DATA_FILE + ".bak")
            except OSError:
                pass
            if not any(c.get("id") == "default" for c in cats):
                cats.insert(0, {"id": "default", "name": "常用"})
            save_data({"items": items, "cats": cats})
            return self._json({"ok": True,
                               "items": len(items), "cats": len(cats)})
        if u.path == "/api/settings":
            for key, value in body.items():
                if key == "autostart":
                    set_autostart(bool(value))
                elif key == "hotkey_combo":
                    if combo_to_vk(value):
                        save_setting(key, str(value).strip().lower())
                elif key in DEFAULT_SETTINGS:
                    save_setting(key, value)
            s = load_settings()
            s["autostart"] = get_autostart()
            return self._json(s)
        if u.path == "/api/set-cat":
            data = load_data()
            cid = body.get("cat") or "default"
            if not any(c["id"] == cid for c in data["cats"]):
                cid = "default"
            for it in data["items"]:
                if it["id"] == body.get("id"):
                    it["cat"] = cid
            save_data(data)
            return self._json({"ok": True})
        if u.path == "/api/order":
            order = body.get("order", [])
            items = {i["id"]: i for i in load_items()}
            save_items([items[i] for i in order if i in items])
            return self._json({"ok": True})
        if u.path == "/api/rename":
            items = load_items()
            for i in items:
                if i["id"] == body.get("id"):
                    i["name"] = body.get("name", i["name"]).strip() or i["name"]
            save_items(items)
            return self._json({"ok": True})
        if u.path == "/api/delete":
            items = [i for i in load_items() if i["id"] != body.get("id")]
            save_items(items)
            return self._json({"ok": True})
        if u.path == "/api/launch":
            for i in load_items():
                if i["id"] == body.get("id"):
                    try:
                        launch(i["path"])
                        return self._json({"ok": True})
                    except Exception as e:
                        return self._json({"ok": False, "error": str(e)}, 500)
            return self._json({"ok": False, "error": "not found"}, 404)
        if u.path == "/api/open-folder":
            for i in load_items():
                if i["id"] == body.get("id"):
                    p = i["path"]
                    if os.path.isfile(p):
                        subprocess.run(["explorer", "/select,", p], check=False)
                    else:
                        os.startfile(p if os.path.isdir(p) else os.path.dirname(p))
                    return self._json({"ok": True})
            return self._json({"ok": False}, 404)
        if u.path == "/api/browse":
            try:
                return self._json({"path": browse_file()})
            except Exception as e:
                return self._json({"ok": False, "error": str(e)}, 500)
        return self._json({"ok": False}, 404)


def open_window(url):
    for exe in ("msedge", "chrome"):
        try:
            subprocess.Popen(
                f'start "" {exe} --app={url}',
                shell=True,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            return
        except Exception:
            continue
    webbrowser.open(url)


def _hwnd():
    import ctypes
    return ctypes.windll.user32.FindWindowW(None, WIN_TITLE)


_MAIN_HWND = [0]  # 真正的主窗口句柄（WebView2 子窗口会带同名标题，FindWindowW 不可靠）


def _resolve_main_hwnd():
    """枚举本进程顶层窗口，取同名且面积最大的——那才是 WinForms 主窗口。"""
    import ctypes
    from ctypes import wintypes
    u = ctypes.windll.user32
    pid = os.getpid()
    best = [0, 0]

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def _cb(h, lp):
        p = wintypes.DWORD()
        u.GetWindowThreadProcessId(h, ctypes.byref(p))
        if p.value == pid:
            buf = ctypes.create_unicode_buffer(256)
            u.GetWindowTextW(h, buf, 256)
            if buf.value == WIN_TITLE:
                rc = wintypes.RECT()
                u.GetWindowRect(h, ctypes.byref(rc))
                area = (rc.right - rc.left) * (rc.bottom - rc.top)
                if area > best[1]:
                    best[0], best[1] = h, area
        return True

    u.EnumWindows(_cb, 0)
    return best[0]


def _main_hwnd():
    """优先用运行期解析出的主窗口句柄，失效就重新解析。"""
    import ctypes
    u = ctypes.windll.user32
    if _MAIN_HWND[0] and u.IsWindow(_MAIN_HWND[0]):
        return _MAIN_HWND[0]
    _MAIN_HWND[0] = _resolve_main_hwnd()
    return _MAIN_HWND[0]


def _foreground_window():
    """Bring the app window back from minimized/hidden state."""
    import ctypes
    h = _main_hwnd()
    if not h:
        return False
    u = ctypes.windll.user32
    u.ShowWindow(h, 9)  # SW_RESTORE
    u.SetForegroundWindow(h)
    return True


class JsApi:
    """Exposed to the page as window.pywebview.api (custom title bar)."""

    def __init__(self):
        self._win = None
        self._max = False
        self._prev = None

    def minimize(self):
        import ctypes
        h = _main_hwnd()
        if h:
            ctypes.windll.user32.ShowWindow(h, 6)  # SW_MINIMIZE

    def toggle_maximize(self):
        """Maximize to the work area (never covers the taskbar) / restore."""
        import ctypes
        from ctypes import wintypes
        u = ctypes.windll.user32
        h = _main_hwnd()
        if not h:
            return self._max
        if self._max and self._prev:
            x, y, w, hh = self._prev
            u.MoveWindow(h, x, y, w, hh, True)
            self._max = False
        else:
            rc = wintypes.RECT()
            u.GetWindowRect(h, ctypes.byref(rc))
            self._prev = (rc.left, rc.top, rc.right - rc.left, rc.bottom - rc.top)
            wa = wintypes.RECT()
            u.SystemParametersInfoW(0x0030, 0, ctypes.byref(wa), 0)  # SPI_GETWORKAREA
            u.MoveWindow(h, wa.left, wa.top,
                         wa.right - wa.left, wa.bottom - wa.top, True)
            self._max = True
        return self._max

    def hide_window(self):
        if self._win:
            try:
                self._win.hide()
            except Exception:
                pass


_HOTKEY_MODS = {
    "alt": 0x0001, "ctrl": 0x0002, "control": 0x0002,
    "shift": 0x0004, "win": 0x0008,
}
_HOTKEY_SPECIAL = {
    "space": 0x20, "tab": 0x09, "enter": 0x0D, "esc": 0x1B,
    "up": 0x26, "down": 0x28, "left": 0x25, "right": 0x27,
    "backspace": 0x08, "delete": 0x2E, "home": 0x24, "end": 0x23,
    "pageup": 0x21, "pagedown": 0x22,
}


def combo_to_vk(combo):
    """'ctrl+shift+k' -> (mods, vk) or None."""
    parts = [p.strip().lower() for p in str(combo).split("+") if p.strip()]
    mods, key = 0, None
    for p in parts:
        if p in _HOTKEY_MODS:
            mods |= _HOTKEY_MODS[p]
        else:
            key = p
    if not key or not mods:
        return None
    if len(key) == 1 and key.isalnum():
        vk = ord(key.upper())
    elif key in _HOTKEY_SPECIAL:
        vk = _HOTKEY_SPECIAL[key]
    else:
        m = re.fullmatch(r"f([1-9]|1[0-2])", key)
        if not m:
            return None
        vk = 0x70 + int(m.group(1)) - 1
    return mods | 0x4000, vk  # 0x4000 = MOD_NOREPEAT


def start_hotkey(toggle, combo="alt+d"):
    """Global hotkey toggles the window. Runs its own message loop."""
    import ctypes
    from ctypes import wintypes

    parsed = combo_to_vk(combo) or combo_to_vk("alt+d")

    def _loop():
        u = ctypes.windll.user32
        mods, vk = parsed
        if not u.RegisterHotKey(None, 1, mods, vk):
            return  # 热键被占用就静默放弃
        msg = wintypes.MSG()
        while u.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
            if msg.message == 0x0312:  # WM_HOTKEY
                try:
                    toggle()
                except Exception:
                    pass

    threading.Thread(target=_loop, daemon=True).start()


_last_toggle = [0.0]


def _force_foreground(u, h):
    """把窗口提到最前（AttachThreadInput 绕过 Windows 前台锁定）。"""
    import ctypes
    k32 = ctypes.windll.kernel32
    fg = u.GetForegroundWindow()
    cur_tid = k32.GetCurrentThreadId()
    fg_tid = u.GetWindowThreadProcessId(fg, None) if fg else 0
    attached = False
    if fg_tid and fg_tid != cur_tid:
        attached = bool(u.AttachThreadInput(cur_tid, fg_tid, True))
    u.ShowWindow(h, 9)      # SW_RESTORE
    u.BringWindowToTop(h)
    u.SetForegroundWindow(h)
    u.SetActiveWindow(h)
    u.SetFocus(h)
    if attached:
        u.AttachThreadInput(cur_tid, fg_tid, False)


def toggle_window():
    import ctypes
    u = ctypes.windll.user32
    h = _main_hwnd()
    if not h:
        return
    # 防抖：300ms 内的重复触发直接忽略
    now = time.time()
    if now - _last_toggle[0] < 0.3:
        return
    _last_toggle[0] = now

    visible = u.IsWindowVisible(h) and not u.IsIconic(h)
    if visible and u.GetForegroundWindow() == h:
        u.ShowWindow(h, 0)  # 在前台 → 隐藏
    else:
        # 不可见，或可见但被其它窗口盖住 → 提到最前
        _force_foreground(u, h)


def _load_logo_image():
    """图标源：优先 app.ico（成品图标文件），再 ico.png，最后 logo.png。"""
    if not TRAY_AVAILABLE:
        return None, None
    p = os.path.join(ROOT, "app.ico")
    if os.path.exists(p):
        try:
            return Image.open(p).convert("RGBA"), p
        except Exception:
            pass
    for name in ("ico.png", "logo.png"):
        p = os.path.join(ROOT, name)
        if os.path.exists(p):
            try:
                return Image.open(p).convert("RGBA"), p
            except Exception:
                continue
    return None, None


def make_tray_image():
    logo, _ = _load_logo_image()
    if logo:
        img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        lg = logo.copy()
        lg.thumbnail((62, 62), Image.LANCZOS)
        img.paste(lg, ((64 - lg.width) // 2, (64 - lg.height) // 2), lg)
        return img
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([3, 3, 60, 60], radius=13,
                        fill="#f6f1e6", outline="#1b1712", width=4)
    try:
        f = ImageFont.truetype("arialbd.ttf", 34)
    except Exception:
        f = ImageFont.load_default()
    d.text((30, 32), "T", font=f, fill="#1b1712", anchor="mm")
    d.ellipse([42, 9, 54, 21], fill="#d2401e")
    return img


def ensure_app_icon():
    """用品牌 logo 生成多尺寸 .ico：每个尺寸都从原图直接 LANCZOS 缩放，保证清晰度。"""
    if not TRAY_AVAILABLE:
        return None
    ico = os.path.join(ICON_DIR, "thunderhub.ico")
    logo, src = _load_logo_image()
    if logo:
        if os.path.exists(ico) and os.path.getmtime(ico) >= os.path.getmtime(src):
            return ico
        # 裁掉透明边距，内容撑满（ico.png 本身就是完整图标设计，不留边）
        bbox = logo.getchannel("A").getbbox()
        if bbox:
            logo = logo.crop(bbox)
        sizes = [16, 24, 32, 48, 64, 128, 256]
        frames = []
        for s in sizes:
            frames.append(logo.resize((s, s), Image.LANCZOS))
        frames[-1].save(ico, format="ICO", append_images=frames[:-1])
        return ico
    # 兜底：纸底 T 贴纸
    if os.path.exists(ico):
        return ico
    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([14, 14, 242, 242], radius=52,
                        fill="#f6f1e6", outline="#1b1712", width=16)
    try:
        f = ImageFont.truetype("arialbd.ttf", 138)
    except Exception:
        f = ImageFont.load_default()
    d.text((120, 128), "T", font=f, fill="#1b1712", anchor="mm")
    d.ellipse([168, 36, 218, 88], fill="#d2401e")
    img.save(ico, sizes=[(16, 16), (24, 24), (32, 32), (48, 48),
                         (64, 64), (128, 128), (256, 256)])
    return ico


def apply_window_icon():
    """把任务栏/窗口图标从 Python 默认换成我们的贴纸图标（WM_SETICON）。"""
    import ctypes

    def _work():
        ico = ensure_app_icon()
        if not ico:
            return
        u = ctypes.windll.user32
        for _ in range(30):  # 等窗口出现，最多 15s
            h = _main_hwnd()
            if h:
                # 关键：按系统实际需要的精确尺寸加载对应帧，避免 Windows 用低质量算法现场缩放
                sm_x = u.GetSystemMetrics(49)  # SM_CXSMICON
                sm_y = u.GetSystemMetrics(50)  # SM_CYSMICON
                bg_x = u.GetSystemMetrics(11)  # SM_CXICON
                bg_y = u.GetSystemMetrics(12)  # SM_CYICON
                h_small = u.LoadImageW(None, ico, 1, sm_x, sm_y, 0x0010)
                h_big = u.LoadImageW(None, ico, 1, bg_x, bg_y, 0x0010)
                if h_small:
                    u.SendMessageW(h, 0x0080, 0, h_small)  # WM_SETICON small
                if h_big:
                    u.SendMessageW(h, 0x0080, 1, h_big)    # WM_SETICON big
                return
            time.sleep(0.5)

    threading.Thread(target=_work, daemon=True).start()


def _file_dialog(kind, default_name=""):
    """系统原生文件对话框（tkinter），取消或无环境返回 None。"""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        if kind == "save":
            p = filedialog.asksaveasfilename(
                parent=root, defaultextension=".json",
                initialfile=default_name,
                filetypes=[("JSON", "*.json")],
                title="导出数据 / Export data")
        else:
            p = filedialog.askopenfilename(
                parent=root, filetypes=[("JSON", "*.json")],
                title="导入数据 / Import data")
        root.destroy()
        return p or None
    except Exception:
        return None


def start_tray(on_open, on_quit=None):
    quit_cb = on_quit or (lambda: os._exit(0))
    open_lbl, quit_lbl = TRAY_TEXT.get(
        load_settings().get("lang", "zh"), TRAY_TEXT["zh"])
    icon = pystray.Icon(
        "thunderhub", make_tray_image(), WIN_TITLE,
        menu=pystray.Menu(
            pystray.MenuItem(open_lbl, lambda *a: on_open(), default=True),
            pystray.MenuItem(quit_lbl, lambda *a: quit_cb()),
        ),
    )
    threading.Thread(target=icon.run, daemon=True).start()


def _probe_existing():
    """已有实例在跑则返回其端口，否则 None。"""
    for p in range(PORT, PORT + 10):
        try:
            with urllib.request.urlopen(
                    f"http://127.0.0.1:{p}/api/settings", timeout=0.4) as r:
                if r.status == 200:
                    return p
        except Exception:
            continue
    return None


def _bind_server():
    """47120 起递增尝试绑定端口，返回 (server, port) 或 (None, None)。"""
    for p in range(PORT, PORT + 10):
        try:
            return ThreadingHTTPServer(("127.0.0.1", p), Handler), p
        except OSError:
            continue
    return None, None


def _run_browser_fallback(url):
    if TRAY_AVAILABLE:
        start_tray(lambda: open_window(url))
    open_window(url)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        pass


def main():
    # 任务栏独立应用身份：不挂到 python.exe 的图标下
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("ThunderHub.App")
    except Exception:
        pass

    # 已有实例：只唤醒窗口，绝不开第二个
    existing = _probe_existing()
    if existing is not None:
        if WEBVIEW_AVAILABLE and _foreground_window():
            return
        open_window(f"http://127.0.0.1:{existing}/")
        return

    srv, port = _bind_server()
    if srv is None:
        return  # 端口全被占，放弃
    url = f"http://127.0.0.1:{port}/"
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    if WEBVIEW_AVAILABLE:
        try:
            _run_webview(url)
        except Exception:
            # WebView2 运行时缺失等异常：回退浏览器窗口
            _run_browser_fallback(url)
    else:
        _run_browser_fallback(url)


def _run_webview(url):
    settings = load_settings()
    win_state = settings.get("win") or {}
    w = int(win_state.get("w", 1040))
    h = int(win_state.get("h", 680))
    if w < 500 or h < 400:
        w, h = 1040, 680
    api = JsApi()
    win = webview.create_window(
        WIN_TITLE, url,
        width=w, height=h,
        min_size=(760, 480),
        frameless=True, easy_drag=False, js_api=api,
        hidden=bool(settings.get("start_hidden")),
    )
    api._win = win

    # 位置在启动后再恢复（create_window 传 x/y 会把窗口挤成细条）
    wx, wy = win_state.get("x"), win_state.get("y")
    if wx is not None and wy is not None:
        def _restore_pos():
            try:
                win.move(int(wx), int(wy))
            except Exception:
                pass
        win.events.loaded += _restore_pos

    # 窗口尺寸 / 位置记忆（0.8s 防抖）
    _save_timer = [None]

    def _schedule_save(**kw):
        st = load_settings().get("win") or {}
        st.update({k: v for k, v in kw.items() if v is not None})

        def _do():
            data = load_data()
            data.setdefault("settings", {})["win"] = st
            save_data(data)

        if _save_timer[0]:
            _save_timer[0].cancel()
        t = threading.Timer(0.8, _do)
        t.daemon = True
        t.start()
        _save_timer[0] = t

    win.events.resized += lambda w_, h_: (
        _schedule_save(w=w_, h=h_) if (w_ >= 500 and h_ >= 400) else None)
    win.events.moved += lambda x, y: _schedule_save(x=x, y=y)

    # 启动后解析并锁定真正的主窗口句柄
    win.events.loaded += lambda: _main_hwnd()

    def _setup_dnd():
        """Register a DOM drop listener so pywebview delivers real file paths."""
        def on_drop(event):
            try:
                files = (event.get("dataTransfer") or {}).get("files") or []
                paths = [f.get("pywebviewFullPath") for f in files
                         if f.get("pywebviewFullPath")]
                if not paths:
                    return
                # 只送路径，目标分类由前端按当前选中的分类决定
                payload = json.dumps(paths, ensure_ascii=False)
                win.evaluate_js(
                    "window.__bathubDropPaths && window.__bathubDropPaths(" + payload + ")")
            except Exception:
                pass
        try:
            win.dom.get_element("body").on("drop", on_drop)
        except Exception:
            pass

    win.events.loaded += _setup_dnd
    if TRAY_AVAILABLE:
        def reopen():
            try:
                win.show()
                win.restore()
            except Exception:
                pass
            _foreground_window()

        def _on_closing():
            # 关闭窗口：默认隐藏到托盘；设置里可改为直接退出
            if load_settings().get("close_action") == "quit":
                try:
                    win.destroy()
                except Exception:
                    pass
                return True
            try:
                win.hide()
            except Exception:
                pass
            return False

        win.events.closing += _on_closing

        def quit_app():
            try:
                win.destroy()
            except Exception:
                pass
            os._exit(0)

        start_tray(reopen, quit_app)
    if settings.get("hotkey", True):
        start_hotkey(toggle_window, settings.get("hotkey_combo", "alt+d"))
    apply_window_icon()
    webview.start(storage_path=os.path.join(ROOT, ".webview2"))


if __name__ == "__main__":
    main()
