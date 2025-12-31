
import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32

def is_window_visible(hwnd):
    return user32.IsWindowVisible(hwnd)

def get_window_text(hwnd):
    length = user32.GetWindowTextLengthW(hwnd)
    if not length:
        return ""
    buff = ctypes.create_unicode_buffer(length + 1)
    user32.GetWindowTextW(hwnd, buff, length + 1)
    return buff.value

def enum_windows_callback(hwnd, results):
    if is_window_visible(hwnd):
        title = get_window_text(hwnd)
        if title:
            results.append((hwnd, title))
    return True

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, ctypes.POINTER(ctypes.py_object))

def get_open_windows():
    results = []
    # Create the callback function
    cb = WNDENUMPROC(enum_windows_callback)
    
    # Needs to pass a pointer to the python object 'results' so the callback can append to it
    # BUT ctypes callback logic with custom data is tricky. 
    # Simpler: Use a global list or a class, or just iterate without passing data pointer if possible (ctypes usually allows closure if defined inside)
    
    # Actually, simpler approach for ctypes callback:
    
    local_results = []
    def callback(hwnd, extra):
        if user32.IsWindowVisible(hwnd):
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buff = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buff, length + 1)
                title = buff.value
                # Filter out some common system windows if needed, but for now list all
                if title:
                    local_results.append(title)
        return True
    
    c_callback = WNDENUMPROC(callback)
    user32.EnumWindows(c_callback, 0)
    return local_results

if __name__ == "__main__":
    windows = get_open_windows()
    for w in windows:
        print(f"Window: {w}")
