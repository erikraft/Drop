from pathlib import Path

root = Path(__file__).resolve().parents[2]
target = root / '.github/workflows/apply_drop_upgrade.py'
text = target.read_text(encoding='utf-8')
if text.rstrip().endswith("'''\n}") or text.rstrip().endswith("'''\n"):
    text = text.rstrip()
    if text.endswith("'''"):
        text = text[:-3]
        target.write_text(text.rstrip() + "\n", encoding='utf-8')
exec(compile(target.read_text(encoding='utf-8'), str(target), 'exec'), {'__name__': '__main__'})
