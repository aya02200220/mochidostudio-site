#!/usr/bin/env python3
"""アプリ内の規約 HTML（CardDock リポジトリ）からサイト用ページを生成する。
アプリ側を直したら、このスクリプトを実行し直せばサイトにも反映される。"""
import pathlib, re, sys

SRC = pathlib.Path.home() / "LocalRepository/CardDock/CardDock/Resources/Legal"
OUT = pathlib.Path(__file__).parent / "carddock"

HEADER = """<header class="site-header"><div class="wrap">
<a class="brand" href="/">Mochido Studio</a>
<nav><a href="/carddock/">CardDock</a></nav>
</div></header>
<main><div class="wrap">"""

FOOTER = """</div></main>
<footer class="site-footer"><div class="wrap">
<p><a href="/carddock/">&larr; CardDock について</a></p>
<p>&copy; 2026 Mochido Studio</p>
</div></footer>"""

PAGES = {"legal-privacy.html": "privacy.html", "legal-terms.html": "terms.html"}

for src_name, out_name in PAGES.items():
    src = SRC / src_name
    if not src.exists():
        sys.exit(f"見つかりません: {src}")
    html = src.read_text(encoding="utf-8")
    html = html.replace(
        '<link rel="stylesheet" href="legal-style.css">',
        '<link rel="stylesheet" href="/assets/site.css">')
    html = re.sub(r"<body>", "<body>\n" + HEADER, html, count=1)
    html = re.sub(r"</body>", FOOTER + "\n</body>", html, count=1)
    (OUT / out_name).write_text(html, encoding="utf-8")
    print(f"生成: carddock/{out_name}  （元: {src_name}）")
