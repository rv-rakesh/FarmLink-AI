"""Text-to-speech service for FarmLink AI voice simulator."""
import asyncio
import base64
import io

import edge_tts


VOICE_MAP = {
    "en": "en-IN-NeerjaNeural",
    "hi": "hi-IN-SwaraNeural",
    "mr": "mr-IN-AarohiNeural",
}


async def _synthesize(text, language):
    voice = VOICE_MAP.get(language, VOICE_MAP["en"])
    communicate = edge_tts.Communicate(text, voice)
    audio = bytearray()

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])

    if not audio:
        raise RuntimeError("TTS returned no audio")

    return bytes(audio)


def synthesize_audio(text, language="en"):
    if not text:
        return None

    audio = asyncio.run(_synthesize(str(text), language))
    return {
        "provider": "Microsoft Neural TTS",
        "language": language,
        "mime_type": "audio/mpeg",
        "audio_base64": base64.b64encode(audio).decode("ascii"),
    }
