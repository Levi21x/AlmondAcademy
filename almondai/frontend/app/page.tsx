'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

const steps = [
  { num: '01', title: 'Set your exam goal', desc: 'Tell AlmondAI your target exam date and weak subjects. It builds a personalised revision plan from day one.' },
  { num: '02', title: 'Study with your AI tutor', desc: 'Ask questions, solve MCQs, use the voice agent. AlmondAI learns your weak spots as you go and adjusts difficulty.' },
  { num: '03', title: 'Track and improve daily', desc: 'Streaks, accuracy trends, peer leaderboards, and AI-generated insights keep momentum building every day.' },
]

const testimonials = [
  { initials: 'RK', name: 'Rahul K.', role: 'MBBS Final Year, AIIMS Hyderabad', quote: 'The weakness tracker found I was consistently failing Pharmacology at the mechanism level, not just recall. It completely changed how I study.', color: '#d5c5a8' },
  { initials: 'SP', name: 'Sneha P.', role: 'Intern Doctor, KMC Manipal', quote: "AlmondAI's voice agent during my commute replaced both PrepLadder and Marrow for concept revision. It's like having a tutor on call 24/7.", color: '#e4b4a0' },
  { initials: 'AM', name: 'Arjun M.', role: 'PG Aspirant, JIPMER', quote: "The visual explainers for drug mechanisms are something PrepLadder never had. A flowchart for beta-blocker MOA just sticks differently.", color: '#22c55e' },
]

