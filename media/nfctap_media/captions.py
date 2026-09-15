from __future__ import annotations

from pathlib import Path

from nfctap_media.config import Config
from nfctap_media.tts import Word

# Amarillo marca #FFD400. En ASS el color va BGR.
_YELLOW = r"\c&H00D4FF&\3c&H000010&\bord8\shad0\b1"


def _ass_time(seconds: float) -> str:
    if seconds < 0:
        seconds = 0
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _chunk_words(words: list[Word], size: int = 3) -> list[list[Word]]:
    chunks: list[list[Word]] = []
    current: list[Word] = []
    for word in words:
        if current:
            prev = current[-1].text
            starts_sentence = word.text[:1].isupper() and prev[-1:].islower()
            if starts_sentence and len(current) >= 1:
                chunks.append(current)
                current = []
        current.append(word)
        punct = word.text.endswith((".", ",", "?", "!", ";", ":"))
        if len(current) >= size or punct:
            chunks.append(current)
            current = []
    if current:
        chunks.append(current)
    return chunks


def write_ass(
    words: list[Word],
    dest: Path,
    cfg: Config,
    hook_until: float = 0.0,
    close_from: float | None = None,
    close_until: float | None = None,
    close_lines: list[str] | None = None,
) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    hook_size = max(cfg.subtitle_fontsize + 16, 84)
    close_size = max(cfg.subtitle_fontsize + 8, 76)
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {cfg.width}
PlayResY: {cfg.height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,{cfg.subtitle_fontsize},&H0000D4FF,&H000000FF,&H00001010,&H64000000,-1,0,0,0,100,100,0,0,1,8,0,2,70,70,{cfg.subtitle_margin_v},1
Style: Hook,Arial,{hook_size},&H0000D4FF,&H000000FF,&H00001010,&H64000000,-1,0,0,0,100,100,0,0,1,9,0,2,50,50,{cfg.subtitle_margin_v},1
Style: Close,Arial,{close_size},&H0000D4FF,&H000000FF,&H00101010,&H96000000,-1,0,0,0,100,100,0,0,3,12,0,2,48,48,{cfg.subtitle_margin_v + 40},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    rest: list[Word] = []
    close_chunks: list[Word] = []
    for w in words:
        if close_from is not None and w.start >= close_from - 0.05:
            close_chunks.append(w)
        else:
            rest.append(w)
    for chunk in _chunk_words(rest):
        start = chunk[0].start
        end = max(chunk[-1].end, start + 0.35)
        text = " ".join(w.text.replace("\n", " ") for w in chunk)
        text = text.replace("{", "").replace("}", "")
        style = "Hook" if start < hook_until else "Default"
        lines.append(
            f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},{style},,0,0,0,,"
            f"{{\\fad(80,80){_YELLOW}}}{text}\n"
        )
    if close_from is not None:
        if close_lines:
            text = r"\N".join(line.replace("{", "").replace("}", "") for line in close_lines if line)
        elif close_chunks:
            text = " ".join(w.text.replace("\n", " ") for w in close_chunks)
            text = text.replace("{", "").replace("}", "")
        else:
            text = ""
        if text:
            start = close_from
            if close_chunks:
                start = min(close_from, close_chunks[0].start)
            end = close_until if close_until is not None else start + 3.0
            if close_chunks:
                end = max(end, close_chunks[-1].end + 0.35)
            end = max(end, start + 0.8)
            lines.append(
                f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Close,,0,0,0,,"
                f"{{\\fad(100,120){_YELLOW}}}{text}\n"
            )
    dest.write_text("".join(lines), encoding="utf-8")
    return dest
