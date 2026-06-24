import { useState, useRef, useEffect } from "react";
const LANGUAGES = [
  { code: "en", name: "English", speech: "en-IN" },
  { code: "hi", name: "हिंदी", speech: "hi-IN" },
  { code: "ta", name: "தமிழ்", speech: "ta-IN" },
  { code: "te", name: "తెలుగు", speech: "te-IN" },
  { code: "mr", name: "मराठी", speech: "mr-IN" },
  { code: "bn", name: "বাংলা", speech: "bn-IN" },
  { code: "gu", name: "ગુજરાતી", speech: "gu-IN" },
  { code: "kn", name: "ಕನ್ನಡ", speech: "kn-IN" },
  { code: "ml", name: "മലയാളം", speech: "ml-IN" },
  { code: "pa", name: "ਪੰਜਾਬੀ", speech: "pa-IN" },
  { code: "ur", name: "اردو", speech: "ur-PK" },
  { code: "or", name: "ଓଡ଼ିଆ", speech: "or-IN" },
];
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
async function callClaude(messages, system) {
  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system, max_tokens: 1000 }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.content.map((b) => b.text || "").join("");
}
function MicButton({ onResult, lang, size = 64 }) {
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);
  const toggle = () => {
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported"); return; }
    const r = new SR();
    r.lang = lang;
    r.interimResults = false;
    r.onresult = (e) => { onResult(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recogRef.current = r;
    r.start();
    setListening(true);
  };
  return (
    <button onClick={toggle} style={{
      width: size, height: size, borderRadius: "50%",
      background: listening ? "#c0392b" : "#F2A93B",
      border: "none", cursor: "pointer", fontSize: size * 0.38,
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: listening ? "pulse 1.2s ease-in-out infinite" : "none",
      boxShadow: "0 4px 14px rgba(242,169,59,0.45)",
      transition: "background 0.2s", flexShrink: 0,
    }}>
      {listening ? "⏹" : "🎤"}
    </button>
  );
}
function SpeakButton({ text, lang, label }) {
  const [speaking, setSpeaking] = useState(false);
  const speak = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };
  return (
    <button onClick={speak} style={{
      background: speaking ? "#155a2e" : "#2e7d52", color: "#fff",
      border: "none", borderRadius: 20, padding: "6px 14px",
      cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5,
    }}>
      {speaking ? "⏹" : "🔊"} {label}
    </button>
  );
    }
