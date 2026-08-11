#!/usr/bin/env python3
"""Local preview server for the MultiNet site.

    python3 serve.py            # http://127.0.0.1:8899
    python3 serve.py 9000       # pick a port

Use this rather than `python3 -m http.server`. That one sends no
cache headers at all, so browsers apply their own heuristic and
happily keep serving an index.html from a minute ago - which shows
up as new markup rendered with old styles, and looks like a bug in
the page rather than in the cache.

GitHub Pages sends short cache lifetimes of its own, so this only
affects local review.
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 404s are worth seeing; the rest is noise while clicking around.
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    handler = partial(NoCacheHandler, directory=".")
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print("MultiNet site  ->  http://127.0.0.1:%d" % port)
        print("Cache disabled, so a plain reload always shows your latest edit.")
        print("Ctrl-C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
