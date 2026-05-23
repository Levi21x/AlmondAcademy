// AlmondAI Dashboard Page

const QUICK_ACTIONS = [
  { id:'tutor',    label:'AI Tutor',     sub:'Ask anything',         icon:'brain',    color:'var(--aa-amber)',  bg:'var(--aa-amber-bg)', border:'var(--aa-amber-border)' },
  { id:'practice', label:'Practice MCQs',sub:'10 questions daily',   icon:'clipboard',color:'var(--aa-teal)',   bg:'var(--aa-teal-bg)',  border:'var(--aa-teal-border)' },
  { id:'syllabus', label:'Syllabus Map', sub:'Track your topics',    icon:'map',      color:'var(--aa-purple)', bg:'var(--aa-purple-bg)',border:'rgba(157,120,255,0.28)' },
  { id:'crisis',   label:'Crisis Mode',  sub:'Emergency revision',   icon:'alert',    color:'var(--aa-coral)',  bg:'var(--aa-coral-bg)', border:'var(--aa-coral-border)' },
];

const ACHIEVEMENTS = [
  { emoji:'🔥', label:'7-Day Streak', earned:true },
  { emoji:'⚡', label:'Speed Learner', earned:true },
  { emoji:'🏆', label:'Topic Master',  earned:false },
  { emoji:'💎', label:'Perfect Score', earned:false },
];

