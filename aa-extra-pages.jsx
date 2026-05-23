// AlmondAI — Extra Pages (Progress, Planner, Insights, Voice, Visualise, Profile, Settings, Upgrade)

// ─────────────────────────────────────────────────────────
// PROGRESS PAGE
// ─────────────────────────────────────────────────────────
const HEATMAP_DATA = Array.from({length:56},(_,i)=>({day:i,val:Math.random()<0.3?0:Math.floor(Math.random()*5)+1}));
const BAR_DATA = [
  {sub:'Anatomy',acc:72,color:'var(--aa-amber)'},{sub:'Physiology',acc:58,color:'var(--aa-amber-lt)'},
  {sub:'Biochemistry',acc:45,color:'var(--aa-text-2)'},{sub:'Pathology',acc:31,color:'var(--aa-coral)'},
  {sub:'Pharmacology',acc:62,color:'var(--aa-amber)'},{sub:'Microbiology',acc:38,color:'var(--aa-text-2)'},
];

const Progress = ({ onNav }) => {
  const heatColors = ['var(--aa-s4)','rgba(213,197,168,0.2)','rgba(213,197,168,0.4)','rgba(213,197,168,0.65)','rgba(213,197,168,0.85)','var(--aa-amber)'];
  return (
    <div className="aa-page aa-anim-fade-up">
      <div style={{marginBottom:28}}>
        <div className="aa-h1" style={{marginBottom:6}}>Progress</div>
        <div className="aa-body" style={{color:'var(--aa-text-2)'}}>Your learning journey over time</div>
      </div>

      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[
          {label:'Total Questions',val:'847',sub:'All time',icon:'📝'},
          {label:'Avg Accuracy',val:'68%',sub:'Last 30 days',icon:'🎯'},
          {label:'Study Sessions',val:'63',sub:'This month',icon:'📅'},
          {label:'Total XP',val:'12,340',sub:'Level 8',icon:'⚡'},
        ].map(s=>(
          <div key={s.label} className="aa-card" style={{padding:'18px 16px'}}>
            <div style={{fontSize:20,marginBottom:10}}>{s.icon}</div>
            <div style={{fontFamily:'var(--aa-fd)',fontSize:'1.5rem',fontWeight:700,color:'var(--aa-amber)',lineHeight:1}}>{s.val}</div>
            <div className="aa-label" style={{color:'var(--aa-text-3)',marginTop:4,fontSize:'0.62rem'}}>{s.label}</div>
            <div className="aa-caption" style={{fontSize:'0.68rem',marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Streak + Heatmap */}
      <div className="aa-card" style={{padding:'22px 24px',marginBottom:20}}>
        <div className="aa-flex-between" style={{marginBottom:16}}>
          <div>
            <span className="aa-h3">Activity Heatmap</span>
            <div className="aa-caption" style={{marginTop:2}}>Last 8 weeks of study activity</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span className="aa-caption">Less</span>
            {heatColors.map((c,i)=><div key={i} style={{width:12,height:12,borderRadius:3,background:c}}/>)}
            <span className="aa-caption">More</span>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(28,1fr)',gap:3}}>
          {HEATMAP_DATA.map((d,i)=>(
            <div key={i} title={`${d.val} questions`} style={{
              width:'100%',paddingBottom:'100%',borderRadius:3,
              background:heatColors[Math.min(d.val,5)],
              cursor:'pointer',transition:'transform 0.1s',
            }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.3)'}
              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
            />
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:16,marginBottom:20}}>
        {/* Accuracy by subject */}
        <div className="aa-card" style={{padding:'22px 24px'}}>
          <div className="aa-h3" style={{marginBottom:16}}>Accuracy by Subject</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {BAR_DATA.map(b=>(
              <div key={b.sub}>
                <div className="aa-flex-between" style={{marginBottom:5}}>
                  <span className="aa-body-sm" style={{color:'var(--aa-text-2)'}}>{b.sub}</span>
                  <span style={{fontFamily:'var(--aa-fd)',fontSize:'0.9rem',fontWeight:600,color:b.color}}>{b.acc}%</span>
                </div>
                <div className="aa-prog-track" style={{height:5}}>
                  <div className="aa-prog-fill" style={{width:`${b.acc}%`,background:b.color,boxShadow:'none'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* XP breakdown */}
        <div className="aa-card" style={{padding:'22px 24px'}}>
          <div className="aa-h3" style={{marginBottom:16}}>XP This Week</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,marginBottom:12}}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=>{
              const h = [40,65,30,80,55,90,45][i];
              return (
                <div key={day} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <div style={{width:'100%',height:h+'%',background:i===5?'var(--aa-amber)':'var(--aa-s3)',borderRadius:'var(--aa-r-sm)',transition:'height 0.8s ease-out',position:'relative',overflow:'hidden'}}>
                    {i===5&&<div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,var(--aa-amber-lt),var(--aa-amber))'}}/>}
                  </div>
                  <span className="aa-caption" style={{fontSize:'0.65rem'}}>{day}</span>
                </div>
              );
            })}
          </div>
          <div className="aa-divider" style={{marginBottom:12}}/>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <div><div style={{fontFamily:'var(--aa-fd)',fontWeight:700,color:'var(--aa-amber)'}}>+840</div><div className="aa-caption" style={{fontSize:'0.7rem'}}>XP this week</div></div>
            <div><div style={{fontFamily:'var(--aa-fd)',fontWeight:700,color:'var(--aa-text-2)'}}>Level 8</div><div className="aa-caption" style={{fontSize:'0.7rem'}}>Current rank</div></div>
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="aa-card" style={{padding:'22px 24px'}}>
        <div className="aa-h3" style={{marginBottom:14}}>Recent Sessions</div>
        <div style={{display:'flex',flexDirection:'column',gap:0}}>
          {[
            {date:'Today',sub:'Pharmacology',q:12,acc:83,xp:120,streak:true},
            {date:'Yesterday',sub:'Anatomy',q:10,acc:70,xp:90,streak:true},
            {date:'2 days ago',sub:'Physiology',q:8,acc:62,xp:70,streak:false},
            {date:'3 days ago',sub:'Pathology',q:15,acc:53,xp:60,streak:false},
          ].map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderBottom:i<3?'1px solid var(--aa-border)':'none'}}>
              <div style={{width:40,height:40,borderRadius:'var(--aa-r)',background:'var(--aa-s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                {s.streak?'🔥':'📖'}
              </div>
              <div style={{flex:1}}>
                <div className="aa-body-sm" style={{fontWeight:600}}>{s.sub}</div>
                <div className="aa-caption" style={{fontSize:'0.7rem'}}>{s.date} · {s.q} questions</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--aa-fd)',fontSize:'0.9rem',fontWeight:600,color:s.acc>=70?'var(--aa-green)':s.acc>=50?'var(--aa-caution)':'var(--aa-coral)'}}>{s.acc}%</div>
                <div className="aa-caption" style={{fontSize:'0.68rem',color:'var(--aa-amber)'}}>+{s.xp} XP</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// PLANNER PAGE
// ─────────────────────────────────────────────────────────
const Planner = ({ onNav }) => {
  const [showModal, setShowModal] = React.useState(false);
  const exams = [{name:'NEET-PG 2025',days:47,type:'NEET-PG'},{name:'MBBS Finals',days:23,type:'University'}];
  const todayPlan = [
    {time:'8–10 AM',topic:'Pharmacology — Cardiac drugs',done:true,subject:'Pharma'},
    {time:'10–12 PM',topic:'Anatomy — Brachial plexus revision',done:true,subject:'Anatomy'},
    {time:'2–4 PM',topic:'Practice MCQs — 20 mixed questions',done:false,subject:'Practice'},
    {time:'4–6 PM',topic:'Physiology — Cardiac output',done:false,subject:'Physio'},
    {time:'8–9 PM',topic:'Quick revision — Yesterday\'s errors',done:false,subject:'Revision'},
  ];
  const [done, setDone] = React.useState({0:true,1:true});

  return (
    <div className="aa-page aa-anim-fade-up">
      <div className="aa-flex-between" style={{marginBottom:28}}>
        <div>
          <div className="aa-h1" style={{marginBottom:6}}>Study Planner</div>
          <div className="aa-body" style={{color:'var(--aa-text-2)'}}>Your exam countdown and daily plan</div>
        </div>
        <button className="aa-btn aa-btn-primary aa-btn-sm" onClick={()=>setShowModal(true)}>+ Add Exam</button>
      </div>

      {/* Exam countdowns */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:24}}>
        {exams.map(e=>{
          const urgent=e.days<20;
          const color=e.days<10?'var(--aa-coral)':e.days<30?'var(--aa-caution)':'var(--aa-amber)';
          return (
            <div key={e.name} style={{padding:'24px',borderRadius:'var(--aa-r-xl)',background:'var(--aa-s2)',border:`1px solid ${urgent?'var(--aa-coral-border)':'var(--aa-border)'}`,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:`radial-gradient(circle, ${color}12 0%, transparent 70%)`}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div>
                  <span className={`aa-badge ${urgent?'aa-badge-coral':'aa-badge-amber'}`}>{e.type}</span>
                  <div className="aa-h3" style={{marginTop:8}}>{e.name}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'var(--aa-fd)',fontSize:'2.8rem',fontWeight:800,color,lineHeight:1}}>{e.days}</div>
                  <div className="aa-label" style={{color:'var(--aa-text-3)',fontSize:'0.62rem'}}>days left</div>
                </div>
              </div>
              <div className="aa-prog-track" style={{height:4}}>
                <div className="aa-prog-fill" style={{width:`${Math.max(5,100-(e.days/90*100))}%`,background:color,boxShadow:'none'}}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's plan */}
      <div className="aa-card" style={{padding:'22px 24px',marginBottom:20}}>
        <div className="aa-flex-between" style={{marginBottom:16}}>
          <div>
            <div className="aa-h3">Today's Plan</div>
            <div className="aa-caption" style={{marginTop:2}}>{Object.values(done).filter(Boolean).length}/{todayPlan.length} sessions complete</div>
          </div>
          <div style={{display:'flex',gap:3}}>
            {todayPlan.map((_,i)=>(
              <div key={i} style={{width:24,height:5,borderRadius:2,background:done[i]?'var(--aa-green)':'var(--aa-s4)'}}/>
            ))}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {todayPlan.map((s,i)=>(
            <div key={i} onClick={()=>setDone(d=>({...d,[i]:!d[i]}))} style={{
              display:'flex',alignItems:'center',gap:12,padding:'12px 14px',
              borderRadius:'var(--aa-r-md)',border:'1px solid',cursor:'pointer',transition:'all 0.18s',
              borderColor:done[i]?'var(--aa-green-border)':'var(--aa-border)',
              background:done[i]?'var(--aa-green-bg)':'var(--aa-s1)',
              opacity:done[i]?0.75:1,
            }}>
              <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${done[i]?'var(--aa-green)':'var(--aa-border)'}`,background:done[i]?'var(--aa-green)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.18s'}}>
                {done[i]&&<span style={{color:'#131313',fontSize:12,fontWeight:700}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div className="aa-body-sm" style={{fontWeight:500,textDecoration:done[i]?'line-through':'none',color:done[i]?'var(--aa-text-3)':'var(--aa-text-1)'}}>{s.topic}</div>
                <div className="aa-caption" style={{fontSize:'0.7rem',marginTop:1}}>{s.time}</div>
              </div>
              <span className="aa-badge aa-badge-gray" style={{fontSize:'0.6rem'}}>{s.subject}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Week view */}
      <div className="aa-card" style={{padding:'22px 24px'}}>
        <div className="aa-h3" style={{marginBottom:14}}>This Week</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>{
            const isToday=i===3;const done2=i<3;
            return (
              <div key={d} style={{textAlign:'center'}}>
                <div className="aa-caption" style={{fontSize:'0.68rem',marginBottom:6,color:isToday?'var(--aa-amber)':'var(--aa-text-3)'}}>{d}</div>
                <div style={{padding:'10px 4px',borderRadius:'var(--aa-r-md)',border:'1px solid',borderColor:isToday?'var(--aa-amber-border)':done2?'var(--aa-green-border)':'var(--aa-border)',background:isToday?'var(--aa-amber-bg)':done2?'var(--aa-green-bg)':'var(--aa-s1)'}}>
                  <div style={{fontSize:isToday?'1.1rem':'0.9rem',fontFamily:'var(--aa-fd)',fontWeight:700,color:isToday?'var(--aa-amber)':done2?'var(--aa-green)':'var(--aa-text-3)'}}>
                    {isToday?'📅':done2?'✓':'·'}
                  </div>
                  <div className="aa-caption" style={{fontSize:'0.62rem',marginTop:3}}>{done2?'Done':isToday?'Today':'–'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal&&(
        <div className="aa-overlay" onClick={()=>setShowModal(false)}>
          <div className="aa-modal" onClick={e=>e.stopPropagation()}>
            <div className="aa-h3" style={{marginBottom:16}}>Add Exam</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><div className="aa-label" style={{color:'var(--aa-text-3)',marginBottom:6,fontSize:'0.62rem'}}>Exam Name</div><input className="aa-input" placeholder="NEET-PG 2025"/></div>
              <div><div className="aa-label" style={{color:'var(--aa-text-3)',marginBottom:6,fontSize:'0.62rem'}}>Exam Date</div><input type="date" className="aa-input"/></div>
              <div><div className="aa-label" style={{color:'var(--aa-text-3)',marginBottom:6,fontSize:'0.62rem'}}>Type</div>
                <select className="aa-input"><option>NEET-PG</option><option>University</option><option>FMGE</option><option>Internal</option></select>
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:20}}>
              <button className="aa-btn aa-btn-primary" style={{flex:1}} onClick={()=>setShowModal(false)}>Save Exam</button>
              <button className="aa-btn aa-btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// INSIGHTS PAGE
// ─────────────────────────────────────────────────────────
const Insights = ({ onNav }) => {
  const gaps = [
    {topic:'Cardiac Physiology',subject:'Physiology',risk:'Critical',score:18,color:'var(--aa-coral)'},
    {topic:'Renal Pharmacology',subject:'Pharmacology',risk:'Critical',score:22,color:'var(--aa-coral)'},
    {topic:'GI Anatomy',subject:'Anatomy',risk:'High',score:34,color:'var(--aa-caution)'},
    {topic:'Biochemistry Enzymes',subject:'Biochemistry',risk:'High',score:41,color:'var(--aa-caution)'},
    {topic:'Inflammation Pathology',subject:'Pathology',risk:'Medium',score:52,color:'var(--aa-amber)'},
    {topic:'Antibiotic Resistance',subject:'Microbiology',risk:'Medium',score:58,color:'var(--aa-amber)'},
  ];
  const readiness = 38;
  return (
    <div className="aa-page aa-anim-fade-up">
      <div style={{marginBottom:28}}>
        <div className="aa-h1" style={{marginBottom:6}}>Insights</div>
        <div className="aa-body" style={{color:'var(--aa-text-2)'}}>AI-powered weakness detection and readiness analysis</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:16,marginBottom:24}}>
        {/* Readiness gauge */}
        <div className="aa-card" style={{padding:'28px',textAlign:'center'}}>
          <div className="aa-label" style={{color:'var(--aa-text-3)',fontSize:'0.62rem',marginBottom:16}}>Exam Readiness</div>
          <div style={{position:'relative',width:140,height:140,margin:'0 auto 16px'}}>
            <svg width="140" height="140">
              <circle cx="70" cy="70" r="58" fill="none" stroke="var(--aa-s4)" strokeWidth="10"/>
              <circle cx="70" cy="70" r="58" fill="none" strokeWidth="10"
                stroke={readiness<40?'var(--aa-coral)':readiness<60?'var(--aa-caution)':'var(--aa-green)'}
                strokeLinecap="round" strokeDasharray={`${(readiness/100)*364.4} 364.4`}
                style={{transform:'rotate(-90deg)',transformOrigin:'center',transition:'stroke-dasharray 1s ease-out'}}/>
            </svg>
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <div style={{fontFamily:'var(--aa-fd)',fontSize:'2rem',fontWeight:800,color:readiness<40?'var(--aa-coral)':'var(--aa-amber)',lineHeight:1}}>{readiness}%</div>
              <div className="aa-caption" style={{fontSize:'0.68rem',marginTop:2}}>Readiness</div>
            </div>
          </div>
          <div className="aa-badge aa-badge-coral" style={{margin:'0 auto'}}>Needs Work</div>
          <div className="aa-body-sm" style={{color:'var(--aa-text-2)',marginTop:12,lineHeight:1.5}}>
            2 critical gaps need immediate attention before your exam.
          </div>
        </div>

        {/* Summary stats */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {[{label:'Critical Gaps',val:2,color:'var(--aa-coral)',bg:'var(--aa-coral-bg)'},{label:'High Risk Topics',val:4,color:'var(--aa-caution)',bg:'var(--aa-caution-bg)'},{label:'Strong Topics',val:18,color:'var(--aa-green)',bg:'var(--aa-green-bg)'}].map(s=>(
              <div key={s.label} style={{padding:'16px',borderRadius:'var(--aa-r-lg)',background:s.bg,border:`1px solid ${s.color}30`,textAlign:'center'}}>
                <div style={{fontFamily:'var(--aa-fd)',fontSize:'2rem',fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div>
                <div className="aa-label" style={{color:s.color,opacity:0.75,fontSize:'0.6rem',marginTop:6}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI recommendation */}
          <div style={{padding:'16px 18px',borderRadius:'var(--aa-r-lg)',background:'var(--aa-s2)',border:'1px solid var(--aa-border)',flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:16}}>🌰</span>
              <span className="aa-h4">AlmondAI Recommendation</span>
            </div>
            <div className="aa-body-sm" style={{color:'var(--aa-text-2)',lineHeight:1.7}}>
              Prioritise <strong style={{color:'var(--aa-coral)'}}>Cardiac Physiology</strong> and <strong style={{color:'var(--aa-coral)'}}>Renal Pharmacology</strong> this week. These topics carry the highest mark-risk for NEET-PG. Spending 4 hours on each with AI Tutor could shift your readiness score from 38% to ~55%.
            </div>
            <button className="aa-btn aa-btn-primary aa-btn-sm" style={{marginTop:12}} onClick={()=>onNav('tutor')}>
              Study with AI Tutor →
            </button>
          </div>
        </div>
      </div>

      {/* Gaps table */}
      <div className="aa-card" style={{padding:'22px 24px'}}>
        <div className="aa-flex-between" style={{marginBottom:16}}>
          <div className="aa-h3">Topic Risk Analysis</div>
          <span className="aa-badge aa-badge-gray">AI Updated Today</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:0}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:12,padding:'8px 12px',borderBottom:'1px solid var(--aa-border)'}}>
            {['Topic','Subject','Risk Level','Readiness'].map(h=>(
              <span key={h} className="aa-label" style={{color:'var(--aa-text-3)',fontSize:'0.62rem'}}>{h}</span>
            ))}
          </div>
          {gaps.map((g,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:12,padding:'12px',borderBottom:i<gaps.length-1?'1px solid var(--aa-border)':'none',alignItems:'center',transition:'background 0.15s',cursor:'pointer'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--aa-s1)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span className="aa-body-sm" style={{fontWeight:500}}>{g.topic}</span>
              <span className="aa-caption">{g.subject}</span>
              <span className={`aa-badge ${g.risk==='Critical'?'aa-badge-coral':g.risk==='High'?'aa-badge-caution':'aa-badge-amber'}`} style={{fontSize:'0.6rem',width:'fit-content'}}>{g.risk}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{flex:1,height:4,borderRadius:2,background:'var(--aa-s4)',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${g.score}%`,background:g.color,borderRadius:2}}/>
                </div>
                <span style={{fontSize:'0.75rem',fontWeight:600,color:g.color,width:28}}>{g.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// VOICE AGENT PAGE
// ─────────────────────────────────────────────────────────
const VoiceAgent = ({ onNav }) => {
  const [recording, setRecording] = React.useState(false);
  const [status, setStatus] = React.useState('idle');
  const [transcript, setTranscript] = React.useState('');
  const [history, setHistory] = React.useState([
    {role:'user',text:'What is the mechanism of action of beta blockers?'},
    {role:'ai',text:'Beta blockers competitively inhibit catecholamines at beta-adrenergic receptors, reducing heart rate, myocardial contractility, and blood pressure. They\'re classified as β1-selective like metoprolol, or non-selective like propranolol.'},
  ]);

  const toggleRecording = () => {
    if (recording) {
      setRecording(false); setStatus('processing');
      setTimeout(()=>{
        setStatus('responding');
        setHistory(h=>[...h,{role:'user',text:'Explain the side effects of ACE inhibitors'},{role:'ai',text:'The classic side effect of ACE inhibitors is a dry, persistent cough caused by bradykinin accumulation. Other effects include hyperkalemia, hypotension (first dose), and rarely angioedema.'}]);
        setTimeout(()=>setStatus('idle'),2000);
      },1500);
    } else {
      setRecording(true); setStatus('recording');
    }
  };

  const waveBarH = [4,8,16,12,20,8,14,18,10,6,16,20,12,8,18,14,6,10];

  return (
    <div className="aa-page aa-anim-fade-up">
      <div style={{marginBottom:28}}>
        <div className="aa-h1" style={{marginBottom:6}}>Voice Agent</div>
        <div className="aa-body" style={{color:'var(--aa-text-2)'}}>Speak naturally — AlmondAI listens and responds</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:20}}>
        {/* Left: mic + controls */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
          <div className="aa-card" style={{padding:'40px 24px',width:'100%',textAlign:'center'}}>
            {/* Status */}
            <div style={{marginBottom:24}}>
              <div className={`aa-badge ${status==='recording'?'aa-badge-coral':status==='processing'?'aa-badge-caution':status==='responding'?'aa-badge-green':'aa-badge-gray'}`} style={{margin:'0 auto',marginBottom:8}}>
                {status==='recording'?'● Recording':status==='processing'?'⟳ Processing':status==='responding'?'◈ Responding':'Ready'}
              </div>
              <div className="aa-body-sm" style={{color:'var(--aa-text-2)'}}>
                {status==='recording'?'Speak clearly...':status==='processing'?'Understanding...':status==='responding'?'AlmondAI is answering...':'Tap to start speaking'}
              </div>
            </div>

            {/* Waveform */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:3,height:40,marginBottom:28}}>
              {waveBarH.map((h,i)=>(
                <div key={i} style={{
                  width:4,borderRadius:2,
                  background:recording?'var(--aa-amber)':'var(--aa-s4)',
                  height:recording?h+'px':'4px',
                  transition:`height ${0.1+i*0.03}s ease-in-out`,
                  animation:recording?`aaFlicker ${0.8+i*0.1}s ease-in-out infinite`:'none',
                }}/>
              ))}
            </div>

            {/* Mic button */}
            <button onClick={toggleRecording} style={{
              width:80,height:80,borderRadius:'50%',border:'none',
              background:recording?'var(--aa-coral)':'var(--aa-amber)',
              color:'#131313',display:'flex',alignItems:'center',justifyContent:'center',
              cursor:'pointer',transition:'all 0.2s',margin:'0 auto',
              animation:recording?'aaMicPulse 1.5s ease-in-out infinite':'none',
              boxShadow:recording?'0 0 0 0 rgba(228,180,160,0.4)':'0 4px 20px rgba(213,197,168,0.3)',
              fontSize:28,
            }}>
              {recording?'⏹':'🎤'}
            </button>

            <div className="aa-caption" style={{marginTop:16,color:'var(--aa-text-3)'}}>
              {recording?'Tap to stop':'Tap to ask a question'}
            </div>
          </div>

          {/* Suggested topics */}
          <div className="aa-card" style={{padding:'16px 20px',width:'100%'}}>
            <div className="aa-label" style={{color:'var(--aa-text-3)',fontSize:'0.62rem',marginBottom:10}}>Try asking</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {['Explain the brachial plexus','What drugs cause dry cough?','Describe cardiac output regulation'].map(q=>(
                <button key={q} className="aa-pill" style={{justifyContent:'flex-start',fontSize:'0.78rem',padding:'7px 12px'}}>
                  🎤 {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: transcript */}
        <div className="aa-card" style={{padding:'20px',display:'flex',flexDirection:'column',minHeight:500}}>
          <div className="aa-flex-between" style={{marginBottom:14}}>
            <div className="aa-h4">Conversation</div>
            <button className="aa-btn aa-btn-ghost aa-btn-xs" onClick={()=>setHistory([])}>Clear</button>
          </div>
          <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:14}} className="no-scroll">
            {history.map((msg,i)=>(
              <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',flexDirection:msg.role==='user'?'row-reverse':'row'}}>
                <div style={{width:28,height:28,borderRadius:'var(--aa-r-sm)',background:'var(--aa-s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>
                  {msg.role==='user'?'👤':'🌰'}
                </div>
                <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius:'var(--aa-r-lg)',background:msg.role==='user'?'var(--aa-amber-bg)':'var(--aa-s1)',border:`1px solid ${msg.role==='user'?'var(--aa-amber-border)':'var(--aa-border)'}`,borderBottomRightRadius:msg.role==='user'?4:'var(--aa-r-lg)',borderBottomLeftRadius:msg.role==='ai'?4:'var(--aa-r-lg)'}}>
                  <div className="aa-body-sm" style={{lineHeight:1.65}}>{msg.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// VISUALISE PAGE
// ─────────────────────────────────────────────────────────
const Visualise = ({ onNav }) => {
  const [topic, setTopic] = React.useState('');
  const [type, setType] = React.useState('mindmap');
  const visTypes = [{id:'mindmap',label:'Mind Map',icon:'🗺️'},{id:'flowchart',label:'Flowchart',icon:'📊'},{id:'timeline',label:'Timeline',icon:'📅'},{id:'comparison',label:'Comparison',icon:'⚖️'}];
  const samples = [
    {title:'Brachial Plexus',type:'Mind Map',sub:'Anatomy',icon:'🦴'},
    {title:'ACE Inhibitor MOA',type:'Flowchart',sub:'Pharmacology',icon:'💊'},
    {title:'Cardiac Cycle',type:'Timeline',sub:'Physiology',icon:'💓'},
    {title:'Beta Blockers vs ARBs',type:'Comparison',sub:'Pharmacology',icon:'⚖️'},
    {title:'GI Motility',type:'Flowchart',sub:'Physiology',icon:'🔄'},
    {title:'Blood Coagulation',type:'Timeline',sub:'Biochemistry',icon:'🩸'},
  ];
  return (
    <div className="aa-page aa-anim-fade-up">
      <div style={{marginBottom:28}}>
        <div className="aa-h1" style={{marginBottom:6}}>Visualise</div>
        <div className="aa-body" style={{color:'var(--aa-text-2)'}}>Turn complex concepts into beautiful visual diagrams</div>
      </div>

      {/* Input */}
      <div className="aa-card" style={{padding:'22px 24px',marginBottom:24}}>
        <div className="aa-label" style={{color:'var(--aa-text-3)',marginBottom:8,fontSize:'0.62rem'}}>Enter a topic to visualise</div>
        <div style={{display:'flex',gap:10,marginBottom:14}}>
          <input className="aa-input" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Cardiac Output regulation, Brachial Plexus..." style={{flex:1}}/>
          <button className="aa-btn aa-btn-primary" disabled={!topic.trim()}>Generate Visual</button>
        </div>
        <div style={{display:'flex',gap:8}}>
          {visTypes.map(v=>(
            <button key={v.id} className={`aa-pill ${type===v.id?'active':''}`} onClick={()=>setType(v.id)} style={{fontSize:'0.78rem'}}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sample visuals grid */}
      <div className="aa-flex-between" style={{marginBottom:14}}>
        <div className="aa-h3">Recent Visuals</div>
        <span className="aa-badge aa-badge-amber">PRO</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
        {samples.map(s=>(
          <div key={s.title} className="aa-card" style={{padding:'20px',cursor:'pointer'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--aa-amber-border)';e.currentTarget.style.transform='translateY(-3px)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--aa-border)';e.currentTarget.style.transform='';}}>
            <div style={{width:'100%',height:90,borderRadius:'var(--aa-r)',background:'var(--aa-s1)',border:'1px solid var(--aa-border)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12,fontSize:32}}>
              {s.icon}
            </div>
            <div className="aa-h4" style={{marginBottom:4}}>{s.title}</div>
            <div style={{display:'flex',gap:6}}>
              <span className="aa-badge aa-badge-gray" style={{fontSize:'0.6rem'}}>{s.type}</span>
              <span className="aa-badge aa-badge-amber" style={{fontSize:'0.6rem'}}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// PROFILE PAGE
// ─────────────────────────────────────────────────────────
const BADGES = [
  {emoji:'🔥',label:'7-Day Streak',desc:'7 days in a row',earned:true},
  {emoji:'⚡',label:'Speed Learner',desc:'Answered in <10s',earned:true},
  {emoji:'🏆',label:'Topic Master',desc:'100% on any topic',earned:false},
  {emoji:'💎',label:'Perfect Score',desc:'10/10 session',earned:false},
  {emoji:'🌙',label:'Night Owl',desc:'Study after midnight',earned:true},
  {emoji:'🎯',label:'Consistent',desc:'30-day streak',earned:false},
  {emoji:'🚨',label:'Crisis Survivor',desc:'Completed crisis plan',earned:false},
  {emoji:'👑',label:'AlmondAI Pro',desc:'Premium member',earned:false},
  {emoji:'💪',label:'Comeback King',desc:'After 3-day break',earned:false},
  {emoji:'🌟',label:'High Achiever',desc:'Avg accuracy >80%',earned:false},
];

const ProfilePage = ({ user }) => {
  const patterns = [
    {topic:'Cardiac Physiology',count:8,last:'2 days ago'},
    {topic:'Beta Blockers',count:5,last:'3 days ago'},
    {topic:'Brachial Plexus',count:4,last:'1 week ago'},
  ];
  return (
    <div className="aa-page aa-anim-fade-up">
      <div style={{marginBottom:28}}>
        <div className="aa-h1" style={{marginBottom:6}}>Profile</div>
        <div className="aa-body" style={{color:'var(--aa-text-2)'}}>Your learning identity and memory patterns</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:20,marginBottom:20}}>
        {/* Profile card */}
        <div className="aa-card" style={{padding:'28px',textAlign:'center'}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:'var(--aa-s3)',border:'2px solid var(--aa-amber-border)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:28,fontFamily:'var(--aa-fd)',fontWeight:700,color:'var(--aa-amber)'}}>
            {user.name[0]}
          </div>
          <div className="aa-h3">{user.name}</div>
          <div className="aa-caption" style={{marginTop:4}}>{user.college}</div>
          <div style={{display:'flex',justifyContent:'center',marginTop:10}}>
            <span className="aa-level">Level {user.level}</span>
          </div>

          <div className="aa-divider" style={{margin:'16px 0'}}/>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[{label:'Study Mode',val:'MBBS'},{label:'Category',val:'Ambitious Grinder'},{label:'Joined',val:'Jan 2025'},{label:'College',val:user.college}].map(item=>(
              <div key={item.label} style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}>
                <span className="aa-caption">{item.label}</span>
                <span className="aa-body-sm" style={{fontWeight:500,color:'var(--aa-amber)'}}>{item.val}</span>
              </div>
            ))}
          </div>

          <div className="aa-divider" style={{margin:'16px 0'}}/>

          <div style={{display:'flex',justifyContent:'space-around'}}>
            {[{val:user.streak,label:'Day Streak'},{val:'68%',label:'Accuracy'},{val:'LV '+user.level,label:'Level'}].map(s=>(
              <div key={s.label} style={{textAlign:'center'}}>
                <div style={{fontFamily:'var(--aa-fd)',fontWeight:700,fontSize:'1.1rem',color:'var(--aa-amber)'}}>{s.val}</div>
                <div className="aa-caption" style={{fontSize:'0.65rem',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements + memory */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Badges */}
          <div className="aa-card" style={{padding:'22px 24px'}}>
            <div className="aa-flex-between" style={{marginBottom:14}}>
              <div className="aa-h3">Achievement Badges</div>
              <span className="aa-caption">{BADGES.filter(b=>b.earned).length}/{BADGES.length} earned</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
              {BADGES.map((b,i)=>(
                <div key={i} title={b.desc} style={{
                  textAlign:'center',padding:'12px 6px',borderRadius:'var(--aa-r-md)',
                  background:b.earned?'var(--aa-amber-bg)':'var(--aa-s1)',
                  border:`1px solid ${b.earned?'var(--aa-amber-border)':'var(--aa-border)'}`,
                  opacity:b.earned?1:0.45,transition:'all 0.2s',cursor:'pointer',
                }}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.opacity='1';}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.opacity=b.earned?'1':'0.45';}}>
                  <div style={{fontSize:20,marginBottom:5}}>{b.emoji}</div>
                  <div style={{fontSize:'0.62rem',fontWeight:600,color:b.earned?'var(--aa-amber)':'var(--aa-text-3)',lineHeight:1.3}}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Memory patterns */}
          <div className="aa-card" style={{padding:'22px 24px'}}>
            <div className="aa-h3" style={{marginBottom:14}}>AlmondAI Memory — What It Knows About You</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {patterns.map((p,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',background:'var(--aa-s1)',borderRadius:'var(--aa-r)',border:'1px solid var(--aa-border)'}}>
                  <div style={{width:36,height:36,borderRadius:'var(--aa-r-sm)',background:'var(--aa-s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>🧠</div>
                  <div style={{flex:1}}>
                    <div className="aa-body-sm" style={{fontWeight:500}}>{p.topic}</div>
                    <div className="aa-caption" style={{fontSize:'0.7rem',marginTop:1}}>Asked {p.count} times · Last: {p.last}</div>
                  </div>
                  <div style={{width:40,height:5,borderRadius:2,background:'var(--aa-s4)',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${(p.count/8)*100}%`,background:'var(--aa-amber)',borderRadius:2}}/>
                  </div>
                </div>
              ))}
              <div className="aa-caption" style={{color:'var(--aa-text-3)',textAlign:'center',paddingTop:4}}>
                AlmondAI builds memory from every question you ask
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────
const SettingsPage = () => {
  const [notifs, setNotifs] = React.useState({daily:true,streak:true,peer:false,exam:true});
  const [feedback, setFeedback] = React.useState('');
  const Toggle = ({on,onToggle})=>(
    <div onClick={onToggle} style={{width:42,height:24,borderRadius:12,background:on?'var(--aa-amber)':'var(--aa-s4)',border:on?'none':'1px solid var(--aa-border)',position:'relative',cursor:'pointer',transition:'all 0.2s',flexShrink:0}}>
      <div style={{position:'absolute',top:3,left:on?21:3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}}/>
    </div>
  );
  const Section = ({title,children})=>(
    <div className="aa-card" style={{padding:'22px 24px',marginBottom:16}}>
      <div className="aa-h3" style={{marginBottom:16,paddingBottom:12,borderBottom:'1px solid var(--aa-border)'}}>{title}</div>
      {children}
    </div>
  );
  const Row = ({label,sub,right})=>(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--aa-border)'}}>
      <div><div className="aa-body-sm" style={{fontWeight:500}}>{label}</div>{sub&&<div className="aa-caption" style={{fontSize:'0.7rem',marginTop:1}}>{sub}</div>}</div>
      {right}
    </div>
  );

  return (
    <div className="aa-page aa-anim-fade-up">
      <div style={{marginBottom:28}}>
        <div className="aa-h1" style={{marginBottom:6}}>Settings</div>
        <div className="aa-body" style={{color:'var(--aa-text-2)'}}>Manage your preferences and account</div>
      </div>

      <div style={{maxWidth:640}}>
        <Section title="Study Mode">
          <Row label="Mode" sub="Your current MBBS/NEET-PG track" right={<div style={{display:'flex',gap:6}}>
            {['MBBS','NEET-PG'].map(m=><button key={m} className={`aa-pill ${m==='MBBS'?'active':''}`} style={{fontSize:'0.78rem'}}>{m}</button>)}
          </div>}/>
          <Row label="Daily MCQ Goal" sub="Target questions per day" right={<select className="aa-input" style={{width:100}}><option>10</option><option>15</option><option>20</option><option>30</option></select>}/>
          <Row label="Difficulty Preference" right={<select className="aa-input" style={{width:120}}><option>Mixed</option><option>Easy</option><option>Medium</option><option>Hard</option></select>}/>
        </Section>

        <Section title="Notifications">
          {[
            {key:'daily',label:'Daily Study Reminder',sub:'Remind me to study each day'},
            {key:'streak',label:'Streak Alerts',sub:'Alert me if my streak is at risk'},
            {key:'peer',label:'Peer Activity',sub:'See what your batch is studying'},
            {key:'exam',label:'Exam Countdown',sub:'Daily exam countdown reminders'},
          ].map(n=>(
            <Row key={n.key} label={n.label} sub={n.sub} right={<Toggle on={notifs[n.key]} onToggle={()=>setNotifs(p=>({...p,[n.key]:!p[n.key]}))}/>}/>
          ))}
        </Section>

        <Section title="Account">
          <Row label="Email" sub="arjun@example.com" right={<button className="aa-btn aa-btn-ghost aa-btn-xs">Change</button>}/>
          <Row label="Password" right={<button className="aa-btn aa-btn-ghost aa-btn-xs">Update</button>}/>
          <Row label="Subscription" sub="Free Plan" right={<button className="aa-btn aa-btn-primary aa-btn-xs">Upgrade</button>}/>
          <div style={{paddingTop:12}}>
            <button className="aa-btn aa-btn-danger aa-btn-sm">Delete Account</button>
          </div>
        </Section>

        <Section title="Feedback">
          <div className="aa-body-sm" style={{color:'var(--aa-text-2)',marginBottom:12}}>Help us improve AlmondAI — your feedback shapes the product</div>
          <textarea className="aa-input" rows={4} style={{resize:'none',marginBottom:10}} placeholder="What would make AlmondAI better for you?" value={feedback} onChange={e=>setFeedback(e.target.value)}/>
          <button className="aa-btn aa-btn-primary aa-btn-sm" disabled={!feedback.trim()}>Send Feedback</button>
        </Section>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// UPGRADE PAGE
// ─────────────────────────────────────────────────────────
const Upgrade = () => {
  const features = [
    {label:'Daily MCQ Practice',free:'10/day',pro:'Unlimited'},
    {label:'AI Tutor Questions',free:'15/day',pro:'Unlimited'},
    {label:'High-Yield Sessions',free:'15/day',pro:'Unlimited'},
    {label:'Crisis Mode',free:'1 use',pro:'Unlimited'},
    {label:'Insights & Analytics',free:'❌',pro:'✓ Full access'},
    {label:'Study Planner',free:'❌',pro:'✓ Full plans'},
    {label:'Visualise Diagrams',free:'❌',pro:'✓ Unlimited'},
    {label:'Voice Agent',free:'5/day',pro:'Unlimited'},
    {label:'Weakness Detection',free:'Basic',pro:'Advanced AI'},
  ];

  return (
    <div className="aa-page aa-anim-fade-up">
      <div style={{textAlign:'center',marginBottom:36}}>
        <span className="aa-badge aa-badge-amber" style={{margin:'0 auto 12px',display:'inline-flex'}}>✨ Go Premium</span>
        <div className="aa-display" style={{marginBottom:10}}>Upgrade to AlmondAI</div>
        <div className="aa-body-lg" style={{color:'var(--aa-text-2)',maxWidth:440,margin:'0 auto'}}>
          Everything you need to crack NEET-PG. Unlimited access to every feature.
        </div>
      </div>

      {/* Pricing cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1.15fr',gap:16,maxWidth:640,margin:'0 auto 36px'}}>
        {/* Free */}
        <div className="aa-card" style={{padding:'28px 24px'}}>
          <div className="aa-label" style={{color:'var(--aa-text-3)',fontSize:'0.65rem',marginBottom:12}}>Free Plan</div>
          <div style={{fontFamily:'var(--aa-fd)',fontSize:'2rem',fontWeight:800,marginBottom:4}}>₹0</div>
          <div className="aa-caption" style={{marginBottom:20}}>Forever free, limited</div>
          <button className="aa-btn aa-btn-ghost" style={{width:'100%',marginBottom:16}}>Current Plan</button>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {['10 MCQs/day','15 AI questions','1 Crisis Mode use','Basic analytics'].map(f=>(
              <div key={f} style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{color:'var(--aa-green)',fontSize:13}}>✓</span>
                <span className="aa-body-sm" style={{color:'var(--aa-text-2)'}}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Premium */}
        <div style={{padding:'28px 24px',borderRadius:'var(--aa-r-xl)',background:'var(--aa-s2)',border:'1px solid var(--aa-amber-border)',position:'relative',overflow:'hidden',boxShadow:'0 0 40px var(--aa-amber-glow)'}}>
          <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle, rgba(213,197,168,0.1) 0%, transparent 70%)'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div className="aa-label" style={{color:'var(--aa-amber)',fontSize:'0.65rem'}}>Premium</div>
            <span className="aa-badge aa-badge-amber">Most Popular</span>
          </div>
          <div style={{marginBottom:4}}>
            <span style={{fontFamily:'var(--aa-fd)',fontSize:'2rem',fontWeight:800,color:'var(--aa-amber)'}}>₹199</span>
            <span className="aa-caption"> /month</span>
          </div>
          <div className="aa-caption" style={{marginBottom:8}}>or ₹499/3 months (save ₹98)</div>
          <button className="aa-btn aa-btn-primary" style={{width:'100%',marginBottom:16,padding:'12px'}}>Start Premium Now →</button>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {['Unlimited MCQ Practice','Unlimited AI Tutor','Unlimited Crisis Mode','Advanced Insights & Analytics','Full Study Planner','Visualise Diagrams','Unlimited Voice Agent','Priority support'].map(f=>(
              <div key={f} style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{color:'var(--aa-amber)',fontSize:13}}>✓</span>
                <span className="aa-body-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature comparison */}
      <div className="aa-card" style={{padding:'22px 24px',maxWidth:700,margin:'0 auto'}}>
        <div className="aa-h3" style={{marginBottom:16,textAlign:'center'}}>Full Feature Comparison</div>
        <div style={{display:'flex',flexDirection:'column',gap:0}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12,padding:'8px 12px',borderBottom:'1px solid var(--aa-border)'}}>
            {['Feature','Free','Premium'].map((h,i)=>(
              <span key={h} className="aa-label" style={{color:'var(--aa-text-3)',fontSize:'0.62rem',textAlign:i>0?'center':'left'}}>{h}</span>
            ))}
          </div>
          {features.map((f,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12,padding:'11px 12px',borderBottom:i<features.length-1?'1px solid var(--aa-border)':'none',alignItems:'center'}}>
              <span className="aa-body-sm">{f.label}</span>
              <span className="aa-body-sm" style={{textAlign:'center',color:'var(--aa-text-3)'}}>{f.free}</span>
              <span className="aa-body-sm" style={{textAlign:'center',color:'var(--aa-amber)',fontWeight:600}}>{f.pro}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Progress, Planner, Insights, VoiceAgent, Visualise, ProfilePage, SettingsPage, Upgrade });
