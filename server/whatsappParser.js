const messagePattern =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2})\s?(am|pm|AM|PM)?\s-\s([^:]+):\s(.*)$/;

function normalizeTimestamp(dateText, timeText, meridiem) {
  return `${dateText} ${timeText}${meridiem ? ` ${meridiem.toUpperCase()}` : ""}`;
}

export function parseWhatsAppChat(rawText, sourceFile) {
  const messages = [];
  let currentMessage = null;

  rawText.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const match = line.match(messagePattern);

    if (match) {
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const [, dateText, timeText, meridiem, sender, message] = match;
      currentMessage = {
        timestamp: normalizeTimestamp(dateText, timeText, meridiem),
        sender: sender.trim(),
        message: message.trim(),
        sourceFile,
      };
      return;
    }

    if (currentMessage) {
      currentMessage.message += `\n${line}`;
    }
  });

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}