const StatCard = ({ icon, value, label, sub, color, onClick }) => {
  const Icon = Icons[icon];
  return (
    <div className="aa-card" onClick={onClick}
      style={{ padding:'22px 20px', cursor: onClick ? 'pointer' : 'default', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg, ${color}, transparent)`, opacity:0.6 }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ padding:8, borderRadius:'var(--aa-r)', background:`rgba(${color === 'var(--aa-amber)' ? '245,166,35' : color === 'var(--aa-teal)' ? '15,212,192' : '255,107,91'},0.1)`, color }}>
          <Icon />
        </div>
        {sub && <span className="aa-caption" style={{ fontSize:'0.7rem', color:'var(--aa-text-3)' }}>{sub}</span>}
      </div>
      <div style={{ fontFamily:'var(--aa-fd)', fontSize:'2rem', fontWeight:700, color:'var(--aa-text-1)', lineHeight:1 }}>
        {value}
      </div>
      <div className="aa-label" style={{ color:'var(--aa-text-3)', marginTop:6, fontSize:'0.65rem' }}>{label}</div>
    </div>
  );
};

const StreakDisplay = ({ streak }) => (
  <div style={{
    background:'linear-gradient(135deg, rgba(213,197,168,0.07) 0%, rgba(255,100,0,0.05) 100%)',
    border:'1px solid var(--aa-amber-border)', borderRadius:'var(--aa-r-lg)',
    padding:'20px 24px', display:'flex', alignItems:'center', gap:20,
  }}>
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:'3.5rem', lineHeight:1, animation:'aaFlicker 2s ease-in-out infinite, aaStreakGlow 2.5s ease-in-out infinite' }}>
        🔥
      </div>
    </div>
    <div>
      <div style={{ fontFamily:'var(--aa-fd)', fontSize:'2.4rem', fontWeight:800, color:'var(--aa-amber)', lineHeight:1, letterSpacing:'-0.03em' }}>
        {streak} days
      </div>
      <div className="aa-body" style={{ color:'var(--aa-text-2)', marginTop:4 }}>Study streak — you're on fire!</div>
      <div style={{ display:'flex', gap:4, marginTop:10 }}>
        {Array.from({length:7}).map((_,i) => (
          <div key={i} style={{
            width:28, height:28, borderRadius:'var(--aa-r-sm)',
            background: i < 6 ? 'var(--aa-amber-bg)' : 'var(--aa-s2)',
            border: i < 6 ? '1px solid var(--aa-amber-border)' : '1px solid var(--aa-border)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13
          }}>
            {i < 6 ? '✓' : '·'}
          </div>
        ))}
      </div>
    </div>
    <div style={{ marginLeft:'auto', textAlign:'right' }}>
      <div className="aa-label" style={{ color:'var(--aa-text-3)', fontSize:'0.62rem', marginBottom:6 }}>Best streak</div>
      <div style={{ fontFamily:'var(--aa-fd)', fontSize:'1.4rem', fontWeight:700, color:'var(--aa-text-2)' }}>21 days</div>
    </div>
  </div>
);

const XpSection = ({ xp, maxXp, level }) => {
  const pct = Math.min((xp / maxXp)*100, 100);
  return (
    <div style={{
      background:'var(--aa-s2)', border:'1px solid var(--aa-border)', borderRadius:'var(--aa-r-lg)',
      padding:'18px 22px',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}><Icons.sparkles /></span>
          <div>
            <div className="aa-h4" style={{ color:'var(--aa-text-1)' }}>Level {level} — Resident</div>
            <div className="aa-caption">{(maxXp - xp).toLocaleString()} XP to Level {level+1}</div>
          </div>
        </div>
        <span className="aa-level">LV {level}</span>
      </div>
      <div className="aa-prog-track" style={{ height:8 }}>
        <div className="aa-prog-fill aa-prog-fill-teal"
          style={{ width:`${pct}%`, animation:'aaXpLoad 1.4s ease-out' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
        <span className="aa-caption">{xp.toLocaleString()} XP</span>
        <span className="aa-caption">{maxXp.toLocaleString()} XP</span>
      </div>
    </div>
  );
};

const TodayMission = ({ onNav, questionsLeft, examName, examDays }) => (
  <div style={{
    position:'relative', overflow:'hidden',
    background:'linear-gradient(135deg, #1c1b1b 0%, #1a1a1a 60%, #131313 100%)',
    border:'1px solid rgba(213,197,168,0.12)',
    borderRadius:'var(--aa-r-xl)', padding:'32px 36px',
  }}>
    {/* Ambient glow */}
    <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200,
      background:'radial-gradient(circle, rgba(15,212,192,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
    <div style={{ position:'absolute', bottom:-40, left:100, width:160, height:160,
      background:'radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />

    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span className="aa-badge aa-badge-teal">Today's Mission</span>
        <span className="aa-badge aa-badge-amber">{new Date().toLocaleDateString('en-IN', {weekday:'long'})}</span>
      </div>
      <div className="aa-h1" style={{ color:'var(--aa-text-1)', marginBottom:8, maxWidth:500 }}>
        Your daily targets are ready, Arjun
      </div>
      <div className="aa-body" style={{ color:'var(--aa-text-2)', marginBottom:24, maxWidth:440 }}>
        {questionsLeft} questions left today · {examName} in <span style={{ color:'var(--aa-coral)', fontWeight:600 }}>{examDays} days</span>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
        <button className="aa-btn aa-btn-teal aa-btn-sm" onClick={() => onNav('tutor')}>
          <Icons.sparkles /> Start Study Session
        </button>
        <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={() => onNav('practice')}>
          <Icons.clipboard /> Practice MCQs
        </button>
      </div>

      <div style={{ marginTop:22, paddingTop:18, borderTop:'1px solid var(--aa-border)',
        display:'flex', gap:24 }}>
        {[
          { label:'Questions Today', value:'8 / 15', color:'var(--aa-teal)' },
          { label:'Accuracy',        value:'82%',   color:'var(--aa-green)' },
          { label:'Time Studied',    value:'2.4 hrs', color:'var(--aa-amber)' },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontFamily:'var(--aa-fd)', fontSize:'1.3rem', fontWeight:700, color:item.color }}>{item.value}</div>
            <div className="aa-label" style={{ color:'var(--aa-text-3)', fontSize:'0.62rem', marginTop:2 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const WeaknessAlert = ({ onNav }) => (
  <div className="aa-card" style={{ padding:'20px 22px' }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color:'var(--aa-coral)' }}><Icons.alert /></span>
        <span className="aa-h4">Weakness Alert</span>
      </div>
      <button className="aa-btn aa-btn-ghost aa-btn-xs" onClick={() => onNav('insights')}>View Insights →</button>
    </div>
    <div className="aa-body-sm" style={{ color:'var(--aa-text-2)', marginBottom:12 }}>
      AI detected <span style={{ color:'var(--aa-coral)', fontWeight:600 }}>3 critical gaps</span> that may cost you marks
    </div>
    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
      {['Cardiac Physiology', 'Renal Pharmacology', 'GI Anatomy'].map(t => (
        <span key={t} className="aa-badge aa-badge-coral" style={{ fontSize:'0.72rem', padding:'4px 10px' }}>{t}</span>
      ))}
    </div>
    <div style={{ marginTop:14, height:4, borderRadius:'var(--aa-r-full)', background:'var(--aa-s3)' }}>
      <div style={{ height:'100%', width:'38%', borderRadius:'var(--aa-r-full)',
        background:'linear-gradient(90deg, var(--aa-coral), #ff9580)',
        boxShadow:'0 0 8px rgba(255,107,91,0.4)' }} />
    </div>
    <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
      <span className="aa-caption" style={{ fontSize:'0.7rem' }}>Exam readiness</span>
      <span className="aa-caption" style={{ color:'var(--aa-coral)', fontSize:'0.7rem', fontWeight:600 }}>38% — Needs work</span>
    </div>
  </div>
);

const PeerWidget = () => (
  <div className="aa-card" style={{ padding:'20px 22px' }}>
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
      <span style={{ color:'var(--aa-teal)' }}><Icons.target /></span>
      <span className="aa-h4">Peer Intelligence</span>
    </div>
    <div className="aa-body-sm" style={{ color:'var(--aa-text-2)', marginBottom:12 }}>
      <span style={{ color:'var(--aa-teal)', fontWeight:600 }}>14 students</span> in your batch studied today
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {[
        { name:'Batch avg score',    val:'71%', color:'var(--aa-text-2)' },
        { name:'Top topic today',    val:'Pathology', color:'var(--aa-amber)' },
        { name:'Students ahead of you', val:'3', color:'var(--aa-coral)' },
      ].map(item => (
        <div key={item.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'7px 10px', background:'var(--aa-s1)', borderRadius:'var(--aa-r-sm)' }}>
          <span className="aa-caption">{item.name}</span>
          <span style={{ fontFamily:'var(--aa-fd)', fontSize:'0.875rem', fontWeight:600, color:item.color }}>{item.val}</span>
        </div>
      ))}
    </div>
  </div>
);

const RecentAchievement = () => (
  <div style={{
    background:'linear-gradient(135deg, rgba(157,120,255,0.08) 0%, rgba(245,166,35,0.04) 100%)',
    border:'1px solid rgba(157,120,255,0.25)', borderRadius:'var(--aa-r-lg)',
    padding:'16px 20px', display:'flex', alignItems:'center', gap:14
  }}>
    <div style={{
      width:52, height:52, borderRadius:'var(--aa-r-md)', flexShrink:0,
      background:'linear-gradient(135deg, rgba(206,197,185,0.12), rgba(245,166,35,0.1))',
      border:'1px solid rgba(157,120,255,0.3)',
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
      boxShadow:'0 0 20px rgba(206,197,185,0.12)'
    }}>🏅</div>
    <div>
      <div className="aa-label" style={{ color:'var(--aa-purple)', fontSize:'0.62rem', marginBottom:3 }}>Achievement Unlocked</div>
      <div className="aa-h4" style={{ color:'var(--aa-text-1)' }}>7-Day Streak</div>
      <div className="aa-caption">Studied 7 days in a row · +150 XP</div>
    </div>
    <div style={{ marginLeft:'auto' }}>
      <span style={{ fontSize:28 }}>✨</span>
    </div>
  </div>
);

const ExamCountdown = ({ examName, daysLeft }) => {
  const urgent = daysLeft < 20;
  const color = daysLeft < 10 ? 'var(--aa-coral)' : daysLeft < 30 ? 'var(--aa-amber)' : 'var(--aa-green)';
  return (
    <div className="aa-card" style={{
      padding:'22px 20px', position:'relative', overflow:'hidden',
      background: urgent ? 'rgba(255,107,91,0.04)' : 'var(--aa-s2)',
      borderColor: urgent ? 'var(--aa-coral-border)' : 'var(--aa-border)',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ color: urgent ? 'var(--aa-coral)' : 'var(--aa-text-2)' }}><Icons.calendar /></span>
        <span className={`aa-badge ${urgent ? 'aa-badge-coral' : 'aa-badge-amber'}`}>Upcoming</span>
      </div>
      <div style={{ fontFamily:'var(--aa-fd)', fontSize:'2.2rem', fontWeight:800, color, lineHeight:1 }}>{daysLeft}</div>
      <div className="aa-label" style={{ color:'var(--aa-text-3)', marginTop:4, fontSize:'0.65rem' }}>Days to {examName}</div>
      <div style={{ marginTop:12, display:'flex', gap:6 }}>
        {Array.from({length:5}).map((_,i) => (
          <div key={i} style={{
            flex:1, height:3, borderRadius:2,
            background: i < Math.ceil((daysLeft/60)*5) ? color : 'var(--aa-s3)'
          }} />
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ onNav, user }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="aa-page aa-anim-fade-up">
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span className="aa-badge aa-badge-teal">Learning Profile</span>
          <span className="aa-badge aa-badge-gray">{mode} Mode</span>
        </div>
        <div className="aa-display" style={{ color:'var(--aa-text-1)', marginBottom:6 }}>
          {greeting}, {user.name.split(' ')[0]} 👋
        </div>
        <div className="aa-body-lg" style={{ color:'var(--aa-text-2)' }}>
          AlmondAI is calibrated for your exam. Here's today's intelligence.
        </div>
      </div>

      {/* Today's Mission Hero */}
      <TodayMission onNav={onNav} questionsLeft={7} examName="NEET-PG" examDays={47} />

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, margin:'20px 0' }}>
        <StatCard icon="flame"    value={user.streak} label="Day Streak"    sub="Personal best: 21"  color="var(--aa-amber)" onClick={() => onNav('progress')} />
        <StatCard icon="calendar" value={47}          label="Days to NEET-PG" sub="On track"          color="var(--aa-coral)" />
        <StatCard icon="trending" value="82%"         label="Today's Accuracy" sub="↑ 8% vs last week" color="var(--aa-green)" onClick={() => onNav('progress')} />
      </div>

      {/* Streak + XP */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:20 }}>
        <StreakDisplay streak={user.streak} />
        <XpSection xp={user.xp} maxXp={user.maxXp} level={user.level} />
      </div>

      {/* Recent achievement */}
      <RecentAchievement />

      {/* Quick actions */}
      <div style={{ margin:'20px 0' }}>
        <div className="aa-flex-between" style={{ marginBottom:14 }}>
          <span className="aa-h3">Quick Access</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {QUICK_ACTIONS.map(item => {
            const Icon = Icons[item.icon];
            return (
              <div key={item.id} onClick={() => onNav(item.id)}
                style={{
                  padding:'18px 16px', borderRadius:'var(--aa-r-lg)',
                  background:item.bg, border:`1px solid ${item.border}`,
                  cursor:'pointer', transition:'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.3)`; }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
              >
                <div style={{ color:item.color, marginBottom:10 }}><Icon /></div>
                <div className="aa-h4" style={{ color:'var(--aa-text-1)', marginBottom:3 }}>{item.label}</div>
                <div className="aa-caption" style={{ color:'var(--aa-text-3)', fontSize:'0.7rem' }}>{item.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom row: Weakness + Peer */}
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:14, marginBottom:20 }}>
        <WeaknessAlert onNav={onNav} />
        <PeerWidget />
      </div>

      {/* Syllabus Progress */}
      <div className="aa-card" style={{ padding:'22px 24px' }}>
        <div className="aa-flex-between" style={{ marginBottom:16 }}>
          <span className="aa-h3">Syllabus Progress</span>
          <button className="aa-btn aa-btn-ghost aa-btn-xs" onClick={() => onNav('syllabus')}>Full Map →</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { name:'Anatomy',     pct:72, color:'var(--aa-amber)' },
            { name:'Physiology',  pct:58, color:'var(--aa-teal)' },
            { name:'Biochemistry',pct:45, color:'var(--aa-purple)' },
            { name:'Pathology',   pct:31, color:'var(--aa-coral)' },
          ].map(s => (
            <div key={s.name} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span className="aa-body-sm" style={{ width:110, flexShrink:0, color:'var(--aa-text-2)' }}>{s.name}</span>
              <div style={{ flex:1, height:5, background:'var(--aa-s3)', borderRadius:'var(--aa-r-full)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${s.pct}%`, borderRadius:'var(--aa-r-full)',
                  background:s.color, boxShadow:`0 0 6px ${s.color}50`, transition:'width 1s ease-out' }} />
              </div>
              <span className="aa-caption" style={{ width:32, textAlign:'right', color:s.color, fontWeight:600 }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

// mode needs to be accessible in this scope
const mode = 'MBBS';

Object.assign(window, { Dashboard });
