from pathlib import Path

root = Path(__file__).resolve().parents[2]
target = root / '.github/workflows/apply_drop_upgrade.py'
text = target.read_text(encoding='utf-8')
needle = "\n'''\n}"
if needle in text:
    text = text.replace(needle, "\n}", 1)
else:
    text = text.replace("\n'''\n", "\n", 1)
target.write_text(text, encoding='utf-8')
exec(compile(text, str(target), 'exec'), {'__name__': '__main__'})