function PlantTab({ lang, t }) {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef();
  const langObj = LANGUAGES.find((l) => l.code === lang);
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
      setResult(null); setError("");
    };
    reader.readAsDataURL(file);
  };
  const analyze = async () => {
    if (!imageBase64) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const langName = langObj?.name || "English";
      const system = `You are KrishiSahayak, an expert agricultural plant disease diagnostician. Always respond in ${langName}. Return ONLY valid JSON with exactly these keys: diagnosis, remedy, prevention. No markdown, no extra text.`;
      const messages = [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
          { type: "text", text: `Analyze this crop/plant image. Identify diseases, pests, or issues. Respond in ${langName} as JSON only.` }
        ]
      }];
      const raw = await callClaude(messages, system);
      const clean = raw.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch (e) { setError("Analysis failed: " + e.message); }
    setLoading(false);
  };
  return (
    <div style={{ padding: "16px 0" }}>
      <div onClick={() => fileRef.current.click()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => e.preventDefault()}
        style={{ border: "2.5px dashed #2e7d52", borderRadius: 16, minHeight: 190,
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", cursor: "pointer", background: "#f0f7f3", overflow: "hidden" }}>
        {image ? <img src={image} alt="crop" style={{ width: "100%", maxHeight: 260, objectFit: "cover" }} />
          : <><div style={{ fontSize: 52 }}>📷</div><div style={{ color: "#2e7d52", fontWeight: 600, marginTop: 8 }}>{t.uploadPrompt}</div></>}
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
        <button onClick={analyze} disabled={!imageBase64 || loading} style={{
          flex: 1, padding: "15px 0", borderRadius: 12,
          background: imageBase64 && !loading ? "#1B5E3F" : "#bbb",
          color: "#fff", border: "none", fontSize: 16, fontWeight: 700,
          cursor: imageBase64 && !loading ? "pointer" : "not-allowed" }}>
          {loading ? t.analyzing : "🔍 Analyze Plant"}
        </button>
        <MicButton onResult={() => {}} lang={langObj?.speech} size={54} />
      </div>
      {error && <div style={{ color: "#c0392b", marginTop: 12, padding: 12, background: "#fdecea", borderRadius: 10 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { key: "diagnosis", icon: "🔬", color: "#c0392b", bg: "#fdecea", label: t.diagnosis },
            { key: "remedy", icon: "💊", color: "#1B5E3F", bg: "#e8f5e9", label: t.remedy },
            { key: "prevention", icon: "🛡️", color: "#1565C0", bg: "#e3f2fd", label: t.prevention },
          ].map(({ key, icon, color, bg, label }) => (
            <div key={key} style={{ background: bg, borderRadius: 14, padding: "14px 16px", borderLeft: `4px solid ${color}` }}>
              <div style={{ color, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{icon} {label}</div>
              <div style={{ color: "#333", lineHeight: 1.65 }}>{result[key]}</div>
              <div style={{ marginTop: 10 }}>
                <SpeakButton text={result[key]} lang={langObj?.speech} label={t.speakBtn} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function ExpertTab({ lang, t }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: t.welcome }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  const langObj = LANGUAGES.find((l) => l.code === lang);
  useEffect(() => { setMessages([{ role: "assistant", content: t.welcome }]); }, [lang, t.welcome]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const send = async (text = input) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const langName = langObj?.name || "English";
      const system = `You are KrishiSahayak, a warm farming expert for Indian farmers. Always respond in ${langName}. Give practical advice on crops, soil, weather, irrigation, fertilizers, pest control.`;
      const reply = await callClaude(newMsgs.map((m) => ({ role: m.role, content: m.content })), system);
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "Sorry, could not connect. Please try again." }]);
    }
    setLoading(false);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 230px)", minHeight: 380 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "84%" }}>
            <div style={{
              background: m.role === "user" ? "#1B5E3F" : "#fff",
              color: m.role === "user" ? "#fff" : "#222",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "12px 16px", lineHeight: 1.65, fontSize: 15,
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>{m.content}</div>
            {m.role === "assistant" && (
              <div style={{ marginTop: 6, paddingLeft: 4 }}>
                <SpeakButton text={m.content} lang={langObj?.speech} label={t.speakBtn} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", background: "#fff", borderRadius: "18px 18px 18px 4px",
            padding: "12px 16px", color: "#999", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
            ⏳ {t.thinking}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 12, borderTop: "1px solid #e8e8e8" }}>
        <MicButton onResult={(txt) => send(txt)} lang={langObj?.speech} size={52} />
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t.typeMessage}
          style={{ flex: 1, padding: "13px 16px", borderRadius: 24, border: "1.5px solid #ddd", fontSize: 15, outline: "none" }} />
        <button onClick={() => send()} style={{
          background: "#1B5E3F", color: "#fff", border: "none",
          borderRadius: "50%", width: 48, height: 48, fontSize: 20,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>➤</button>
      </div>
    </div>
  );
}
const UI_TEXT = {
  en: { plantTab: "🌿 Plant Analysis", expertTab: "💬 Ask Expert", uploadPrompt: "Tap to upload a crop photo", analyzing: "Analyzing...", diagnosis: "Diagnosis", remedy: "Remedy", prevention: "Prevention", typeMessage: "Type your question...", thinking: "Expert is thinking...", welcome: "Namaste! I am KrishiSahayak. Ask me anything about farming, crops, soil, or plant diseases.", speakBtn: "Listen", installBtn: "Install App" },
  hi: { plantTab: "🌿 पौधा विश्लेषण", expertTab: "💬 विशेषज्ञ से पूछें", uploadPrompt: "फसल की फोटो अपलोड करें", analyzing: "विश्लेषण हो रहा है...", diagnosis: "निदान", remedy: "उपाय", prevention: "बचाव", typeMessage: "अपना सवाल लिखें...", thinking: "विशेषज्ञ सोच रहे हैं...", welcome: "नमस्ते! मैं कृषिसहायक हूं। खेती, फसल, मिट्टी के बारे में पूछें।", speakBtn: "सुनें", installBtn: "ऐप इंस्टॉल करें" },
  ta: { plantTab: "🌿 தாவர பகுப்பாய்வு", expertTab: "💬 நிபுணரிடம் கேளுங்கள்", uploadPrompt: "பயிர் புகைப்படம் பதிவேற்றவும்", analyzing: "பகுப்பாய்வு...", diagnosis: "நோயறிதல்", remedy: "தீர்வு", prevention: "தடுப்பு", typeMessage: "கேள்வி தட்டச்சு செய்யுங்கள்...", thinking: "நிபுணர் யோசிக்கிறார்...", welcome: "வணக்கம்! நான் கிருஷிசஹாயக். விவசாயம் பற்றி கேளுங்கள்.", speakBtn: "கேளுங்கள்", installBtn: "நிறுவுங்கள்" },
  te: { plantTab: "🌿 మొక్క విశ్లేషణ", expertTab: "💬 నిపుణుడిని అడగండి", uploadPrompt: "పంట ఫోటో అప్‌లోడ్ చేయండి", analyzing: "విశ్లేషిస్తోంది...", diagnosis: "రోగనిర్ధారణ", remedy: "నివారణ", prevention: "నిరోధం", typeMessage: "ప్రశ్న టైప్ చేయండి...", thinking: "నిపుణుడు ఆలోచిస్తున్నారు...", welcome: "నమస్కారం! నేను కృషిసహాయక్. వ్యవసాయం గురించి అడగండి.", speakBtn: "వినండి", installBtn: "ఇన్‌స్టాల్ చేయండి" },
  mr: { plantTab: "🌿 वनस्पती विश्लेषण", expertTab: "💬 तज्ञांना विचारा", uploadPrompt: "पिकाचा फोटो अपलोड करा", analyzing: "विश्लेषण होत आहे...", diagnosis: "निदान", remedy: "उपाय", prevention: "प्रतिबंध", typeMessage: "प्रश्न टाइप करा...", thinking: "तज्ञ विचार करत आहेत...", welcome: "नमस्कार! मी कृषिसहायक. शेती, पिके याबद्दल विचारा.", speakBtn: "ऐका", installBtn: "इंस्टॉल करा" },
  bn: { plantTab: "🌿 উদ্ভিদ বিশ্লেষণ", expertTab: "💬 বিশেষজ্ঞকে জিজ্ঞাসা", uploadPrompt: "ফসলের ছবি আপলোড করুন", analyzing: "বিশ্লেষণ হচ্ছে...", diagnosis: "রোগ নির্ণয়", remedy: "প্রতিকার", prevention: "প্রতিরোধ", typeMessage: "প্রশ্ন টাইপ করুন...", thinking: "বিশেষজ্ঞ ভাবছেন...", welcome: "নমস্কার! আমি কৃষিসহায়ক। কৃষি সম্পর্কে জিজ্ঞাসা করুন।", speakBtn: "শুনুন", installBtn: "ইনস্টল করুন" },
  gu: { plantTab: "🌿 છોડ વિશ્લેષણ", expertTab: "💬 નિષ્ણાતને પૂછો", uploadPrompt: "પાકનો ફોટો અપલોડ કરો", analyzing: "વિશ્લેષણ થઈ રહ્યું છે...", diagnosis: "નિદાન", remedy: "ઉપાય", prevention: "નિવારણ", typeMessage: "પ્રશ્ન ટાઈપ કરો...", thinking: "નિષ્ણાત વિચારી રહ્યા છે...", welcome: "નમસ્તે! હું કૃષિસહાયક. ખેતી વિશે પૂછો.", speakBtn: "સાંભળો", installBtn: "ઇન્સ્ટોલ કરો" },
  kn: { plantTab: "🌿 ಸಸ್ಯ ವಿಶ್ಲೇಷಣೆ", expertTab: "💬 ತಜ್ಞರನ್ನು ಕೇಳಿ", uploadPrompt: "ಬೆಳೆ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ", analyzing: "ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...", diagnosis: "ರೋಗನಿರ್ಣಯ", remedy: "ಪರಿಹಾರ", prevention: "ತಡೆಗಟ್ಟುವಿಕೆ", typeMessage: "ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ...", thinking: "ತಜ್ಞರು ಯೋಚಿಸುತ್ತಿದ್ದಾರೆ...", welcome: "ನಮಸ್ಕಾರ! ನಾನು ಕೃಷಿಸಹಾಯಕ. ಕೃಷಿ ಬಗ್ಗೆ ಕೇಳಿ.", speakBtn: "ಕೇಳಿ", installBtn: "ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ" },
  ml: { plantTab: "🌿 സസ്യ വിശകലനം", expertTab: "💬 വിദഗ്ധനോട് ചോദിക്കൂ", uploadPrompt: "വിളയുടെ ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യൂ", analyzing: "വിശകലനം ചെയ്യുന്നു...", diagnosis: "രോഗനിർണ്ണയം", remedy: "പ്രതിവിധി", prevention: "പ്രതിരോധം", typeMessage: "ചോദ്യം ടൈപ്പ് ചെയ്യൂ...", thinking: "വിദഗ്ധൻ ചിന്തിക്കുന്നു...", welcome: "നമസ്കാരം! ഞാൻ കൃഷിസഹായക്. കൃഷി ഇവയെക്കുറിച്ച് ചോദിക്കൂ.", speakBtn: "കേൾക്കൂ", installBtn: "ഇൻസ്റ്റോൾ ചെയ്യൂ" },
  pa: { plantTab: "🌿 ਪੌਦਾ ਵਿਸ਼ਲੇਸ਼ਣ", expertTab: "💬 ਮਾਹਰ ਤੋਂ ਪੁੱਛੋ", uploadPrompt: "ਫਸਲ ਦੀ ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ", analyzing: "ਵਿਸ਼ਲੇਸ਼ਣ ਹੋ ਰਿਹਾ ਹੈ...", diagnosis: "ਤਸ਼ਖ਼ੀਸ", remedy: "ਉਪਾਅ", prevention: "ਬਚਾਅ", typeMessage: "ਸਵਾਲ ਲਿਖੋ...", thinking: "ਮਾਹਰ ਸੋਚ ਰਹੇ ਹਨ...", welcome: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਕ੍ਰਿਸ਼ੀਸਹਾਇਕ। ਖੇਤੀ ਬਾਰੇ ਪੁੱਛੋ।", speakBtn: "ਸੁਣੋ", installBtn: "ਇੰਸਟਾਲ ਕਰੋ" },
  ur: { plantTab: "🌿 پودے کا تجزیہ", expertTab: "💬 ماہر سے پوچھیں", uploadPrompt: "فصل کی تصویر اپلوڈ کریں", analyzing: "تجزیہ ہو رہا ہے...", diagnosis: "تشخیص", remedy: "علاج", prevention: "بچاؤ", typeMessage: "سوال لکھیں...", thinking: "ماہر سوچ رہے ہیں...", welcome: "آداب! میں کرشی سہایک۔ کھیتی کے بارے میں پوچھیں۔", speakBtn: "سنیں", installBtn: "انسٹال کریں" },
  or: { plantTab: "🌿 ଉଦ୍ଭିଦ ବିଶ୍ଲେଷଣ", expertTab: "💬 ବିଶେଷଜ୍ଞଙ୍କୁ ପଚାରନ୍ତୁ", uploadPrompt: "ଫସଲ ଫଟୋ ଅପଲୋଡ କରନ୍ତୁ", analyzing: "ବିଶ୍ଲେଷଣ ହେଉଛି...", diagnosis: "ରୋଗ ନିର୍ଣ୍ଣୟ", remedy: "ପ୍ରତିକାର", prevention: "ପ୍ରତିରୋଧ", typeMessage: "ପ୍ରଶ୍ନ ଟାଇପ କରନ୍ତୁ...", thinking: "ବିଶେଷଜ୍ଞ ଭାବୁଛନ୍ତି...", welcome: "ନମସ୍କାର! ମୁଁ କୃଷିସହାୟକ। ଚାଷ ବିଷୟରେ ପଚାରନ୍ତୁ।", speakBtn: "ଶୁଣନ୍ତୁ", installBtn: "ଇନଷ୍ଟଲ କରନ୍ତୁ" },
};
function LangPicker({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.4)",
        color: "#fff", borderRadius: 20, padding: "6px 12px",
        cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
        🌐 {current?.name}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 44, background: "#fff",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          zIndex: 999, minWidth: 165, maxHeight: 320, overflowY: "auto" }}>
          {LANGUAGES.map((l) => (
            <div key={l.code} onClick={() => { setLang(l.code); setOpen(false); }} style={{
              padding: "10px 16px", cursor: "pointer", fontSize: 14,
              background: l.code === lang ? "#e8f5e9" : "#fff",
              color: l.code === lang ? "#1B5E3F" : "#333",
              fontWeight: l.code === lang ? 700 : 400,
              borderBottom: "1px solid #f5f5f5" }}>{l.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
export default function App() {
  const [tab, setTab] = useState("plant");
  const [lang, setLang] = useState("hi");
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const t = UI_TEXT[lang] || UI_TEXT.en;
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  return (
    <>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#FBF8F1;font-family:'Segoe UI',system-ui,sans-serif}@keyframes pulse{0%,100%{box-shadow:0 0 0 4px rgba(242,169,59,0.4)}50%{box-shadow:0 0 0 12px rgba(242,169,59,0.15)}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:4px}`}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#1B5E3F", padding: "16px 20px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#F2A93B", fontSize: 21, fontWeight: 800 }}>🌾 KrishiSahayak</div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 1 }}>Smart Farming Assistant</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {deferredPrompt && (
                <button onClick={() => { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => setDeferredPrompt(null)); }}
                  style={{ background: "#F2A93B", color: "#1B5E3F", border: "none", borderRadius: 16, padding: "6px 10px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                  ⬇ {t.installBtn}
                </button>
              )}
              <LangPicker lang={lang} setLang={setLang} />
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 14, background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 4, gap: 4 }}>
            {[{ id: "plant", label: t.plantTab }, { id: "expert", label: t.expertTab }].map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, padding: "10px 8px", border: "none", borderRadius: 9,
                background: tab === id ? "#fff" : "transparent",
                color: tab === id ? "#1B5E3F" : "rgba(255,255,255,0.75)",
                fontWeight: tab === id ? 700 : 500, fontSize: 13, cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: "0 16px 24px" }}>
          {tab === "plant" ? <PlantTab lang={lang} t={t} /> : <ExpertTab lang={lang} t={t} />}
        </div>
        <div style={{ textAlign: "center", padding: 12, color: "#bbb", fontSize: 11, borderTop: "1px solid #ece8df" }}>
          🌱 KrishiSahayak — भारतीय किसानों का डिजिटल साथी
        </div>
      </div>
    </>
  );
}
