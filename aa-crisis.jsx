// AlmondAI — Crisis Mode Page

const CRISIS_PLAN = {
  exam: 'NEET-PG 2025',
  daysLeft: 3,
  days: [
    {
      day: 1, label: 'Day 1 — High Yield Core',
      hours: [
        { time:'8–10 AM',  topic:'Pharmacology: Autonomic drugs + CVS drugs',  subject:'Pharmacology', done:true,  highYield:true },
        { time:'10–12 PM', topic:'Pathology: Cell injury, Inflammation, Neoplasia', subject:'Pathology',     done:true,  highYield:true },
        { time:'1–3 PM',   topic:'Physiology: Cardiac Output + ECG',            subject:'Physiology',   done:true,  highYield:true },
        { time:'3–5 PM',   topic:'Anatomy: Brachial plexus + Cranial nerves',   subject:'Anatomy',      done:false, highYield:true },
        { time:'5–6 PM',   topic:'Quick revision: Biochemistry enzymes',        subject:'Biochemistry', done:false, highYield:false },
        { time:'7–9 PM',   topic:'Microbiology: Bacterial infections + Antibiotics', subject:'Microbiology', done:false, highYield:true },
        { time:'9–10 PM',  topic:'MCQ Practice: Mixed 50 questions',            subject:'Practice',     done:false, highYield:false },
      ],
    },
    {
      day: 2, label: 'Day 2 — Clinical Sciences',
      hours: [
        { time:'8–10 AM',  topic:'Medicine: Cardiology + Respiratory',          subject:'Medicine',     done:false, highYield:true },
        { time:'10–12 PM', topic:'Surgery: GI + Hepatobiliary',                 subject:'Surgery',      done:false, highYield:true },
        { time:'1–3 PM',   topic:'Obs & Gynae: Antepartum + Labour',            subject:'Obs & Gynae',  done:false, highYield:true },
        { time:'3–5 PM',   topic:'Paediatrics: Developmental milestones + NNJ', subject:'Paediatrics',  done:false, highYield:true },
        { time:'5–7 PM',   topic:'ENT + Ophthalmology high-yield combined',     subject:'ENT/Ophtho',   done:false, highYield:true },
        { time:'8–10 PM',  topic:'Grand revision MCQs: 100 questions',          subject:'Practice',     done:false, highYield:false },
      ],
    },
    {
      day: 3, label: 'Day 3 — Final Sprint',
      hours: [
        { time:'8–10 AM',  topic:'Community Medicine: Biostatistics + Screening', subject:'PSM',        done:false, highYield:true },
        { time:'10–12 PM', topic:'Forensic Medicine: TOD + Wounds + Poisons',   subject:'FMT',          done:false, highYield:true },
        { time:'1–3 PM',   topic:'Rapid revision: All subjects 1-liners',       subject:'All',          done:false, highYield:false },
        { time:'3–5 PM',   topic:'Mock test: 200 question full paper',          subject:'Practice',     done:false, highYield:false },
        { time:'6 PM+',    topic:'Rest, hydrate, sleep early',                  subject:'Wellness',     done:false, highYield:false },
      ],
    },
  ],
};

const subjectColors = {
  'Pharmacology':'var(--aa-amber)','Pathology':'var(--aa-coral)','Physiology':'var(--aa-teal)',
  'Anatomy':'var(--aa-purple)','Biochemistry':'var(--aa-green)','Microbiology':'#60a5fa',
  'Medicine':'var(--aa-amber)','Surgery':'var(--aa-coral)','Obs & Gynae':'var(--aa-purple)',
  'Paediatrics':'var(--aa-teal)','ENT/Ophtho':'var(--aa-green)','PSM':'var(--aa-teal)',
  'FMT':'var(--aa-amber)','All':'var(--aa-text-2)','Practice':'var(--aa-teal)','Wellness':'var(--aa-green)',
};

