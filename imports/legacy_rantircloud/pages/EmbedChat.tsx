import { useState, useRef, useEffect } from 'react';
import { getUserFriendlyError } from '@/lib/chat-error-utils';
import { useParams, useSearchParams } from 'react-router-dom';
import { Send, MessageCircle, X, Minimize2, Sun, Moon, ExternalLink, Maximize2, Minimize } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

interface QuickLink {
  label: string;
  url: string;
  icon?: string;
}

export default function EmbedChat() {
  const { flowSlug } = useParams<{ flowSlug: string }>();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode') || 'fullpage';
  const theme = searchParams.get('theme') || 'light';
  const bg = searchParams.get('bg') || '';
  const accent = searchParams.get('accent') || '4A9BD9';
  const title = searchParams.get('title') || 'Chat';
  const welcome = searchParams.get('welcome') || 'Hello! How can I help you today?';
  const apiKey = searchParams.get('key') || '';
  const showWS = searchParams.get('ws') !== '0';
  const avatar = searchParams.get('avatar') || '';
  const brand = searchParams.get('brand') || '';
  const status = searchParams.get('status') || 'Online now';
  const gradientRaw = searchParams.get('gradient') || '#4A9BD9,#74b9ff,#a29bfe';
  const gradientColors = gradientRaw.split(',').map(c => c.trim());
  const linksRaw = searchParams.get('links') || '[]';
  const aqTitle = searchParams.get('aqTitle') || 'Ask a question';
  const aqSub = searchParams.get('aqSub') || 'The AI agent will answer it with blazing speed';
  const startBtn = searchParams.get('startBtn') || 'Start Chat';

  let quickLinks: QuickLink[] = [];
  try { quickLinks = JSON.parse(linksRaw); } catch {}

  const storageKey = `embed-chat-${flowSlug}`;

  const [isOpen, setIsOpen] = useState(mode === 'fullpage');
  const [showWelcome, setShowWelcome] = useState(showWS);
  const [isDark, setIsDark] = useState(theme === 'dark');
  const [isExpanded, setIsExpanded] = useState(() => {
    try { return sessionStorage.getItem(`${storageKey}-expanded`) === '1'; } catch { return false; }
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch {}
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const accentColor = `#${accent}`;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const gradient = `linear-gradient(135deg, ${gradientColors.join(', ')})`;

  // Persist messages to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(messages)); } catch {}
  }, [messages, storageKey]);

  // Persist expand state
  useEffect(() => {
    try { sessionStorage.setItem(`${storageKey}-expanded`, isExpanded ? '1' : '0'); } catch {}
  }, [isExpanded, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const darkBg = '#1a1a2e';
  const lightBg = '#ffffff';
  const currentBg = isDark ? darkBg : lightBg;
  const currentText = isDark ? '#e0e0e0' : '#1a1a1a';
  const msgBg = isDark ? '#2a2a3e' : '#f3f4f6';
  const borderColor = isDark ? '#333355' : '#e5e7eb';
  const mutedText = isDark ? '#9ca3af' : '#6b7280';

  const getBackgroundStyle = (): React.CSSProperties => {
    if (bg) {
      const decoded = decodeURIComponent(bg);
      if (decoded.includes('gradient') || decoded.includes('linear')) return { background: decoded };
      return { backgroundColor: `#${decoded}` };
    }
    if (theme === 'transparent') return { backgroundColor: 'transparent' };
    return { backgroundColor: currentBg, color: currentText };
  };

  const startChat = () => {
    setShowWelcome(false);
    if (messages.length === 0) {
      setMessages([{ id: '1', text: welcome, sender: 'bot', timestamp: new Date() }]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !flowSlug) return;

    const userMsg: Message = { id: `u-${Date.now()}`, text: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== '1')
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;

      const res = await fetch(`${supabaseUrl}/functions/v1/chat-widget/${flowSlug}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: currentInput, history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');

      setMessages(prev => [
        ...prev,
        { id: `b-${Date.now()}`, text: data.reply, sender: 'bot', timestamp: new Date() },
      ]);
    } catch (error: any) {
      const friendlyMsg = getUserFriendlyError(error.message || '');
      setMessages(prev => [
        ...prev,
        { id: `e-${Date.now()}`, text: friendlyMsg, sender: 'bot', timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const widgetHeight = mode === 'widget' ? (isExpanded ? 'min(750px, 85vh)' : '500px') : '100vh';
  const widgetWidth = isExpanded ? 'min(600px, 90vw)' : '360px';

  // Welcome Screen
  const welcomeScreen = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: widgetHeight,
        width: '100%',
        borderRadius: mode === 'widget' ? '16px' : '0',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        border: mode === 'widget' ? `1px solid ${borderColor}` : 'none',
        boxShadow: mode === 'widget' ? '0 8px 32px rgba(0,0,0,0.15)' : 'none',
        backgroundColor: currentBg,
        color: currentText,
        transition: 'width 0.3s ease, height 0.3s ease',
      }}
    >
      {/* Gradient Hero */}
      <div style={{ background: gradient, padding: '20px 16px 24px', flex: '0 0 auto', position: 'relative' }}>
        {/* Top row: avatar + theme toggle + expand + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            {avatar ? (
              <img src={avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={16} color="#fff" />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setIsDark(!isDark)}
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isDark ? <Sun size={13} color="#fff" /> : <Moon size={13} color="#fff" />}
            </button>
            {mode === 'widget' && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={isExpanded ? 'Shrink' : 'Expand'}
              >
                {isExpanded ? <Minimize size={13} color="#fff" /> : <Maximize2 size={13} color="#fff" />}
              </button>
            )}
            {mode === 'widget' && (
              <button
                onClick={() => setIsOpen(false)}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={13} color="#fff" />
              </button>
            )}
          </div>
        </div>

        {/* Brand */}
        {brand && (
          <div style={{ marginBottom: '2px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{brand}</span>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>{status}</div>
          </div>
        )}

        {/* Welcome message */}
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: '12px 0 14px', lineHeight: 1.3 }}>
          {welcome}
        </h2>

        {/* Quick Links */}
        {quickLinks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {quickLinks.map((link, i) => (
              <a
                key={i}
                href={link.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '5px 12px', borderRadius: '20px',
                  backgroundColor: 'rgba(0,0,0,0.25)', color: '#fff',
                  fontSize: '11px', fontWeight: 500, textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.15)',
                  transition: 'background 0.15s',
                }}
              >
                <ExternalLink size={10} />
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Ask a Question section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: currentText }}>{aqTitle}</h3>
        <p style={{ fontSize: '11px', color: mutedText, marginBottom: '16px' }}>{aqSub}</p>
        <button
          onClick={startChat}
          style={{
            width: '100%', padding: '10px', borderRadius: '24px',
            backgroundColor: accentColor, color: '#fff', border: 'none',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          <MessageCircle size={14} />
          {startBtn}
        </button>
      </div>
    </div>
  );

  // Chat Panel
  const chatPanel = (
    <div
      style={{
        ...getBackgroundStyle(),
        display: 'flex',
        flexDirection: 'column',
        height: widgetHeight,
        width: '100%',
        borderRadius: mode === 'widget' ? '16px' : '0',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        border: mode === 'widget' ? `1px solid ${borderColor}` : 'none',
        boxShadow: mode === 'widget' ? '0 8px 32px rgba(0,0,0,0.15)' : 'none',
        transition: 'width 0.3s ease, height 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${borderColor}`,
          background: accentColor, color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {avatar ? (
            <img src={avatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover' }} />
          ) : (
            <MessageCircle size={15} />
          )}
          <span style={{ fontWeight: 600, fontSize: '12px' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {showWS && (
            <button
              onClick={() => setShowWelcome(true)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', padding: '3px 6px', fontSize: '10px' }}
            >
              Home
            </button>
          )}
          <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}>
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          {mode === 'widget' && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}
              title={isExpanded ? 'Shrink' : 'Expand'}
            >
              {isExpanded ? <Minimize size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
          {mode === 'widget' && (
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}>
              <Minimize2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '80%', padding: '7px 10px',
                borderRadius: msg.sender === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                backgroundColor: msg.sender === 'user' ? accentColor : msgBg,
                color: msg.sender === 'user' ? '#fff' : currentText,
                fontSize: '12px', lineHeight: '1.4',
              }}
            >
              {msg.sender === 'bot' ? (
                <div className="prose prose-sm max-w-none" style={{ fontSize: '12px' }}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '7px 10px', borderRadius: '12px', backgroundColor: msgBg, display: 'flex', gap: '3px', alignItems: 'center' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: mutedText, animation: 'bounce 1s infinite' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: mutedText, animation: 'bounce 1s infinite 0.15s' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: mutedText, animation: 'bounce 1s infinite 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${borderColor}`, display: 'flex', gap: '6px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: '8px 10px', borderRadius: '10px',
            border: `1px solid ${borderColor}`, outline: 'none', fontSize: '12px',
            backgroundColor: isDark ? '#2a2a3e' : '#fff', color: currentText,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            width: '34px', height: '34px', borderRadius: '10px', border: 'none',
            backgroundColor: accentColor, color: '#fff',
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: input.trim() && !isLoading ? 1 : 0.5,
          }}
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );

  // Decide what to show
  const currentView = showWelcome && showWS ? welcomeScreen : chatPanel;

  if (mode === 'widget') {
    return (
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }`}</style>
        {isOpen ? (
          <div style={{ width: widgetWidth, transition: 'width 0.3s ease' }}>{currentView}</div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: accentColor, color: '#fff', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <MessageCircle size={20} />
          </button>
        )}
      </div>
    );
  }

  // Fullpage
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }`}</style>
      {currentView}
    </div>
  );
}