const faqs = [
  { q: 'Is AlmondAI only for NEET-PG or can USMLE students use it too?', a: "Currently AlmondAI is optimised for the Indian MBBS and NEET-PG curriculum. USMLE and FMGE support is on our roadmap. The AI tutor itself handles any medical topic — it's not exam-restricted." },
  { q: 'How is this different from PrepLadder or Marrow?', a: 'PrepLadder and Marrow are video lecture platforms. AlmondAI is an interactive AI study system — it adapts to your weaknesses in real time, explains concepts conversationally, and generates visual aids on demand. It works best alongside your existing resources.' },
  { q: 'What are almonds and how does the MCQ currency work?', a: "Almonds (🌰) are AlmondAI's daily practice currency. Free users get 5 per day — each MCQ attempt costs one. Correct answers can earn bonus almonds. Pro users get unlimited almonds. It's designed to build a daily study habit." },
  { q: 'Is my study data private and secure?', a: 'Yes. Your chat history, performance data, and profile are stored via Supabase with row-level security. We never sell your data. Conversations with the AI tutor are private to you.' },
  { q: 'Can I cancel my Pro subscription anytime?', a: 'Absolutely. Cancel anytime from your account settings — no questions asked, no penalty. Access continues until the end of the billing period. Payments are processed via Razorpay.' },
]

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [scrolled, setScrolled] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)

  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 60,
        size: 0.8 + Math.random() * 1.4,
        duration: 2.5 + Math.random() * 3.5,
        delay: Math.random() * 5,
      })),
    []
  )

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let time = 0
    const cx = 350, cy = 300, baseRadius = 190, numPoints = 8

    function getPoint(i: number, t: number) {
      const angle = (i / numPoints) * Math.PI * 2
      const offset = 60 * Math.sin(t * 1.1 + i * 0.85) + 32 * Math.sin(t * 0.65 + i * 1.7)
      return { x: cx + (baseRadius + offset) * Math.cos(angle), y: cy + (baseRadius + offset) * Math.sin(angle) }
    }

    function buildPath(pts: { x: number; y: number }[]) {
      ctx!.beginPath()
      for (let i = 0; i < numPoints; i++) {
        const curr = pts[i], next = pts[(i + 1) % numPoints]
        const prev = pts[(i - 1 + numPoints) % numPoints], nn = pts[(i + 2) % numPoints]
        if (i === 0) ctx!.moveTo(curr.x, curr.y)
        ctx!.bezierCurveTo(
          curr.x + (next.x - prev.x) / 6, curr.y + (next.y - prev.y) / 6,
          next.x - (nn.x - curr.x) / 6, next.y - (nn.y - curr.y) / 6,
          next.x, next.y
        )
      }
      ctx!.closePath()
    }

    function drawBlob(t: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      const pts = Array.from({ length: numPoints }, (_, i) => getPoint(i, t))

      ctx!.save()
      ctx!.shadowColor = 'rgba(213,197,168,0.18)'
      ctx!.shadowBlur = 100
      buildPath(pts)
      const g1 = ctx!.createRadialGradient(cx, cy, 0, cx, cy, baseRadius + 70)
      g1.addColorStop(0, 'rgba(213,197,168,0.88)')
      g1.addColorStop(0.6, 'rgba(42,37,32,0.92)')
      g1.addColorStop(1, 'rgba(19,19,19,0)')
      ctx!.fillStyle = g1
      ctx!.fill()
      ctx!.restore()

      ctx!.save()
      buildPath(pts)
      ctx!.clip()
      const g2 = ctx!.createRadialGradient(260, 170, 0, 260, 170, 210)
      g2.addColorStop(0, 'rgba(230,200,122,0.55)')
      g2.addColorStop(1, 'rgba(230,200,122,0)')
      ctx!.fillStyle = g2
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)
      const g3 = ctx!.createRadialGradient(430, 390, 0, 430, 390, 170)
      g3.addColorStop(0, 'rgba(228,180,160,0.38)')
      g3.addColorStop(1, 'rgba(228,180,160,0)')
      ctx!.fillStyle = g3
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)
      ctx!.restore()
    }

    function animate() {
      time += 0.0035
      drawBlob(time)
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); observer.unobserve(e.target) } }) },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
  }

  return (
    <>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.08} 50%{opacity:0.55} }
        @keyframes floatL  { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-12px) rotate(0.5deg)} }
        @keyframes floatR  { 0%,100%{transform:translateY(0) rotate(1deg)} 50%{transform:translateY(-10px) rotate(-0.5deg)} }
        @keyframes barGrow { from{width:0} to{width:78%} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes aaFadeUp{ from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }

        .hero-badge { animation: aaFadeUp 0.5s ease-out both; }
        .hero-h1    { animation: aaFadeUp 0.55s ease-out 0.1s both; }
        .hero-sub   { animation: aaFadeUp 0.55s ease-out 0.2s both; }
        .hero-ctas  { animation: aaFadeUp 0.55s ease-out 0.3s both; }

        @media(max-width:768px){
          .nav-links{display:none!important}
          .hero-h1{font-size:clamp(2.2rem,7vw,3.2rem)!important}
          .float-card{display:none!important}
          .bento-grid{grid-template-columns:1fr!important}
          .bento-large{grid-column:span 1!important}
          .steps-grid{grid-template-columns:1fr!important}
          .pricing-grid{grid-template-columns:1fr!important;max-width:420px!important}
          .testimonials-grid{grid-template-columns:1fr!important}
          .footer-inner{flex-direction:column!important;text-align:center!important}
        }
        @media(max-width:480px){
          .hero-h1{font-size:2rem!important}
          .pricing-card{padding:26px 20px!important}
        }

        .feat-card { transition: background 0.26s var(--aa-ease), transform 0.26s var(--aa-ease), box-shadow 0.26s var(--aa-ease); }
        .feat-card:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,0.45); }

        .pricing-card { transition: transform 0.26s var(--aa-ease), box-shadow 0.26s var(--aa-ease); }
        .pricing-card:hover { transform: translateY(-4px); }

        .faq-item { transition: background 0.18s; }
        .faq-item:hover { background: rgba(255,255,255,0.02) !important; }

        .testimonial-card { transition: border-color 0.26s var(--aa-ease), transform 0.26s var(--aa-ease); }
        .testimonial-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* ── AUTH MODAL ── */}
      {showAuthModal && (
        <div
          style={{ position:'fixed',inset:0,background:'rgba(6,5,5,0.88)',backdropFilter:'blur(12px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 16px' }}
          onClick={() => setShowAuthModal(false)}
        >
          <div
            style={{ background:'var(--aa-s2)',border:'1px solid rgba(213,197,168,0.2)',borderRadius:24,padding:36,maxWidth:460,width:'100%',boxShadow:'0 32px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(213,197,168,0.08)',animation:'aaScaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <LoginForm />
          </div>
        </div>
      )}

      {/* ── NAV ── */}
      <nav style={{
        position:'fixed',top:0,left:0,right:0,height:66,zIndex:100,
        background: scrolled ? 'rgba(13,12,12,0.82)' : 'rgba(19,19,19,0.5)',
        backdropFilter:'blur(20px)',
        borderBottom: scrolled ? '1px solid rgba(213,197,168,0.08)' : '1px solid transparent',
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0 5%',transition:'all 0.3s ease',
      }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,rgba(213,197,168,0.18),rgba(213,197,168,0.08))',border:'1px solid rgba(213,197,168,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,boxShadow:'0 0 16px rgba(213,197,168,0.2)' }}>
            🌰
          </div>
          <div style={{ fontFamily:'var(--aa-fd)',fontWeight:800,fontSize:'1.1rem',letterSpacing:'-0.025em' }}>
            <span style={{ color:'var(--aa-text-1)' }}>Almond</span><span style={{ color:'var(--aa-amber)' }}>AI</span>
          </div>
        </div>

        <div className="nav-links" style={{ display:'flex',gap:32 }}>
          {[['Features','features'],['Pricing','pricing'],['Reviews','testimonials'],['FAQ','faq']].map(([label,id]) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(id) }}
              style={{ fontFamily:'var(--aa-fb)',fontSize:'0.875rem',color:'var(--aa-text-2)',textDecoration:'none',transition:'color 0.2s',fontWeight:500 }}
              onMouseEnter={(e) => { e.currentTarget.style.color='var(--aa-text-1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color='var(--aa-text-2)' }}>
              {label}
            </a>
          ))}
        </div>

        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          <button onClick={() => setShowAuthModal(true)}
            style={{ fontFamily:'var(--aa-fb)',fontSize:'0.875rem',fontWeight:500,border:'1px solid rgba(76,70,61,0.6)',color:'var(--aa-text-2)',borderRadius:100,padding:'8px 18px',background:'transparent',cursor:'pointer',transition:'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor='rgba(213,197,168,0.4)'; e.currentTarget.style.color='var(--aa-amber)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor='rgba(76,70,61,0.6)'; e.currentTarget.style.color='var(--aa-text-2)' }}>
            Log in
          </button>
          <button onClick={() => setShowAuthModal(true)}
            style={{ fontFamily:'var(--aa-fb)',fontSize:'0.875rem',fontWeight:700,background:'var(--aa-amber)',color:'#131313',borderRadius:100,padding:'9px 22px',border:'none',cursor:'pointer',transition:'all 0.2s',position:'relative',overflow:'hidden' }}
            onMouseEnter={(e) => { e.currentTarget.style.background='var(--aa-amber-lt)'; e.currentTarget.style.boxShadow='0 0 24px rgba(213,197,168,0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background='var(--aa-amber)'; e.currentTarget.style.boxShadow='none' }}>
            Get started free
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight:'100svh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',paddingTop:66,background:'#131313' }}>
        {/* Radial gradient top */}
        <div style={{ position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:'80%',height:'55%',background:'radial-gradient(ellipse 100% 80% at 50% 0%,rgba(213,197,168,0.06) 0%,transparent 70%)',pointerEvents:'none',zIndex:0 }} />

        {/* Stars */}
        {stars.map((s) => (
          <div key={s.id} style={{ position:'absolute',left:`${s.x}%`,top:`${s.y}%`,width:s.size,height:s.size,borderRadius:'50%',background:'rgba(230,213,184,0.35)',animation:`twinkle ${s.duration}s ${s.delay}s infinite ease-in-out`,pointerEvents:'none',zIndex:0 }} />
        ))}

        {/* Blob */}
        <canvas ref={canvasRef} width={700} height={520} style={{ position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:700,height:520,zIndex:1,pointerEvents:'none',opacity:0.75 }} />

        {/* Floating card LEFT */}
        <div className="float-card" style={{ position:'absolute',left:'6%',top:'52%',zIndex:10,animation:'floatL 4.5s ease-in-out infinite' }}>
          <div className="aa-glass" style={{ borderRadius:18,padding:'14px 18px',minWidth:160,boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize:'0.65rem',textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--aa-text-3)',fontFamily:'var(--aa-fb)',marginBottom:4 }}>Daily Streak</div>
            <div style={{ fontFamily:'var(--aa-fd)',fontSize:'1.7rem',fontWeight:800,color:'var(--aa-text-1)',display:'flex',alignItems:'center',gap:6 }}>
              12 <span style={{ fontSize:'1.2rem' }}>🔥</span>
            </div>
            <div style={{ fontSize:'0.72rem',color:'var(--aa-amber)',fontFamily:'var(--aa-fb)',marginTop:2 }}>+3 almonds earned</div>
          </div>
        </div>

        {/* Floating card RIGHT */}
        <div className="float-card" style={{ position:'absolute',right:'6%',top:'55%',zIndex:10,animation:'floatR 4.5s ease-in-out 1.2s infinite' }}>
          <div className="aa-glass" style={{ borderRadius:18,padding:'14px 18px',minWidth:160,boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize:'0.65rem',textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--aa-text-3)',fontFamily:'var(--aa-fb)',marginBottom:4 }}>This week</div>
            <div style={{ fontFamily:'var(--aa-fd)',fontSize:'1.7rem',fontWeight:800,color:'var(--aa-text-1)' }}>84%</div>
            <div style={{ width:110,height:4,background:'var(--aa-s4)',borderRadius:2,overflow:'hidden',marginTop:6 }}>
              <div style={{ height:'100%',background:'linear-gradient(90deg,var(--aa-amber),var(--aa-teal))',borderRadius:2,animation:'barGrow 2s ease forwards 0.8s',width:0 }} />
            </div>
            <div style={{ fontSize:'0.72rem',color:'var(--aa-text-3)',fontFamily:'var(--aa-fb)',marginTop:4 }}>Accuracy ↑ 12%</div>
          </div>
        </div>

        {/* Hero content */}
        <div style={{ position:'relative',zIndex:2,textAlign:'center',padding:'0 5%',maxWidth:880,margin:'0 auto',paddingBottom:280 }}>
          <div className="hero-badge" style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(213,197,168,0.07)',border:'1px solid rgba(213,197,168,0.18)',borderRadius:100,padding:'7px 18px',marginBottom:32 }}>
            <span className="aa-status-dot" />
            <span style={{ fontFamily:'var(--aa-fb)',fontSize:'0.75rem',color:'var(--aa-amber)',fontWeight:600,letterSpacing:'0.04em' }}>Now in Beta — Free for NEET-PG & MBBS</span>
          </div>

          <h1 className="hero-h1" style={{ fontFamily:'var(--aa-fd)',fontSize:'clamp(3rem,5.5vw,5rem)',fontWeight:900,lineHeight:1.08,letterSpacing:'-0.038em',color:'var(--aa-text-1)',marginBottom:24 }}>
            Study smarter, crack{' '}
            <em style={{ fontStyle:'normal' }}>
              <span style={{ background:'linear-gradient(120deg, #d5c5a8 0%, #fff2de 40%, #e6c87a 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>NEET-PG</span>
            </em>
            <br />with confidence
          </h1>

          <p className="hero-sub" style={{ fontFamily:'var(--aa-fb)',fontSize:'1.07rem',color:'var(--aa-text-2)',maxWidth:500,margin:'0 auto 38px',lineHeight:1.75 }}>
            AlmondAI is your AI-powered study companion built exclusively for Indian medical students — adaptive tutoring, voice agent, MCQ engine, and more.
          </p>

          <div className="hero-ctas" style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
            <button onClick={() => setShowAuthModal(true)}
              style={{ fontFamily:'var(--aa-fb)',fontSize:'1rem',fontWeight:700,background:'var(--aa-amber)',color:'#131313',borderRadius:100,padding:'15px 34px',border:'none',cursor:'pointer',transition:'all 0.22s',boxShadow:'0 4px 24px rgba(213,197,168,0.25)',position:'relative',overflow:'hidden' }}
              onMouseEnter={(e) => { e.currentTarget.style.background='var(--aa-amber-lt)'; e.currentTarget.style.boxShadow='0 6px 32px rgba(213,197,168,0.38)'; e.currentTarget.style.transform='translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background='var(--aa-amber)'; e.currentTarget.style.boxShadow='0 4px 24px rgba(213,197,168,0.25)'; e.currentTarget.style.transform='translateY(0)' }}>
              Start studying free →
            </button>
            <button
              style={{ fontFamily:'var(--aa-fb)',fontSize:'1rem',fontWeight:500,border:'1px solid rgba(76,70,61,0.6)',color:'var(--aa-text-2)',borderRadius:100,padding:'15px 28px',background:'transparent',cursor:'pointer',transition:'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor='rgba(213,197,168,0.4)'; e.currentTarget.style.color='var(--aa-amber)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor='rgba(76,70,61,0.6)'; e.currentTarget.style.color='var(--aa-text-2)' }}>
              Watch demo
            </button>
          </div>

          {/* Mini trust row */}
          <div style={{ display:'flex',gap:28,justifyContent:'center',marginTop:36,flexWrap:'wrap' }}>
            {[['🔒','End-to-end private'],['⚡','Built for NEET-PG'],['🌰','Free to start']].map(([icon, label]) => (
              <div key={label} style={{ display:'flex',alignItems:'center',gap:6,fontFamily:'var(--aa-fb)',fontSize:'0.78rem',color:'var(--aa-text-3)' }}>
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section id="features" style={{ padding:'104px 5%',background:'var(--aa-bg)' }}>
        <div className="reveal" style={{ marginBottom:56 }}>
          <span className="aa-section-tag" style={{ marginBottom:16,display:'inline-flex' }}>What we offer</span>
          <h2 style={{ fontFamily:'var(--aa-fd)',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:800,letterSpacing:'-0.032em',color:'var(--aa-text-1)',lineHeight:1.08,maxWidth:560,marginBottom:12 }}>
            Everything you need to{' '}
            <em style={{ fontStyle:'italic',color:'var(--aa-amber)' }}>ace the exam</em>
          </h2>
          <p style={{ fontFamily:'var(--aa-fb)',fontSize:'1rem',color:'var(--aa-text-2)',maxWidth:520,lineHeight:1.72 }}>
            Not just flashcards. A full intelligent study system built around how NEET-PG toppers actually learn.
          </p>
        </div>

        {/* Bento grid */}
        <div className="reveal bento-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:8 }}>
          {/* Large card: AI Tutor */}
          <div className="feat-card bento-large" style={{ gridColumn:'span 2',background:'linear-gradient(135deg,#1e1c1c 0%,#1a1916 100%)',border:'1px solid rgba(213,197,168,0.12)',borderRadius:20,padding:'36px 34px',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:-40,right:-40,width:180,height:180,background:'radial-gradient(circle,rgba(213,197,168,0.07) 0%,transparent 70%)',pointerEvents:'none' }} />
            <div className="aa-feat-icon" style={{ fontSize:'1.4rem' }}>🧠</div>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
              <h3 style={{ fontFamily:'var(--aa-fd)',fontSize:'1.22rem',fontWeight:700,color:'var(--aa-text-1)',letterSpacing:'-0.015em' }}>Adaptive AI Tutor</h3>
              <span className="aa-badge aa-badge-amber">Core</span>
            </div>
            <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.9rem',color:'var(--aa-text-2)',lineHeight:1.7,maxWidth:420 }}>
              Ask anything. Get Socratic explanations tailored to your level. AlmondAI never just gives you the answer — it teaches you how to think through it.
            </p>
            <div style={{ marginTop:24,display:'flex',gap:10,flexWrap:'wrap' }}>
              {['Socratic method','Concept maps','Real-time adaptation','Medical context'].map((tag) => (
                <span key={tag} style={{ fontFamily:'var(--aa-fb)',fontSize:'0.72rem',padding:'4px 12px',borderRadius:100,background:'rgba(213,197,168,0.07)',border:'1px solid rgba(213,197,168,0.14)',color:'var(--aa-text-3)' }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Voice Agent */}
          <div className="feat-card" style={{ background:'linear-gradient(135deg,#1c1b1b 0%,#191818 100%)',border:'1px solid rgba(228,180,160,0.1)',borderRadius:20,padding:'30px 28px',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',bottom:-30,right:-20,width:100,height:100,background:'radial-gradient(circle,rgba(228,180,160,0.06) 0%,transparent 70%)',pointerEvents:'none' }} />
            <div className="aa-feat-icon" style={{ background:'rgba(228,180,160,0.08)',borderColor:'rgba(228,180,160,0.14)',fontSize:'1.2rem' }}>🎙️</div>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
              <h3 style={{ fontFamily:'var(--aa-fd)',fontSize:'1rem',fontWeight:700,color:'var(--aa-text-1)' }}>Voice Study Agent</h3>
              <span className="aa-badge aa-badge-caution">Pro</span>
            </div>
            <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.84rem',color:'var(--aa-text-3)',lineHeight:1.65 }}>Study hands-free. Talk to your AI tutor — perfect for commutes and long revision sessions.</p>
          </div>

          {/* MCQs */}
          <div className="feat-card" style={{ background:'#1c1b1b',border:'1px solid rgba(255,242,222,0.08)',borderRadius:20,padding:'30px 28px' }}>
            <div className="aa-feat-icon" style={{ background:'rgba(255,242,222,0.06)',borderColor:'rgba(255,242,222,0.12)' }}>📋</div>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
              <h3 style={{ fontFamily:'var(--aa-fd)',fontSize:'1rem',fontWeight:700,color:'var(--aa-text-1)' }}>MCQ Engine</h3>
              <span className="aa-badge aa-badge-teal">Core</span>
            </div>
            <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.84rem',color:'var(--aa-text-3)',lineHeight:1.65 }}>5,000+ spaced-repetition questions filtered by difficulty and your personal weak zones.</p>
          </div>

          {/* Syllabus Map */}
          <div className="feat-card" style={{ background:'#1c1b1b',border:'1px solid var(--aa-border)',borderRadius:20,padding:'30px 28px' }}>
            <div className="aa-feat-icon">🗺️</div>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
              <h3 style={{ fontFamily:'var(--aa-fd)',fontSize:'1rem',fontWeight:700,color:'var(--aa-text-1)' }}>Syllabus Map</h3>
              <span className="aa-badge aa-badge-amber">Core</span>
            </div>
            <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.84rem',color:'var(--aa-text-3)',lineHeight:1.65 }}>Interactive topic tree for full NEET-PG & MBBS syllabus. See your coverage gaps instantly.</p>
          </div>

          {/* Weakness Intelligence */}
          <div className="feat-card" style={{ background:'linear-gradient(135deg,#1e1b1b 0%,#1a1818 100%)',border:'1px solid rgba(228,180,160,0.1)',borderRadius:20,padding:'30px 28px' }}>
            <div className="aa-feat-icon" style={{ background:'rgba(228,180,160,0.07)',borderColor:'rgba(228,180,160,0.14)' }}>📊</div>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
              <h3 style={{ fontFamily:'var(--aa-fd)',fontSize:'1rem',fontWeight:700,color:'var(--aa-text-1)' }}>Weakness Intelligence</h3>
              <span className="aa-badge aa-badge-caution">Pro</span>
            </div>
            <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.84rem',color:'var(--aa-text-3)',lineHeight:1.65 }}>Real-time analysis of where you&apos;re losing marks. Auto-adjusts your question bank.</p>
          </div>

          {/* Visual Explainers - full width */}
          <div className="feat-card bento-large" style={{ gridColumn:'span 2',background:'linear-gradient(135deg,#1c1b1b 0%,#1a1916 100%)',border:'1px solid rgba(34,197,94,0.08)',borderRadius:20,padding:'30px 28px',display:'flex',alignItems:'center',gap:24 }}>
            <div>
              <div className="aa-feat-icon" style={{ background:'rgba(34,197,94,0.07)',borderColor:'rgba(34,197,94,0.14)' }}>🧬</div>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
                <h3 style={{ fontFamily:'var(--aa-fd)',fontSize:'1rem',fontWeight:700,color:'var(--aa-text-1)' }}>Visual Explainers</h3>
                <span className="aa-badge aa-badge-caution">Pro</span>
              </div>
              <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.84rem',color:'var(--aa-text-3)',lineHeight:1.65,maxWidth:360 }}>Complex pathways rendered as interactive flowcharts, mind maps, and images — generated on demand for any medical topic.</p>
            </div>
            <div style={{ flexShrink:0,display:'flex',flexWrap:'wrap',gap:8,maxWidth:220 }}>
              {['Flowcharts','Mind Maps','Decision Trees','Timelines','Comparisons'].map((v) => (
                <span key={v} style={{ fontFamily:'var(--aa-fb)',fontSize:'0.72rem',padding:'5px 12px',borderRadius:100,background:'rgba(34,197,94,0.07)',border:'1px solid rgba(34,197,94,0.14)',color:'var(--aa-green)' }}>{v}</span>
              ))}
            </div>
          </div>

          {/* 6th cell placeholder */}
          <div className="feat-card" style={{ background:'rgba(213,197,168,0.03)',border:'1px dashed rgba(213,197,168,0.12)',borderRadius:20,padding:'30px 28px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:10 }}>
            <span style={{ fontSize:'2rem',opacity:0.5 }}>🔮</span>
            <div style={{ fontFamily:'var(--aa-fd)',fontSize:'0.9rem',fontWeight:600,color:'var(--aa-text-3)' }}>More coming soon</div>
            <div style={{ fontFamily:'var(--aa-fb)',fontSize:'0.78rem',color:'rgba(183,173,160,0.55)' }}>AI Planner · Crisis Mode · Peer Leaderboard</div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding:'104px 5%',background:'var(--aa-s1)' }}>
        <div className="reveal" style={{ textAlign:'center',marginBottom:60 }}>
          <span className="aa-section-tag" style={{ marginBottom:16,display:'inline-flex' }}>Simple by design</span>
          <h2 style={{ fontFamily:'var(--aa-fd)',fontSize:'clamp(2rem,4vw,3rem)',fontWeight:800,letterSpacing:'-0.032em',color:'var(--aa-text-1)',lineHeight:1.1 }}>
            From signup to{' '}
            <em style={{ fontStyle:'italic',color:'var(--aa-amber)' }}>first revision</em> in minutes
          </h2>
          <p style={{ fontFamily:'var(--aa-fb)',fontSize:'1rem',color:'var(--aa-text-2)',maxWidth:480,lineHeight:1.72,marginTop:14,margin:'14px auto 0' }}>
            No complex setup. Just tell us your goal and let AlmondAI handle the rest.
          </p>
        </div>

        <div className="reveal steps-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,maxWidth:1040,margin:'0 auto' }}>
          {steps.map((step, i) => (
            <div key={step.num} className="reveal" style={{ background:'var(--aa-s2)',border:'1px solid var(--aa-border)',borderRadius:20,padding:'36px 30px',position:'relative',overflow:'hidden',transitionDelay:`${i*0.08}s` }}>
              {/* Ghost number */}
              <div style={{ position:'absolute',top:-12,right:16,fontFamily:'var(--aa-fd)',fontSize:'6.5rem',fontWeight:900,color:'rgba(213,197,168,0.05)',lineHeight:1,letterSpacing:'-0.06em',userSelect:'none',pointerEvents:'none' }}>
                {step.num}
              </div>
              <div style={{ position:'relative' }}>
                <div style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:34,height:34,borderRadius:10,background:'rgba(213,197,168,0.09)',border:'1px solid rgba(213,197,168,0.18)',fontFamily:'var(--aa-fd)',fontSize:'0.78rem',fontWeight:800,color:'var(--aa-amber)',marginBottom:20,letterSpacing:'0.02em' }}>
                  {step.num}
                </div>
                <h3 style={{ fontFamily:'var(--aa-fd)',fontSize:'1.05rem',fontWeight:700,color:'var(--aa-text-1)',marginBottom:10,letterSpacing:'-0.012em' }}>{step.title}</h3>
                <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.875rem',color:'var(--aa-text-3)',lineHeight:1.7 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding:'104px 5%',background:'var(--aa-bg)' }}>
        <div className="reveal" style={{ textAlign:'center',marginBottom:64 }}>
          <span className="aa-section-tag" style={{ marginBottom:16,display:'inline-flex' }}>Simple pricing</span>
          <h2 style={{ fontFamily:'var(--aa-fd)',fontSize:'clamp(2rem,4vw,3rem)',fontWeight:800,letterSpacing:'-0.032em',color:'var(--aa-text-1)',lineHeight:1.1 }}>
            No surprises,{' '}<em style={{ fontStyle:'italic',color:'var(--aa-amber)' }}>just results</em>
          </h2>
        </div>

        <div className="reveal pricing-grid" style={{ maxWidth:980,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20 }}>
          {/* Free */}
          <div className="pricing-card" style={{ background:'var(--aa-s1)',border:'1px solid var(--aa-border)',borderRadius:22,padding:'34px 28px',display:'flex',flexDirection:'column' }}>
            <div style={{ fontFamily:'var(--aa-fb)',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--aa-text-3)',marginBottom:12 }}>Free</div>
            <div style={{ fontFamily:'var(--aa-fd)',fontSize:'2.8rem',fontWeight:800,color:'var(--aa-text-1)',letterSpacing:'-0.045em',marginBottom:4 }}>
              ₹0<span style={{ fontSize:'1rem',fontWeight:400,color:'var(--aa-text-3)',marginLeft:3 }}>/mo</span>
            </div>
            <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.84rem',color:'var(--aa-text-3)',marginBottom:24,lineHeight:1.6 }}>Everything you need to get started.</p>
            <ul style={{ listStyle:'none',padding:0,marginBottom:'auto',display:'flex',flexDirection:'column',gap:10 }}>
              {['AI Tutor (20 questions/day)','5 MCQs daily (almonds system)','Syllabus Map access','Basic progress tracking','Peer leaderboard'].map((item) => (
                <li key={item} style={{ display:'flex',alignItems:'flex-start',gap:10,fontSize:'0.855rem',color:'var(--aa-text-2)',fontFamily:'var(--aa-fb)' }}>
                  <span style={{ color:'rgba(213,197,168,0.5)',fontSize:'0.6rem',marginTop:5,flexShrink:0 }}>✦</span>{item}
                </li>
              ))}
            </ul>
            <button style={{ marginTop:28,width:'100%',padding:'13px 0',borderRadius:100,fontFamily:'var(--aa-fb)',fontSize:'0.9rem',fontWeight:600,cursor:'pointer',background:'transparent',border:'1px solid rgba(76,70,61,0.7)',color:'var(--aa-text-2)',transition:'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor='rgba(213,197,168,0.4)'; e.currentTarget.style.color='var(--aa-amber)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor='rgba(76,70,61,0.7)'; e.currentTarget.style.color='var(--aa-text-2)' }}>
              Get started free
            </button>
          </div>

          {/* Pro — highlighted */}
          <div className="pricing-card aa-card-premium" style={{ padding:'34px 28px',display:'flex',flexDirection:'column',background:'linear-gradient(160deg,#1e1c1a 0%,#1a1916 100%)',boxShadow:'0 0 40px rgba(213,197,168,0.08),0 16px 48px rgba(0,0,0,0.45)' }}>
            <div style={{ position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',background:'var(--aa-amber)',color:'#131313',fontSize:'0.68rem',fontWeight:800,padding:'5px 18px',borderRadius:100,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap',fontFamily:'var(--aa-fb)',boxShadow:'0 4px 16px rgba(213,197,168,0.35)' }}>
              Most Popular
            </div>
            <div style={{ fontFamily:'var(--aa-fb)',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--aa-amber)',marginBottom:12,marginTop:4 }}>Pro</div>
            <div style={{ fontFamily:'var(--aa-fd)',fontSize:'2.8rem',fontWeight:800,color:'var(--aa-text-1)',letterSpacing:'-0.045em',marginBottom:4 }}>
              ₹499<span style={{ fontSize:'1rem',fontWeight:400,color:'var(--aa-text-3)',marginLeft:3 }}>/mo</span>
            </div>
            <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.84rem',color:'var(--aa-text-3)',marginBottom:24,lineHeight:1.6 }}>Serious about NEET-PG? This is what toppers use.</p>
            <ul style={{ listStyle:'none',padding:0,marginBottom:'auto',display:'flex',flexDirection:'column',gap:10 }}>
              {['Unlimited AI Tutor sessions','Unlimited daily MCQs','Voice Study Agent','Weakness intelligence engine','Visual explainers (all types)','AI Study Planner','Crisis revision mode'].map((item) => (
                <li key={item} style={{ display:'flex',alignItems:'flex-start',gap:10,fontSize:'0.855rem',color:'var(--aa-text-2)',fontFamily:'var(--aa-fb)' }}>
                  <span style={{ color:'var(--aa-amber)',fontSize:'0.6rem',marginTop:5,flexShrink:0 }}>✦</span>{item}
                </li>
              ))}
            </ul>
            <button style={{ marginTop:28,width:'100%',padding:'14px 0',borderRadius:100,fontFamily:'var(--aa-fb)',fontSize:'0.9rem',fontWeight:700,cursor:'pointer',background:'var(--aa-amber)',border:'none',color:'#131313',transition:'all 0.2s',boxShadow:'0 4px 20px rgba(213,197,168,0.22)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background='var(--aa-amber-lt)'; e.currentTarget.style.boxShadow='0 6px 28px rgba(213,197,168,0.35)'; e.currentTarget.style.transform='translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background='var(--aa-amber)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(213,197,168,0.22)'; e.currentTarget.style.transform='translateY(0)' }}>
              Start Pro trial
            </button>
          </div>

          {/* Annual */}
          <div className="pricing-card" style={{ background:'var(--aa-s1)',border:'1px solid var(--aa-border)',borderRadius:22,padding:'34px 28px',display:'flex',flexDirection:'column' }}>
            <div style={{ fontFamily:'var(--aa-fb)',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--aa-text-3)',marginBottom:12 }}>Annual</div>
            <div style={{ fontFamily:'var(--aa-fd)',fontSize:'2.8rem',fontWeight:800,color:'var(--aa-text-1)',letterSpacing:'-0.045em',marginBottom:4 }}>
              ₹349<span style={{ fontSize:'1rem',fontWeight:400,color:'var(--aa-text-3)',marginLeft:3 }}>/mo</span>
            </div>
            <div style={{ display:'inline-block',background:'rgba(34,197,94,0.1)',color:'var(--aa-green)',fontSize:'0.72rem',fontWeight:700,padding:'3px 12px',borderRadius:100,fontFamily:'var(--aa-fb)',marginBottom:10,border:'1px solid rgba(34,197,94,0.2)' }}>Save 30%</div>
            <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.84rem',color:'var(--aa-text-3)',marginBottom:24,lineHeight:1.6 }}>Billed annually at ₹4,188/year.</p>
            <ul style={{ listStyle:'none',padding:0,marginBottom:'auto',display:'flex',flexDirection:'column',gap:10 }}>
              {['Everything in Pro','Priority support','Early access to new features','Downloadable study reports'].map((item) => (
                <li key={item} style={{ display:'flex',alignItems:'flex-start',gap:10,fontSize:'0.855rem',color:'var(--aa-text-2)',fontFamily:'var(--aa-fb)' }}>
                  <span style={{ color:'rgba(213,197,168,0.5)',fontSize:'0.6rem',marginTop:5,flexShrink:0 }}>✦</span>{item}
                </li>
              ))}
            </ul>
            <button style={{ marginTop:28,width:'100%',padding:'13px 0',borderRadius:100,fontFamily:'var(--aa-fb)',fontSize:'0.9rem',fontWeight:600,cursor:'pointer',background:'transparent',border:'1px solid rgba(76,70,61,0.7)',color:'var(--aa-text-2)',transition:'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor='rgba(213,197,168,0.4)'; e.currentTarget.style.color='var(--aa-amber)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor='rgba(76,70,61,0.7)'; e.currentTarget.style.color='var(--aa-text-2)' }}>
              Get annual plan
            </button>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding:'104px 5%',background:'var(--aa-s1)' }}>
        <div className="reveal" style={{ textAlign:'center',marginBottom:60 }}>
          <span className="aa-section-tag" style={{ marginBottom:16,display:'inline-flex' }}>Student stories</span>
          <h2 style={{ fontFamily:'var(--aa-fd)',fontSize:'clamp(2rem,4vw,3rem)',fontWeight:800,letterSpacing:'-0.032em',color:'var(--aa-text-1)',lineHeight:1.1 }}>
            Real results from{' '}<em style={{ fontStyle:'italic',color:'var(--aa-amber)' }}>real MBBS students</em>
          </h2>
        </div>

        <div className="reveal testimonials-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,maxWidth:1080,margin:'0 auto' }}>
          {testimonials.map((t, i) => (
            <div key={t.name} className="testimonial-card reveal" style={{ background:'var(--aa-s2)',border:'1px solid var(--aa-border)',borderRadius:20,padding:'28px 26px',borderTop:`2px solid ${t.color}`,transitionDelay:`${i*0.08}s` }}>
              <div style={{ display:'flex',gap:3,marginBottom:16 }}>
                {[...Array(5)].map((_, j) => <span key={j} style={{ color:'var(--aa-caution)',fontSize:'0.82rem' }}>★</span>)}
              </div>
              <p style={{ fontFamily:'var(--aa-fb)',fontSize:'0.91rem',color:'var(--aa-text-2)',lineHeight:1.76,fontStyle:'italic',marginBottom:22,position:'relative' }}>
                <span style={{ fontFamily:'var(--aa-fd)',fontSize:'2.5rem',color:t.color,opacity:0.28,lineHeight:0,verticalAlign:-16,marginRight:2,display:'inline-block' }}>❝</span>
                {t.quote}
              </p>
              <div style={{ display:'flex',alignItems:'center',gap:12,paddingTop:16,borderTop:'1px solid var(--aa-border)' }}>
                <div style={{ width:40,height:40,borderRadius:'50%',background:`linear-gradient(135deg,rgba(213,197,168,0.15),rgba(213,197,168,0.05))`,border:`1.5px solid ${t.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--aa-fd)',fontSize:'0.85rem',fontWeight:800,color:t.color,flexShrink:0 }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontFamily:'var(--aa-fd)',fontSize:'0.88rem',fontWeight:700,color:'var(--aa-text-1)' }}>{t.name}</div>
                  <div style={{ fontFamily:'var(--aa-fb)',fontSize:'0.75rem',color:'var(--aa-text-3)',marginTop:2 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding:'104px 5%',background:'var(--aa-bg)' }}>
        <div className="reveal" style={{ textAlign:'center',marginBottom:60 }}>
          <span className="aa-section-tag" style={{ marginBottom:16,display:'inline-flex' }}>Questions answered</span>
          <h2 style={{ fontFamily:'var(--aa-fd)',fontSize:'clamp(2rem,4vw,3rem)',fontWeight:800,letterSpacing:'-0.032em',color:'var(--aa-text-1)',lineHeight:1.1 }}>
            Everything you{' '}<em style={{ fontStyle:'italic',color:'var(--aa-amber)' }}>want to know</em>
          </h2>
        </div>

        <div className="reveal" style={{ maxWidth:740,margin:'0 auto',display:'flex',flexDirection:'column',gap:4 }}>
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item" style={{ background:'var(--aa-s1)',borderRadius:14,overflow:'hidden',border:`1px solid ${openFaq === i ? 'rgba(213,197,168,0.2)' : 'transparent'}`,transition:'border-color 0.2s,background 0.2s' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width:'100%',background:'transparent',border:'none',padding:'22px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',fontFamily:'var(--aa-fb)',fontSize:'0.93rem',fontWeight:500,color:'var(--aa-text-1)',textAlign:'left',gap:20 }}>
                {faq.q}
                <span style={{ width:22,height:22,borderRadius:6,border:'1px solid',borderColor: openFaq === i ? 'rgba(213,197,168,0.3)' : 'rgba(76,70,61,0.5)',color: openFaq === i ? 'var(--aa-amber)' : 'var(--aa-text-3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.25s',transform: openFaq === i ? 'rotate(45deg)' : 'none',fontSize:'1.1rem',lineHeight:1 }}>
                  +
                </span>
              </button>
              <div style={{ maxHeight: openFaq === i ? 320 : 0,overflow:'hidden',transition:'max-height 0.35s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
                <div style={{ padding:'0 24px 22px',fontFamily:'var(--aa-fb)',fontSize:'0.875rem',color:'var(--aa-text-3)',lineHeight:1.76 }}>{faq.a}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:'120px 5%',background:'var(--aa-bg)',textAlign:'center',position:'relative',overflow:'hidden' }}>
        {/* Dot grid */}
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(213,197,168,0.1) 1px,transparent 1px)',backgroundSize:'26px 26px',opacity:0.4,pointerEvents:'none' }} />
        {/* Radial glow */}
        <div style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:800,height:400,background:'radial-gradient(ellipse,rgba(213,197,168,0.065) 0%,transparent 65%)',pointerEvents:'none' }} />

        <div className="reveal" style={{ position:'relative',zIndex:1 }}>
          <span className="aa-section-tag" style={{ marginBottom:20,display:'inline-flex' }}>Get started today</span>
          <h2 style={{ fontFamily:'var(--aa-fd)',fontSize:'clamp(2.4rem,5.5vw,4.2rem)',fontWeight:900,letterSpacing:'-0.038em',lineHeight:1.07,color:'var(--aa-text-1)',marginBottom:20 }}>
            Your NEET-PG rank starts{' '}
            <em style={{ fontStyle:'italic',background:'linear-gradient(120deg,var(--aa-amber-lt),var(--aa-amber))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>right here</em>
          </h2>
          <p style={{ fontFamily:'var(--aa-fb)',fontSize:'1rem',color:'var(--aa-text-2)',maxWidth:460,margin:'0 auto 40px',lineHeight:1.74 }}>
            Join thousands of MBBS students already studying smarter. Free forever — upgrade only when you&apos;re ready.
          </p>
          <button onClick={() => setShowAuthModal(true)}
            style={{ fontFamily:'var(--aa-fb)',fontSize:'1rem',fontWeight:700,background:'var(--aa-amber)',color:'#131313',borderRadius:100,padding:'16px 36px',border:'none',cursor:'pointer',transition:'all 0.22s',boxShadow:'0 4px 24px rgba(213,197,168,0.25)',position:'relative',overflow:'hidden' }}
            onMouseEnter={(e) => { e.currentTarget.style.background='var(--aa-amber-lt)'; e.currentTarget.style.boxShadow='0 8px 36px rgba(213,197,168,0.38)'; e.currentTarget.style.transform='translateY(-2px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background='var(--aa-amber)'; e.currentTarget.style.boxShadow='0 4px 24px rgba(213,197,168,0.25)'; e.currentTarget.style.transform='translateY(0)' }}>
            Start studying free →
          </button>
          <p style={{ marginTop:16,fontSize:'0.78rem',color:'var(--aa-text-3)',fontFamily:'var(--aa-fb)' }}>
            No credit card · Cancel anytime · Built for Indian medical students
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:'var(--aa-s1)',borderTop:'1px solid var(--aa-border)',padding:'44px 5%' }}>
        <div className="footer-inner" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:20,marginBottom:28 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:30,height:30,borderRadius:9,background:'linear-gradient(135deg,rgba(213,197,168,0.18),rgba(213,197,168,0.07))',border:'1px solid rgba(213,197,168,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15 }}>🌰</div>
            <div style={{ fontFamily:'var(--aa-fd)',fontWeight:800,fontSize:'1.05rem' }}>
              <span style={{ color:'var(--aa-text-1)' }}>Almond</span><span style={{ color:'var(--aa-amber)' }}>AI</span>
            </div>
          </div>
          <nav style={{ display:'flex',gap:24,flexWrap:'wrap' }}>
            {['Privacy','Terms','Contact','Blog'].map((link) => (
              <a key={link} href="#" style={{ fontSize:'0.83rem',color:'var(--aa-text-3)',textDecoration:'none',fontFamily:'var(--aa-fb)',transition:'color 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.color='var(--aa-amber)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color='var(--aa-text-3)' }}>
                {link}
              </a>
            ))}
          </nav>
        </div>
        <div style={{ borderTop:'1px solid var(--aa-border)',paddingTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
          <span style={{ fontSize:'0.78rem',color:'rgba(183,173,160,0.45)',fontFamily:'var(--aa-fb)' }}>© 2025 AlmondAI. Made for MBBS India.</span>
          <span style={{ fontSize:'0.78rem',color:'rgba(183,173,160,0.35)',fontFamily:'var(--aa-fb)' }}>Built with 🌰 for medical students</span>
        </div>
      </footer>
    </>
  )
}
