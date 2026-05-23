// AlmondAI — Syllabus Map Page

const SUBJECTS_DATA = [
  { id:1,  name:'Anatomy',          emoji:'🦴', pct:72, topics:18, done:13, color:'var(--aa-amber)', highYield:['Brachial Plexus','Carpal Tunnel','Cranial Nerves'] },
  { id:2,  name:'Physiology',       emoji:'💓', pct:58, topics:22, done:13, color:'var(--aa-teal)',  highYield:['Cardiac Output','Action Potential','Renal Clearance'] },
  { id:3,  name:'Biochemistry',     emoji:'🧬', pct:45, topics:20, done:9,  color:'var(--aa-purple)',highYield:['Enzyme Kinetics','TCA Cycle','DNA Replication'] },
  { id:4,  name:'Pathology',        emoji:'🔬', pct:31, topics:25, done:8,  color:'var(--aa-coral)', highYield:['Cell Injury','Neoplasia','Inflammation'] },
  { id:5,  name:'Pharmacology',     emoji:'💊', pct:62, topics:24, done:15, color:'var(--aa-amber)', highYield:['Beta Blockers','ACE Inhibitors','Antibiotics'] },
  { id:6,  name:'Microbiology',     emoji:'🦠', pct:38, topics:19, done:7,  color:'var(--aa-green)', highYield:['Bacterial Virulence','Antibiotic Resistance','Immunology'] },
  { id:7,  name:'Forensic Medicine',emoji:'⚖️', pct:55, topics:14, done:8,  color:'var(--aa-teal)',  highYield:['TOD Estimation','Wound Analysis','Medico-Legal'] },
  { id:8,  name:'Community Medicine',emoji:'🏥',pct:40, topics:18, done:7,  color:'var(--aa-green)', highYield:['Epidemiology','National Programs','Biostatistics'] },
  { id:9,  name:'ENT',              emoji:'👂', pct:66, topics:12, done:8,  color:'var(--aa-amber)', highYield:['Ear Anatomy','Vertigo','Sinusitis'] },
  { id:10, name:'Ophthalmology',    emoji:'👁️', pct:71, topics:13, done:9,  color:'var(--aa-teal)',  highYield:['Glaucoma','Retina','Corneal Disorders'] },
  { id:11, name:'Medicine',         emoji:'🩺', pct:48, topics:30, done:14, color:'var(--aa-coral)', highYield:['Cardiology','Respiratory','Nephrology'] },
  { id:12, name:'Surgery',          emoji:'🔪', pct:35, topics:28, done:10, color:'var(--aa-purple)',highYield:['GI Surgery','Trauma','Surgical Anatomy'] },
];

const TOPIC_STATUSES = ['completed','in-progress','not-started','not-started','in-progress','completed','not-started','completed','in-progress','not-started'];

const TOPIC_NAMES_BY_SUBJECT = {
  1:  ['Thorax & Mediastinum','Upper Limb','Lower Limb','Head & Neck','Neuroanatomy','Abdomen','Perineum','Back','Histology Basics','Embryology'],
  2:  ['Cardiac Physiology','Respiratory Physiology','Renal Physiology','GI Physiology','Endocrinology','Neurophysiology','Blood & Immunity','Muscle Physiology','Reproductive','Special Senses'],
  3:  ['Carbohydrate Metabolism','Lipid Metabolism','Protein Metabolism','Nucleic Acids','Enzymology','Vitamins','Minerals','Hormones','Molecular Biology','Clinical Biochemistry'],
  4:  ['Cell Injury & Death','Inflammation','Repair & Regeneration','Neoplasia','Cardiovascular Pathology','Respiratory Pathology','GI Pathology','Renal Pathology','Hematology','Neuropathology'],
  5:  ['Autonomic Pharmacology','Cardiovascular Drugs','CNS Drugs','Antibiotics','Antifungals','Antivirals','GI Pharmacology','Respiratory Drugs','Chemotherapy','Endocrine Pharmacology'],
  default: ['Topic 1','Topic 2','Topic 3','Topic 4','Topic 5','Topic 6','Topic 7','Topic 8','Topic 9','Topic 10'],
};

const CircleProgress = ({ pct, color, size=64 }) => {
  const r = (size-8)/2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct/100)*c;
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--aa-s3)" strokeWidth="4.5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth="4.5"
        stroke={color} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        style={{ transform:'rotate(-90deg)', transformOrigin:'center', transition:'stroke-dashoffset 1s ease-out' }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size*0.2} fontFamily="var(--aa-fd)" fontWeight="700">
        {pct}%
      </text>
    </svg>
  );
};

