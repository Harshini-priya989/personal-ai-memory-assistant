import json
import re
from datetime import datetime
from pathlib import Path


RAW_CHAT_PATH = Path("data/raw/training_whatsapp_chat.txt")
OUTPUT_PATH = Path("data/processed/messages.json")


MESSAGE_PATTERN = re.compile(
    r"^(\d{1,2}/\d{1,2}/\d{2,4}),\s(\d{1,2}:\d{2})\s?(am|pm|AM|PM)?\s-\s([^:]+):\s(.*)$"
)


def parse_timestamp(date_text, time_text, meridiem):
    raw = f"{date_text} {time_text}"
    formats = []

    if meridiem:
        raw = f"{raw} {meridiem.upper()}"
        formats = [
            "%d/%m/%y %I:%M %p",
            "%d/%m/%Y %I:%M %p",
            "%m/%d/%y %I:%M %p",
            "%m/%d/%Y %I:%M %p",
        ]
    else:
        formats = [
            "%d/%m/%y %H:%M",
            "%d/%m/%Y %H:%M",
            "%m/%d/%y %H:%M",
            "%m/%d/%Y %H:%M",
        ]

    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).isoformat()
        except ValueError:
            continue

    return raw


def parse_whatsapp_chat(raw_text):
    messages = []
    current_message = None

    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue

        match = MESSAGE_PATTERN.match(line)

        if match:
            if current_message:
                messages.append(current_message)

            date_text, time_text, meridiem, sender, message = match.groups()

            current_message = {
                "timestamp": parse_timestamp(date_text, time_text, meridiem),
                "sender": sender.strip(),
                "message": message.strip(),
            }
        else:
            if current_message:
                current_message["message"] += "\n" + line

    if current_message:
        messages.append(current_message)

    return messages


def main():
    if not RAW_CHAT_PATH.exists():
        raise FileNotFoundError(f"Could not find file: {RAW_CHAT_PATH}")

    raw_text = RAW_CHAT_PATH.read_text(encoding="utf-8")
    messages = parse_whatsapp_chat(raw_text)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(messages, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Parsed {len(messages)} messages")
    print(f"Saved output to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
