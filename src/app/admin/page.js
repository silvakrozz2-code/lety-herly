'use client';
import { useState, useEffect } from 'react';
import { auth, db, ADMIN_EMAIL, PLANO_VALOR } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { services as defaultServices } from '@/lib/services';
import { ouvirFotosCustomizadas, salvarFotoServico, aplicarFotosCustomizadas } from '@/lib/fotosServicos';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [agendamentos, setAgendamentos] = useState([]);
  const [filtro, setFiltro] = useState('hoje');
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [fotosCustom, setFotosCustom] = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);
  const [notify, setNotify] = useState('');
  const [planoAtivo, setPlanoAtivo] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      if (!u || u.email !== ADMIN_EMAIL) { router.push('/'); return; }
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'agendamentos'), snap => {
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
      setAgendamentos(lista);
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const d = change.doc.data();
          if (d.criadoEm && (Date.now() / 1000 - d.criadoEm.seconds) < 15)
            showNotify(`Novo agendamento!\n${d.clienteNome} · ${d.servico}\n${d.dataBr} às ${d.hora}`);
        }
      });
    });
    const unsubAv = onSnapshot(collection(db, 'avaliacoes'), snap => {
      const lista = [];
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
      setAvaliacoes(lista);
    });
    return () => { unsub(); unsubAv(); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = ouvirFotosCustomizadas(setFotosCustom);
    return () => unsub();
  }, [user]);

  const showNotify = (msg) => { setNotify(msg); setTimeout(() => setNotify(''), 6000); };

  const servicosComFotos = aplicarFotosCustomizadas(defaultServices, fotosCustom);

  const confirmar = async (id) => { await updateDoc(doc(db, 'agendamentos', id), { status: 'confirmado' }); showNotify('Agendamento confirmado!'); };
  const cancelar = async (id) => { await updateDoc(doc(db, 'agendamentos', id), { status: 'cancelado' }); showNotify('Agendamento cancelado.'); };

  const uploadImagem = async (servicoId, tipo, file, indexCarrossel = null) => {
    const key = tipo === 'principal' ? `${servicoId}-principal` : `${servicoId}-carrossel-${indexCarrossel}`;
    setUploadingKey(key);
    try {
      await salvarFotoServico(servicoId, tipo, file, indexCarrossel);
      showNotify('🖼️ Imagem atualizada e já está no site!');
    } catch (e) { showNotify('Erro ao fazer upload.'); }
    setUploadingKey(null);
  };

  const listaFiltrada = () => {
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    if (filtro === 'hoje') return agendamentos.filter(a => a.data === today);
    if (filtro === 'semana') return agendamentos.filter(a => a.data >= today && a.data <= weekEnd);
    return agendamentos;
  };

  const faturamentoDia = agendamentos.filter(a => a.data === today && a.status !== 'cancelado').reduce((s, a) => s + Number(a.valor || 0), 0);
  const faturamentoMes = agendamentos.filter(a => a.data?.startsWith(today.slice(0, 7)) && a.status !== 'cancelado').reduce((s, a) => s + Number(a.valor || 0), 0);
  const mediaAvaliacao = avaliacoes.length ? (avaliacoes.reduce((s, a) => s + (a.nota || 0), 0) / avaliacoes.length).toFixed(1) : '—';
  const horarioMaisPopular = () => {
    const contagem = {};
    agendamentos.forEach(a => { contagem[a.hora] = (contagem[a.hora] || 0) + 1; });
    return Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  };

  if (!user) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}><div className="loader" /></div>;

  const tabIcons = {
    dashboard: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    agendamentos: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    galeria: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    avaliacoes: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    plano: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  };
  const tabs = [
    ['dashboard', 'Dashboard'],
    ['agendamentos', 'Agendamentos'],
    ['galeria', 'Galeria'],
    ['avaliacoes', 'Avaliações'],
    ['plano', 'Plano'],
  ];

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-alt)', paddingTop:'80px' }}>
      {notify && <div className="notify-badge">{notify}</div>}

      {/* Nav */}
      <header style={{ position:'fixed', top:0, width:'100%', zIndex:1000, background:'rgba(255,255,255,0.94)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(0,0,0,0.05)', padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <a href="/" style={{ fontFamily:'Playfair Display,serif', fontSize:'1.4rem', fontWeight:900, color:'#ff8da1', textDecoration:'none' }}>Lety Harley</a>
          <span style={{ background:'linear-gradient(90deg,#ffb6c1,#ff8da1)', color:'#fff', fontSize:'0.7rem', fontWeight:700, padding:'3px 10px', borderRadius:'20px', display:'inline-flex', alignItems:'center', gap:'4px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M2 20l3-9 7 4 7-4 3 9H2zm10-20l3 6H9l3-6z"/></svg>
            ADMIN
          </span>
        </div>
        <button onClick={() => signOut(auth).then(() => router.push('/login'))} style={{ background:'none', border:'2px solid #ffe4e1', color:'#ff8da1', padding:'7px 14px', borderRadius:'100px', fontWeight:700, cursor:'pointer', fontSize:'0.8rem' }}>Sair</button>
      </header>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'20px' }}>
        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'24px', flexWrap:'wrap' }}>
          {tabs.map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} className={`admin-tab ${tab === t ? 'active' : ''}`} style={{ display:'flex', alignItems:'center', gap:'6px' }}>{tabIcons[t]}{label}</button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div>
            <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'2rem', marginBottom:'20px' }}>Olá, Lety!</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'16px', marginBottom:'28px' }}>
              {[
                { label:'Hoje', val:`R$ ${faturamentoDia},00`, icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff8da1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, sub:'faturamento' },
                { label:'Este mês', val:`R$ ${faturamentoMes},00`, icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff8da1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>, sub:'faturamento' },
                { label:'Agend. hoje', val: agendamentos.filter(a=>a.data===today).length, icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff8da1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/></svg>, sub:'agendamentos' },
                { label:'Horário popular', val: horarioMaisPopular(), icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff8da1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, sub:'mais agendado' },
                { label:'Avaliação média', val: mediaAvaliacao, icon:<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff8da1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, sub:`${avaliacoes.length} avaliações` },
              ].map((c, i) => (
                <div key={i} style={{ background:'#fff', borderRadius:'18px', padding:'20px', boxShadow:'var(--shadow)', borderTop:'3px solid #ff8da1' }}>
                  <div style={{ marginBottom:'8px' }}>{c.icon}</div>
                  <div style={{ fontSize:'1.3rem', fontWeight:800, color:'#ff8da1' }}>{c.val}</div>
                  <div style={{ fontSize:'0.75rem', color:'#86868b', marginTop:'4px' }}>{c.label} · {c.sub}</div>
                </div>
              ))}
            </div>

            {/* Próximos agendamentos */}
            <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Próximos agendamentos</h3>
            {agendamentos.filter(a => a.data >= today && a.status !== 'cancelado').slice(0, 5).map(a => (
              <CardAgendamento key={a.id} a={a} onConfirmar={confirmar} onCancelar={cancelar} />
            ))}
          </div>
        )}

        {/* AGENDAMENTOS */}
        {tab === 'agendamentos' && (
          <div>
            <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
              {[['hoje','Hoje'],['semana','Esta Semana'],['todos','Todos']].map(([f,l]) => (
                <button key={f} onClick={() => setFiltro(f)} className={`admin-tab ${filtro===f?'active':''}`}>{l}</button>
              ))}
            </div>
            {listaFiltrada().length === 0
              ? <div style={{ background:'#fff', borderRadius:'var(--radius)', padding:'40px', textAlign:'center', color:'#86868b' }}>Nenhum agendamento</div>
              : listaFiltrada().map(a => <CardAgendamento key={a.id} a={a} onConfirmar={confirmar} onCancelar={cancelar} />)
            }
          </div>
        )}

        {/* GALERIA */}
        {tab === 'galeria' && (
          <div>
            <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.8rem', marginBottom:'8px' }}>Galeria de Serviços</h2>
            <p style={{ color:'#86868b', fontSize:'0.85rem', marginBottom:'28px' }}>Troque a foto principal do card e as 3 fotos do carrossel (que aparecem ao segurar o dedo). As mudanças aparecem no site na hora.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
              {servicosComFotos.map((s, idx) => (
                <div key={s.id} style={{ background:'#fff', borderRadius:'20px', padding:'20px', boxShadow:'var(--shadow)' }}>
                  <p style={{ fontWeight:700, fontSize:'1rem', marginBottom:'4px' }}>{s.name}</p>
                  <p style={{ color:'#bbb', fontSize:'0.75rem', marginBottom:'16px' }}>R$ {defaultServices[idx].price},00</p>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'12px' }}>
                    {/* Foto principal */}
                    <FotoSlot
                      label="Foto principal"
                      sublabel="Card do site"
                      url={s.image}
                      loading={uploadingKey === `${s.id}-principal`}
                      onUpload={file => uploadImagem(s.id, 'principal', file)}
                      destaque
                    />
                    {/* 3 fotos do carrossel */}
                    {[0,1,2].map(i => (
                      <FotoSlot
                        key={i}
                        label={`Carrossel ${i+1}`}
                        sublabel="Segurar o dedo"
                        url={s.carouselImgs[i]}
                        loading={uploadingKey === `${s.id}-carrossel-${i}`}
                        onUpload={file => uploadImagem(s.id, 'carrossel', file, i)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AVALIAÇÕES */}
        {tab === 'avaliacoes' && (
          <div>
            <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.8rem', marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px' }}>
              Avaliações
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#ff8da1" stroke="#ff8da1" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span style={{ fontSize:'1.2rem', color:'#ff8da1' }}>{mediaAvaliacao}</span>
            </h2>
            {avaliacoes.length === 0
              ? <div style={{ background:'#fff', borderRadius:'var(--radius)', padding:'40px', textAlign:'center', color:'#86868b' }}>Nenhuma avaliação ainda</div>
              : avaliacoes.map(av => (
                <div key={av.id} style={{ background:'#fff', borderRadius:'16px', padding:'18px', marginBottom:'12px', boxShadow:'var(--shadow)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                    <p style={{ fontWeight:700 }}>{av.clienteNome}</p>
                    <div style={{ display:'flex', gap:'2px' }}>
                      {Array.from({length: av.nota || 0}).map((_,i) => (
                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#ff8da1" stroke="#ff8da1" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      ))}
                    </div>
                  </div>
                  <p style={{ color:'#86868b', fontSize:'0.85rem' }}>{av.comentario}</p>
                  <p style={{ color:'#bbb', fontSize:'0.75rem', marginTop:'6px' }}>{av.servico} · {av.dataBr}</p>
                </div>
              ))
            }
          </div>
        )}

        {/* PLANO */}
        {tab === 'plano' && (
          <div style={{ maxWidth:480, margin:'0 auto' }}>
            <div style={{ background:'#fff', borderRadius:'var(--radius)', padding:'32px', boxShadow:'var(--shadow)', textAlign:'center' }}>
              <div style={{ marginBottom:"12px" }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff8da1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
              <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.8rem', marginBottom:'8px' }}>Plano Mensal</h2>
              <div style={{ fontSize:'2.5rem', fontWeight:900, color:'#ff8da1', margin:'16px 0' }}>R$ 120<span style={{ fontSize:'1rem', color:'#86868b' }}>/mês</span></div>
              <div style={{ background: planoAtivo ? '#d1fae5' : '#fee2e2', color: planoAtivo ? '#065f46' : '#991b1b', padding:'10px 20px', borderRadius:'100px', fontWeight:700, fontSize:'0.85rem', display:'inline-block', marginBottom:'20px' }}>
                {planoAtivo ? 'Plano ativo' : 'Plano vencido'}
              </div>
              <p style={{ color:'#86868b', fontSize:'0.85rem', marginBottom:'24px', lineHeight:1.6 }}>Próxima renovação: <strong>16/07/2025</strong></p>
              <div style={{ background:'#fff9fa', borderRadius:'16px', padding:'20px', border:'2px dashed #ffb6c1', marginBottom:'20px' }}>
                <p style={{ fontWeight:700, marginBottom:'8px' }}>Pagar via Pix</p>
                <p style={{ color:'#86868b', fontSize:'0.82rem', marginBottom:'4px' }}>Chave Pix MelquiDev:</p>
                <p style={{ fontWeight:800, color:'#ff8da1', fontSize:'1rem' }}>silvakrozz2@gmail.com</p>
                <p style={{ color:'#bbb', fontSize:'0.75rem', marginTop:'8px' }}>Após o pagamento, o plano é renovado em até 1h</p>
              </div>
              <a href={`https://wa.me/554196824913?text=${encodeURIComponent('Olá MelquiDev! Quero renovar meu plano mensal.')}`} target="_blank" style={{ display:'block', background:'#25d366', color:'#fff', padding:'14px', borderRadius:'14px', textDecoration:'none', fontWeight:700, fontSize:'0.92rem' }}>
                Falar com MelquiDev
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Footer MelquiDev */}
      <footer style={{ textAlign:'center', padding:'30px', borderTop:'1px solid #ffe4e1', marginTop:'40px' }}>
        <a href="https://wa.me/554196824913" target="_blank" style={{ display:'inline-flex' }}>
          <div style={{ background:'#fff5f8', border:'1px solid #ffe4e1', borderRadius:'14px', padding:'9px 20px', opacity:0.6 }}>
            <img src="/melquidev-logo.png" alt="MelquiDev" style={{ height:24 }} />
          </div>
        </a>
      </footer>
    </div>
  );
}

function CardAgendamento({ a, onConfirmar, onCancelar }) {
  return (
    <div style={{ background:'#fff', borderRadius:'16px', padding:'18px', marginBottom:'12px', boxShadow:'var(--shadow)', borderLeft:'4px solid #ff8da1', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
      <div>
        <p style={{ fontWeight:700, marginBottom:'3px' }}>{a.clienteNome}</p>
        <p style={{ color:'#86868b', fontSize:'0.82rem' }}>{a.servico} · R$ {a.valor},00</p>
        <a href={`https://wa.me/55${(a.telefone||'').replace(/\D/g,'')}` } target="_blank" style={{ color:'#25d366', fontSize:'0.78rem', fontWeight:700, textDecoration:'none' }}>{a.clienteEmail}</a>
        <span style={{ background: a.status==='confirmado'?'#d1fae5':a.status==='cancelado'?'#fee2e2':'#fef9c3', color:a.status==='confirmado'?'#065f46':a.status==='cancelado'?'#991b1b':'#854d0e', fontSize:'0.68rem', fontWeight:700, padding:'2px 9px', borderRadius:'20px', marginLeft:'8px' }}>
          {a.status==='confirmado'?'Confirmado':a.status==='cancelado'?'Cancelado':'Pendente'}
        </span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px' }}>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:'1.2rem', fontWeight:700, color:'#ff8da1' }}>{a.hora}</p>
          <p style={{ color:'#86868b', fontSize:'0.8rem' }}>{a.dataBr}</p>
        </div>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {a.status !== 'confirmado' && a.status !== 'cancelado' && (
              <button onClick={() => onConfirmar(a.id)} style={{ background:'#d1fae5', border:'none', color:'#065f46', padding:'7px 14px', borderRadius:'100px', fontWeight:700, cursor:'pointer', fontSize:'0.78rem' }}>✅ Confirmar</button>
            )}
            {a.status !== 'cancelado' && (
              <button onClick={() => onCancelar(a.id)} style={{ background:'#fee2e2', border:'none', color:'#991b1b', padding:'7px 14px', borderRadius:'100px', fontWeight:700, cursor:'pointer', fontSize:'0.78rem' }}>❌ Cancelar</button>
            )}
            {a.status === 'cancelado' && (
              <button onClick={() => onConfirmar(a.id)} style={{ background:'#d1fae5', border:'none', color:'#065f46', padding:'7px 14px', borderRadius:'100px', fontWeight:700, cursor:'pointer', fontSize:'0.78rem' }}>↩️ Reativar</button>
            )}
          </div>
      </div>
    </div>
  );
}

function FotoSlot({ label, sublabel, url, loading, onUpload, destaque }) {
  return (
    <div style={{ background: destaque ? '#fff5f8' : '#fafafa', borderRadius:'14px', overflow:'hidden', border: destaque ? '2px solid #ffb6c1' : '1px solid #eee' }}>
      <div style={{ height:100, position:'relative', background:'#f0f0f0' }}>
        {url ? (
          <img src={url} alt={label} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc', fontSize:'0.7rem' }}>Sem foto</div>
        )}
        {loading && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div className="loader" style={{ width:24, height:24 }} />
          </div>
        )}
      </div>
      <div style={{ padding:'8px' }}>
        <p style={{ fontWeight:700, fontSize:'0.7rem', marginBottom:'1px' }}>{label}</p>
        <p style={{ color:'#bbb', fontSize:'0.62rem', marginBottom:'8px' }}>{sublabel}</p>
        <label style={{ display:'block', width:'100%', padding:'7px', borderRadius:'8px', background: destaque ? 'linear-gradient(90deg,#ffb6c1,#ff8da1)' : '#fff', border: destaque ? 'none' : '1px solid #ffb6c1', color: destaque ? '#fff' : '#ff8da1', fontWeight:700, fontSize:'0.68rem', textAlign:'center', cursor:'pointer' }}>
          📷 Trocar
          <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
        </label>
      </div>
    </div>
  );
}