const statusIcon = (s) => {
  if (s==='completed')   return <span style={{ color:'var(--aa-green)',  fontSize:14 }}>✓</span>;
  if (s==='in-progress') return <span style={{ color:'var(--aa-amber)',  fontSize:11 }}>◐</span>;
  return                        <span style={{ color:'var(--aa-text-3)', fontSize:11 }}>○</span>;
};

const statusColor = (s) =>
  s==='completed' ? 'var(--aa-green)' : s==='in-progress' ? 'var(--aa-amber)' : 'var(--aa-text-3)';

const SubjectPanel = ({ subject, onClose, onNav }) => {
  const topics = (TOPIC_NAMES_BY_SUBJECT[subject.id] || TOPIC_NAMES_BY_SUBJECT.default);
  const statuses = TOPIC_STATUSES;
  return (
    <div style={{
      position:'fixed', right:0, top:0, bottom:0, width:380, zIndex:80,
      background:'var(--aa-s2)', borderLeft:'1px solid var(--aa-border)',
      display:'flex', flexDirection:'column',
      animation:'aaSlideR 0.3s ease-out',
      boxShadow:'-8px 0 40px rgba(0,0,0,0.4)',
    }}>
      {/* Panel header */}
      <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid var(--aa-border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:24 }}>{subject.emoji}</span>
            <span className="aa-h3">{subject.name}</span>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            color:'var(--aa-text-2)', padding:4, borderRadius:'var(--aa-r-sm)',
            transition:'background 0.15s', display:'flex', alignItems:'center' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--aa-s3)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}>
            <Icons.close />
          </button>
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <CircleProgress pct={subject.pct} color={subject.color} size={56} />
          <div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <span className="aa-badge aa-badge-green" style={{ fontSize:'0.65rem' }}>{subject.done} completed</span>
              <span className="aa-badge aa-badge-amber" style={{ fontSize:'0.65rem' }}>{subject.topics - subject.done} remaining</span>
            </div>
            <div className="aa-caption" style={{ marginTop:6 }}>
              {subject.topics} total topics
            </div>
          </div>
        </div>

        {/* High yield */}
        <div style={{ marginTop:14 }}>
          <div className="aa-label" style={{ color:'var(--aa-coral)', fontSize:'0.62rem', marginBottom:6 }}>
            🎯 High Yield Topics
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {subject.highYield.map(t => (
              <span key={t} className="aa-badge aa-badge-coral" style={{ fontSize:'0.68rem' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Topics list */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px' }} className="no-scroll">
        <div className="aa-label" style={{ color:'var(--aa-text-3)', marginBottom:10, paddingLeft:4, fontSize:'0.63rem' }}>
          All Topics
        </div>
        {topics.map((topic, i) => {
          const st = statuses[i % statuses.length];
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
              borderRadius:'var(--aa-r)', marginBottom:4, cursor:'pointer',
              transition:'background 0.15s', background:'transparent',
              border:'1px solid transparent',
            }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--aa-s3)'; e.currentTarget.style.borderColor='var(--aa-border)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; }}>
              <div style={{ width:24, flexShrink:0, textAlign:'center' }}>
                {statusIcon(st)}
              </div>
              <span className="aa-body-sm" style={{ flex:1,
                color: st==='completed' ? 'var(--aa-text-2)' : 'var(--aa-text-1)',
                textDecoration: st==='completed' ? 'none' : 'none',
              }}>{topic}</span>
              {subject.highYield.some(h => topic.includes(h.split(' ')[0])) && (
                <span className="aa-badge aa-badge-coral" style={{ fontSize:'0.58rem' }}>HY</span>
              )}
              <span style={{ color:'var(--aa-text-3)', flexShrink:0 }}><Icons.chevronRight /></span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ padding:'14px 16px', borderTop:'1px solid var(--aa-border)', display:'flex', gap:8 }}>
        <button className="aa-btn aa-btn-primary aa-btn-sm" style={{ flex:1 }} onClick={() => onNav('tutor')}>
          <Icons.brain /> Study with AI
        </button>
        <button className="aa-btn aa-btn-secondary aa-btn-sm" style={{ flex:1 }} onClick={() => onNav('practice')}>
          <Icons.clipboard /> Practice MCQs
        </button>
      </div>
    </div>
  );
};

