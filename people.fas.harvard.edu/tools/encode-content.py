#!/usr/bin/env python3
"""Encode docs/content.html into docs/content.enc.

The homepage ships as an empty shell: index.html carries only the head and the
gate, and the page itself lives in content.enc, which gate.js decodes and
injects once a visitor has answered the challenge. So a crawler that fetches
the URL and reads the HTML source finds no article titles and no mail address
-- it has to run the JavaScript to see anything.

The transform is XOR against a repeating key, then base64. It is obfuscation,
not encryption: the key sits in gate.js, in the open. It costs a scraper an
extra step; it does not stop anyone who looks.

    ./tools/encode-content.py     # run after every edit to content.html

content.html is the source of truth and is excluded from deploy.sh, so the
plaintext never reaches either host.
"""

import base64
import pathlib

# Must match KEY in docs/gate.js.
KEY = b"une-lecture-attentive"

root = pathlib.Path(__file__).resolve().parent.parent
src = root / "docs" / "content.html"
dst = root / "docs" / "content.enc"

plain = src.read_bytes()
cipher = bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(plain))
dst.write_bytes(base64.b64encode(cipher))

print(f"{src.name} ({len(plain)} bytes) -> {dst.name} ({dst.stat().st_size} bytes)")
