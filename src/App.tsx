import React, { useState } from 'react';
import { 
  Sparkles, Film, Image as ImageIcon, MessageSquare, Send, 
  HelpCircle, CheckCircle2, ChevronRight, Zap, Info, PlayCircle, Star
} from 'lucide-react';
import ImageEnhancer from './components/ImageEnhancer';
import VideoEditor from './components/VideoEditor';
import { ChatMessage } from './types';

export default function App() {
  const [activeStudio, setActiveStudio] = useState<'photo' | 'video'>('photo');
  
  // AI Diagnostics state
  const [aiParameters, setAiParameters] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Conversational AI Sidebar Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: "Namaste! Main hu GS INHANCE AI Studio expert. 📸 Apni kharab photo ya video upload karein aur mere se poochein. AI kaise photo ko HD saaf bana sakta hai uski guider tips main aapko dunga! Try tapping one of the quick suggestions below.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [userChatPrompt, setUserChatPrompt] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);

  // Image analysis runner connecting to backend Express router
  const handleAnalyzePhoto = async (base64: string, mimeType: string, fileName: string) => {
    setLoadingAI(true);
    setAiError(null);
    setAiParameters(null);

    try {
      const response = await fetch('/api/enhance-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageBase64: base64, mimeType, fileName })
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI diagnostic portal.");
      }

      const result = await response.json();
      if (result.success) {
        setAiParameters(result);
        
        // Push a custom dialogue entry in chat to inform user in real time about fixes
        const triggerMessage: ChatMessage = {
          id: `ai-suggest-${Date.now()}`,
          sender: "assistant",
          text: `🔍 [Diagnostics Complete] Maine is photo ko auto-scan kar liya hai! Isme hume ye issues mile hain: ${result.detectedIssues?.join(', ') || 'Low detailing'}. \n\n💡 AI Advice: ${result.analysis} \n\n🚀 Fixes Suggestion: ${result.hindiTips || ''}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, triggerMessage]);
      } else {
        throw new Error(result.error || "Unknown diagnostic error.");
      }
    } catch (err: any) {
      console.error("AI diagnostics error:", err);
      setAiError("AI Advisor offline or API Key is missing. Try utilizing manual slider controls.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleClearAIParams = () => {
    setAiParameters(null);
    setAiError(null);
  };

  // Conversational response runner
  const handleSendChat = async (presetText?: string) => {
    const textToQuery = presetText || userChatPrompt;
    if (!textToQuery.trim()) return;

    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: "user",
      text: textToQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!presetText) setUserChatPrompt("");
    setLoadingChat(true);

    try {
      const response = await fetch('/api/chat-expert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages.slice(-5), // contextual history
          userPrompt: textToQuery
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact chat server.");
      }

      const result = await response.json();
      const botMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: "assistant",
        text: result.reply || "Main is vakt respond nahi kar paa raha hu. Photo ko HD banane ke liye Sharpness aur Contrast slider badhayein!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error("Chat failure:", error);
      const offlineMsg: ChatMessage = {
        id: `fail-${Date.now()}`,
        sender: "assistant",
        text: "System Offline. Aap direct manual sliders aur AI background switches se photo/video edit kar sakte hain standard local algorithm support se!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, offlineMsg]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Preset quick template helper questions
  const presetPrompts = [
    { label: "Photo saaf kaise karein?", prompt: "Blurry ya poorani photo ko saaf karke ultra HD dynamic range me kaise laayein?" },
    { label: "BG Removal guide", prompt: "Aasani se perfect clean background removal karne ke tips bataiye." },
    { label: "Object clean instruction", prompt: "Smart Eraser brush se unwanted cheezon ko gayab karne ka badhiya tarika bataiye." }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* GLOWING AMBIENT BACKGROUNDS SHARDS */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* HEADER SECTION MAP */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-slate-900 px-6 py-4.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-2.5 rounded-2xl shadow-lg ring-1 ring-white/10 shadow-cyan-500/10">
              <Sparkles className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tightest bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  GS INHANCE
                </span>
                <span className="text-[9px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono">
                  v2.8 Pro AI
                </span>
              </div>
              <div className="text-[10px] font-semibold text-cyan-400/90 tracking-wider uppercase">
                GS Founder By Gurvinder Singh
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Smarter Photo Clean Upscale, HD Restoration, BG Remover & Video Grading Studio
              </p>
            </div>
          </div>

          {/* Tab Selection Switches */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl shadow-inner shadow-black/40">
            <button
              onClick={() => setActiveStudio('photo')}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeStudio === 'photo'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 shadow border-b border-cyan-500/35 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              📸 Photo HD Restore Studio
            </button>
            <button
              onClick={() => setActiveStudio('video')}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeStudio === 'video'
                  ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 text-violet-300 shadow border-b border-violet-500/35 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-4 h-4 text-violet-400" />
              🎥 Video Filters & Editing
            </button>
          </div>

        </div>
      </header>

      {/* MAIN APPLICATION BODY WORKSPACE GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* LEFT COLUMN: ACTIVE WORKSPACE STUDIO CONTAINER (Takes 9 columns of 12) */}
        <div className="xl:col-span-9 flex flex-col gap-6">
          
          {/* AI Advisor Diagnostic panel banner results */}
          {aiParameters && (
            <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/20 border border-cyan-500/30 p-5 rounded-3xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start gap-4">
                <div className="bg-cyan-500/10 text-cyan-300 p-2 rounded-xl border border-cyan-500/20 shadow">
                  <Star className="w-5 h-5 text-cyan-400 fill-cyan-400" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      AI Diagnostic Suggestions Applied Successfully!
                    </h3>
                    <button 
                      onClick={handleClearAIParams}
                      className="text-[10px] text-slate-500 hover:text-slate-350 underline"
                    >
                      Disable Suggestions
                    </button>
                  </div>
                  <p className="text-[12.5px] text-slate-300 leading-relaxed font-medium">
                    {aiParameters.analysis}
                  </p>
                  
                  {/* Hindi translations & Encouragement alerts */}
                  {aiParameters.hindiTips && (
                    <div className="bg-cyan-950/20 p-2.5 rounded-xl border border-cyan-500/10 text-xs text-cyan-300 font-sans mt-2">
                      💡 <strong>Nuskha:</strong> {aiParameters.hindiTips}
                    </div>
                  )}

                  {/* Highlights tag array */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {aiParameters.detectedIssues?.map((issue: string, i: number) => (
                      <span key={i} className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md font-mono">
                        🔧 {issue}
                      </span>
                    ))}
                    <span className="text-[10px] bg-slate-800 text-slate-450 px-2 py-0.5 rounded-md font-mono">
                      Upscaling Ratio: 4X Pro
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rendering the active studio */}
          {activeStudio === 'photo' ? (
            <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-3xl relative backdrop-blur">
              <div className="mb-6">
                <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase block mb-1">STATION 01</span>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  📸 Advanced Photo Restoration & Enhancer
                </h1>
                <p className="text-xs text-slate-400">
                  Dull, blurry images ko saaf karein using pixel density upscaling, background separation & unwanted object removal filters.
                </p>
              </div>

              <ImageEnhancer 
                onAnalyze={handleAnalyzePhoto} 
                aiParameters={aiParameters}
                loadingAI={loadingAI}
                onClearAIParams={handleClearAIParams}
              />
            </div>
          ) : (
            <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-3xl relative backdrop-blur">
              <div className="mb-6">
                <span className="text-xs text-violet-400 font-bold tracking-widest uppercase block mb-1">STATION 02</span>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  🎥 Cinematic Color Grading & Video Suite
                </h1>
                <p className="text-xs text-slate-400">
                  Video trims set karein. Slow-motion cinematic effect, real-time bright range boost and customizable text watermark layers apply karein.
                </p>
              </div>

              <VideoEditor />
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: AI EXPERT CONVERSATIONAL CHAT (Takes 3 columns of 12) */}
        <div className="xl:col-span-3 flex flex-col gap-5 bg-slate-900/40 border border-slate-900 p-5 rounded-3xl backdrop-blur max-h-[850px]">
          
          {/* Chat Header */}
          <div className="flex items-center gap-2 pb-3.5 border-b border-slate-900">
            <div className="bg-cyan-500/10 text-cyan-400 p-1.5 rounded-lg border border-cyan-500/20">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">GS INHANCE Advisor</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-450 font-bold">Online expert consultant</span>
              </div>
            </div>
          </div>

          {/* Suggestion list */}
          <div className="flex flex-col gap-1.5 pt-1.5">
            <span className="text-[10.5px] font-bold text-slate-400">Duaadhaar Quick Questions:</span>
            <div className="flex flex-col gap-1">
              {presetPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendChat(p.prompt)}
                  className="text-left text-[11px] bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-medium py-1.5 px-3 rounded-lg transition-all border border-slate-850 hover:border-slate-800 truncate"
                  title={p.prompt}
                >
                  💡 {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message Thread Panel */}
          <div className="flex-1 overflow-y-auto space-y-3.5 py-4 min-h-[300px] max-h-[500px] pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto items-end animate-fade-in' : 'mr-auto items-start'
                }`}
              >
                <div 
                  className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-medium rounded-tr-none'
                      : 'bg-slate-900 border border-slate-850 text-slate-201 rounded-tl-none font-medium'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-450 font-mono mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {loadingChat && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 ml-2 animate-pulse font-semibold">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                Thinking badhiya tips...
              </div>
            )}
          </div>

          {/* Message query trigger input frame */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-900">
            <input
              type="text"
              placeholder="Ask anything about edit..."
              value={userChatPrompt}
              onChange={(e) => setUserChatPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendChat();
              }}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/40"
            />
            <button
              onClick={() => handleSendChat()}
              disabled={!userChatPrompt.trim() || loadingChat}
              className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold hover:shadow-lg hover:shadow-cyan-400/10 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

        </div>

      </main>

      {/* FOOTER SECTION BRAND */}
      <footer className="mt-12 bg-slate-950 border-t border-slate-900/60 py-6 text-center text-[11px] text-slate-500">
        <p className="font-semibold text-slate-400">GS INHANCE © 2026 Studio Engine.</p>
        <p className="max-w-md mx-auto leading-relaxed mt-1">
          Designed elegantly in slate off-whites with neon custom indicators protecting client raw byte feeds. Fully optimized for high-performance responsive iframe viewport bounds.
        </p>
      </footer>

    </div>
  );
}
