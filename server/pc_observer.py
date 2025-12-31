import ctypes
import json
import threading
import time
from ctypes import wintypes
from typing import Dict, Optional
import mss
import mss.tools
import base64
import io
from PIL import Image

# WinAPI setup
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

class PCObserver:
    def __init__(self, interval: float = 2.0):
        self.interval = interval
        self.current_context = {"app": "None", "title": "None", "pid": 0}
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self.enabled = True

    def get_active_window_info(self) -> Dict:
        try:
            hwnd = user32.GetForegroundWindow()
            if not hwnd:
                return {"app": "None", "title": "None", "pid": 0}

            # Get Window Title
            length = user32.GetWindowTextLengthW(hwnd)
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            title = buff.value or "Unknown"

            # Get Process ID
            pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            
            # Get Process Name
            process_name = "Unknown"
            try:
                import psutil
                process = psutil.Process(pid.value)
                process_name = process.name()
            except ImportError:
                # Fallback if psutil is not available
                process_name = f"PID:{pid.value}"
            except Exception:
                process_name = "Unknown"

            return {
                "app": process_name,
                "title": title,
                "pid": pid.value
            }
        except Exception:
            return {"app": "Error", "title": "Error", "pid": 0}

    def _run(self):
        while not self._stop_event.is_set():
            if self.enabled:
                new_info = self.get_active_window_info()
                # Update context if changed
                if new_info != self.current_context:
                    self.current_context = new_info
            time.sleep(self.interval)

    def start(self):
        if self._thread is None:
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run, daemon=True)
            self._thread.start()
            print("[PC_OBSERVER] Started monitoring.")

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
            print("[PC_OBSERVER] Stopped monitoring.")

    def get_open_windows(self) -> list:
        """Retorna uma lista de strings com 'Título - App' de todas as janelas visíveis."""
        results = []
        
        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, ctypes.POINTER(ctypes.py_object))
        
        def enum_callback(hwnd, _):
            if user32.IsWindowVisible(hwnd):
                length = user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buff = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd, buff, length + 1)
                    title = buff.value
                    
                    # Filtra janelas de sistema irrelevantes para o usuário comum
                    if title and title not in ["Program Manager", "Calculadora", "Configurações", "Microsoft Text Input Application"]:
                        results.append(title)
            return True

        c_callback = WNDENUMPROC(enum_callback)
        user32.EnumWindows(c_callback, 0)
        return list(set(results)) # Remove duplicatas

    def get_context_string(self) -> str:
        """Returns a string formatted for the LLM prompt."""
        if not self.enabled:
            return ""
        ctx = self.current_context
        return f"[USUÁRIO ESTÁ AGORA EM: {ctx['app']} - {ctx['title']}]"

    def capture_screen(self) -> str:
        """Captura a tela inteira e retorna como string base64 (JPEG)."""
        try:
            with mss.mss() as sct:
                # Capture primary monitor
                monitor = sct.monitors[1]
                sct_img = sct.grab(monitor)
                
                # Convert to PIL Image
                img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
                
                # Resize if too large (HD max usually enough for LLM)
                max_size = (1280, 720)
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Buffer for JPEG
                buffered = io.BytesIO()
                img.save(buffered, format="JPEG", quality=80)
                
                # Base64 encode
                img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                return img_str
        except Exception as e:
            print(f"[PC_OBSERVER] Erro ao capturar tela: {e}")
            return ""

# Global instance
observer = PCObserver()
