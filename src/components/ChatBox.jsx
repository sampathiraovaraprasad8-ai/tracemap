import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Server, ChevronRight } from 'lucide-react';

export default function ChatBox({ selectedNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am your TraceMap AI Architecture Assistant. Click on any node in the topology graph to inspect its microservice metrics, or ask me questions about your architecture.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat history to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // When selectedNode changes, notify user in chat & open chat automatically
  useEffect(() => {
    if (selectedNode) {
      setMessages(prev => [
        ...prev,
        {
          id: `inspect_${Date.now()}`,
          sender: 'system',
          text: `Currently inspecting: ${selectedNode.label || selectedNode.id} (${selectedNode.status || 'healthy'})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsOpen(true);
    }
  }, [selectedNode]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg.trim();
    const userMsgObj = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsgObj]);
    setInputMsg('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          nodeContext: selectedNode ? {
            id: selectedNode.id,
            label: selectedNode.label || selectedNode.id,
            status: selectedNode.status || 'healthy',
            connectionCount: selectedNode.connectionCount || 0
          } : null
        })
      });

      const data = await response.json();
      const botReply = data.reply || "I couldn't process that request right now. Please try again.";

      setMessages(prev => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Unable to connect to AI Assistant server endpoint. Please verify backend is running on port 5000.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Expanded Floating Chat Panel */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[500px] bg-[#0c1220]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3 ring-1 ring-cyan-500/20 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Chat Window Header */}
          <div className="p-3.5 bg-gradient-to-r from-[#10182b] to-[#152038] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-100 font-sans tracking-wide">AI Architecture Assistant</span>
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                </div>
                <span className="text-[10px] text-slate-400 block font-mono">Powered by TraceMap AI Engine</span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Node Banner */}
          {selectedNode && (
            <div className="bg-cyan-950/40 border-b border-cyan-800/40 px-3 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 truncate">
                <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-slate-300 font-mono truncate">
                  Inspect: <strong className="text-cyan-300">{selectedNode.label || selectedNode.id}</strong>
                </span>
              </div>
              <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                selectedNode.status === 'critical' ? 'bg-red-950 text-red-400 border border-red-800' :
                selectedNode.status === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}>
                {selectedNode.status || 'healthy'}
              </span>
            </div>
          )}

          {/* Chat Messages History Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs scrollbar-thin">
            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center my-1.5">
                    <span className="text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 px-2.5 py-1 rounded-full flex items-center space-x-1">
                      <ChevronRight className="w-3 h-3 text-cyan-400" />
                      <span>{msg.text}</span>
                    </span>
                  </div>
                );
              }

              const isBot = msg.sender === 'bot';
              return (
                <div key={msg.id} className={`flex items-start space-x-2 ${isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] ${
                    isBot ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-blue-600 text-white'
                  }`}>
                    {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  <div className={`max-w-[80%] rounded-xl px-3 py-2 leading-relaxed ${
                    isBot
                      ? 'bg-slate-900/90 text-slate-200 border border-slate-800'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className={`text-[9px] block text-right mt-1 opacity-60 font-mono`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isTyping && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs py-1">
                <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-[#090e1a] border-t border-slate-800 flex items-center space-x-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={selectedNode ? `Ask about ${selectedNode.label || selectedNode.id}...` : "Ask AI about your architecture..."}
              className="flex-1 bg-[#101726] text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 outline-none transition-all placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!inputMsg.trim() || isTyping}
              className="w-8 h-8 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-xl shadow-cyan-600/30 border border-cyan-400/40 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 group relative"
      >
        <MessageSquare className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        
        {selectedNode && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 border-2 border-[#080c14] rounded-full animate-ping"></span>
        )}
      </button>
    </div>
  );
}
