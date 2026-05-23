// AlmondAI — AI Tutor Page

const MODELS = [
  { id:'groq',   label:'Groq',   sub:'Fast',  emoji:'⚡', color:'var(--aa-amber)' },
  { id:'gemini', label:'Gemini', sub:'Smart', emoji:'🔮', color:'var(--aa-purple)' },
  { id:'claude', label:'Claude', sub:'Deep',  emoji:'🌿', color:'var(--aa-teal)' },
];

const MODES = [
  { id:'normal',    label:'Normal',    icon:'brain' },
  { id:'search',    label:'Search',    icon:'search' },
  { id:'visualise', label:'Visualise', icon:'image' },
];

const SAMPLE_MESSAGES = [
  { role:'user', text:'Explain the mechanism of action of ACE inhibitors in hypertension.' },
  { role:'ai', text:`ACE inhibitors block the Angiotensin-Converting Enzyme, which normally converts Angiotensin I → Angiotensin II.\n\n**Why this matters:**\n- Angiotensin II is a potent vasoconstrictor\n- It also stimulates aldosterone release → sodium/water retention\n- ACE inhibitors break both pathways\n\n**Net effect:** ↓ SVR + ↓ blood volume → ↓ BP\n\n**High-yield exam point:** ACE inhibitors also decrease bradykinin breakdown (same enzyme), which causes the classic dry cough side effect. This is why ARBs are preferred in patients who can't tolerate ACE inhibitors.` },
  { role:'user', text:'What are the contraindications?' },
  { role:'ai', text:`**Absolute contraindications:**\n1. **Pregnancy** — teratogenic (Category D), causes renal agenesis in fetus\n2. **Bilateral renal artery stenosis** — removes the protective Ang II effect on efferent arteriole, causing acute kidney injury\n3. **Hyperkalemia** — ACE-I reduce aldosterone → K⁺ retention\n4. **History of ACE-I-induced angioedema**\n\n**Remember this mnemonically:** *P-BRAK* — Pregnancy, Bilateral RAS, Renal failure (severe), Angioedema, K⁺ (hyperkalemia)` },
];

const TypingDots = () => (
  <div style={{ display:'flex', alignItems:'center', gap:5, padding:'12px 16px', background:'var(--aa-s2)',
    border:'1px solid var(--aa-border)', borderRadius:'var(--aa-r-lg)', borderBottomLeftRadius:4,
    width:'fit-content' }}>
    <span style={{ fontFamily:'var(--aa-fd)', fontSize:'0.75rem', color:'var(--aa-teal)', marginRight:4 }}>
      AlmondAI is thinking
    </span>
    {[0,1,2].map(i => (
      <div key={i} className="aa-typing-dot" style={{
        width:6, height:6, borderRadius:'50%', background:'var(--aa-teal)',
        animation:`aaDotPulse 1.4s ease-in-out ${i*0.2}s infinite`
      }} />
    ))}
  </div>
);

const AIAvatar = ({ size=32 }) => (
  <div style={{
    width:size, height:size, borderRadius:'var(--aa-r-sm)', flexShrink:0,
    background:'linear-gradient(135deg, rgba(213,197,168,0.12), rgba(206,197,185,0.1))',
    border:'1.5px solid var(--aa-teal-border)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:size*0.48, boxShadow:'0 0 12px var(--aa-teal-glow)'
  }}>🌰</div>
);

const formatMessage = (text) => {
  // Simple markdown-ish rendering
  const lines = text.split('\n');
  return lines.map((line, i) => {
    let formatted = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/↑/g, '<span style="color:var(--aa-green)">↑</span>')
      .replace(/↓/g, '<span style="color:var(--aa-coral)">↓</span>');
    if (line.startsWith('**') && line.endsWith('**')) {
      return <div key={i} dangerouslySetInnerHTML={{__html: formatted}} style={{ marginBottom:4 }} />;
    }
    if (line.match(/^\d+\./)) {
      return <div key={i} dangerouslySetInnerHTML={{__html: formatted}} style={{ marginBottom:3, paddingLeft:4 }} />;
    }
    return <div key={i} dangerouslySetInnerHTML={{__html: formatted}} style={{ marginBottom: line === '' ? 8 : 2 }} />;
  });
};

