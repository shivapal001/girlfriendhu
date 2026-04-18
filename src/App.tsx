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
  Heart
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { getFridayResponse } from './services/geminiService';
import { sounds } from './services/soundService';
import { generateFridaySpeech, playTTSAudio, stopAllSpeech, isTTSQuotaExceeded, resetTTSQuota } from './services/ttsService';

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
        className="w-[400px] h-[400px] rounded-full relative"
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

// --- Component ---
export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<{ id: string, content: string, type: 'log' | 'error' | 'info' }[]>([]);
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
    
    const logs: string[] = [];
    const customConsole = {
      log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args: any[]) => logs.push('ERROR: ' + args.join(' ')),
      warn: (...args: any[]) => logs.push('WARN: ' + args.join(' ')),
    };

    try {
      const fn = new Function('console', code);
      fn(customConsole);
      
      if (logs.length > 0) {
        setTerminalOutput(prev => [...prev, ...logs.map(l => ({ 
          id: (Date.now() + Math.random()).toString(), 
          content: l, 
          type: 'log' as const 
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

        // Optimized chunking: Wait for longer sentences to save TTS quota
        if (/[.!?।]\s*$/.test(pendingSpeechText) || pendingSpeechText.length > 200) {
          const textToSpeak = pendingSpeechText.trim();
          if (textToSpeak && textToSpeak.length > 10) {
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
    } finally {
      setIsThinking(false);
    }
  };

  const toggleListening = () => {
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
    <div className="min-h-screen bg-[#0a0205] text-pink-50 font-sans selection:bg-pink-500/30 overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(244,63,94,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
        <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
      </div>

      <Orb isSpeaking={isSpeaking} isThinking={isThinking} />

      <header className="relative z-10 p-6 flex items-center justify-between border-b border-pink-500/20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-pink-500/30 flex items-center justify-center bg-pink-950/40">
              <Heart className="w-6 h-6 text-pink-400 animate-pulse" />
            </div>
            {isSpeaking && (
              <motion.div 
                className="absolute inset-0 rounded-full border-2 border-pink-400"
                animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-pink-400 uppercase">BklTeriGirlfriendHu</h1>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-tighter text-pink-600">
              <span className="flex items-center gap-1">Heart-Synced</span>
              <span className="w-1 h-1 rounded-full bg-pink-500" />
              <span>Ver 2.0.Loving</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMuted(!muted)}
            className="p-2 rounded-lg border border-pink-500/20 hover:bg-pink-500/10 transition-colors"
          >
            {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-pink-400" />}
          </button>
          <div className="hidden md:flex flex-col items-end gap-1">
             <div className="text-[10px] text-pink-700 tracking-widest font-mono">NEURAL_LINK: STABLE</div>
             <div className="text-[10px] text-pink-700 tracking-widest font-mono">
               VOICE_ENGINE: {isTTSQuotaExceeded() ? (
                 <button 
                   onClick={() => resetTTSQuota()}
                   className="text-amber-500 animate-pulse hover:text-amber-400"
                 >
                   FALLBACK (TAP TO RETRY)
                 </button>
               ) : "PRIMARY"}
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative z-10 p-4 md:p-8 space-y-6 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-12"
            >
              <div className="space-y-4">
                <h2 className="text-4xl font-extralight tracking-[0.2em] text-pink-100 uppercase">
                  Love <span className="text-pink-500">Synced</span>
                </h2>
                <div className="h-0.5 w-24 bg-pink-500 mx-auto rounded-full" />
              </div>

              <div className="p-8 rounded-3xl bg-pink-950/20 border border-pink-500/10 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-pink-400/80 leading-relaxed relative z-10 text-lg">
                  "Suno na Babu, I missed you! Aaj hamara kya plan hai?"
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full relative z-10">
                {[
                  { icon: Terminal, label: 'Kaam Karo', color: 'text-rose-400' },
                  { icon: Youtube, label: 'Kuch Dekhein', color: 'text-rose-400' },
                  { icon: Music, label: 'Gana Bajao', color: 'text-rose-400' },
                  { icon: MessageSquare, label: 'Baat Karein', color: 'text-rose-400' },
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      const prompts = [
                        "Jaan, help me with this code",
                        "YouTube pe kuch romantic dikhao na",
                        "Koi mast gana bajao na mere liye",
                        "Tell me you love me"
                      ];
                      handleSend(prompts[idx]);
                    }}
                    className="p-4 rounded-xl bg-pink-950/40 border border-pink-500/20 hover:border-pink-400 transition-all flex flex-col items-center gap-3 group"
                  >
                    <item.icon className={cn("w-6 h-6", item.color)} />
                    <span className="text-xs font-medium tracking-wider group-hover:text-pink-400 uppercase">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex w-full",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] md:max-w-[70%] p-4 rounded-2xl border backdrop-blur-md space-y-2",
                  msg.role === 'user' 
                    ? "bg-pink-500/10 border-pink-500/30 rounded-tr-none" 
                    : "bg-pink-950/40 border-pink-500/20 rounded-tl-none"
                )}>
                  <div className="flex items-center justify-between gap-4">
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", msg.role === 'user' ? 'text-pink-900' : 'text-pink-400')}>
                      {msg.role === 'user' ? 'Lover' : 'Girlfriend'}
                    </span>
                    <span className="text-[9px] text-pink-900 font-mono">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="prose prose-invert prose-rose max-w-none">
                    <ReactMarkdown
                      components={{
                        code({ className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const isJS = match && (match[1] === 'javascript' || match[1] === 'js' || match[1] === 'typescript' || match[1] === 'ts');
                          return (
                            <div className="relative group/code">
                              <code className={cn("bg-black/50 p-1 rounded font-mono text-sm", match ? "block p-4 my-2 overflow-x-auto border border-pink-500/20" : "", className)} {...props}>
                                {children}
                              </code>
                              {isJS && (
                                <button onClick={() => runJS(String(children).replace(/\n$/, ''))} className="absolute top-4 right-4 p-1 rounded bg-pink-500/10 border border-pink-500/30 text-[10px] text-pink-400 opacity-0 group-hover/code:opacity-100 transition-opacity hover:bg-pink-500/20">EXECUTE</button>
                              )}
                            </div>
                          );
                        }
                      }}
                    >
                      {msg.text.replace(/\[ACTION:.*\]/g, '')}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        {isThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-pink-400/50 text-xs font-mono">
            <Heart className="w-3 h-3 animate-ping text-rose-500" /> Thinking about you...
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </main>

      {terminalOutput.length > 0 && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="relative z-20 border-t border-pink-500/20 bg-black/80 backdrop-blur-xl max-h-48 overflow-y-auto">
          <div className="p-2 border-b border-pink-500/10 flex justify-between items-center px-4 bg-pink-950/20">
            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest flex items-center gap-2"><Terminal className="w-3 h-3" /> System Diagnostics</span>
            <button onClick={() => setTerminalOutput([])} className="text-[9px] text-pink-700 hover:text-pink-400 uppercase tracking-tighter transition-colors">Clear Buffer</button>
          </div>
          <div className="p-4 font-mono text-xs space-y-1">
            {terminalOutput.map((log) => (
              <div key={log.id} className={cn(log.type === 'error' ? "text-red-400" : log.type === 'info' ? "text-pink-600 italic" : "text-pink-100")}>
                {log.content}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <footer className="relative z-10 p-6 border-t border-pink-500/20 backdrop-blur-xl bg-black/40">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={toggleListening}
            className={cn(
              "p-4 rounded-full transition-all duration-300",
              isListening ? "bg-red-500/20 border-red-500 ring-4 ring-red-500/20 animate-pulse" : "bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500/20"
            )}
          >
            {isListening ? <MicOff className="w-6 h-6 text-red-500" /> : <Mic className="w-6 h-6 text-pink-400" />}
          </button>
          <div className="flex-1 relative">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Message your girlfriend..." className="w-full bg-pink-950/20 border border-pink-500/20 rounded-2xl px-6 py-4 outline-none focus:border-pink-400/50 transition-colors text-pink-100 placeholder:text-pink-900" />
          </div>
          <button onClick={() => handleSend()} disabled={!input.trim() || isThinking} className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            <Send className="w-6 h-6 text-pink-400" />
          </button>
        </div>
        <div className="mt-4 flex justify-center gap-6">
          <div className="flex items-center gap-2 text-[10px] text-pink-900 uppercase font-bold tracking-widest"><Heart className="w-3 h-3" /> Status: Caring</div>
          <div className="flex items-center gap-2 text-[10px] text-pink-900 uppercase font-bold tracking-widest"><Zap className="w-3 h-3" /> Love Meter: 100%</div>
        </div>
      </footer>
    </div>
  );
}
