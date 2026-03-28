import React, { useState, useEffect, useRef } from 'react';
import * as ReactDOM from 'react-dom';
import { 
  Mic, 
  MicOff, 
  ArrowLeftRight, 
  Trash2, 
  MessageSquare, 
  Globe, 
  Zap 
} from 'lucide-react';

// --- API Configuration ---
const apiKey = ""; 
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sourceLang, setSourceLang] = useState('ja-JP');
  const [targetLang, setTargetLang] = useState('zh-TW'); // 台湾（繁体字）
  const [interimText, setInterimText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  const quickSettings = [
    { label: "🇯🇵 → 🇹🇼 繁体字", src: "ja-JP", tgt: "zh-TW" },
    { label: "🇹🇼 → 🇯🇵 日本語", src: "zh-TW", tgt: "ja-JP" },
    { label: "🇯🇵 → 🇺🇸 English", src: "ja-JP", tgt: "en-US" },
    { label: "🇺🇸 → 🇯🇵 日本語", src: "en-US", tgt: "ja-JP" }
  ];

  // 自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText]);

  // 音声認識の設定
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = sourceLang;

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setInterimText(transcript);

      if (event.results[current].isFinal) {
        handleFinalTranscript(transcript);
        setInterimText('');
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Speech recognition error:", e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [sourceLang, isRecording]);

  const handleFinalTranscript = async (text) => {
    if (!text.trim()) return;

    const newMessage = {
      id: Date.now(),
      original: text,
      translated: '...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: sourceLang,
      target: targetLang
    };

    setMessages(prev => [...prev, newMessage]);
    
    setIsTranslating(true);
    const translatedText = await translateWithAI(text, sourceLang, targetLang);
    
    setMessages(prev => prev.map(msg => 
      msg.id === newMessage.id ? { ...msg, translated: translatedText } : msg
    ));
    setIsTranslating(false);
  };

  const translateWithAI = async (text, from, to) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Translate the following text from ${from} to ${to}. If to zh-TW, use Traditional Chinese as used in Taiwan. Return ONLY the translated text.\nText: ${text}` }] }],
          generationConfig: { temperature: 0.3 }
        })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "翻訳に失敗しました。";
    } catch (error) {
      console.error("Translation error:", error);
      return "エラーが発生しました。";
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current?.start();
    }
  };

  const setQuickLang = (src, tgt) => {
    setSourceLang(src);
    setTargetLang(tgt);
    if (isRecording) {
      setIsRecording(false);
      recognitionRef.current?.stop();
    }
  };

  const getLangName = (code) => {
    if (code === 'ja-JP') return '日本語';
    if (code === 'zh-TW') return '繁体字';
    if (code === 'en-US') return '英語';
    return code;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <header className="bg-white border-b px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Globe className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">翻訳アシスト</h1>
                <p className="text-xs font-medium text-slate-400">翻譯助手 (Taiwan)</p>
              </div>
            </div>
            <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1 border border-indigo-100">
              {getLangName(sourceLang)} → {getLangName(targetLang)}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickSettings.map((setting, index) => (
              <button
                key={index}
                onClick={() => setQuickLang(setting.src, setting.tgt)}
                className={`py-2 px-1 text-xs md:text-sm font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                  sourceLang === setting.src && targetLang === setting.tgt
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <Zap className={`w-3 h-3 ${sourceLang === setting.src && targetLang === setting.tgt ? 'text-indigo-200' : 'text-indigo-400'}`} />
                {setting.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        {messages.length === 0 && !interimText && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 pt-12">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
              <MessageSquare className="w-8 h-8 text-indigo-100" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-slate-600">会話を始めましょう</p>
              <p className="text-sm text-slate-400">開始對話吧</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm max-w-[85%]">
                <p className="text-slate-400 text-[10px] font-bold mb-1 uppercase tracking-wider">{getLangName(msg.source)}</p>
                <p className="text-slate-800 leading-relaxed">{msg.original}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-br-none shadow-md max-w-[85%] relative overflow-hidden">
                <p className="text-indigo-200 text-[10px] font-bold mb-1 uppercase tracking-wider">{getLangName(msg.target)}</p>
                {msg.translated === '...' ? (
                  <div className="flex gap-1 py-1">
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce delay-150"></div>
                  </div>
                ) : (
                  <p className="text-white leading-relaxed font-bold text-xl">{msg.translated}</p>
                )}
                <span className="text-[10px] opacity-40 absolute bottom-1 right-2">{msg.timestamp}</span>
              </div>
            </div>
          </div>
        ))}

        {interimText && (
          <div className="flex justify-start opacity-70">
            <div className="bg-slate-200 px-4 py-2 rounded-2xl rounded-bl-none italic text-slate-500 text-sm border border-slate-300">
              {interimText}...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      <footer className="bg-white border-t p-6 pb-8 flex items-center justify-center relative">
        <div className="absolute left-6">
          <button 
            onClick={() => { if(window.confirm("会話記録を削除しますか？")) setMessages([]); }}
            className="p-3 text-slate-300 hover:text-red-500 rounded-full transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={toggleRecording}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
            isRecording ? 'bg-red-500 scale-110 active:scale-95' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
          }`}
        >
          {isRecording ? <MicOff className="text-white w-8 h-8" /> : <Mic className="text-white w-8 h-8" />}
        </button>
      </footer>
    </div>
  );
};

// --- レンダリング・ブートストラップの最終修正 ---
const ROOT_ID = 'root';
const GLOBAL_ROOT_STORAGE = '__TRANSLATION_APP_ROOT__';

const mountApp = () => {
  const container = document.getElementById(ROOT_ID);
  if (!container) return;

  const appElement = (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // グローバル変数を確認して、ルートが存在すれば render だけ行う
  if (window[GLOBAL_ROOT_STORAGE]) {
    window[GLOBAL_ROOT_STORAGE].render(appElement);
    return;
  }

  // ルートが存在しない場合のみ作成
  try {
    let createRootFn;
    try {
      // clientモジュールからの取得を試みる
      const ReactDOMClient = require('react-dom/client');
      createRootFn = ReactDOMClient.createRoot;
    } catch (e) {
      // 直接 ReactDOM からの取得を試みる
      createRootFn = ReactDOM.createRoot;
    }

    if (createRootFn) {
      const root = createRootFn(container);
      window[GLOBAL_ROOT_STORAGE] = root; // 作成したルートを保存
      root.render(appElement);
    }
  } catch (err) {
    console.error("React root initialization failed:", err);
  }
};

// DOMの状態に応じて実行。既に読み込み済みの場合は即座に実行。
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  mountApp();
} else {
  window.addEventListener('DOMContentLoaded', mountApp);
}

export default App;