const Message = ({ msg }) => {
  if (msg.role === 'user') {
    return (
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <div className="aa-bubble aa-bubble-user">
          {msg.text}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'flex-start' }}>
      <AIAvatar />
      <div style={{ maxWidth:'76%' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
          <span style={{ fontFamily:'var(--aa-fd)', fontSize:'0.78rem', fontWeight:600, color:'var(--aa-teal)' }}>AlmondAI</span>
          <span className="aa-badge aa-badge-teal" style={{ fontSize:'0.58rem' }}>Claude</span>
        </div>
        <div className="aa-bubble aa-bubble-ai" style={{ lineHeight:1.7 }}>
          {formatMessage(msg.text)}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:6 }}>
          <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--aa-text-3)',
            fontSize:'0.72rem', fontFamily:'var(--aa-fb)', display:'flex', alignItems:'center', gap:4, transition:'color 0.15s' }}
            onMouseEnter={e => e.target.style.color='var(--aa-teal)'}
            onMouseLeave={e => e.target.style.color='var(--aa-text-3)'}>
            <Icons.book /> Study this
          </button>
          <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--aa-text-3)',
            fontSize:'0.72rem', fontFamily:'var(--aa-fb)', display:'flex', alignItems:'center', gap:4, transition:'color 0.15s' }}
            onMouseEnter={e => e.target.style.color='var(--aa-amber)'}
            onMouseLeave={e => e.target.style.color='var(--aa-text-3)'}>
            <Icons.clipboard /> Practice MCQs
          </button>
        </div>
      </div>
    </div>
  );
};

