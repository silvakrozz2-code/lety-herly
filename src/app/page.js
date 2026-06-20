'use client';
import { useState, useEffect, useRef } from 'react';
import { auth, db, ADMIN_EMAIL, WA_NUMBER } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, Timestamp, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { services as defaultServices, manutencoes } from '@/lib/services';
import { ouvirFotosCustomizadas, aplicarFotosCustomizadas } from '@/lib/fotosServicos';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselServico, setCarouselServico] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalServico, setModalServico] = useState(null);
  const [dataSel, setDataSel] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [notify, setNotify] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupServico, setPopupServico] = useState(null);
  const [services, setServices] = useState(defaultServices);
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setIsAdmin(u?.email === ADMIN_EMAIL);
      if (!u) {
        const timer = setTimeout(() => setShowPopup(true), 25000);
        return () => clearTimeout(timer);
      }
    });
    return () => unsub();
  }, []);

  // Escuta mudanças nas fotos feitas pela Lety no painel admin
  useEffect(() => {
    const unsub = ouvirFotosCustomizadas((fotosCustom) => {
      setServices(aplicarFotosCustomizadas(defaultServices, fotosCustom));
    });
    return () => unsub();
  }, []);

  const showNotify = (msg) => { setNotify(msg); setTimeout(() => setNotify(''), 5000); };

  // LONG PRESS
  const touchStart = useRef({ x: 0, y: 0 });
  const touchMoved = useRef(false);

  const startPress = (s, e) => {
    isLongPress.current = false;
    touchMoved.current = false;
    const touch = e?.touches?.[0] || e;
    touchStart.current = { x: touch?.clientX || 0, y: touch?.clientY || 0 };
    pressTimer.current = setTimeout(() => { isLongPress.current = true; abrirCarrossel(s); }, 1000);
  };

  const onTouchMove = (e) => {
    const touch = e?.touches?.[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - touchStart.current.x);
    const dy = Math.abs(touch.clientY - touchStart.current.y);
    if (dx > 8 || dy > 8) {
      touchMoved.current = true;
      clearTimeout(pressTimer.current);
    }
  };

  const endPress = (s, e) => {
    clearTimeout(pressTimer.current);
    if (!isLongPress.current && !touchMoved.current) {
      abrirModal(s);
    }
    isLongPress.current = false;
    touchMoved.current = false;
  };

  const abrirCarrossel = (s) => { setCarouselServico(s); setCarouselIndex(0); setCarouselOpen(true); };
  const abrirModal = (s) => {
    if (!user) {
      setShowPopup(true);
      setPopupServico(s);
      return;
    }
    setModalServico(s); setDataSel(''); setHorarios([]); setModalOpen(true);
  };

  useEffect(() => {
    if (!dataSel || !modalOpen) return;
    const d = new Date(dataSel + 'T12:00:00');
    if (d.getDay() === 0) { setHorarios('domingo'); return; }
    setLoadingHorarios(true);
    const horas = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
    getDocs(query(collection(db, 'agendamentos'), where('data', '==', dataSel))).then(snap => {
      const ocupados = [];
      snap.forEach(d => ocupados.push(d.data().hora));
      setHorarios(horas.map(h => ({ hora: h, livre: !ocupados.includes(h) })));
      setLoadingHorarios(false);
    });
  }, [dataSel, modalOpen]);

  const agendar = async (hora) => {
    if (!user || !modalServico) return;
    const dataBr = dataSel.split('-').reverse().join('/');
    try {
      await addDoc(collection(db, 'agendamentos'), {
        clienteNome: user.displayName || 'Cliente',
        clienteEmail: user.email,
        servico: modalServico.name,
        valor: modalServico.price,
        data: dataSel, dataBr, hora,
        status: 'pendente',
        criadoEm: Timestamp.now()
      });
      setModalOpen(false);
      showNotify(`Agendado!\n${modalServico.name} · ${dataBr} às ${hora}`);
    } catch (e) { alert('Erro ao agendar: ' + e.message); }
  };

  const carouselImgs = carouselServico?.carouselImgs || [];
  const total = carouselImgs.length;
  const radius = 170;
  const swipeStart = useRef(null);

  const handleSwipeStart = (e) => {
    const touch = e.touches?.[0] || e;
    swipeStart.current = touch.clientX;
  };
  const handleSwipeEnd = (e) => {
    if (swipeStart.current === null) return;
    const touch = e.changedTouches?.[0] || e;
    const diff = swipeStart.current - touch.clientX;
    if (Math.abs(diff) > 40) {
      setCarouselIndex(prev => (prev + (diff > 0 ? 1 : -1) + total) % total);
    }
    swipeStart.current = null;
  };

  return (
    <div style={{ minHeight:'100vh' }}>
      {notify && <div className="notify-badge">{notify}</div>}

      {/* NAV */}
      <header style={{ position:'fixed', top:0, width:'100%', zIndex:1000, padding:'8px 12px' }}>
        <div style={{ background:'rgba(255,255,255,0.88)', backdropFilter:'blur(24px)', borderRadius:'18px', padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 4px 24px rgba(255,182,193,0.18)', border:'1px solid rgba(255,182,193,0.25)' }}>
          <a href="/" style={{ fontFamily:'Playfair Display,serif', fontSize:'1.1rem', fontWeight:900, color:'#ff8da1', textDecoration:'none', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'5px', flexShrink:0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#ff8da1"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
            Lety Harley
          </a>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <a href="#servicos" className="nav-link" style={{ textDecoration:'none', color:'#1d1d1f', fontWeight:600, fontSize:'0.82rem' }}>Serviços</a>
            <a href="#contato" className="nav-link" style={{ textDecoration:'none', color:'#1d1d1f', fontWeight:600, fontSize:'0.82rem' }}>Contato</a>
            {isAdmin && <a href="/admin" style={{ textDecoration:'none', color:'#ff8da1', display:'flex', alignItems:'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ff8da1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </a>}
            {user ? (
              <a href="/perfil" style={{ display:'flex', alignItems:'center', gap:'5px', textDecoration:'none', background:'#fff5f8', padding:'3px 8px 3px 3px', borderRadius:'100px', border:'1px solid #ffe4e1' }}>
                <img src={user.photoURL || ''} style={{ width:24, height:24, borderRadius:'50%', border:'2px solid #ffb6c1', background:'#ffb6c1', flexShrink:0 }} alt="" />
                <span style={{ fontSize:'0.75rem', fontWeight:600, maxWidth:55, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#ff8da1' }}>{(user.displayName||'Perfil').split(' ')[0]}</span>
              </a>
            ) : (
              <button onClick={() => router.push('/login')} style={{ background:'linear-gradient(90deg,#ffb6c1,#ff8da1)', color:'#fff', border:'none', padding:'7px 12px', borderRadius:'100px', fontWeight:700, cursor:'pointer', fontSize:'0.78rem', whiteSpace:'nowrap' }}>
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ height:'100vh', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#fff' }}>
        <video autoPlay muted loop playsInline style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:-1 }}>
          <source src="/bannersite.mp4" type="video/mp4" />
        </video>
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)' }} />
        <div style={{ position:'relative', zIndex:10, padding:'0 20px' }}>
          <span style={{ background:'#ffb6c1', padding:'8px 20px', borderRadius:'100px', fontSize:'0.8rem', textTransform:'uppercase', fontWeight:700, display:'inline-flex', alignItems:'center', gap:'6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
            Lash Designer Profissional
          </span>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'clamp(3rem,10vw,6rem)', margin:'20px 0' }}>Olhar de Rainha</h1>
          <p style={{ fontSize:'1.1rem', opacity:0.9, marginBottom:'30px' }}>O olhar mais sofisticado e seguro da cidade.</p>
          <a href="#servicos" style={{ display:'inline-block', background:'#fff', color:'#ff8da1', padding:'18px 45px', borderRadius:'100px', textDecoration:'none', fontWeight:700, fontSize:'1rem' }}>Ver Serviços</a>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" style={{ padding:'100px 24px 40px', background:'var(--bg-alt)', textAlign:'center' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'clamp(2rem,5vw,3rem)', marginBottom:'10px' }}>Nossos Serviços</h2>
          <p style={{ color:'#86868b', fontSize:'0.88rem', marginBottom:'16px' }}>Segure o card para ver exemplos • Toque para agendar</p>
          {!user && (
            <div style={{ background:'linear-gradient(90deg,#ffe4e1,#fff5f8)', border:'1px solid #ffe4e1', padding:'14px 20px', borderRadius:'14px', marginBottom:'28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
              <p style={{ fontSize:'0.88rem' }}>Entre para <strong style={{ color:'#ff8da1' }}>agendar seu horário</strong></p>
              <button onClick={() => router.push('/login')} style={{ background:'#fff', border:'2px solid #ddd', color:'#333', padding:'9px 16px', borderRadius:'100px', fontWeight:700, cursor:'pointer', fontSize:'0.82rem', display:'flex', alignItems:'center', gap:'7px' }}>
                <img src="https://www.google.com/favicon.ico" width="16" alt="" /> Entrar
              </button>
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'24px' }}>
            {services.map(s => (
              <div key={s.id}
                style={{ background:'#fff', borderRadius:'24px', overflow:'hidden', boxShadow:'var(--shadow)', cursor:'pointer', userSelect:'none', WebkitUserSelect:'none', transition:'transform 0.3s' }}
                onMouseDown={e => startPress(s, e)}
                onTouchStart={e => startPress(s, e)}
                onTouchMove={e => onTouchMove(e)}
                onMouseUp={e => endPress(s, e)}
                onTouchEnd={e => endPress(s, e)}
                onMouseLeave={() => { clearTimeout(pressTimer.current); touchMoved.current = false; }}
              >
                <div style={{ height:230, overflow:'hidden', position:'relative' }}>
                  <img src={s.image} alt={s.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s' }} />
                  <span style={{ position:'absolute', bottom:8, right:10, background:'rgba(0,0,0,0.55)', color:'#fff', fontSize:'0.6rem', padding:'4px 9px', borderRadius:'20px', backdropFilter:'blur(4px)' }}>Segure para ver exemplos</span>
                </div>
                <div style={{ padding:'22px' }}>
                  <h3 style={{ fontWeight:700, marginBottom:'6px' }}>{s.name}</h3>
                  <span style={{ fontSize:'1.4rem', fontWeight:700, color:'#ff8da1' }}>R$ {s.price},00</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MANUTENÇÃO */}
      <section id="manutencao" style={{ padding:'40px 24px 100px', background:'var(--bg-alt)', textAlign:'center' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'clamp(1.8rem,4vw,2.5rem)', marginBottom:'8px' }}>Manutenção</h2>
          <p style={{ color:'#86868b', fontSize:'0.88rem', marginBottom:'32px' }}>Mantenha seus cílios sempre perfeitos</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
            {manutencoes.map((m, i) => (
              <div key={i} onClick={() => abrirModal(m)} style={{ background:'#fff', borderRadius:'18px', padding:'24px 16px', border:'2px solid #ffe4e1', transition:'all 0.2s', cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
              >
                <span style={{ background:'#ff8da1', color:'#fff', fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', padding:'3px 10px', borderRadius:'20px', marginBottom:'8px', display:'inline-flex', alignItems:'center', gap:'4px' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                  Manutenção
                </span>
                <h3 style={{ fontSize:'0.88rem', fontWeight:700, margin:'8px 0 6px' }}>{m.name.replace('Manutenção ','')}</h3>
                <span style={{ fontSize:'1.4rem', fontWeight:700, color:'#ff8da1' }}>R$ {m.price},00</span>
                <div style={{ marginTop:12 }}>
                  <span style={{ background:'linear-gradient(90deg,#ffb6c1,#ff8da1)', color:'#fff', fontSize:'0.72rem', fontWeight:700, padding:'6px 14px', borderRadius:'100px', display:'inline-flex', alignItems:'center', gap:'5px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Agendar
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato" style={{ padding:'60px 20px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(255,182,193,0.12),rgba(255,141,161,0.08))', backdropFilter:'blur(20px)', borderRadius:'32px', border:'1px solid rgba(255,182,193,0.3)', overflow:'hidden', boxShadow:'0 30px 80px rgba(255,141,161,0.12)' }} className="contact-grid">
            {/* Info */}
            <div style={{ background:'linear-gradient(135deg,#ffb6c1,#ff8da1)', padding:'44px 40px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <p style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'rgba(255,255,255,0.7)', marginBottom:'12px' }}>Atendimento Premium</p>
              <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'2rem', color:'#fff', marginBottom:'12px', lineHeight:1.2 }}>Agende sua Visita</h2>
              <p style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.9rem', lineHeight:1.7, marginBottom:'28px' }}>Materiais premium e técnica internacional para o olhar perfeito.</p>
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" style={{ display:'inline-flex', alignItems:'center', gap:'10px', background:'rgba(255,255,255,0.2)', backdropFilter:'blur(10px)', color:'#fff', padding:'14px 22px', borderRadius:'100px', textDecoration:'none', fontWeight:700, fontSize:'0.88rem', border:'1px solid rgba(255,255,255,0.4)', width:'fit-content' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Dúvidas via WhatsApp
              </a>
            </div>
            {/* Agendar */}
            <div style={{ padding:'44px 40px', background:'rgba(255,255,255,0.7)', backdropFilter:'blur(20px)', display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ background:'rgba(255,182,193,0.1)', borderRadius:'20px', padding:'28px', border:'1px solid rgba(255,182,193,0.2)', marginBottom:'20px' }}>
                <p style={{ fontSize:'0.75rem', fontWeight:700, color:'#ff8da1', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>Como agendar</p>
                <p style={{ fontSize:'0.88rem', color:'#86868b', lineHeight:1.7 }}>Escolha um serviço acima, toque nele e selecione seu horário favorito!</p>
              </div>
              <button onClick={() => { const el = document.getElementById('servicos'); el?.scrollIntoView({behavior:'smooth'}); }} style={{ width:'100%', padding:'16px', borderRadius:'100px', border:'none', background:'linear-gradient(90deg,#ffb6c1,#ff8da1)', color:'#fff', fontWeight:900, cursor:'pointer', fontSize:'0.92rem', boxShadow:'0 8px 24px rgba(255,141,161,0.35)' }}>
                {user ? 'Ver Serviços ↑' : 'Criar conta e Agendar'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MAPA ESTILO iOS */}
      <section style={{ padding:'60px 24px 0' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'clamp(1.8rem,4vw,2.5rem)', marginBottom:'8px' }}>Onde Estamos</h2>
          <p style={{ color:'#86868b', marginBottom:'28px', fontSize:'0.9rem' }}>R. Nazílio Camargo, 191 - Casa 16 - Jardim Taiza, Almirante Tamandaré - PR</p>
          <div className="map-glass" style={{ borderRadius:'32px', overflow:'hidden', padding:'12px', marginBottom:'16px' }}>
            <div style={{ borderRadius:'22px', overflow:'hidden', height:'320px' }}>
              <iframe src="https://www.google.com/maps?q=R.+Naz%C3%ADlio+Camargo,+191,+Almirante+Tamandare,+PR,+Brazil&output=embed" style={{ width:'100%', height:'100%', border:'none' }} allowFullScreen loading="lazy" />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 8px 4px', justifyContent:'center' }}>
              <span style={{ fontSize:'1rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="#ff8da1"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span>
              <span style={{ fontSize:'0.82rem', color:'#ff8da1', fontWeight:600 }}>R. Nazílio Camargo, 191 · Almirante Tamandaré - PR</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:'#1a0a0e', color:'rgba(255,255,255,0.5)', textAlign:'center', padding:'30px 20px', marginTop:'40px' }}>
        <p style={{ color:'#ff8da1', fontFamily:'Playfair Display,serif', fontWeight:700, marginBottom:'6px' }}>Lety Harley Lashdesigner</p>
        <p style={{ fontSize:'0.82rem', marginBottom:'16px' }}>R. Nazílio Camargo, 191 - Casa 16 - Jardim Taiza, Almirante Tamandaré - PR · CEP 83504-570</p>
        <a href="https://wa.me/554196824913" target="_blank" style={{ marginBottom:'12px', display:'inline-flex', alignItems:'center', gap:'8px', textDecoration:'none' }}>
          <div style={{ background:'rgba(255,182,193,0.1)', border:'1px solid rgba(255,182,193,0.25)', borderRadius:'14px', padding:'8px 18px', display:'flex', alignItems:'center' }}>
            <img src="/melquidev-logo.png" alt="MelquiDev" style={{ height:26, filter:'invert(1)', opacity:0.7 }} />
          </div>
        </a>
        <p style={{ fontSize:'0.75rem', opacity:0.4, marginTop:'8px' }}>© 2026 Todos os direitos reservados</p>
      </footer>

      <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" style={{ position:'fixed', bottom:28, right:20, background:'linear-gradient(135deg,#ffb6c1,#ff8da1)', width:58, height:58, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', zIndex:1000, boxShadow:'0 6px 24px rgba(255,141,161,0.5)', border:'2px solid rgba(255,255,255,0.6)' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* CARROSSEL 3D */}
      {carouselOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setCarouselOpen(false); }} onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd} onMouseDown={handleSwipeStart} onMouseUp={handleSwipeEnd} style={{ position:'fixed', inset:0, background:'rgba(8,2,5,0.93)', backdropFilter:'blur(18px)', zIndex:3000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px', userSelect:'none' }}>
          <button onClick={() => setCarouselOpen(false)} style={{ position:'absolute', top:20, right:20, background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', width:44, height:44, borderRadius:'50%', fontSize:'1.2rem', cursor:'pointer' }}>✕</button>
          <div style={{ textAlign:'center', marginBottom:20, color:'#fff' }}>
            <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.8rem', color:'#ffb6c1', marginBottom:4 }}>{carouselServico?.name}</h2>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.8rem' }}>Exemplos reais do serviço</p>
          </div>
          <div className="carousel-3d-wrap" style={{ width:'100%', maxWidth:480, height:310, position:'relative' }}>
            <div className="carousel-3d" style={{ width:'100%', height:'100%', position:'relative', transform:`rotateY(${-(carouselIndex*(360/total))}deg)` }}>
              {carouselImgs.map((img, i) => (
                <div key={i} className="carousel-slide" style={{ transform:`rotateY(${(360/total)*i}deg) translateZ(${radius}px)` }}>
                  <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ color:'#ffb6c1', fontWeight:700, fontSize:'1.2rem', border:'1px solid #ffb6c1', padding:'8px 26px', borderRadius:'100px', marginTop:14, background:'rgba(255,182,193,0.1)' }}>
            R$ {carouselServico?.price},00
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:20, marginTop:18 }}>
            <button onClick={() => setCarouselIndex((carouselIndex-1+total)%total)} style={{ background:'rgba(255,182,193,0.15)', border:'2px solid #ffb6c1', color:'#ffb6c1', width:48, height:48, borderRadius:'50%', fontSize:'1.3rem', cursor:'pointer' }}>‹</button>
            <div style={{ display:'flex', gap:8 }}>
              {carouselImgs.map((_,i) => <div key={i} onClick={() => setCarouselIndex(i)} style={{ width: i===carouselIndex?24:8, height:8, borderRadius: i===carouselIndex?4:50, background: i===carouselIndex?'#ffb6c1':'rgba(255,182,193,0.3)', cursor:'pointer', transition:'0.3s' }} />)}
            </div>
            <button onClick={() => setCarouselIndex((carouselIndex+1)%total)} style={{ background:'rgba(255,182,193,0.15)', border:'2px solid #ffb6c1', color:'#ffb6c1', width:48, height:48, borderRadius:'50%', fontSize:'1.3rem', cursor:'pointer' }}>›</button>
          </div>
          <button onClick={() => { setCarouselOpen(false); abrirModal(carouselServico); }} style={{ marginTop:12, background:'linear-gradient(90deg,#ffb6c1,#ff8da1)', color:'#fff', border:'none', padding:'13px 36px', borderRadius:'100px', fontWeight:700, cursor:'pointer' }}>
            {user ? 'Agendar Este Serviço' : 'Entrar para Agendar'}
          </button>
        </div>
      )}

      {/* MODAL AGENDAMENTO */}
      {modalOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(255,255,255,0.88)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
          <div style={{ background:'#fff', padding:'28px 20px', borderRadius:'24px', width:'100%', maxWidth:400, textAlign:'center', boxShadow:'var(--shadow)', border:'2px solid #ffe4e1', maxHeight:'90vh', overflowY:'auto' }}>
            <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.5rem', marginBottom:8 }}>{modalServico?.name}</h2>
            <span style={{ background:'#ffe4e1', color:'#ff8da1', padding:'8px 18px', borderRadius:'15px', fontWeight:800, marginBottom:20, display:'inline-block' }}>R$ {modalServico?.price},00</span>

            {/* CALENDÁRIO CUSTOMIZADO */}
            <CalendarioCustom today={today} dataSel={dataSel} onSelect={setDataSel} />

            <label style={{ display:'block', fontWeight:700, color:'#ff8da1', marginBottom:10, fontSize:'0.75rem', textTransform:'uppercase', textAlign:'left', marginTop:16 }}>Escolha o Horário</label>
            {horarios === 'domingo'
              ? <p style={{ color:'#ff8da1', fontWeight:700, padding:15 }}>Domingo fechado</p>
              : loadingHorarios
              ? <p style={{ color:'#86868b', padding:10, fontSize:'0.85rem' }}>Carregando...</p>
              : !dataSel
              ? <p style={{ color:'#86868b', padding:10, fontSize:'0.85rem' }}>Selecione uma data acima</p>
              : <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                  {horarios.map(({ hora, livre }) => (
                    <button key={hora} onClick={() => livre && agendar(hora)} className={`horario-btn ${!livre?'ocupado':''}`}>{hora}</button>
                  ))}
                </div>
            }
            <button onClick={() => setModalOpen(false)} style={{ background:'none', border:'none', color:'#999', fontWeight:800, cursor:'pointer', textTransform:'uppercase', fontSize:'0.7rem', marginTop:8 }}>Voltar</button>
          </div>
        </div>
      )}

      {/* POPUP CADASTRO */}
      {showPopup && !user && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'#fff', borderRadius:'28px', padding:'36px 28px', maxWidth:360, width:'100%', textAlign:'center', boxShadow:'0 30px 80px rgba(255,141,161,0.3)', position:'relative' }}>
            <button onClick={() => setShowPopup(false)} style={{ position:'absolute', top:14, right:16, background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#bbb' }}>✕</button>
            <div style={{ fontSize:'3rem', marginBottom:'12px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff8da1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.6rem', color:'#ff8da1', marginBottom:'10px' }}>
              {popupServico ? 'Quase lá!' : 'Olhar de Rainha'}
            </h2>
            <p style={{ color:'#86868b', fontSize:'0.88rem', lineHeight:1.6, marginBottom:'24px' }}>
              {popupServico
                ? `Para agendar ${popupServico.name}, crie sua conta grátis em segundos!`
                : 'Crie sua conta e agende seu horário de forma rápida e fácil!'}
            </p>
            <button onClick={() => { setShowPopup(false); router.push('/login'); }} style={{ width:'100%', padding:'15px', borderRadius:'14px', border:'none', background:'linear-gradient(90deg,#ffb6c1,#ff8da1)', color:'#fff', fontWeight:900, cursor:'pointer', fontSize:'0.95rem', marginBottom:'10px' }}>
              {popupServico ? 'Criar conta e agendar' : 'Criar conta grátis'}
            </button>
            {!popupServico && (
              <button onClick={() => setShowPopup(false)} style={{ background:'none', border:'none', color:'#bbb', fontSize:'0.8rem', cursor:'pointer' }}>
                Agora não
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:768px){
          .contact-grid{grid-template-columns:1fr!important}
        }
        @media(min-width:600px){
          .nav-link{ display:inline!important }
        }
      `}</style>
    </div>
  );
}

function CalendarioCustom({ today, dataSel, onSelect }) {
  const [mesAtual, setMesAtual] = useState(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });

  const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const primeiroDia = new Date(mesAtual.ano, mesAtual.mes, 1).getDay();
  const totalDias = new Date(mesAtual.ano, mesAtual.mes + 1, 0).getDate();

  const avancar = () => {
    setMesAtual(m => {
      if (m.mes === 11) return { ano: m.ano + 1, mes: 0 };
      return { ...m, mes: m.mes + 1 };
    });
  };
  const voltar = () => {
    setMesAtual(m => {
      const hoje = new Date();
      if (m.ano === hoje.getFullYear() && m.mes === hoje.getMonth()) return m;
      if (m.mes === 0) return { ano: m.ano - 1, mes: 11 };
      return { ...m, mes: m.mes - 1 };
    });
  };

  const toISO = (dia) => {
    const mm = String(mesAtual.mes + 1).padStart(2,'0');
    const dd = String(dia).padStart(2,'0');
    return `${mesAtual.ano}-${mm}-${dd}`;
  };

  const isBloqueado = (dia) => {
    const iso = toISO(dia);
    if (iso < today) return true;
    const dow = new Date(iso + 'T12:00:00').getDay();
    return dow === 0; // domingo fechado
  };

  const cells = [];
  for (let i = 0; i < primeiroDia; i++) cells.push(null);
  for (let d = 1; d <= totalDias; d++) cells.push(d);

  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#ff8da1', marginBottom:10, textTransform:'uppercase', textAlign:'left' }}>Data</label>
      {/* Cabeçalho mês */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <button onClick={voltar} style={{ background:'none', border:'2px solid #ffe4e1', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'#ff8da1', fontWeight:900, fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <span style={{ fontFamily:'Playfair Display,serif', fontWeight:700, color:'#1a0a0e', fontSize:'0.95rem' }}>
          {meses[mesAtual.mes]} {mesAtual.ano}
        </span>
        <button onClick={avancar} style={{ background:'none', border:'2px solid #ffe4e1', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'#ff8da1', fontWeight:900, fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
      </div>

      {/* Dias da semana */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
        {diasSemana.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:'0.65rem', fontWeight:700, color: d === 'Dom' ? '#ffb6c1' : '#bbb', padding:'4px 0', textTransform:'uppercase' }}>{d}</div>
        ))}
      </div>

      {/* Dias */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {cells.map((dia, i) => {
          if (!dia) return <div key={i} />;
          const iso = toISO(dia);
          const bloqueado = isBloqueado(dia);
          const selecionado = iso === dataSel;
          const ehHoje = iso === today;
          return (
            <button
              key={i}
              onClick={() => !bloqueado && onSelect(iso)}
              disabled={bloqueado}
              style={{
                padding:'7px 0',
                borderRadius:10,
                border: ehHoje && !selecionado ? '2px solid #ffb6c1' : '2px solid transparent',
                background: selecionado ? 'linear-gradient(135deg,#ffb6c1,#ff8da1)' : bloqueado ? 'transparent' : '#fff9fa',
                color: selecionado ? '#fff' : bloqueado ? '#ddd' : '#1a0a0e',
                fontWeight: selecionado ? 800 : 500,
                fontSize:'0.82rem',
                cursor: bloqueado ? 'not-allowed' : 'pointer',
                textDecoration: bloqueado && !selecionado ? 'line-through' : 'none',
                transition:'all 0.15s',
                boxShadow: selecionado ? '0 4px 12px rgba(255,141,161,0.4)' : 'none',
              }}
            >{dia}</button>
          );
        })}
      </div>

      {dataSel && (
        <p style={{ marginTop:10, fontSize:'0.78rem', color:'#ff8da1', fontWeight:700, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff8da1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {dataSel.split('-').reverse().join('/')}
        </p>
      )}
    </div>
  );
}
