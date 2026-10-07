#!/usr/bin/env python3
"""アプリ内の規約 HTML（CardDock リポジトリ）からサイト用ページを生成する。

⚠️ carddock/privacy.html と carddock/terms.html（英語版は carddock/en/ の同名ファイル）は、
   このスクリプトの生成物です。直接編集しないこと（次の実行で上書きされます）。
   - 本文を直す        → CardDock リポジトリの Resources/Legal/legal-*.html（英語版は legal-*-en.html）
   - 見た目を直す      → assets/site.css
   - ヘッダー・フッター → このファイルの LANGS の header / footer
   - <head> の中身      → このファイルの head_block()

使い方:
    python3 sync-legal.py                      # 既定の場所（~/LocalRepository/CardDock/...）から生成
    python3 sync-legal.py <Legal フォルダ>      # 別の場所（worktree など）から生成
    CARDDOCK_LEGAL_DIR=<Legal フォルダ> python3 sync-legal.py

英語版（legal-*-en.html）が元のフォルダにあるときだけ、carddock/en/ に英語のページも作り、
日本語・英語の両方のページに言語の切り替えリンクを付ける。
"""
import os
import pathlib
import sys

SITE = "https://mochidostudio.com"
DEFAULT_SRC = pathlib.Path.home() / "LocalRepository/CardDock/CardDock/Resources/Legal"
ROOT = pathlib.Path(__file__).parent

if len(sys.argv) > 1:
    SRC = pathlib.Path(sys.argv[1]).expanduser()
elif os.environ.get("CARDDOCK_LEGAL_DIR"):
    SRC = pathlib.Path(os.environ["CARDDOCK_LEGAL_DIR"]).expanduser()
else:
    SRC = DEFAULT_SRC

STYLE_FROM = '<link rel="stylesheet" href="legal-style.css">'
STYLE_TO = '<link rel="stylesheet" href="/assets/site.css">'

# 言語ごとの設定。dir はサイトの中の置き場所（/carddock/ からの相対）、suffix は元ファイル名の後ろ。
LANGS = {
    "ja": {
        "dir": "",
        "suffix": "",
        "og_locale": "ja_JP",
        "og_image_alt": "CardDock — ポイントカード・会員証・決済アプリを 1 か所に",
        "switch_label": "日本語",
        "header": """<a class="skip-link" href="#main">本文へスキップ</a>
<header class="site-header"><div class="wrap">
<a class="brand" href="/">Mochido Studio</a>
<nav aria-label="メインナビゲーション"><a href="/carddock/">CardDock</a><a href="/business/">事業者情報</a></nav>
</div></header>
<main id="main"><div class="wrap">""",
        "footer": """</div></main>
<footer class="site-footer"><div class="wrap">
<p><a href="/carddock/">CardDock について</a></p>
<p>&copy; 2026 Mochido Studio</p>
</div></footer>""",
    },
    "en": {
        "dir": "en/",
        "suffix": "-en",
        "og_locale": "en_US",
        "og_image_alt": "CardDock — point card, membership, and payment apps in one place",
        "switch_label": "English",
        "header": """<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="wrap">
<a class="brand" href="/">Mochido Studio</a>
<nav aria-label="Main navigation"><a href="/carddock/">CardDock</a><a href="/business/">Business Information</a></nav>
</div></header>
<main id="main"><div class="wrap">""",
        "footer": """</div></main>
<footer class="site-footer"><div class="wrap">
<p><a href="/carddock/">About CardDock</a></p>
<p>&copy; 2026 Mochido Studio</p>
</div></footer>""",
    },
}

PAGES = [
    {
        "src": "legal-privacy",
        "out": "privacy.html",
        "title": {"ja": "CardDock プライバシーポリシー", "en": "CardDock Privacy Policy"},
        "desc": {
            "ja": "iPhone 向けアプリ CardDock における利用者の情報の取り扱いについて定めたものです。",
            "en": "How user information is handled in CardDock, an app for iPhone.",
        },
    },
    {
        "src": "legal-terms",
        "out": "terms.html",
        "title": {"ja": "CardDock 利用規約", "en": "CardDock Terms of Use"},
        "desc": {
            "ja": "iPhone 向けアプリ CardDock のご利用にあたっての条件を定めたものです。",
            "en": "The conditions for using CardDock, an app for iPhone.",
        },
    },
]


def page_path(lang, out):
    return f'/carddock/{LANGS[lang]["dir"]}{out}'


def head_block(lang, path, title, desc, alternates):
    url = f"{SITE}{path}"
    conf = LANGS[lang]
    alt_links = "".join(
        f'\n<link rel="alternate" hreflang="{code}" href="{SITE}{alt_path}">'
        for code, alt_path in alternates
    )
    return f"""<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">{alt_links}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#1c1b26">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Mochido Studio">
<meta property="og:locale" content="{conf["og_locale"]}">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}/assets/og-carddock.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{conf["og_image_alt"]}">
<meta name="twitter:card" content="summary_large_image">"""


def switch_block(others):
    """ほかの言語のページへのリンク（本文の一番上に小さく出す）。"""
    links = " / ".join(
        f'<a href="{path}" hreflang="{code}" lang="{code}">{LANGS[code]["switch_label"]}</a>'
        for code, path in others
    )
    return f'<p class="note">{links}</p>'


def source(page, lang):
    return SRC / f'{page["src"]}{LANGS[lang]["suffix"]}.html'


if not SRC.is_dir():
    sys.exit(f"見つかりません: {SRC}")

for page in PAGES:
    langs = [lang for lang in LANGS if source(page, lang).exists()]
    if "ja" not in langs:
        sys.exit(f'見つかりません: {source(page, "ja")}')
    # 2 言語以上あるときだけ、hreflang と切り替えリンクを付ける（日本語だけなら前と同じページになる）
    multi = len(langs) > 1

    for lang in langs:
        src = source(page, lang)
        html = src.read_text(encoding="utf-8")
        if STYLE_FROM not in html:
            sys.exit(f"スタイルシートの行が見つかりません: {src}")

        path = page_path(lang, page["out"])
        alternates = [(code, page_path(code, page["out"])) for code in langs] if multi else []
        others = [(code, p) for code, p in alternates if code != lang]

        head = head_block(lang, path, page["title"][lang], page["desc"][lang], alternates)
        header = LANGS[lang]["header"]
        if others:
            header += "\n" + switch_block(others)

        html = html.replace(STYLE_FROM, STYLE_TO + "\n" + head, 1)
        html = html.replace("<body>", "<body>\n" + header, 1)
        html = html.replace("</body>", LANGS[lang]["footer"] + "\n</body>", 1)

        out_dir = ROOT / "carddock" / LANGS[lang]["dir"]
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / page["out"]).write_text(html, encoding="utf-8")
        print(f'生成: carddock/{LANGS[lang]["dir"]}{page["out"]}  （元: {src.name}）')
