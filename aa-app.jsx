// AlmondAI — Main App Component (All Pages)

const USER = {
  name: 'Arjun Sharma',
  college: 'AIIMS New Delhi',
  streak: 14,
  xp: 2340,
  maxXp: 3000,
  level: 8,
  almonds: 4,
  isPremium: false,
};

const ALL_PAGES = {
  dashboard: Dashboard,
  tutor:     Tutor,
  practice:  Practice,
  syllabus:  Syllabus,
  crisis:    Crisis,
  progress:  Progress,
  planner:   Planner,
  insights:  Insights,
  voice:     VoiceAgent,
  visualise: Visualise,
  profile:   ProfilePage,
  settings:  SettingsPage,
  upgrade:   Upgrade,
};

const PlaceholderPage = ({ name }) => (
  <div className="aa-page aa-anim-fade-up">
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:'50vh', textAlign:'center', gap:16 }}>
      <div style={{ width:64, height:64, borderRadius:'var(--aa-r-xl)', background:'var(--aa-s2)',
        border:'1px solid var(--aa-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
        🚧
      </div>
      <div className="aa-h2">{name}</div>
      <div className="aa-body" style={{ color:'var(--aa-text-2)', maxWidth:300 }}>
        Navigate to a page from the sidebar.
      </div>
    </div>
  </div>
);

const Toast = ({ msg, type, onDone }) => {
  React.useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  return (
    <div className={`aa-toast aa-toast-${type}`}>
      <span>◈</span> {msg}
    </div>
  );
};

const TweaksPanel = ({ tweaks, onTweak }) => (
  <div id="aa-tweaks" className="visible">
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
      <div className="aa-h4">Tweaks</div>
      <span className="aa-badge aa-badge-green">Live</span>
    </div>

    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <div className="aa-label" style={{ color:'var(--aa-text-3)', marginBottom:8, fontSize:'0.62rem' }}>Accent Color</div>
        <div style={{ display:'flex', gap:6 }}>
          {[
            { label:'Almond', val:'almond', color:'#d5c5a8' },
            { label:'Cream',  val:'cream',  color:'#fff2de' },
            { label:'Warm',   val:'warm',   color:'#e4b4a0' },
          ].map(a => (
            <button key={a.val} onClick={() => onTweak('accent', a.val, a.color)}
              style={{
                flex:1, padding:'7px 4px', borderRadius:'var(--aa-r)', border:'1px solid',
                borderColor: tweaks.accent===a.val ? a.color+'60' : 'var(--aa-border)',
                background: tweaks.accent===a.val ? a.color+'12' : 'var(--aa-s1)',
                color: tweaks.accent===a.val ? a.color : 'var(--aa-text-2)',
                fontFamily:'var(--aa-fb)', fontSize:'0.72rem', fontWeight:600, cursor:'pointer', transition:'all 0.18s',
              }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:a.color, margin:'0 auto 3px' }} />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="aa-label" style={{ color:'var(--aa-text-3)', marginBottom:8, fontSize:'0.62rem' }}>Density</div>
        <div style={{ display:'flex', gap:6 }}>
          {['Compact','Default','Spacious'].map(d => (
            <button key={d} onClick={() => onTweak('density', d.toLowerCase())}
              className={`aa-pill ${tweaks.density===d.toLowerCase() ? 'active' : ''}`}
              style={{ flex:1, justifyContent:'center', fontSize:'0.72rem' }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="aa-label" style={{ color:'var(--aa-text-3)', marginBottom:6, fontSize:'0.62rem' }}>
          XP Demo ({tweaks.xp}%)
        </div>
        <input type="range" min="0" max="100" value={tweaks.xp}
          onChange={e => onTweak('xp', +e.target.value)}
          style={{ width:'100%', accentColor:'var(--aa-amber)', cursor:'pointer' }} />
      </div>

      <div>
        <div className="aa-label" style={{ color:'var(--aa-text-3)', marginBottom:6, fontSize:'0.62rem' }}>
          Streak Demo ({tweaks.streak} days)
        </div>
        <input type="range" min="0" max="100" value={tweaks.streak}
          onChange={e => onTweak('streak', +e.target.value)}
          style={{ width:'100%', accentColor:'var(--aa-amber)', cursor:'pointer' }} />
      </div>
    </div>
  </div>
);

const App = () => {
  const saved = (() => { try { return localStorage.getItem('aa_page') || 'dashboard'; } catch { return 'dashboard'; } })();
  const [page, setPage]       = React.useState(saved);
  const [toast, setToast]     = React.useState(null);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [tweaks, setTweaks]   = React.useState({
    accent: 'almond', density: 'default', xp: 78, streak: 14
  });

  const navigate = React.useCallback((p) => {
    setPage(p);
    try { localStorage.setItem('aa_page', p); } catch {}
  }, []);

  const handleTweak = (key, val, extra) => {
    setTweaks(t => ({ ...t, [key]: val }));
    if (key === 'accent' && extra) {
      document.documentElement.style.setProperty('--aa-amber', extra);
      document.documentElement.style.setProperty('--aa-amber-lt', extra + 'cc');
      document.documentElement.style.setProperty('--aa-amber-bg', extra + '12');
      document.documentElement.style.setProperty('--aa-amber-border', extra + '45');
      document.documentElement.style.setProperty('--aa-amber-glow', extra + '28');
      window.parent.postMessage({ type:'__edit_mode_set_keys', edits: { accent: val } }, '*');
    }
    if (key === 'density') {
      const padMap = { compact:'24px 28px 60px', default:'36px 44px 80px', spacious:'52px 60px 100px' };
      document.querySelectorAll('.aa-page').forEach(el => { el.style.padding = padMap[val]; });
    }
  };

  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode')   setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const userWithTweaks = {
    ...USER,
    streak: tweaks.streak,
    xp: Math.round((tweaks.xp / 100) * 3000),
    maxXp: 3000,
    level: 8,
  };

  const PageComp = ALL_PAGES[page];

  return (
    <div className="aa-layout">
      <Sidebar page={page} onNav={navigate} user={userWithTweaks} />

      <main className="aa-main">
        {PageComp
          ? <PageComp onNav={navigate} user={userWithTweaks} />
          : <PlaceholderPage name={page.charAt(0).toUpperCase() + page.slice(1)} />
        }
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {tweaksOpen && <TweaksPanel tweaks={tweaks} onTweak={handleTweak} />}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