const Tutor = ({ onNav }) => {
  const [messages, setMessages] = React.useState(SAMPLE_MESSAGES);
  const [input, setInput] = React.useState('');
  const [model, setModel] = React.useState('claude');
  const [chatMode, setChatMode] = React.useState('normal');
  const [typing, setTyping] = React.useState(false);
  const [sessionCount, setSessionCount] = React.useState(12);
  const msgEndRef = React.useRef(null);

  React.useEffect(() => {
    if (msgEndRef.current) msgEndRef.current.scrollIntoView({ block:'nearest', behavior:'smooth' });
  }, [messages, typing]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages(m => [...m, { role:'user', text }]);
    setTyping(true);

    try {
      const reply = await window.claude.complete({
        messages: [
          { role:'user', content:`You are AlmondAI, a brilliant medical education AI for Indian MBBS/NEET-PG students. Answer this concisely but thoroughly for exam prep. Use bold for key terms and include high-yield exam points: ${text}` }
        ]
      });
      setMessages(m => [...m, { role:'ai', text: reply }]);
      setSessionCount(c => c + 1);
    } catch(e) {
      setMessages(m => [...m, { role:'ai', text:'I encountered an error. Please try again.' }]);
    } finally {
      setTyping(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const SUGGESTED = ['What are the adverse effects of NSAIDs?', 'Explain cardiac output regulation', 'High-yield drugs for NEET-PG'];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 0px)', overflow:'hidden' }}>
      {/* Top bar */}
      <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--aa-border)',
        background:'var(--aa-s1)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <AIAvatar size={36} />
        <div>
          <div className="aa-h4">AlmondAI Tutor</div>
          <div className="aa-caption" style={{ color:'var(--aa-green)', fontSize:'0.7rem' }}>● Online · Ready to teach</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          {/* Mode pills */}
          {MODES.map(m => {
            const Icon = Icons[m.icon];
            return (
              <button key={m.id} className={`aa-pill ${chatMode===m.id ? 'active-teal' : ''}`}
                onClick={() => setChatMode(m.id)}
                style={{ padding:'5px 12px', fontSize:'0.78rem' }}>
                <Icon /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Model selector */}
      <div style={{ padding:'10px 24px', borderBottom:'1px solid var(--aa-border)',
        display:'flex', alignItems:'center', gap:8, background:'var(--aa-bg)', flexShrink:0 }}>
        <span className="aa-label" style={{ color:'var(--aa-text-3)', fontSize:'0.62rem', marginRight:4 }}>Engine:</span>
        {MODELS.map(m => (
          <button key={m.id} onClick={() => setModel(m.id)}
            style={{
              display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
              borderRadius:'var(--aa-r-full)', border:'1px solid',
              borderColor: model===m.id ? m.color+'50' : 'var(--aa-border)',
              background: model===m.id ? m.color+'10' : 'transparent',
              color: model===m.id ? m.color : 'var(--aa-text-3)',
              fontFamily:'var(--aa-fb)', fontSize:'0.8rem', fontWeight:600,
              cursor:'pointer', transition:'all 0.18s',
            }}>
            <span>{m.emoji}</span> {m.label}
            <span style={{ fontSize:'0.65rem', opacity:0.7 }}>{m.sub}</span>
          </button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
          <span className="aa-caption" style={{ color:'var(--aa-text-3)', fontSize:'0.7rem' }}>
            {sessionCount}/15 sessions today
          </span>
          <div style={{ width:60, height:3, background:'var(--aa-s3)', borderRadius:'var(--aa-r-full)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(sessionCount/15)*100}%`,
              background:'var(--aa-teal)', borderRadius:'var(--aa-r-full)' }} />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px' }} className="no-scroll">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {typing && (
          <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:16 }}>
            <AIAvatar />
            <TypingDots />
          </div>
        )}
        <div ref={msgEndRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length <= 2 && (
        <div style={{ padding:'0 24px 12px', display:'flex', gap:8, flexWrap:'wrap' }}>
          {SUGGESTED.map(s => (
            <button key={s} onClick={() => setInput(s)}
              className="aa-pill" style={{ fontSize:'0.78rem' }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding:'14px 24px', borderTop:'1px solid var(--aa-border)', background:'var(--aa-s1)', flexShrink:0 }}>
        <div style={{
          display:'flex', gap:10, alignItems:'flex-end',
          background:'var(--aa-s2)', border:'1px solid var(--aa-border)',
          borderRadius:'var(--aa-r-xl)', padding:'12px 16px',
          transition:'border-color 0.2s',
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor='var(--aa-amber-border)'}
          onBlurCapture={e => e.currentTarget.style.borderColor='var(--aa-border)'}
        >
          <textarea
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Ask anything about medicine... (Enter to send)"
            style={{
              flex:1, background:'none', border:'none', outline:'none', resize:'none',
              fontFamily:'var(--aa-fb)', fontSize:'0.9rem', color:'var(--aa-text-1)',
              lineHeight:1.55, minHeight:24, maxHeight:120, paddingTop:2,
            }}
            rows={1}
          />
          <button onClick={sendMessage} disabled={!input.trim() || typing}
            style={{
              width:38, height:38, borderRadius:'var(--aa-r-full)', border:'none',
              background: input.trim() && !typing ? 'var(--aa-amber)' : 'var(--aa-s3)',
              color: input.trim() && !typing ? '#08100e' : 'var(--aa-text-3)',
              cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0, transition:'all 0.2s',
              boxShadow: input.trim() && !typing ? '0 0 16px var(--aa-amber-glow)' : 'none',
            }}>
            {typing
              ? <div style={{ width:16, height:16, border:'2px solid var(--aa-text-3)', borderTopColor:'transparent', borderRadius:'50%', animation:'aaSpinSlow 0.7s linear infinite' }} />
              : <Icons.send />
            }
          </button>
        </div>
        <div className="aa-caption" style={{ textAlign:'center', marginTop:8, fontSize:'0.68rem', color:'var(--aa-text-3)' }}>
          AlmondAI can make mistakes. Always verify with textbooks for exams.
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Tutor });
