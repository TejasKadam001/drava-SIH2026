import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Wrench, X } from 'lucide-react';
import { api } from '../lib/api';

interface CopilotProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWell: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  tools?: string[];
}

const SUGGESTIONS = [
  'Why did failure risk increase?',
  'Recommend next CSS cycle settings',
  'What happens if we increase soak time?',
  'Forecast production for next 30 days',
];

const line = '1px solid var(--border)';

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 100,
    width: 460, maxWidth: '90vw',
    display: 'flex', flexDirection: 'column',
    background: 'var(--surface-raised)', borderLeft: line,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: line, background: 'var(--surface-raised)',
  },
  logo: {
    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--text-main)', border: line,
  },
  closeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, cursor: 'pointer',
    background: 'var(--surface-raised)', border: line,
  },
  feed: {
    flex: 1, overflowY: 'auto', padding: 16,
    display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface-raised)',
  },
  chips: {
    display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 16px',
    borderTop: line, background: 'var(--surface-raised)',
  },
  chip: {
    padding: '4px 10px', fontSize: '0.70rem', fontWeight: 600, cursor: 'pointer',
    color: 'var(--text-main)', background: 'var(--surface-raised)', border: line,
    transition: 'all 0.15s ease',
  },
  composer: {
    display: 'flex', gap: 8, padding: '14px 16px', borderTop: line, background: 'var(--surface-raised)',
  },
  field: {
    flex: 1, padding: '8px 12px', outline: 'none', fontSize: '0.82rem',
    color: 'var(--text-main)', background: 'var(--surface-raised)', border: line,
    fontFamily: 'var(--font-main)',
  },
  sendBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', cursor: 'pointer',
    color: 'var(--bg)', background: 'var(--primary)', border: line,
  },
};

/** Replace **bold** markers from the agent with <strong> nodes. */
function renderEmphasis(text: string): React.ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((chunk, i) =>
    i % 2 ? <strong key={i} style={{ color: 'var(--text)', fontWeight: 600 }}>{chunk}</strong> : chunk
  );
}

const Bubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const mine = message.role === 'user';
  return (
    <div
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '92%', padding: '12px 14px', lineHeight: 1.5, fontSize: '0.82rem',
        background: mine ? 'var(--text-main)' : 'var(--surface-raised)',
        color: mine ? 'var(--bg)' : 'var(--text-main)',
        border: line,
      }}
    >
      {!!message.tools?.length && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {message.tools.map((tool, i) => (
            <span key={i} className="tech-badge badge-cyan" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
              <Wrench size={10} />
              <span>{tool}()</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ whiteSpace: 'pre-wrap' }}>{renderEmphasis(message.text)}</div>
    </div>
  );
};

export const AICopilotDrawer: React.FC<CopilotProps> = ({ isOpen, onClose, selectedWell }) => {
  const [thread, setThread] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: `Hello! I am the **Drava Agentic AI Copilot**. I am connected directly to the **Baghewala Jodhpur Sandstone Digital Twin**, physics solvers, and deterministic tool supervisor for well **${selectedWell}**.\n\nHow can I assist your operational decisions today?`,
      tools: ['get_well_state'],
    },
  ]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread, busy]);

  const ask = async (override?: string) => {
    const question = (override ?? draft).trim();
    if (!question) return;

    setThread((t) => [...t, { role: 'user', text: question }]);
    setDraft('');
    setBusy(true);

    try {
      const reply = await api.queryCopilot(question, selectedWell);
      setThread((t) => [...t, { role: 'assistant', text: reply.answer, tools: reply.tools_used }]);
    } catch {
      setThread((t) => [...t, {
        role: 'assistant',
        text: 'An error occurred querying the agent service. Operating in offline fallback mode.',
        tools: [],
      }]);
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside style={styles.panel}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.logo}><Sparkles size={16} color="var(--bg)" /></div>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>Drava COPILOT</div>
            <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Grounded Petroleum Supervisor Agent</div>
          </div>
        </div>
        <button onClick={onClose} style={styles.closeBtn} aria-label="Close copilot">
          <X size={18} color="var(--text-main)" />
        </button>
      </header>

      <div style={styles.feed}>
        {thread.map((m, i) => <Bubble key={i} message={m} />)}
        {busy && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)' }}>
            <Sparkles size={14} />
            <span>Agent planning & calling physical calculators...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.chips}>
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(s)} style={styles.chip}>{s}</button>
        ))}
      </div>

      <div style={styles.composer}>
        <input
          type="text"
          placeholder="Ask engineering question..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
          style={styles.field}
        />
        <button onClick={() => ask()} style={styles.sendBtn} aria-label="Send">
          <Send size={16} />
        </button>
      </div>
    </aside>
  );
};
