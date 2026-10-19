import { useEffect, useState } from "react";

// Phones rarely have a Latin voice; an Italian one reads Latin the church way
// (ecclesiastical pronunciation), which suits the liturgical sets.
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase().startsWith("la")) ?? voices.find((v) => v.lang.toLowerCase().startsWith("it")) ?? null;
}

/** The voice to read Latin with, or null when the device has none (then no speaker buttons are shown). */
export function useLatinVoice(): SpeechSynthesisVoice | null {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const update = () => setVoice(pickVoice());
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  return voice;
}

export function speak(text: string, voice: SpeechSynthesisVoice): void {
  const synth = window.speechSynthesis;
  synth.cancel();
  // Macrons and breves are only for the reader; the voice would stumble on them.
  const u = new SpeechSynthesisUtterance(text.normalize("NFD").replace(/[̄̆]/g, "").normalize("NFC"));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.85;
  synth.speak(u);
}
