import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Terminal, 
  Youtube, 
  Music, 
  MessageSquare,
  Cpu,
  Shield,
  Zap,
  LayoutGrid,
  Heart,
  Image,
  Info,
  Phone,
  Video,
  MoreHorizontal,
  Search,
  X,
  Camera,
  ChevronLeft,
  PlusCircle,
  Smile
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { getFridayResponse, setAIServicePersona } from './services/geminiService';
import { sounds } from './services/soundService';
import { generateFridaySpeech, playTTSAudio, stopAllSpeech, isTTSQuotaExceeded, resetTTSQuota, setTTSServicePersona } from './services/ttsService';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'friday';
  text: string;
  timestamp: Date;
}

interface Action {
  type: string;
  detail: string;
}

function Orb({ isSpeaking, isThinking }: { isSpeaking: boolean, isThinking: boolean }) {
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-20">
      <motion.div
        className="w-[280px] h-[280px] md:w-[400px] md:h-[400px] rounded-full relative"
        animate={{
          rotate: 360,
          scale: isSpeaking || isThinking ? [1, 1.1, 1] : 1,
        }}
        transition={{
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        {/* Arc Reactor Style Rings */}
        <div className="absolute inset-0 border border-pink-500/20 rounded-full" />
        <div className="absolute inset-[10%] border border-pink-500/10 rounded-full border-dashed" />
        <div className="absolute inset-[20%] border-2 border-pink-500/5 rounded-full" />
        
        {/* Pulsing Core */}
        <div className="absolute inset-[40%] bg-pink-500/5 rounded-full blur-2xl animate-pulse" />
        
        {/* Spinning Segments */}
        <div className="absolute inset-0 border-t-2 border-pink-400/30 rounded-full" />
        <div className="absolute inset-4 border-b-2 border-pink-400/20 rounded-full rotate-45" />
      </motion.div>
    </div>
  );
}

const themes = {
  youAndMe: {
    name: 'You & Me',
    bg: 'bg-[#000000]',
    bubble: 'bg-gradient-to-tr from-[#9137cc] via-[#cb20a4] to-[#f7992c]',
    headerBg: 'bg-black/90',
    text: 'text-white',
    accent: 'text-white',
    preview: 'from-[#b324b3] via-[#ff2975] to-[#ff9051]',
    wallpaper: 'https://storage.googleapis.com/static.mira.ai/artifact_attachments%2F1715341595166_40213d29.png'
  },
  instagram: {
    name: 'Instagram',
    bg: 'bg-black',
    bubble: 'bg-gradient-to-tr from-[#9137cc] via-[#cb20a4] to-[#f7992c]',
    headerBg: 'bg-black/80',
    text: 'text-white',
    accent: 'text-pink-500',
    preview: 'from-[#9137cc] via-[#cb20a4] to-[#f7992c]',
    wallpaper: 'https://storage.googleapis.com/static.mira.ai/artifact_attachments%2F1715339673412_f6bd7be3.png'
  },
  loveTree: {
    name: 'Love Garden',
    bg: 'bg-[#4c0519]',
    bubble: 'bg-gradient-to-tr from-[#fb7185] via-[#e11d48] to-[#9f1239]',
    headerBg: 'bg-[#4c0519]/80',
    text: 'text-rose-50',
    accent: 'text-rose-400',
    preview: 'from-[#fb7185] via-[#e11d48] to-[#9f1239]',
    wallpaper: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000'
  },
  loveScript: {
    name: 'Love Script',
    bg: 'bg-[#0f172a]',
    bubble: 'bg-gradient-to-tr from-[#6366f1] via-[#8b5cf6] to-[#d946ef]',
    headerBg: 'bg-[#0f172a]/80',
    text: 'text-zinc-50',
    accent: 'text-indigo-400',
    preview: 'from-[#6366f1] via-[#8b5cf6] to-[#d946ef]',
    wallpaper: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=1000'
  },
  blackLove: {
    name: 'Black Love',
    bg: 'bg-[#0a0a0a]',
    bubble: 'bg-white text-black',
    headerBg: 'bg-black/90',
    text: 'text-white',
    accent: 'text-zinc-400',
    preview: 'from-zinc-100 via-zinc-200 to-white',
    wallpaper: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1000'
  },
  kawaii: {
    name: 'Kawaii Friends',
    bg: 'bg-[#eff6ff]',
    bubble: 'bg-gradient-to-tr from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8]',
    headerBg: 'bg-[#eff6ff]/80',
    text: 'text-blue-900',
    accent: 'text-blue-500',
    preview: 'from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8]',
    wallpaper: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?q=80&w=1000'
  },
  rainyLove: {
    name: 'Rainy Love',
    bg: 'bg-[#e2e8f0]',
    bubble: 'bg-zinc-800',
    headerBg: 'bg-[#e2e8f0]/80',
    text: 'text-zinc-900',
    accent: 'text-zinc-600',
    preview: 'from-zinc-400 via-zinc-500 to-zinc-600',
    wallpaper: 'https://storage.googleapis.com/static.mira.ai/artifact_attachments%2F1715339673516_1456a644.png'
  },
  dancingSouls: {
    name: 'Dancing Souls',
    bg: 'bg-black',
    bubble: 'bg-white/10 backdrop-blur-md border border-white/20',
    headerBg: 'bg-black/80',
    text: 'text-white',
    accent: 'text-white',
    preview: 'from-zinc-800 via-zinc-900 to-black',
    wallpaper: 'https://storage.googleapis.com/static.mira.ai/artifact_attachments%2F1715339673413_6455ffb2.png'
  },
  heartSymphony: {
    name: 'Heart Symphony',
    bg: 'bg-[#450a0a]',
    bubble: 'bg-gradient-to-tr from-[#f43f5e] via-[#e11d48] to-[#be123c]',
    headerBg: 'bg-[#450a0a]/80',
    text: 'text-rose-50',
    accent: 'text-rose-400',
    preview: 'from-[#f43f5e] via-[#e11d48] to-[#be123c]',
    wallpaper: 'https://storage.googleapis.com/static.mira.ai/artifact_attachments%2F1715339673516_1456a644.png'
  }
};

// --- Component ---
export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [gfName, setGfName] = useState('ZUBY');
  const [gfUsername, setGfUsername] = useState('zuby_2006');
  const [gfPfp, setGfPfp] = useState('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200');
  const [chatWallpaper, setChatWallpaper] = useState<string | null>(null);
  const [theme, setTheme] = useState<keyof typeof themes>('youAndMe');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const cloudinaryCloudName = 'de7wbghmy';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview first
    const reader = new FileReader();
    reader.onloadend = () => {
      setGfPfp(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Attempt Cloudinary upload (needs unsigned preset, assuming 'ml_default' or user will configure)
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default'); // Common default, might fail if not configured

    try {
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      if (data.secure_url) {
        setGfPfp(data.secure_url);
        setTerminalOutput(prev => [...prev, { id: Date.now().toString(), content: 'PFP uploaded to Cloudinary!', type: 'info' }]);
      }
    } catch (err) {
      console.error('Cloudinary upload failed:', err);
      setTerminalOutput(prev => [...prev, { id: Date.now().toString(), content: 'Cloudinary upload failed (Preset might be missing). Using local preview.', type: 'warn' }]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setChatWallpaper(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default');

    try {
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      if (data.secure_url) {
        setChatWallpaper(data.secure_url);
        setTerminalOutput(prev => [...prev, { id: Date.now().toString(), content: 'Wallpaper uploaded!', type: 'info' }]);
      }
    } catch (err) {
      console.error('Cloudinary upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    setAIServicePersona(gfName);
    setTTSServicePersona(gfName);
  }, [gfName]);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<{ id: string, content: string, type: 'log' | 'error' | 'info' | 'warn' }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Voice Recognition
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisVoice | null>(null);

  // Initialize Speech
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSend(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Try to find a natural Hindi female voice first, then fallbacks
      synthesisRef.current = voices.find(v => v.lang.includes('hi-IN')) || 
                            voices.find(v => v.name.includes('Female')) || 
                            voices[0];
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const wakeAudio = useCallback(async () => {
    // Only wake if on mobile or if AudioContext is not running
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (muted) return;
    
    // Clean text from actions before speaking
    const cleanText = text.replace(/\[ACTION:.*\]/g, '').trim();
    if (!cleanText) return;

    try {
      // 1. Generate high-quality speech from Gemini TTS
      const base64Audio = await generateFridaySpeech(cleanText);
      
      if (base64Audio) {
        // Play the high-quality audio
        await playTTSAudio(
          base64Audio,
          () => {
            setIsSpeaking(true);
            sounds.playSpeechStart();
          },
          () => setIsSpeaking(false)
        );
      } else {
        // Fallback to browser TTS if Gemini TTS fails
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.voice = synthesisRef.current;
        utterance.rate = 1.1;
        utterance.pitch = 1.2;

        utterance.onstart = () => {
          setIsSpeaking(true);
          sounds.playSpeechStart();
        };
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("Speech error:", error);
      setIsSpeaking(false);
    }
  }, [muted]);

  const handleAction = (text: string) => {
    const actionMatch = text.match(/\[ACTION:\s*([^,]+),\s*([^\]]+)\]/);
    if (!actionMatch) return;

    const [_, type, detail] = actionMatch;
    const actionType = type.trim();
    const actionDetail = detail.trim();

    switch (actionType) {
      case 'execute_code':
        try {
          runJS(actionDetail);
        } catch (e) {
          console.error(e);
        }
        break;
      case 'youtube_search':
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(actionDetail)}`, '_blank');
        break;
      case 'play_music':
        window.open(`https://open.spotify.com/search/${encodeURIComponent(actionDetail)}`, '_blank');
        break;
      case 'send_message':
        const [app, recipient, msg] = actionDetail.split('|');
        if (app.includes('instagram')) {
          window.open(`https://www.instagram.com/direct/inbox/`, '_blank');
        } else {
          setTerminalOutput(prev => [...prev, { id: Date.now().toString(), content: `Simulated ${app} to ${recipient}: ${msg}`, type: 'info' }]);
        }
        break;
    }
  };

  const runJS = (code: string) => {
    setTerminalOutput(prev => [...prev, { id: Date.now().toString(), content: '> Executing Script...', type: 'info' }]);
    
    const logs: { content: string, type: 'log' | 'error' | 'warn' }[] = [];
    const customConsole = {
      log: (...args: any[]) => logs.push({ 
        content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '),
        type: 'log'
      }),
      error: (...args: any[]) => logs.push({ content: args.join(' '), type: 'error' }),
      warn: (...args: any[]) => logs.push({ content: args.join(' '), type: 'warn' }),
    };

    try {
      const fn = new Function('console', code);
      fn(customConsole);
      
      if (logs.length > 0) {
        setTerminalOutput(prev => [...prev, ...logs.map(l => ({ 
          id: (Date.now() + Math.random()).toString(), 
          content: l.content, 
          type: l.type 
        }))]);
      } else {
        setTerminalOutput(prev => [...prev, { id: Date.now().toString(), content: 'Execution finished (no output).', type: 'info' }]);
      }
    } catch (err: any) {
      setTerminalOutput(prev => [...prev, { id: Date.now().toString(), content: String(err), type: 'error' }]);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim()) return;

    // Wake audio for mobile browsers
    wakeAudio();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);
    stopAllSpeech();

    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.text }]
    }));

    let fridayText = '';
    const fridayMessageId = (Date.now() + 1).toString();
    
    try {
      setHasConnectionError(false);
      const stream = getFridayResponse(messageText, history);
      
      setMessages(prev => [...prev, {
        id: fridayMessageId,
        role: 'friday',
        text: '',
        timestamp: new Date()
      }]);

      let pendingSpeechText = '';

      for await (const chunk of stream) {
        fridayText += chunk;
        pendingSpeechText += chunk;

        setMessages(prev => prev.map(m => 
          m.id === fridayMessageId ? { ...m, text: fridayText } : m
        ));

        // Enhanced chunking for High-Fidelity Voice: Wait for natural breaks
        // Increase character limit to avoid hitting RPM limits on free keys
        if (/[.!?।]\s*$/.test(pendingSpeechText) || pendingSpeechText.length > 500) {
          const textToSpeak = pendingSpeechText.trim();
          if (textToSpeak && textToSpeak.length > 15) {
            speak(textToSpeak);
            pendingSpeechText = '';
          }
        }
      }

      if (pendingSpeechText.trim()) {
        speak(pendingSpeechText.trim());
      }

      handleAction(fridayText);
    } catch (error) {
      console.error(error);
      setHasConnectionError(true);
    } finally {
      setIsThinking(false);
    }
  };

  const toggleListening = () => {
    // Wake audio for mobile browsers
    wakeAudio();
    if (isListening) {
      recognitionRef.current?.stop();
      sounds.playStopListen();
    } else {
      stopAllSpeech();
      recognitionRef.current?.start();
      setIsListening(true);
      sounds.playStartListen();
      setTerminalOutput(prev => [...prev, { id: Date.now().toString(), content: 'Recording Audio...', type: 'info' }]);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isThinking) {
      interval = setInterval(() => {
        sounds.playThinkingPulse();
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isThinking]);

  return (
    <div className={cn("min-h-screen font-sans selection:bg-pink-500/30 flex flex-col overflow-hidden relative", themes[theme].bg, themes[theme].text)}>
      {/* Dynamic Background Effect */}
      <div className={cn("fixed inset-0 pointer-events-none z-0", themes[theme].bg)}>
        {(chatWallpaper || (themes[theme] as any).wallpaper) && (
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700" 
            style={{ 
              backgroundImage: `url(${chatWallpaper || (themes[theme] as any).wallpaper})`,
              filter: theme === 'youAndMe' ? 'brightness(1) saturate(1.1)' : 'brightness(0.7) saturate(1.2)'
            }} 
          />
        )}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-pink-900/10 to-black"
            />
          )}
        </AnimatePresence>
      </div>

      <Orb isSpeaking={isSpeaking} isThinking={isThinking} />

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#1c1c1e] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Edit Profile</h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-6 h-6 text-zinc-400" />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-white/10">
                      <img src={gfPfp} alt="Preview" className="w-full h-full object-cover" />
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-pink-500 rounded-full shadow-lg hover:bg-pink-600 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handlePfpUpload}
                  />
                  <p className="text-xs text-zinc-500">Change Profile Photo</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase px-1">Name</label>
                    <input 
                      type="text" 
                      value={gfName} 
                      onChange={(e) => setGfName(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-pink-500/50 transition-colors text-white"
                      placeholder="Display Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase px-1">Username</label>
                    <input 
                      type="text" 
                      value={gfUsername} 
                      onChange={(e) => setGfUsername(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-pink-500/50 transition-colors text-zinc-400"
                      placeholder="Username"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-500 uppercase px-1">Chat Theme</label>
                  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                    {(Object.keys(themes) as Array<keyof typeof themes>).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setTheme(t);
                          // Clear custom wallpaper if switching to a theme that has one
                          if ((themes[t] as any).wallpaper) setChatWallpaper(null);
                        }}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-xl transition-all border-2",
                          theme === t ? "border-pink-500 bg-white/5" : "border-transparent bg-zinc-900/50 hover:bg-white/5"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-full bg-gradient-to-tr shadow-inner", (themes[t] as any).preview)} />
                        <span className="text-[13px] font-medium text-zinc-300 truncate">{(themes[t] as any).name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase px-1">Chat Wallpaper</label>
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => wallpaperInputRef.current?.click()}
                      className="flex-1 h-12 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <Image className="w-5 h-5 text-zinc-400 mr-2" />
                      <span className="text-[13px] text-zinc-400">Choose Custom...</span>
                    </div>
                    {chatWallpaper && (
                      <button 
                        onClick={() => setChatWallpaper(null)}
                        className="px-3 h-12 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={wallpaperInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleWallpaperUpload}
                  />
                </div>

                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors mt-2"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Overlay */}
      <AnimatePresence>
        {!isOnboarded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-white"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-sm space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-3xl mx-auto mb-6 flex items-center justify-center transform rotate-12">
                  <Heart className="w-8 h-8 text-white" fill="white" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Setup your chat</h1>
                <p className="text-zinc-500 text-[15px]">Customize your partner's profile</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center mb-6">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors overflow-hidden"
                  >
                    {gfPfp ? (
                      <img src={gfPfp} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-zinc-500 mb-1" />
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Photo</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase px-1">Partner Name</label>
                    <input 
                      type="text" 
                      value={gfName}
                      onChange={(e) => setGfName(e.target.value)}
                      placeholder="e.g. ZUBY"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase px-1">Username</label>
                    <input 
                      type="text" 
                      value={gfUsername}
                      onChange={(e) => setGfUsername(e.target.value)}
                      placeholder="e.g. zuby_2006"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-pink-500 transition-colors shadow-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase px-1">Chat Wallpaper</label>
                    <button 
                      onClick={() => wallpaperInputRef.current?.click()}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between hover:bg-zinc-800 transition-colors"
                    >
                      <span className="text-zinc-400 text-[14px]">{chatWallpaper ? 'Custom set' : 'Choose wallpaper...'}</span>
                      <Image className="w-5 h-5 text-zinc-500" />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (gfName.trim() && gfUsername.trim()) setIsOnboarded(true);
                  }}
                  className="w-full py-4 bg-white text-black font-bold rounded-xl active:scale-95 transition-transform mt-4 disabled:opacity-50"
                  disabled={!gfName.trim() || !gfUsername.trim()}
                >
                  Start Chatting
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>      {/* Instagram DM Header */}
      <header className={cn("sticky border-b border-white/5 top-0 z-30 flex items-center justify-between px-4 h-16 transition-colors", themes[theme].headerBg)}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-1 -ml-1 hover:bg-white/5 rounded-full transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <div className="relative cursor-pointer group flex items-center gap-3" onClick={() => setIsSettingsOpen(true)}>
            <div className="w-[38px] h-[38px] rounded-full overflow-hidden border border-white/10 bg-zinc-800">
              <img 
                src={gfPfp} 
                alt={gfName}
                className={cn("w-full h-full object-cover transition-transform duration-500", isSpeaking && "scale-110")}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <h1 className="text-[15px] font-bold tracking-tight leading-none uppercase">{gfName} ⚡</h1>
              </div>
              <span className="text-[11px] text-zinc-500 font-medium leading-none mt-1">
                {gfUsername}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button onClick={() => setMuted(!muted)} className="text-white">
            {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
          <button className="text-white">
            <PlusCircle className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Message List */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 relative z-10 scrollbar-hide py-6 custom-scrollbar">
        <div className="flex flex-col items-center mb-10 pt-4 flex-none opacity-90">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[3.5px] mb-4 relative group cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
            <div className="w-full h-full rounded-full bg-black border-2 border-black overflow-hidden relative">
               <img 
                  src={gfPfp} 
                  alt={gfName}
                  className="w-full h-full object-cover"
                />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight">{gfName} ⚡</h2>
          <p className="text-[13px] text-zinc-500 mt-1 font-medium">{gfUsername} · Instagram</p>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="px-6 py-1.5 bg-[#2a2a2a] rounded-lg text-[13px] font-semibold hover:bg-zinc-800 transition-colors mt-4"
          >
            View profile
          </button>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center opacity-70 py-10">
             <div className="grid grid-cols-2 gap-2 w-full max-w-sm px-4 mt-4">
              {['Say Hi 👋', 'I love you ❤️', 'Miss me? 🥺', 'Wanna fight? 😤'].map(txt => (
                <button 
                  key={txt} 
                  onClick={() => handleSend(txt)}
                  className="px-4 py-2 border border-white/10 rounded-xl text-[13px] bg-white/5 hover:bg-white/10 transition-colors active:scale-95 text-white/80"
                >
                  {txt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isAssistant = msg.role === 'friday';
                const nextMessage = messages[idx + 1];
                const showAvatar = isAssistant && (!nextMessage || nextMessage.role !== 'friday');
                const isLast = idx === messages.length - 1;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex max-w-[85%] items-end gap-2",
                      msg.role === 'user' ? "flex-row-reverse self-end ml-auto" : "flex-row self-start mr-auto"
                    )}
                  >
                    {isAssistant && (
                      <div className="w-[28px] h-[28px] flex-none mb-1">
                        {showAvatar ? (
                          <div className="w-full h-full rounded-full overflow-hidden border border-white/5">
                            <img src={gfPfp} alt={gfName} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full h-full" />
                        )}
                      </div>
                    )}

                    <div className={cn(
                      "px-4 py-2 text-[17px] leading-[1.3] break-words shadow-sm relative group message-font",
                      msg.role === 'user' 
                        ? "bg-gradient-to-tr from-[#9137cc] via-[#cb20a4] to-[#f7992c] text-white rounded-[20px] rounded-br-[4px]" 
                        : "bg-[#262626] text-white rounded-[20px] rounded-bl-[4px]"
                    )}>
                      <ReactMarkdown
                         components={{
                           p: ({children}) => <p className="mb-0">{children}</p>,
                           code: ({children}) => <code className="bg-black/20 px-1 rounded text-xs">{children}</code>
                         }}
                      >
                        {msg.text.replace(/\[ACTION:.*\]/g, '')}
                      </ReactMarkdown>
                      {msg.role === 'user' && isLast && !isThinking && (
                        <span className="absolute -bottom-5 right-1 text-[10px] text-zinc-500 font-medium">Seen</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {isThinking && (
              <div className="flex items-end gap-2 max-w-[85%] self-start mr-auto mt-1">
                <div className="w-[28px] h-[28px] flex-none mb-1 rounded-full overflow-hidden border border-white/5">
                  <img src={gfPfp} alt={gfName} className="w-full h-full object-cover" />
                </div>
                <div className={cn("px-4 py-3 rounded-[20px] rounded-bl-[4px] shadow-sm", themes[theme].bubble)}>
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* Instagram Input Footer */}
      <footer className={cn("relative z-30 pb-safe transition-colors", themes[theme].bg)}>
        <div className="p-3 max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-[44px] h-[44px] rounded-full bg-[#7a42f4] flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform" onClick={() => setTerminalOutput(prev => [...prev, { id: Date.now().toString(), content: 'Camera opened (Simulated)', type: 'info' }])}>
            <Camera className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1 relative bg-[#121212] rounded-[28px] border border-white/10 flex items-center px-4 py-2 min-h-[44px] focus-within:border-white/20 transition-all">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message..."
              className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-zinc-500 text-white py-1"
            />
            {input.trim() ? (
              <button 
                onClick={() => handleSend()} 
                disabled={isThinking}
                className={cn("ml-3 font-bold disabled:opacity-50 transition-colors text-[14px]", themes[theme].accent)}
              >
                Send
              </button>
            ) : (
              <div className="flex items-center gap-3.5 ml-3 text-white">
                <button onClick={toggleListening} className={isListening ? "text-red-500" : "text-white"}><Mic className="w-5 h-5" /></button>
                <button onClick={() => fileInputRef.current?.click()} className="text-white"><Image className="w-5 h-5" /></button>
                <button className="text-white"><Smile className="w-5 h-5" /></button>
                <button className="text-white"><PlusCircle className="w-5 h-5" /></button>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
