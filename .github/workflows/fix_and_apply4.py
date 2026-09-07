from pathlib import Path

root = Path(__file__).resolve().parents[2]
target = root / '.github/workflows/apply_drop_upgrade.py'
lines = target.read_text(encoding='utf-8').splitlines()
while lines and lines[-1].strip() in {"'''", "}"}:
    lines.pop()
text = '\n'.join(lines) + '\n'
target.write_text(text, encoding='utf-8')
exec(compile(text, str(target), 'exec'), {'__name__': '__main__'})
