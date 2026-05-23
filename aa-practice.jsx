// AlmondAI — MCQ Practice Page

const SUBJECTS = ['Anatomy','Physiology','Biochemistry','Pathology',
  'Pharmacology','Microbiology','Forensic Medicine','Community Medicine',
  'ENT','Ophthalmology','Medicine','Surgery'];

const SAMPLE_QUESTIONS = [
  {
    id:1, subject:'Anatomy', difficulty:'medium',
    text:'The nerve that passes through the carpal tunnel along with the flexor tendons is:',
    options:['Ulnar nerve','Radial nerve','Median nerve','Anterior interosseous nerve'],
    correct:2,
    explanation:'The median nerve passes through the carpal tunnel along with 9 flexor tendons (FDS ×4, FDP ×4, FPL ×1). The ulnar nerve passes through Guyon\'s canal, not the carpal tunnel. Compression of the median nerve here causes Carpal Tunnel Syndrome (CTS) — thenar wasting + sensory loss over lateral 3½ fingers.'
  },
  {
    id:2, subject:'Physiology', difficulty:'hard',
    text:'During exercise, which of the following changes occurs in the oxygen-haemoglobin dissociation curve?',
    options:['Shifts left due to decreased CO₂','Shifts right due to increased temperature and CO₂','Shifts left due to decreased 2,3-DPG','No shift occurs'],
    correct:1,
    explanation:'During exercise: ↑CO₂, ↑H⁺ (Bohr effect), ↑temperature, ↑2,3-DPG — all cause a rightward shift of the O₂-Hb dissociation curve. This means Hb releases O₂ more readily to working muscles. Remember: RIGHT shift = Release O₂ (good for tissues), LEFT shift = Load O₂ (good for lungs).'
  },
  {
    id:3, subject:'Pharmacology', difficulty:'easy',
    text:'Which of the following beta-blockers is cardioselective (β₁ selective)?',
    options:['Propranolol','Carvedilol','Metoprolol','Labetalol'],
    correct:2,
    explanation:'Metoprolol, Atenolol, Bisoprolol, Esmolol are β₁-selective (cardioselective) beta-blockers. Mnemonic: "MABE" — Metoprolol, Atenolol, Bisoprolol, Esmolol. Propranolol and Carvedilol are non-selective. Labetalol blocks α₁, β₁, β₂. Cardioselective agents are preferred in asthma/COPD patients as they cause less bronchospasm.'
  },
  {
    id:4, subject:'Pathology', difficulty:'medium',
    text:'Reed-Sternberg cells are characteristically seen in:',
    options:['Non-Hodgkin\'s lymphoma','Hodgkin\'s lymphoma','Burkitt\'s lymphoma','Multiple myeloma'],
    correct:1,
    explanation:'Reed-Sternberg cells are the pathognomonic cells of Hodgkin\'s Lymphoma. They are large binucleate/bilobed cells with prominent "owl-eye" nucleoli. Immunophenotype: CD15+, CD30+, CD20−. Burkitt\'s lymphoma shows "starry sky" pattern. Multiple myeloma has plasma cells with "clock-face" chromatin.'
  },
  {
    id:5, subject:'Biochemistry', difficulty:'hard',
    text:'Which vitamin deficiency leads to megaloblastic anemia WITHOUT neurological symptoms?',
    options:['Vitamin B12','Vitamin B6','Folate','Vitamin B1'],
    correct:2,
    explanation:'Folate deficiency causes megaloblastic anemia WITHOUT neurological symptoms. Vitamin B12 deficiency causes both megaloblastic anemia AND subacute combined degeneration of spinal cord (posterior + lateral column involvement). This distinction is high-yield! Both B12 and Folate are required for DNA synthesis (thymidylate synthesis), but only B12 is needed for myelin synthesis.'
  },
];

const ConfettiParticle = ({ x, color, delay }) => (
  <div style={{
    position:'fixed', left:x+'vw', top:'-20px', width:8, height:8,
    background:color, borderRadius:2, zIndex:9999,
    animation:`aaConfettiDrop ${1.5 + Math.random()}s ease-in ${delay}s forwards`,
    transform:`rotate(${Math.random()*360}deg)`
  }} />
);

