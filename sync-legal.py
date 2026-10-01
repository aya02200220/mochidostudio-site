#!/usr/bin/env python3
"""アプリ内の規約 HTML（CardDock リポジトリ）からサイト用ページを生成する。

⚠️ carddock/privacy.html と carddock/terms.html は、このスクリプトの生成物です。
   直接編集しないこと（次の実行で上書きされます）。
   - 本文を直す        → CardDock リポジトリの Resources/Legal/legal-*.html
   - 見た目を直す      → assets/site.css
   - ヘッダー・フッター → このファイルの HEADER / FOOTER
   - <head> の中身      → このファイルの head_block()
"""
import pathlib
import sys

SITE = "https://mochidostudio.com"
SRC = pathlib.Path.home() / "LocalRepository/CardDock/CardDock/Resources/Legal"
OUT = pathlib.Path(__file__).parent / "carddock"

STYLE_FROM = '<link rel="stylesheet" href="legal-style.css">'
STYLE_TO = '<link rel="stylesheet" href="/assets/site.css">'

HEADER = """<a class="skip-link" href="#main">本文へスキップ</a>
<header class="site-header"><div class="wrap">
<a class="brand" href="/">Mochido Studio</a>
<nav aria-label="メインナビゲーション"><a href="/carddock/">CardDock</a><a href="/business/">事業者情報</a></nav>
</div></header>
<main id="main"><div class="wrap">"""

FOOTER = """</div></main>
<footer class="site-footer"><div class="wrap">
<p><a href="/carddock/">CardDock について</a></p>
<p>&copy; 2026 Mochido Studio</p>
</div></footer>"""


def head_block(path, title, desc):
    url = f"{SITE}{path}"
    return f"""<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#1c1b26">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Mochido Studio">
<meta property="og:locale" content="ja_JP">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}/assets/og-carddock.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="CardDock — ポイントカード・会員証・決済アプリを 1 か所に">
<meta name="twitter:card" content="summary_large_image">"""


PAGES = [
    {
        "src": "legal-privacy.html",
        "out": "privacy.html",
        "title": "CardDock プライバシーポリシー",
        "desc": "iPhone 向けアプリ CardDock における利用者の情報の取り扱いについて定めたものです。",
    },
    {
        "src": "legal-terms.html",
        "out": "terms.html",
        "title": "CardDock 利用規約",
        "desc": "iPhone 向けアプリ CardDock のご利用にあたっての条件を定めたものです。",
    },
]

for page in PAGES:
    src = SRC / page["src"]
    if not src.exists():
        sys.exit(f"見つかりません: {src}")
    html = src.read_text(encoding="utf-8")
    if STYLE_FROM not in html:
        sys.exit(f"スタイルシートの行が見つかりません: {src}")

    head = head_block(f'/carddock/{page["out"]}', page["title"], page["desc"])
    html = html.replace(STYLE_FROM, STYLE_TO + "\n" + head, 1)
    html = html.replace("<body>", "<body>\n" + HEADER, 1)
    html = html.replace("</body>", FOOTER + "\n</body>", 1)

    (OUT / page["out"]).write_text(html, encoding="utf-8")
    print(f'生成: carddock/{page["out"]}  （元: {page["src"]}）')