const TeachModal = ({ topic, onClose }) => {
  const [loading, setLoading] = React.useState(true);
  const [content, setContent] = React.useState('');

  React.useEffect(() => {
    setLoading(true);
    window.claude.complete({
      messages:[{ role:'user', content:`Give me a rapid exam-focused summary of "${topic}" for NEET-PG. Use bullet points, bold key terms, and include 2-3 must-know facts. Keep it under 200 words.` }]
    }).then(r => { setContent(r); setLoading(false); })
      .catch(() => { setContent('Could not load content. Please try again.'); setLoading(false); });
  }, [topic]);

  const formatContent = (text) => text.split('\n').map((line, i) => {
    let html = line.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
    return <div key={i} dangerouslySetInnerHTML={{__html: html}}
      style={{ marginBottom: line==='' ? 8 : 3, lineHeight:1.65 }} />;
  });

  return (
    <div className="aa-overlay" onClick={onClose}>
      <div className="aa-modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
          <div>
            <div className="aa-badge aa-badge-coral" style={{ marginBottom:8 }}>🚨 Crisis Teach</div>
            <div className="aa-h3" style={{ lineHeight:1.3 }}>{topic}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            color:'var(--aa-text-2)', padding:4, flexShrink:0, marginTop:-2 }}>
            <Icons.close />
          </button>
        </div>
        <div style={{ padding:'18px', background:'var(--aa-s1)', borderRadius:'var(--aa-r-lg)',
          border:'1px solid var(--aa-border)', minHeight:160, maxHeight:360, overflowY:'auto' }}
          className="no-scroll">
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[100,85,90,70,95].map((w,i) => (
                <div key={i} style={{ height:14, borderRadius:6, background:'var(--aa-s3)',
                  width:`${w}%`, animation:`aaPulse 1.5s ${i*0.1}s ease-in-out infinite` }} />
              ))}
              <div style={{ marginTop:8, color:'var(--aa-teal)', fontSize:'0.78rem',
                fontFamily:'var(--aa-fd)', display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:12, height:12, border:'2px solid var(--aa-teal)', borderTopColor:'transparent',
                  borderRadius:'50%', animation:'aaSpinSlow 0.7s linear infinite' }} />
                AlmondAI is compiling crisis notes…
              </div>
            </div>
          ) : (
            <div className="aa-body-sm" style={{ lineHeight:1.7 }}>
              {formatContent(content)}
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          <button className="aa-btn aa-btn-primary aa-btn-sm" style={{ flex:1 }}>
            <Icons.clipboard /> Practice MCQs on this
          </button>
          <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const Crisis = ({ onNav }) => {
  const [activeDay, setActiveDay] = React.useState(1);
  const [checked, setChecked] = React.useState({ 0:true, 1:true, 2:true });
  const [teachTopic, setTeachTopic] = React.useState(null);
  const [activated, setActivated] = React.useState(true);

  const currentDayData = CRISIS_PLAN.days.find(d => d.day === activeDay);
  const doneCount = Object.values(checked).filter(Boolean).length;
  const totalToday = currentDayData?.hours.length || 0;
  const progressPct = totalToday > 0 ? Math.round((doneCount / totalToday)*100) : 0;

  const toggle = (i) => setChecked(c => ({ ...c, [i]: !c[i] }));

  if (!activated) return (
    <div className="aa-page aa-anim-fade-up">
      <div style={{ maxWidth:540 }}>
        <div style={{
          padding:'32px', background:'rgba(255,107,91,0.05)',
          border:'1px solid var(--aa-coral-border)', borderRadius:'var(--aa-r-xl)', textAlign:'center'
        }}>
          <div style={{ fontSize:'3rem', marginBottom:16 }}>🚨</div>
          <div className="aa-h2" style={{ marginBottom:8 }}>Activate Crisis Mode</div>
          <div className="aa-body" style={{ color:'var(--aa-text-2)', marginBottom:24, maxWidth:380, margin:'0 auto 24px' }}>
            Crisis Mode generates an AI-powered hour-by-hour exam rescue plan. Use when exam is in 1–7 days.
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
            {['NEET-PG 2025','MBBS Finals','FMGE','Internal Assessment'].map(exam => (
              <button key={exam} className="aa-pill" style={{ justifyContent:'center', padding:'10px' }}>
                {exam}
              </button>
            ))}
          </div>
          <button className="aa-btn aa-btn-danger" style={{ width:'100%', padding:'13px' }}
            onClick={() => setActivated(true)}>
            <Icons.alert /> Activate Crisis Mode — 1 Free Use
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background:'radial-gradient(ellipse at 50% 0%, rgba(228,180,160,0.06) 0%, var(--aa-bg) 55%)', minHeight:'100vh' }}>
      <div className="aa-page aa-anim-fade-up">
        {/* Crisis header */}
        <div style={{
          background:'rgba(228,180,160,0.07)', border:'1px solid var(--aa-coral-border)',
          borderRadius:'var(--aa-r-xl)', padding:'22px 28px', marginBottom:24,
          display:'flex', alignItems:'center', gap:20, position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120,
            background:'radial-gradient(circle, rgba(228,180,160,0.1) 0%, transparent 70%)' }} />
          <div style={{ fontSize:'2.8rem', animation:'aaFlicker 1.5s ease-in-out infinite', flexShrink:0 }}>🚨</div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span className="aa-badge aa-badge-coral">CRISIS MODE ACTIVE</span>
              <span className="aa-badge" style={{ background:'rgba(255,107,91,0.15)', color:'var(--aa-coral)',
                border:'1px solid var(--aa-coral-border)' }}>
                {CRISIS_PLAN.daysLeft} days to {CRISIS_PLAN.exam}
              </span>
            </div>
            <div className="aa-h2" style={{ color:'var(--aa-text-1)', marginBottom:4 }}>
              {CRISIS_PLAN.exam} — Emergency Plan
            </div>
            <div className="aa-body-sm" style={{ color:'var(--aa-text-2)' }}>
              AI-generated 3-day rescue plan · Stay focused, execute the mission
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--aa-fd)', fontSize:'3rem', fontWeight:800,
              color:'var(--aa-coral)', lineHeight:1, animation:'aaStreakGlow 2s ease-in-out infinite',
              filter:'drop-shadow(0 0 12px rgba(255,107,91,0.5))' }}>
              {CRISIS_PLAN.daysLeft}
            </div>
            <div className="aa-label" style={{ color:'var(--aa-text-3)', fontSize:'0.62rem' }}>DAYS LEFT</div>
          </div>
        </div>

        {/* Day selector */}
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          {CRISIS_PLAN.days.map(d => (
            <button key={d.day} onClick={() => { setActiveDay(d.day); setChecked({}); }}
              style={{
                flex:1, padding:'12px 16px', borderRadius:'var(--aa-r-md)', border:'1px solid',
                borderColor: activeDay===d.day ? 'var(--aa-coral-border)' : 'var(--aa-border)',
                background: activeDay===d.day ? 'var(--aa-coral-bg)' : 'var(--aa-s2)',
                color: activeDay===d.day ? 'var(--aa-coral)' : 'var(--aa-text-2)',
                fontFamily:'var(--aa-fb)', fontWeight:600, fontSize:'0.875rem', cursor:'pointer',
                transition:'all 0.18s',
              }}>
              <div>Day {d.day}</div>
              <div style={{ fontSize:'0.72rem', fontWeight:400, marginTop:2, opacity:0.75 }}>
                {d.hours.length} sessions
              </div>
            </button>
          ))}
        </div>

        {/* Day header + progress */}
        <div style={{ marginBottom:18 }}>
          <div className="aa-flex-between" style={{ marginBottom:10 }}>
            <span className="aa-h3">{currentDayData.label}</span>
            <span className="aa-badge aa-badge-coral">{doneCount}/{totalToday} done</span>
          </div>
          <div className="aa-prog-track" style={{ height:7 }}>
            <div className="aa-prog-fill"
              style={{ width:`${progressPct}%`,
                background:`linear-gradient(90deg, var(--aa-coral), #ff9580)`,
                boxShadow:'0 0 10px rgba(255,107,91,0.4)' }} />
          </div>
          <div className="aa-caption" style={{ marginTop:5, color:'var(--aa-coral)' }}>
            {progressPct}% of today's mission complete
            {progressPct === 100 && ' 🎉 Day complete!'}
          </div>
        </div>

        {/* Hour blocks */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
          {currentDayData.hours.map((block, i) => {
            const isDone = checked[i];
            const subColor = subjectColors[block.subject] || 'var(--aa-text-2)';
            return (
              <div key={i} style={{
                display:'flex', alignItems:'flex-start', gap:14, padding:'16px 18px',
                borderRadius:'var(--aa-r-md)',
                background: isDone ? 'rgba(34,197,94,0.04)' : 'var(--aa-s2)',
                border:`1px solid ${isDone ? 'var(--aa-green-border)' : 'var(--aa-border)'}`,
                transition:'all 0.2s', opacity: isDone ? 0.7 : 1,
              }}>
                {/* Checkbox */}
                <div onClick={() => toggle(i)} style={{
                  width:22, height:22, borderRadius:6, border:`2px solid ${isDone ? 'var(--aa-green)' : 'var(--aa-border)'}`,
                  background: isDone ? 'var(--aa-green)' : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', flexShrink:0, marginTop:1, transition:'all 0.2s',
                }}>
                  {isDone && <span style={{ color:'#06090f', fontSize:13, fontWeight:700 }}>✓</span>}
                </div>

                {/* Left bar */}
                <div style={{ width:3, alignSelf:'stretch', borderRadius:2, background:subColor, flexShrink:0, opacity:0.7 }} />

                {/* Content */}
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span className="aa-label" style={{ color:'var(--aa-text-3)', fontSize:'0.62rem' }}>{block.time}</span>
                    <span className="aa-badge" style={{ fontSize:'0.6rem', background:`${subColor}15`,
                      color:subColor, border:`1px solid ${subColor}40` }}>{block.subject}</span>
                    {block.highYield && <span className="aa-badge aa-badge-coral" style={{ fontSize:'0.58rem' }}>HY</span>}
                  </div>
                  <div className="aa-body-sm" style={{
                    color: isDone ? 'var(--aa-text-3)' : 'var(--aa-text-1)',
                    textDecoration: isDone ? 'line-through' : 'none',
                    fontWeight: isDone ? 400 : 500,
                  }}>{block.topic}</div>
                </div>

                {/* Teach button */}
                {!isDone && block.subject !== 'Practice' && block.subject !== 'Wellness' && (
                  <button className="aa-btn aa-btn-ghost aa-btn-xs" style={{ flexShrink:0 }}
                    onClick={() => setTeachTopic(block.topic)}>
                    <Icons.sparkles /> Teach me
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{ display:'flex', gap:10 }}>
          <button className="aa-btn aa-btn-danger" style={{ flex:1, padding:'12px' }} onClick={() => onNav('practice')}>
            <Icons.clipboard /> Practice MCQs Now
          </button>
          <button className="aa-btn aa-btn-secondary" onClick={() => onNav('tutor')}>
            <Icons.brain /> Ask AI Tutor
          </button>
        </div>
      </div>

      {teachTopic && <TeachModal topic={teachTopic} onClose={() => setTeachTopic(null)} />}
    </div>
  );
};

Object.assign(window, { Crisis });
