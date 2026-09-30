import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Clock,
  Globe,
  ShoppingCart,
  CreditCard,
  ShieldCheck,
  Database,
  BarChart3,
  Box,
  Truck,
  Cpu,
  AlertTriangle,
  Send,
  Bot,
  User,
  MessageSquare
} from 'lucide-react';

/**
 * Resolves category icon and color theme for node header
 */
function getServiceIcon(serviceName) {
  const name = (serviceName || '').toLowerCase();

  if (name.includes('cart') || name.includes('checkout') || name.includes('basket')) {
    return { Icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/40 ring-amber-500/20' };
  }
  if (name.includes('payment') || name.includes('pay') || name.includes('charge') || name.includes('upi')) {
    return { Icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/40 ring-emerald-500/20' };
  }
  if (name.includes('auth') || name.includes('login') || name.includes('security') || name.includes('rome')) {
    return { Icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/40 ring-purple-500/20' };
  }
  if (name.includes('db') || name.includes('database') || name.includes('sql') || name.includes('mongo') || name.includes('store')) {
    return { Icon: Database, color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/40 ring-blue-500/20' };
  }
  if (name.includes('sonic') || name.includes('fdp') || name.includes('analytics') || name.includes('metrics') || name.includes('telemetry') || name.includes('bam') || name.includes('nr-data')) {
    return { Icon: BarChart3, color: 'text-pink-400', bg: 'bg-pink-500/15 border-pink-500/40 ring-pink-500/20' };
  }
  if (name.includes('static') || name.includes('assets') || name.includes('cdn') || name.includes('flixcart')) {
    return { Icon: Box, color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/40 ring-indigo-500/20' };
  }
  if (name.includes('logistics') || name.includes('shipment') || name.includes('delivery') || name.includes('order')) {
    return { Icon: Truck, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/40 ring-orange-500/20' };
  }
  if (name.includes('gateway') || name.includes('www') || name.includes('web') || name.includes('flipkart.com') || name.includes('sarvasiddhi')) {
    return { Icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/40 ring-cyan-500/20' };
  }

  return { Icon: Cpu, color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/40 ring-sky-500/20' };
}

export default function NodeInspector({ selectedNodeData, onClose }) {
  const isOpen = Boolean(selectedNodeData);
  const [initialAnalysis, setInitialAnalysis] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Scroll chat history to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  // Initial Auto-Analysis fetch when selectedNodeData changes
  useEffect(() => {
    if (!selectedNodeData) {
      setInitialAnalysis(null);
      setChatHistory([]);
      return;
    }

    const fetchInitialAnalysis = async () => {
      setIsAnalysisLoading(true);
      setInitialAnalysis(null);
      setChatHistory([]);

      try {
        const response = await fetch('/api/node-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeContext: {
              name: selectedNodeData.name,
              status: selectedNodeData.status,
              incoming: selectedNodeData.incoming || [],
              outgoing: selectedNodeData.outgoing || []
            },
            chatHistory: [],
            newMessage: '' // Empty newMessage triggers initial architectural analysis
          })
        });

        const data = await response.json();
        setInitialAnalysis(data.reply || 'Analysis unavailable.');
      } catch (err) {
        console.error('Initial analysis error:', err);
        setInitialAnalysis('⚠️ Could not fetch automated architectural analysis for this service.');
      } finally {
        setIsAnalysisLoading(false);
      }
    };

    fetchInitialAnalysis();
  }, [selectedNodeData]);

  // Handle User Follow-Up Chat Submission
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMsg.trim() || !selectedNodeData) return;

    const userText = inputMsg.trim();
    const newUserMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedHistory = [...chatHistory, newUserMsg];
    setChatHistory(updatedHistory);
    setInputMsg('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/node-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeContext: {
            name: selectedNodeData.name,
            status: selectedNodeData.status,
            incoming: selectedNodeData.incoming || [],
            outgoing: selectedNodeData.outgoing || []
          },
          chatHistory: updatedHistory,
          newMessage: userText
        })
      });

      const data = await response.json();
      const botReply = data.reply || "I couldn't process that question right now.";

      setChatHistory(prev => [
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
      setChatHistory(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Unable to reach AI Chat endpoint. Please verify backend is running.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const { Icon, color, bg } = getServiceIcon(selectedNodeData?.name);
  const isCritical = selectedNodeData?.status === 'critical';
  const isWarning = selectedNodeData?.status === 'warning';

  return (
    <>
      {/* Phase 1: Backdrop Blur Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 backdrop-blur-sm bg-black/40 transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Phase 1: Fixed Side Drawer Container */}
      <aside
        className={`fixed right-0 top-0 h-full w-full sm:w-[420px] bg-slate-950 border-l border-slate-800 flex flex-col z-50 transform transition-transform duration-500 ease-in-out font-sans ${
          isOpen ? 'translate-x-0 shadow-2xl shadow-cyan-950/40' : 'translate-x-full'
        }`}
      >
        {selectedNodeData && (
          <>
            {/* Phase 2: Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-[#0d1424] to-[#131c33] shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ring-1 shadow-md ${
                  isCritical
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 ring-red-500/20'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 ring-amber-500/20'
                    : `${bg} ${color}`
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-100 truncate font-sans tracking-wide" title={selectedNodeData.name}>
                    {selectedNodeData.name}
                  </h2>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${
                      isCritical ? 'bg-red-500 animate-ping' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                      isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {selectedNodeData.status || 'healthy'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable Content (Traffic Top Half + Chat Bottom Half) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300 scrollbar-thin">

              {/* Phase 2: Traffic In List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-200 font-semibold text-xs">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    <span>Traffic In ({selectedNodeData.incoming?.length || 0})</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Callers &rarr; Node</span>
                </div>

                {selectedNodeData.incoming?.length === 0 ? (
                  <div className="p-2.5 bg-[#090e1a] border border-slate-800/60 rounded-xl text-slate-500 text-xs italic text-center font-mono">
                    No inbound caller services
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedNodeData.incoming.map((edge) => (
                      <div
                        key={edge.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between font-mono text-xs hover:scale-[1.02] hover:bg-slate-900 transition-all duration-200 cursor-pointer ${
                          edge.is_circular
                            ? 'bg-red-950/40 border-red-800/60 text-red-300 ring-1 ring-red-500/20'
                            : 'bg-[#090e1a] border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {edge.is_circular ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          )}
                          <span className="truncate font-medium">{edge.source}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] shrink-0">
                          <span className="text-slate-400 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{edge.latency_ms} ms</span>
                          </span>
                          {edge.is_circular && (
                            <span className="text-[9px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-800 font-bold">
                              Circular Loop
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Phase 2: Traffic Out List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-200 font-semibold text-xs">
                    <ArrowUpRight className="w-4 h-4 text-blue-400" />
                    <span>Traffic Out ({selectedNodeData.outgoing?.length || 0})</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Node &rarr; Downstream</span>
                </div>

                {selectedNodeData.outgoing?.length === 0 ? (
                  <div className="p-2.5 bg-[#090e1a] border border-slate-800/60 rounded-xl text-slate-500 text-xs italic text-center font-mono">
                    No outbound downstream connections
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedNodeData.outgoing.map((edge) => (
                      <div
                        key={edge.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between font-mono text-xs hover:scale-[1.02] hover:bg-slate-900 transition-all duration-200 cursor-pointer ${
                          edge.is_circular
                            ? 'bg-red-950/40 border-red-800/60 text-red-300 ring-1 ring-red-500/20'
                            : 'bg-[#090e1a] border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {edge.is_circular ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                          )}
                          <span className="truncate font-medium">{edge.target}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] shrink-0">
                          <span className="text-slate-400 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{edge.latency_ms} ms</span>
                          </span>
                          {edge.is_circular && (
                            <span className="text-[9px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-800 font-bold">
                              Circular Loop
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-slate-800/80" />

              {/* Phase 3: Auto-Analysis Block (The Explainer) */}
              <div className="bg-[#080d19] border border-cyan-900/40 rounded-xl p-3.5 space-y-2 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-cyan-400 font-semibold font-mono text-xs">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>AI Architecture Analysis</span>
                  </div>
                  <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                    Live Explainer
                  </span>
                </div>

                {isAnalysisLoading ? (
                  <div className="space-y-2 pt-1 animate-pulse">
                    <div className="h-3 bg-slate-800 rounded w-full"></div>
                    <div className="h-3 bg-slate-800 rounded w-5/6"></div>
                    <div className="h-3 bg-slate-800 rounded w-4/6"></div>
                  </div>
                ) : (
                  <p className="text-slate-300 leading-relaxed text-xs pt-1 font-sans animate-fade-in">
                    {initialAnalysis}
                  </p>
                )}
              </div>

              {/* Phase 3: Interactive Follow-Up Chat History */}
              {chatHistory.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Follow-up Discussion</span>
                  </div>

                  <div className="space-y-2.5">
                    {chatHistory.map((msg) => {
                      const isBot = msg.sender === 'bot';
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start space-x-2 animate-slide-up ${
                            isBot ? '' : 'flex-row-reverse space-x-reverse'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] ${
                            isBot ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-blue-600 text-white'
                          }`}>
                            {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          </div>

                          <div className={`max-w-[82%] rounded-xl px-3 py-2 leading-relaxed ${
                            isBot
                              ? 'bg-[#0d1424] text-slate-200 border border-slate-800'
                              : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <span className="text-[9px] block text-right mt-1 opacity-60 font-mono">
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {isChatLoading && (
                      <div className="flex items-center space-x-2 text-slate-400 text-xs py-1 animate-slide-up">
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
                    <div ref={chatBottomRef} />
                  </div>
                </div>
              )}

            </div>

            {/* Phase 3: Pinned Input Field (Bottom) */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#080d17] border-t border-slate-800 flex items-center space-x-2 shrink-0">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder={`Ask AI about ${selectedNodeData.name}...`}
                className="flex-1 bg-[#101728] text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 outline-none transition-all placeholder:text-slate-500 font-sans"
              />
              <button
                type="submit"
                disabled={!inputMsg.trim() || isChatLoading}
                className="w-8 h-8 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:from-cyan-700 active:to-blue-700 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        )}
      </aside>
    </>
  );
}
