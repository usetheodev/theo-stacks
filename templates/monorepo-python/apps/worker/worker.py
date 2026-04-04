import logging
import signal
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os

from shared.config import VERSION
from shared.logging import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

running = True


def signal_handler(sig, frame):
    global running
    logger.info("Shutdown signal received")
    running = False


signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        elif self.path == "/ready":
            # Customize: add database/redis connectivity checks for production
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ready"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


def main():
    port = int(os.environ.get("PORT", 8001))
    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    server.timeout = 1

    logger.info(f"Worker starting (version {VERSION}), health on port {port}")

    while running:
        server.handle_request()
        logger.info("Worker tick")
        time.sleep(10)

    logger.info("Worker stopped")


if __name__ == "__main__":
    main()