const Syllabus = ({ onNav }) => {
  const [selected, setSelected] = React.useState(null);
  const [filter, setFilter] = React.useState('all');

  const filtered = SUBJECTS_DATA.filter(s => {
    if (filter === 'low')  return s.pct < 40;
    if (filter === 'mid')  return s.pct >= 40 && s.pct < 70;
    if (filter === 'high') return s.pct >= 70;
    return true;
  });

  const totalTopics = SUBJECTS_DATA.reduce((a,s)=>a+s.topics,0);
  const doneTopics  = SUBJECTS_DATA.reduce((a,s)=>a+s.done,0);
  const overallPct  = Math.round((doneTopics/totalTopics)*100);

  return (
    <div className="aa-page aa-anim-fade-up">
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div className="aa-h1" style={{ marginBottom:6 }}>Syllabus Map</div>
        <div className="aa-body" style={{ color:'var(--aa-text-2)' }}>
          Your visual curriculum tracker — light up every topic
        </div>
      </div>

      {/* Overall progress card */}
      <div style={{
        background:'linear-gradient(135deg, #0f1e38 0%, #1a1a1a 100%)',
        border:'1px solid var(--aa-teal-border)', borderRadius:'var(--aa-r-xl)',
        padding:'24px 28px', marginBottom:24, display:'flex', alignItems:'center', gap:24,
      }}>
        <CircleProgress pct={overallPct} color="var(--aa-teal)" size={88} />
        <div style={{ flex:1 }}>
          <div className="aa-h2" style={{ marginBottom:4 }}>Overall Progress</div>
          <div className="aa-body" style={{ color:'var(--aa-text-2)', marginBottom:12 }}>
            {doneTopics} of {totalTopics} topics completed across {SUBJECTS_DATA.length} subjects
          </div>
          <div className="aa-prog-track" style={{ height:6 }}>
            <div className="aa-prog-fill aa-prog-fill-teal" style={{ width:`${overallPct}%` }} />
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--aa-fd)', fontSize:'2rem', fontWeight:700, color:'var(--aa-teal)' }}>
            {overallPct}%
          </div>
          <div className="aa-caption">Complete</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[{id:'all',label:'All Subjects'},{id:'low',label:'Needs Work <40%'},{id:'mid',label:'In Progress'},{id:'high',label:'Strong >70%'}].map(f => (
          <button key={f.id} className={`aa-pill ${filter===f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)} style={{ fontSize:'0.78rem' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Subject grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14,
        marginRight: selected ? 400 : 0, transition:'margin-right 0.3s' }}>
        {filtered.map(s => (
          <div key={s.id} onClick={() => setSelected(selected?.id===s.id ? null : s)}
            style={{
              padding:'20px', borderRadius:'var(--aa-r-lg)',
              background: selected?.id===s.id ? s.color+'10' : 'var(--aa-s2)',
              border:`1px solid ${selected?.id===s.id ? s.color+'50' : 'var(--aa-border)'}`,
              cursor:'pointer', transition:'all 0.2s',
              boxShadow: selected?.id===s.id ? `0 0 24px ${s.color}20` : 'none',
            }}
            onMouseEnter={e => { if (selected?.id!==s.id) { e.currentTarget.style.borderColor=s.color+'40'; e.currentTarget.style.transform='translateY(-2px)'; } }}
            onMouseLeave={e => { if (selected?.id!==s.id) { e.currentTarget.style.borderColor='var(--aa-border)'; e.currentTarget.style.transform=''; } }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:20 }}>{s.emoji}</span>
                <span className="aa-h4" style={{ fontSize:'0.9rem' }}>{s.name}</span>
              </div>
              <CircleProgress pct={s.pct} color={s.color} size={44} />
            </div>

            <div className="aa-prog-track" style={{ height:4, marginBottom:8 }}>
              <div className="aa-prog-fill" style={{ width:`${s.pct}%`, background:s.color, boxShadow:`0 0 6px ${s.color}40` }} />
            </div>

            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span className="aa-caption" style={{ fontSize:'0.7rem' }}>{s.done}/{s.topics} topics</span>
              <div style={{ display:'flex', gap:4 }}>
                {s.highYield.slice(0,1).map(h => (
                  <span key={h} className="aa-badge aa-badge-coral" style={{ fontSize:'0.58rem' }}>HY</span>
                ))}
                {s.pct >= 70 && <span className="aa-badge aa-badge-green" style={{ fontSize:'0.58rem' }}>Strong</span>}
                {s.pct < 40 && <span className="aa-badge aa-badge-coral" style={{ fontSize:'0.58rem' }}>Review</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(4,7,14,0.3)', zIndex:79 }}
            onClick={() => setSelected(null)} />
          <SubjectPanel subject={selected} onClose={() => setSelected(null)} onNav={onNav} />
        </>
      )}
    </div>
  );
};

Object.assign(window, { Syllabus });
