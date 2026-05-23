// AlmondAI Sidebar Component

const NAV_ITEMS = [
  { id:'dashboard', label:'Dashboard',    icon:'dashboard' },
  { id:'tutor',     label:'AI Tutor',     icon:'brain' },
  { id:'syllabus',  label:'Syllabus Map', icon:'map' },
  { id:'practice',  label:'Practice MCQs',icon:'clipboard' },
  { id:'progress',  label:'Progress',     icon:'trending' },
  { id:'planner',   label:'Planner',      icon:'calendar' },
  { id:'insights',  label:'Insights',     icon:'chart',   badge:'3 Critical', badgeColor:'coral' },
  { id:'voice',     label:'Voice Agent',  icon:'mic' },
  { id:'visualise', label:'Visualise',    icon:'image',   badge:'PRO', badgeColor:'amber' },
];
const BOTTOM_ITEMS = [
  { id:'profile',  label:'Profile',  icon:'user' },
  { id:'settings', label:'Settings', icon:'settings' },
  { id:'crisis',   label:'Crisis Mode', icon:'alert', crisis:true, badge:'FREE', badgeColor:'green' },
];

const XPBar = ({ xp, maxXp, level }) => {
  const pct = Math.min((xp / maxXp) * 100, 100);
  return (
    <div>
      <div className="aa-flex-between" style={{ marginBottom: 6 }}>
        <span className="aa-label" style={{ color:'var(--aa-text-3)', fontSize:'0.63rem' }}>
          XP {xp.toLocaleString()} / {maxXp.toLocaleString()}
        </span>
        <span className="aa-level">LV {level}</span>
      </div>
      <div className="aa-prog-track" style={{ height: 5 }}>
        <div className="aa-prog-fill aa-prog-fill-teal"
          style={{ width:`${pct}%`, animation:'aaXpLoad 1.2s ease-out' }} />
      </div>
    </div>
  );
};

const AlmondHearts = ({ count=4, max=5 }) => (
  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
    {Array.from({length:max}).map((_,i) => (
      <span key={i} className={`aa-heart ${i < count ? 'on' : 'off'}`}>
        {i < count ? '🌰' : '·'}
      </span>
    ))}
  </div>
);

