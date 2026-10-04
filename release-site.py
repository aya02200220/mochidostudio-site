#!/usr/bin/env python3
"""CardDock が App Store で公開されたら実行して、サイトを「配信中」の表記に切り替える。

    python3 release-site.py --dry-run   # 置き換え箇所がまだ全部あるか確認（書き込まない）
    python3 release-site.py             # 実行
    git add -u && git commit -m "CardDock を配信中の表記に" && git push

2026-10-03 に用意。1.0 の審査中に、承認後の差し替えを先に書いておいたもの。
"""
import os, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
URL  = "https://apps.apple.com/app/id6811987779"

EDITS = {
 "carddock/index.html": [
  ('<span class="badge">リリース準備中</span>',
   '<span class="badge">App Store で配信中</span>'),

  ('<div class="product-actions"><a class="button" href="#features">できることを見る</a>'
   '<a class="button button-secondary" href="#pricing">料金を見る</a></div>',
   f'<div class="product-actions"><a class="button" href="{URL}">App Store でダウンロード</a>'
   '<a class="button button-secondary" href="#features">できることを見る</a>'
   '<a class="button button-secondary" href="#pricing">料金を見る</a></div>'),

  ('App Store での配信に向けて準備中です。', 'App Store で配信中です。'),
  ('App Store 掲載予定画像 · 開発中', 'App Store 掲載画像'),
  ('CardDock の App Store 掲載予定画像。', 'CardDock の App Store 掲載画像。'),
  ('<p class="note">リリース後は、次の手順でお使いいただけます。</p>',
   '<p class="note">次の手順でお使いいただけます。</p>'),
  ('<tr><th>提供地域</th><td>日本（順次拡大予定）</td></tr>',
   '<tr><th>提供地域</th><td>全世界（表示言語は日本語のみ）</td></tr>'),
 ],
 "index.html": [
  ('<span class="app-status st-soon">近日公開</span>',
   '<span class="app-status st-live">配信中</span>'),
 ],
 "assets/site.css": [
  ('.st-dev { color: var(--sub); border: 1px solid var(--line); }',
   '.st-dev { color: var(--sub); border: 1px solid var(--line); }\n'
   '.st-live { color: #fff; background: var(--accent); }'),
 ],
}

missing = []
for path, subs in EDITS.items():
    full = os.path.join(ROOT, path)
    t = open(full, encoding="utf-8").read()
    for old, new in subs:
        if old not in t:
            missing.append(f"{path}: {old[:50]}…")
        t = t.replace(old, new)
    if "--dry-run" not in sys.argv:
        open(full, "w", encoding="utf-8").write(t)

if missing:
    print("⚠️ 見つからなかった箇所（手で確認）:")
    for m in missing: print("  ", m)
else:
    print("すべて置き換えました" if "--dry-run" not in sys.argv else "すべて一致（書き込みなし）")
print("App Store URL:", URL)
