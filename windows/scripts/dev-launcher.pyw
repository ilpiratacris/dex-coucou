"""Run the checked-out Goo Windows app without opening a console window."""

import msvcrt
import os
from pathlib import Path
import subprocess
import time


ROOT = Path(__file__).resolve().parents[2]
WINDOWS = ROOT / "windows"
RUNTIME = ROOT.parent / "dev-runtime"
LOCK = RUNTIME / "launcher.lock"
PID = RUNTIME / "launcher.pid"
STOP = RUNTIME / "stop"
LOG = RUNTIME / "tauri-dev.log"
FLAGS = subprocess.CREATE_NO_WINDOW


def main():
    RUNTIME.mkdir(exist_ok=True)
    with LOCK.open("a+b") as lock:
        lock.seek(0)
        lock.write(b"0")
        lock.flush()
        lock.seek(0)
        try:
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            return
        STOP.unlink(missing_ok=True)
        PID.write_text(str(os.getpid()), encoding="ascii")
        try:
            with LOG.open("a", encoding="utf-8") as log:
                log.write(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting Goo from {WINDOWS}\n")
                log.flush()
                child = subprocess.Popen(
                    ["cmd.exe", "/d", "/c", "npm.cmd", "run", "tauri", "dev"],
                    cwd=WINDOWS,
                    stdin=subprocess.DEVNULL,
                    stdout=log,
                    stderr=subprocess.STDOUT,
                    creationflags=FLAGS,
                )
                while child.poll() is None:
                    if STOP.exists():
                        subprocess.run(
                            ["taskkill.exe", "/T", "/F", "/PID", str(child.pid)],
                            stdout=log,
                            stderr=subprocess.STDOUT,
                            creationflags=FLAGS,
                            check=False,
                        )
                        break
                    time.sleep(2)
                log.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Development process exited\n")
        finally:
            PID.unlink(missing_ok=True)
            STOP.unlink(missing_ok=True)
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)


if __name__ == "__main__":
    main()