const Sidebar = ({ page, onNav, user }) => {
  const [mode, setMode] = React.useState('MBBS');
  const [collapsed, setCollapsed] = React.useState(false);

  const badgeColors = {
    coral: 'aa-badge-coral',
    amber: 'aa-badge-amber',
    green: 'aa-badge-green',
    teal:  'aa-badge-teal',
  };

  return (
    <aside className="aa-sidebar" style={{ padding:'0 0 24px' }}>
      {/* Logo */}
      <div style={{ padding:'22px 20px 16px', borderBottom:'1px solid var(--aa-border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{
            width:38, height:38, borderRadius:'var(--aa-r)', flexShrink:0,
            background:'var(--aa-s3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, boxShadow:'0 0 16px rgba(213,197,168,0.25)'
          }}>🌰</div>
          <div>
            <div style={{ fontFamily:'var(--aa-fd)', fontWeight:700, fontSize:'1.1rem',
              letterSpacing:'-0.02em', color:'var(--aa-text-1)', lineHeight:1 }}>
              AlmondAI
            </div>
            <div className="aa-label" style={{ color:'var(--aa-teal)', fontSize:'0.6rem', marginTop:2 }}>
              Medical Intelligence
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display:'flex', background:'var(--aa-bg)', borderRadius:'var(--aa-r-full)',
          padding:3, border:'1px solid var(--aa-border)'
        }}>
          {['MBBS','NEET-PG'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex:1, padding:'6px 0', borderRadius:'var(--aa-r-full)', border:'none',
              fontFamily:'var(--aa-fb)', fontSize:'0.75rem', fontWeight:600,
              cursor:'pointer', transition:'all 0.2s',
              background: mode===m ? 'var(--aa-amber-bg)' : 'transparent',
              color: mode===m ? 'var(--aa-amber)' : 'var(--aa-text-3)',
              boxShadow: mode===m ? '0 0 0 1px var(--aa-amber-border) inset' : 'none',
            }}>{m}</button>
          ))}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex:1, padding:'12px 12px 0', overflowY:'auto' }} className="no-scroll">
        <div className="aa-label" style={{ color:'var(--aa-text-3)', padding:'8px 8px 6px', fontSize:'0.6rem' }}>
          Core
        </div>
        {NAV_ITEMS.map(item => {
          const Icon = Icons[item.icon];
          const active = page === item.id;
          return (
            <div key={item.id} className={`aa-nav-item ${active ? 'active' : ''}`}
              onClick={() => onNav(item.id)} style={{ marginBottom:2 }}>
              <Icon />
              <span style={{ flex:1 }}>{item.label}</span>
              {item.badge && (
                <span className={`aa-badge ${badgeColors[item.badgeColor] || 'aa-badge-gray'}`} style={{ fontSize:'0.6rem' }}>
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}

        <div className="aa-label" style={{ color:'var(--aa-text-3)', padding:'12px 8px 6px', fontSize:'0.6rem' }}>
          Tools
        </div>
        {BOTTOM_ITEMS.map(item => {
          const Icon = Icons[item.icon];
          const active = page === item.id;
          return (
            <div key={item.id}
              className={`aa-nav-item ${item.crisis ? 'crisis-item' : ''} ${active ? 'active' : ''}`}
              onClick={() => onNav(item.id)} style={{ marginBottom:2 }}>
              <Icon />
              <span style={{ flex:1 }}>{item.label}</span>
              {item.badge && (
                <span className={`aa-badge ${badgeColors[item.badgeColor] || 'aa-badge-gray'}`} style={{ fontSize:'0.6rem' }}>
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ padding:'16px 16px 0', borderTop:'1px solid var(--aa-border)', marginTop:12 }}>
        {/* Streak */}
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          background:'var(--aa-s2)', border:'1px solid var(--aa-border)',
          borderRadius:'var(--aa-r-md)', padding:'10px 12px', marginBottom:10
        }}>
          <span style={{ fontSize:22, animation:'aaFlicker 2s ease-in-out infinite', filter:'drop-shadow(0 0 8px rgba(255,150,0,0.7))' }}>🔥</span>
          <div>
            <div style={{ fontFamily:'var(--aa-fd)', fontWeight:700, fontSize:'1rem', color:'var(--aa-amber)', lineHeight:1 }}>
              {user.streak} day streak
            </div>
            <div className="aa-caption" style={{ fontSize:'0.7rem', marginTop:2 }}>
              Keep it going!
            </div>
          </div>
          <div style={{ marginLeft:'auto' }}>
            <AlmondHearts count={user.almonds} max={5} />
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ marginBottom:14 }}>
          <XPBar xp={user.xp} maxXp={user.maxXp} level={user.level} />
        </div>

        {/* User profile */}
        <div style={{
          display:'flex', alignItems:'center', gap:10, padding:'8px 6px',
          borderRadius:'var(--aa-r)', cursor:'pointer',
          transition:'background 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background='var(--aa-s2)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}
          onClick={() => onNav('profile')}
        >
          <div style={{
            width:34, height:34, borderRadius:'var(--aa-r-full)',
            background:'linear-gradient(135deg, var(--aa-s3), var(--aa-s4))',
            border:'2px solid var(--aa-amber-border)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:14, fontWeight:700, color:'var(--aa-amber)',
            fontFamily:'var(--aa-fd)', flexShrink:0,
          }}>
            {user.name[0]}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div className="aa-body-sm" style={{ fontWeight:600, color:'var(--aa-text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user.name}
            </div>
            <div className="aa-caption" style={{ fontSize:'0.7rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user.college}
            </div>
          </div>
          {user.isPremium && (
            <span style={{ color:'var(--aa-amber)', flexShrink:0 }}><Icons.crown /></span>
          )}
        </div>
      </div>
    </aside>
  );
};

Object.assign(window, { Sidebar, AlmondHearts, XPBar });