const Confetti = () => {
  const colors = ['#d5c5a8','#d5c5a8','#cec5b9','#22c55e','#e4b4a0','#e6d5b8'];
  const particles = Array.from({length:60}, (_,i) => ({
    x: Math.random()*100, color: colors[i%colors.length], delay: Math.random()*0.8
  }));
  return <>{particles.map((p,i) => <ConfettiParticle key={i} {...p} />)}</>;
};

const difficultyColor = (d) =>
  d==='easy' ? 'var(--aa-green)' : d==='hard' ? 'var(--aa-coral)' : 'var(--aa-amber)';

const optLetter = ['A','B','C','D'];

const Practice = ({ onNav }) => {
  const [phase, setPhase] = React.useState('setup'); // setup | session | result
  const [subject, setSubject] = React.useState('Anatomy');
  const [difficulty, setDifficulty] = React.useState('all');
  const [highYield, setHighYield] = React.useState(false);
  const [qIdx, setQIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [showExp, setShowExp] = React.useState(false);
  const [answers, setAnswers] = React.useState([]);
  const [almonds, setAlmonds] = React.useState(5);
  const [losingHeart, setLosingHeart] = React.useState(null);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [xpGained, setXpGained] = React.useState(0);
  const [xpFlash, setXpFlash] = React.useState(null);

  const questions = SAMPLE_QUESTIONS;
  const q = questions[qIdx];
  const progress = (qIdx / questions.length) * 100;
  const correct = answers.filter(a => a.correct).length;

  const handleSubmit = () => {
    if (selected === null) return;
    const isCorrect = selected === q.correct;
    setSubmitted(true);
    setShowExp(!isCorrect);
    setAnswers(a => [...a, { correct: isCorrect }]);

    if (!isCorrect) {
      const newAlmonds = almonds - 1;
      setLosingHeart(almonds - 1);
      setTimeout(() => { setAlmonds(newAlmonds); setLosingHeart(null); }, 500);
    } else {
      const xp = difficulty === 'hard' ? 20 : difficulty === 'easy' ? 8 : 12;
      setXpFlash('+' + xp + ' XP');
      setXpGained(g => g + xp);
      setTimeout(() => setXpFlash(null), 1500);
    }
  };

  const handleNext = () => {
    if (qIdx >= questions.length - 1) {
      if (correct / questions.length >= 0.7) setShowConfetti(true);
      setPhase('result');
      return;
    }
    setQIdx(i => i + 1);
    setSelected(null);
    setSubmitted(false);
    setShowExp(false);
  };

  const reset = () => {
    setPhase('setup'); setQIdx(0); setSelected(null); setSubmitted(false);
    setShowExp(false); setAnswers([]); setAlmonds(5); setShowConfetti(false); setXpGained(0);
  };

  if (phase === 'setup') return (
    <div className="aa-page aa-anim-fade-up">
      <div style={{ marginBottom:28 }}>
        <div className="aa-h1" style={{ marginBottom:8 }}>Practice MCQs</div>
        <div className="aa-body" style={{ color:'var(--aa-text-2)' }}>
          Sharpen exam speed with intelligent question practice
        </div>
      </div>

      <div style={{ maxWidth:560 }}>
        <div className="aa-card" style={{ padding:'28px 28px 32px' }}>
          {/* Almonds display */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <div>
              <div className="aa-h3" style={{ marginBottom:4 }}>Your Almonds</div>
              <div className="aa-caption">Lose one for each wrong answer</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {Array.from({length:5}).map((_,i) => (
                <span key={i} className={`aa-heart ${i < almonds ? 'on' : 'off'}`}>
                  {i < almonds ? '🌰' : '○'}
                </span>
              ))}
            </div>
          </div>
          <div className="aa-divider" style={{ marginBottom:24 }} />

          {/* Setup */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <div className="aa-label" style={{ color:'var(--aa-text-3)', marginBottom:6, fontSize:'0.65rem' }}>Subject</div>
              <select className="aa-input" value={subject} onChange={e => setSubject(e.target.value)}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div className="aa-label" style={{ color:'var(--aa-text-3)', marginBottom:6, fontSize:'0.65rem' }}>Difficulty</div>
              <div style={{ display:'flex', gap:8 }}>
                {['all','easy','medium','hard'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`aa-pill ${difficulty===d ? (d==='hard' ? 'active' : d==='easy' ? '' : 'active') : ''}`}
                    style={{
                      flex:1, justifyContent:'center',
                      borderColor: difficulty===d ? difficultyColor(d) : 'var(--aa-border)',
                      background: difficulty===d ? difficultyColor(d)+'15' : 'transparent',
                      color: difficulty===d ? difficultyColor(d) : 'var(--aa-text-2)',
                    }}>
                    {d === 'all' ? 'All' : d.charAt(0).toUpperCase()+d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'12px 14px', background:'var(--aa-s1)', borderRadius:'var(--aa-r)',
              border:'1px solid var(--aa-border)', cursor:'pointer' }}>
              <div>
                <div className="aa-body-sm" style={{ fontWeight:600 }}>High-Yield Only</div>
                <div className="aa-caption" style={{ fontSize:'0.7rem' }}>Focus on most tested NEET-PG topics</div>
              </div>
              <div onClick={() => setHighYield(h => !h)} style={{
                width:42, height:24, borderRadius:12, transition:'all 0.2s', cursor:'pointer',
                background: highYield ? 'var(--aa-amber)' : 'var(--aa-s3)',
                border: highYield ? 'none' : '1px solid var(--aa-border)',
                position:'relative', flexShrink:0,
              }}>
                <div style={{
                  position:'absolute', top:3, left: highYield ? 21 : 3, width:18, height:18,
                  borderRadius:'50%', background:'white', transition:'left 0.2s',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.3)'
                }} />
              </div>
            </label>
          </div>

          <button className="aa-btn aa-btn-primary" style={{ width:'100%', marginTop:24, padding:'13px' }}
            onClick={() => setPhase('session')}>
            <Icons.playCircle /> Start 5-Question Session
          </button>
        </div>

        <div style={{ marginTop:16, display:'flex', gap:10 }}>
          {[{label:'Today\'s accuracy', val:'82%', color:'var(--aa-green)'},
            {label:'Questions done', val:'47', color:'var(--aa-teal)'},
            {label:'Streak', val:'14 days', color:'var(--aa-amber)'}].map(s => (
            <div key={s.label} style={{ flex:1, padding:'12px 14px', background:'var(--aa-s2)',
              border:'1px solid var(--aa-border)', borderRadius:'var(--aa-r)' }}>
              <div style={{ fontFamily:'var(--aa-fd)', fontSize:'1.1rem', fontWeight:700, color:s.color }}>{s.val}</div>
              <div className="aa-caption" style={{ fontSize:'0.68rem', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (phase === 'result') return (
    <div className="aa-page aa-anim-fade-up">
      {showConfetti && <Confetti />}
      <div style={{ maxWidth:520, margin:'0 auto', textAlign:'center' }}>
        <div style={{ fontSize:'4rem', marginBottom:16 }}>
          {correct >= 4 ? '🎉' : correct >= 3 ? '💪' : '📚'}
        </div>
        <div className="aa-display" style={{ marginBottom:8 }}>{correct}/{questions.length}</div>
        <div className="aa-h3" style={{ color:'var(--aa-text-2)', marginBottom:6 }}>
          {correct >= 4 ? 'Excellent work!' : correct >= 3 ? 'Good effort!' : 'Keep practising!'}
        </div>

        <div style={{ display:'flex', justifyContent:'center', marginBottom:28 }}>
          <div style={{ width:120, height:120, borderRadius:'50%', position:'relative',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="120" height="120" style={{ position:'absolute', top:0, left:0 }}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--aa-s3)" strokeWidth="8"/>
              <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8"
                stroke={correct>=4 ? 'var(--aa-green)' : correct>=3 ? 'var(--aa-amber)' : 'var(--aa-coral)'}
                strokeLinecap="round" strokeDasharray={`${(correct/questions.length)*327} 327`}
                style={{ transform:'rotate(-90deg)', transformOrigin:'center', transition:'stroke-dasharray 1s ease-out' }} />
            </svg>
            <div style={{ fontFamily:'var(--aa-fd)', fontSize:'1.6rem', fontWeight:700,
              color: correct>=4 ? 'var(--aa-green)' : correct>=3 ? 'var(--aa-amber)' : 'var(--aa-coral)' }}>
              {Math.round((correct/questions.length)*100)}%
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:28 }}>
          <div className="aa-card" style={{ padding:'14px 20px' }}>
            <div style={{ color:'var(--aa-teal)', fontFamily:'var(--aa-fd)', fontSize:'1.3rem', fontWeight:700 }}>+{xpGained}</div>
            <div className="aa-caption" style={{ fontSize:'0.7rem' }}>XP Earned</div>
          </div>
          <div className="aa-card" style={{ padding:'14px 20px' }}>
            <div style={{ color:'var(--aa-amber)', fontFamily:'var(--aa-fd)', fontSize:'1.3rem', fontWeight:700 }}>{almonds}/5</div>
            <div className="aa-caption" style={{ fontSize:'0.7rem' }}>Almonds Left</div>
          </div>
          <div className="aa-card" style={{ padding:'14px 20px' }}>
            <div style={{ color:'var(--aa-green)', fontFamily:'var(--aa-fd)', fontSize:'1.3rem', fontWeight:700 }}>{correct}</div>
            <div className="aa-caption" style={{ fontSize:'0.7rem' }}>Correct</div>
          </div>
        </div>

        {correct < 3 && (
          <div style={{ padding:'16px 20px', background:'rgba(15,212,192,0.07)',
            border:'1px solid var(--aa-teal-border)', borderRadius:'var(--aa-r-lg)', marginBottom:20, textAlign:'left' }}>
            <div className="aa-h4" style={{ color:'var(--aa-teal)', marginBottom:4 }}>💡 Review with AI Tutor</div>
            <div className="aa-body-sm" style={{ color:'var(--aa-text-2)' }}>
              Your score suggests this topic needs more depth. Let AlmondAI explain it with memory aids.
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button className="aa-btn aa-btn-primary" onClick={reset}><Icons.playCircle /> Practice Again</button>
          <button className="aa-btn aa-btn-secondary" onClick={() => onNav('tutor')}><Icons.brain /> Ask AI Tutor</button>
        </div>
      </div>
    </div>
  );

  // Session
  return (
    <div className="aa-page aa-anim-fade-up" style={{ maxWidth:640, margin:'0 auto' }}>
      {/* Header bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', gap:5 }}>
          {Array.from({length:5}).map((_,i) => (
            <span key={i} className={`aa-heart ${i < almonds ? 'on' : 'off'} ${losingHeart===i ? 'lose' : ''}`}>
              {i < almonds ? '🌰' : '○'}
            </span>
          ))}
        </div>
        <div style={{ position:'relative' }}>
          {xpFlash && (
            <div style={{ position:'absolute', top:-28, left:'50%', transform:'translateX(-50%)',
              fontFamily:'var(--aa-fd)', fontSize:'0.85rem', fontWeight:700, color:'var(--aa-teal)',
              animation:'aaFadeUp 1.2s ease-out forwards', whiteSpace:'nowrap' }}>
              {xpFlash}
            </div>
          )}
          <span className="aa-badge aa-badge-teal">{qIdx+1} / {questions.length}</span>
        </div>
        <span className={`aa-badge`} style={{ background:difficultyColor(q.difficulty)+'20',
          color:difficultyColor(q.difficulty), border:`1px solid ${difficultyColor(q.difficulty)}50` }}>
          {q.difficulty}
        </span>
      </div>

      {/* Progress */}
      <div className="aa-prog-track" style={{ height:5, marginBottom:22 }}>
        <div className="aa-prog-fill" style={{ width:`${progress}%` }} />
      </div>

      {/* Question card */}
      <div className="aa-card" style={{ padding:'28px 28px 24px', marginBottom:14 }}>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <span className="aa-badge aa-badge-amber" style={{ fontSize:'0.68rem' }}>{q.subject}</span>
        </div>
        <div style={{ fontFamily:'var(--aa-fd)', fontSize:'1.05rem', fontWeight:500,
          color:'var(--aa-text-1)', lineHeight:1.65, marginBottom:24 }}>
          {q.text}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {q.options.map((opt, i) => {
            let cls = 'aa-mcq-opt';
            if (submitted) {
              cls += ' locked';
              if (i === q.correct) cls += ' correct';
              else if (i === selected && selected !== q.correct) cls += ' wrong';
            } else if (i === selected) {
              cls += ' selected';
            }
            return (
              <div key={i} className={cls}
                onClick={() => !submitted && setSelected(i)}>
                <div style={{
                  width:32, height:32, borderRadius:'var(--aa-r-sm)', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--aa-fd)', fontSize:'0.85rem', fontWeight:700,
                  background: submitted && i===q.correct ? 'var(--aa-green)' : submitted && i===selected && i!==q.correct ? 'var(--aa-coral)' : !submitted && i===selected ? 'var(--aa-amber)' : 'var(--aa-s3)',
                  color: (submitted && (i===q.correct || (i===selected&&i!==q.correct))) || (!submitted&&i===selected) ? '#06090f' : 'var(--aa-text-2)',
                  border: '1px solid',
                  borderColor: submitted&&i===q.correct ? 'var(--aa-green)' : submitted&&i===selected&&i!==q.correct ? 'var(--aa-coral)' : !submitted&&i===selected ? 'var(--aa-amber)' : 'var(--aa-border)',
                  transition:'all 0.15s',
                }}>{optLetter[i]}</div>
                <span className="aa-body-sm" style={{ color: submitted&&i===q.correct ? 'var(--aa-green)' : submitted&&i===selected&&i!==q.correct ? 'var(--aa-coral)' : 'var(--aa-text-1)' }}>
                  {opt}
                </span>
                {submitted && i===q.correct && <span style={{ marginLeft:'auto', color:'var(--aa-green)', flexShrink:0 }}><Icons.checkCircle /></span>}
                {submitted && i===selected && i!==q.correct && <span style={{ marginLeft:'auto', color:'var(--aa-coral)', flexShrink:0 }}><Icons.xCircle /></span>}
              </div>
            );
          })}
        </div>

        <button className="aa-btn" style={{ width:'100%', marginTop:20, padding:'13px',
          background: !submitted && selected===null ? 'var(--aa-s3)' : 'var(--aa-amber)',
          color: !submitted && selected===null ? 'var(--aa-text-3)' : '#08100e',
          borderRadius:'var(--aa-r-xl)', fontSize:'0.95rem',
          cursor: !submitted && selected===null ? 'not-allowed' : 'pointer',
          boxShadow: submitted || selected!==null ? '0 0 20px var(--aa-amber-glow)' : 'none',
        }} onClick={submitted ? handleNext : handleSubmit}
          disabled={!submitted && selected===null}>
          {!submitted && selected===null ? 'Choose an answer' :
           !submitted ? 'Check Answer →' :
           qIdx >= questions.length-1 ? 'View Results 🎉' : 'Next Question →'}
        </button>
      </div>

      {/* Explanation */}
      {submitted && (
        <div style={{
          padding:'18px 22px', borderRadius:'var(--aa-r-lg)', marginBottom:14,
          background: selected===q.correct ? 'var(--aa-green-bg)' : 'var(--aa-coral-bg)',
          border:`1px solid ${selected===q.correct ? 'var(--aa-green-border)' : 'var(--aa-coral-border)'}`,
          animation:'aaFadeUp 0.35s ease-out',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span style={{ color: selected===q.correct ? 'var(--aa-green)' : 'var(--aa-coral)' }}>
              {selected===q.correct ? <Icons.checkCircle /> : <Icons.xCircle />}
            </span>
            <span style={{ fontFamily:'var(--aa-fd)', fontWeight:600,
              color: selected===q.correct ? 'var(--aa-green)' : 'var(--aa-coral)' }}>
              {selected===q.correct ? 'Correct! Well done.' : 'Not quite — here\'s why:'}
            </span>
          </div>
          <div className="aa-body-sm" style={{ color:'var(--aa-text-1)', lineHeight:1.7 }}>
            {q.explanation}
          </div>
          {!showExp && selected===q.correct && (
            <button className="aa-body-sm" style={{ background:'none', border:'none', cursor:'pointer',
              color:'var(--aa-teal)', marginTop:8, fontFamily:'var(--aa-fb) ' }}
              onClick={() => setShowExp(true)}>
              Show full explanation ↓
            </button>
          )}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { Practice });
