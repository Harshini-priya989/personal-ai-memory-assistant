import os
import sys

from flask import Flask, abort, request
from twilio.twiml.messaging_response import MessagingResponse

try:
    from agents import MemoryAssistant
except ModuleNotFoundError:
    from src.agents import MemoryAssistant


MAX_WHATSAPP_REPLY_LENGTH = 1500

app = Flask(__name__)
assistant = MemoryAssistant()


def configure_output():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")


def allowed_senders():
    raw_senders = os.getenv("WHATSIN_ALLOWED_SENDERS", "")
    return {sender.strip() for sender in raw_senders.split(",") if sender.strip()}


def is_sender_allowed(sender):
    allowed = allowed_senders()
    return not allowed or sender in allowed


def clamp_reply(text):
    if len(text) <= MAX_WHATSAPP_REPLY_LENGTH:
        return text

    return text[: MAX_WHATSAPP_REPLY_LENGTH - 3].rstrip() + "..."


@app.post("/whatsapp")
def whatsapp_webhook():
    sender = request.form.get("From", "")
    question = request.form.get("Body", "").strip()

    if not is_sender_allowed(sender):
        abort(403)

    response = MessagingResponse()

    if not question:
        response.message("Send me a question about your saved WhatsApp chats.")
        return str(response)

    result = assistant.answer_question(question)
    response.message(clamp_reply(result["answer"].output))

    return str(response)


if __name__ == "__main__":
    configure_output()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
