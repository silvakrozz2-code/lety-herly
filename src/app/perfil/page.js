'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { updateProfile, updatePassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [agendamentos, setAgendamentos] = useState([]);
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('perfil');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
      setNome(u.displayName || '');
      buscarAgendamentos(u.email);
    });
    return () => unsub();
  }, []);

  const buscarAgendamentos = async (email) => {
    try {
      const snap = await getDocs(query(collection(db, 'agendamentos'), where('clienteEmail', '==', email)));
      const lista = [];
      snap.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));
      lista.sort((a, b) => b.data.localeCompare(a.data));
      setAgendamentos(lista);
    } catch (e) {}
  };

  const salvarPerfil = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: nome });
      setSucesso('Perfil atualizado!');
      setTimeout(() => setSucesso(''), 3000);
    } catch (e) { setSucesso('Erro ao salvar.'); }
    setLoading(false);
  };

  const resetSenha = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSucesso('Email de redefinição enviado!');
      setTimeout(() => setSucesso(''), 4000);
    } catch (e) {}
  };

  const sair = async () => { await signOut(auth); router.push('/login'); };

  if (!user) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}><div className="loader" /></div>;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-alt)', paddingTop:'80px' }}>
      {/* Nav */}
      <header style={{ position:'fixed', top:0, width:'100%', zIndex:1000, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(0,0,0,0.05)', padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <a href="/" style={{ fontFamily:'Playfair Display,serif', fontSize:'1.4rem', fontWeight:900, color:'#ff8da1', textDecoration:'none' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="#ff8da1" style={{marginRight:"6px"}}><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>Lety Harley</a>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <img src={user.photoURL || ''} style={{ width:34, height:34, borderRadius:'50%', border:'2px solid #ffb6c1' }} alt="" />
          <button onClick={sair} style={{ background:'none', border:'2px solid #ffe4e1', color:'#ff8da1', padding:'7px 14px', borderRadius:'100px', fontWeight:700, cursor:'pointer', fontSize:'0.8rem' }}>Sair</button>
        </div>
      </header>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'20px 20px 40px' }}>
        {/* Avatar */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ width:90, height:90, borderRadius:'50%', background:'linear-gradient(135deg,#ffb6c1,#ff8da1)', margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', border:'4px solid #fff', boxShadow:'0 8px 24px rgba(255,182,193,0.3)', overflow:'hidden' }}>
            {user.photoURL ? <img src={user.photoURL} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : '👤'}
          </div>
          <h2 style={{ fontFamily:'Playfair Display,serif', fontSize:'1.5rem', fontWeight:900 }}>{user.displayName || 'Usuária'}</h2>
          <p style={{ color:'#86868b', fontSize:'0.85rem' }}>{user.email}</p>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'24px', background:'#fff', borderRadius:'16px', padding:'4px', boxShadow:'var(--shadow)' }}>
          {[['perfil','Perfil'],['historico','Histórico']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'11px', borderRadius:'12px', border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.85rem', transition:'0.3s', background: tab===t ? '#ff8da1' : 'transparent', color: tab===t ? '#fff' : '#86868b' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Perfil */}
        {tab === 'perfil' && (
          <div style={{ background:'#fff', borderRadius:'var(--radius)', padding:'28px', boxShadow:'var(--shadow)' }}>
            <h3 style={{ fontWeight:700, marginBottom:'20px' }}>Meus dados</h3>
            <form onSubmit={salvarPerfil}>
              <Campo label="Nome" value={nome} onChange={setNome} type="text" />
              <Campo label="Email" value={user.email} onChange={() => {}} type="email" disabled />
              <Campo label="WhatsApp" value={telefone} onChange={setTelefone} type="tel" placeholder="(41) 99999-9999" />
              {sucesso && <p style={{ color:'#4ade80', fontSize:'0.85rem', marginBottom:'12px', fontWeight:600 }}>{sucesso}</p>}
              <button type="submit" disabled={loading} style={{ width:'100%', padding:'15px', borderRadius:'14px', border:'none', background:'linear-gradient(90deg,#ffb6c1,#ff8da1)', color:'#fff', fontWeight:900, cursor:'pointer', marginBottom:'12px' }}>
                {loading ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </form>
            <button onClick={resetSenha} style={{ width:'100%', padding:'13px', borderRadius:'14px', border:'2px solid #ffe4e1', background:'none', color:'#ff8da1', fontWeight:700, cursor:'pointer' }}>
              Redefinir senha
            </button>
          </div>
        )}

        {/* Histórico */}
        {tab === 'historico' && (
          <div>
            <h3 style={{ fontWeight:700, marginBottom:'16px' }}>Meus agendamentos</h3>
            {agendamentos.length === 0
              ? <div style={{ background:'#fff', borderRadius:'var(--radius)', padding:'40px', textAlign:'center', color:'#86868b', boxShadow:'var(--shadow)' }}>📭 Nenhum agendamento ainda</div>
              : agendamentos.map(a => (
                <div key={a.id} style={{ background:'#fff', borderRadius:'18px', padding:'18px', marginBottom:'12px', boxShadow:'var(--shadow)', borderLeft:'4px solid #ff8da1', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ fontWeight:700, marginBottom:'4px' }}>{a.servico}</p>
                    <p style={{ color:'#86868b', fontSize:'0.82rem' }}>R$ {a.valor},00</p>
                    <span style={{ background: a.status === 'confirmado' ? '#d1fae5' : a.status === 'cancelado' ? '#fee2e2' : '#fef9c3', color: a.status === 'confirmado' ? '#065f46' : a.status === 'cancelado' ? '#991b1b' : '#854d0e', fontSize:'0.7rem', fontWeight:700, padding:'3px 10px', borderRadius:'20px', marginTop:'6px', display:'inline-block' }}>
                      {a.status === 'confirmado' ? 'Confirmado' : a.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                    </span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:'1.2rem', fontWeight:700, color:'#ff8da1' }}>{a.hora}</p>
                    <p style={{ color:'#86868b', fontSize:'0.8rem' }}>{a.dataBr}</p>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, type, disabled, placeholder }) {
  return (
    <div style={{ marginBottom:'16px' }}>
      <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#ff8da1', marginBottom:'5px', textTransform:'uppercase' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} style={{ width:'100%', padding:'12px', border:'2px solid #ffe4e1', borderRadius:'12px', background: disabled ? '#f5f5f5' : 'var(--bg-alt)', outline:'none', fontSize:'0.92rem', color: disabled ? '#999' : '#1d1d1f' }} />
    </div>
  );
}
