'use client';
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState('login'); // login | cadastro | reset
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  const googleLogin = async () => {
    setErro(''); setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push('/');
    } catch (e) { setErro('Erro ao entrar com Google.'); }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setErro(''); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.push('/');
    } catch (e) { setErro('Email ou senha incorretos.'); }
    setLoading(false);
  };

  const handleCadastro = async (e) => {
    e.preventDefault(); setErro(''); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(cred.user, { displayName: nome });
      router.push('/');
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') setErro('Email já cadastrado.');
      else if (e.code === 'auth/weak-password') setErro('Senha muito fraca. Mínimo 6 caracteres.');
      else setErro('Erro ao cadastrar.');
    }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault(); setErro(''); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSucesso('Email de redefinição enviado! Verifique sua caixa de entrada.');
    } catch (e) { setErro('Email não encontrado.'); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0a0e 0%, #3d1220 50%, #1a0a0e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden'
    }}>
      {/* Decoração de fundo */}
      <div style={{ position:'absolute', top:'-100px', right:'-100px', width:'400px', height:'400px', background:'rgba(255,182,193,0.08)', borderRadius:'50%', filter:'blur(60px)' }} />
      <div style={{ position:'absolute', bottom:'-100px', left:'-100px', width:'400px', height:'400px', background:'rgba(255,141,161,0.06)', borderRadius:'50%', filter:'blur(60px)' }} />

      <div style={{ width:'100%', maxWidth:'420px', position:'relative', zIndex:10 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontFamily:'Playfair Display, serif', fontSize:'2.2rem', fontWeight:900, color:'#ff8da1', marginBottom:'6px' }} style={{display:"flex",alignItems:"center",gap:"8px",justifyContent:"center"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="#ff8da1"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>Lety Harley</div>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.85rem' }}>Lashdesigner Profissional</p>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,0.07)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,182,193,0.2)', borderRadius:'28px', padding:'32px 28px', boxShadow:'0 30px 80px rgba(0,0,0,0.4)' }}>

          {/* Tabs */}
          {tab !== 'reset' && (
            <div style={{ display:'flex', gap:'8px', marginBottom:'28px', background:'rgba(0,0,0,0.2)', borderRadius:'14px', padding:'4px' }}>
              {['login','cadastro'].map(t => (
                <button key={t} onClick={() => { setTab(t); setErro(''); setSucesso(''); }} style={{
                  flex:1, padding:'10px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.85rem', transition:'0.3s',
                  background: tab === t ? '#ff8da1' : 'transparent',
                  color: tab === t ? '#fff' : 'rgba(255,255,255,0.5)'
                }}>
                  {t === 'login' ? 'Entrar' : 'Cadastrar'}
                </button>
              ))}
            </div>
          )}

          {/* Google */}
          {tab !== 'reset' && (
            <>
              <button onClick={googleLogin} disabled={loading} style={{
                width:'100%', padding:'14px', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.15)',
                background:'rgba(255,255,255,0.08)', color:'#fff', fontWeight:700, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', fontSize:'0.9rem', marginBottom:'20px', transition:'0.3s'
              }}>
                <img src="https://www.google.com/favicon.ico" width="18" alt="Google" />
                Continuar com Google
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
                <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.1)' }} />
                <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.75rem' }}>ou</span>
                <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.1)' }} />
              </div>
            </>
          )}

          {/* Form Login */}
          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
              <InputSenha label="Senha" value={senha} onChange={setSenha} show={showSenha} toggleShow={() => setShowSenha(!showSenha)} />
              {erro && <p style={{ color:'#ff6b8a', fontSize:'0.82rem', marginBottom:'12px', textAlign:'center' }}>{erro}</p>}
              <BtnSubmit loading={loading} label="Entrar" />
              <button type="button" onClick={() => { setTab('reset'); setErro(''); }} style={{ background:'none', border:'none', color:'rgba(255,182,193,0.6)', fontSize:'0.8rem', cursor:'pointer', width:'100%', marginTop:'12px', textAlign:'center' }}>
                Esqueci minha senha
              </button>
            </form>
          )}

          {/* Form Cadastro */}
          {tab === 'cadastro' && (
            <form onSubmit={handleCadastro}>
              <Input label="Nome completo" type="text" value={nome} onChange={setNome} placeholder="Seu nome" />
              <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
              <Input label="WhatsApp" type="tel" value={telefone} onChange={setTelefone} placeholder="(41) 99999-9999" />
              <InputSenha label="Senha" value={senha} onChange={setSenha} show={showSenha} toggleShow={() => setShowSenha(!showSenha)} />
              {erro && <p style={{ color:'#ff6b8a', fontSize:'0.82rem', marginBottom:'12px', textAlign:'center' }}>{erro}</p>}
              <BtnSubmit loading={loading} label="Criar conta" />
            </form>
          )}

          {/* Reset Senha */}
          {tab === 'reset' && (
            <form onSubmit={handleReset}>
              <h3 style={{ color:'#fff', fontFamily:'Playfair Display,serif', fontSize:'1.3rem', marginBottom:'8px' }}>Redefinir senha</h3>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.82rem', marginBottom:'20px' }}>Enviaremos um link para seu email.</p>
              <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
              {erro && <p style={{ color:'#ff6b8a', fontSize:'0.82rem', marginBottom:'12px', textAlign:'center' }}>{erro}</p>}
              {sucesso && <p style={{ color:'#4ade80', fontSize:'0.82rem', marginBottom:'12px', textAlign:'center' }}>{sucesso}</p>}
              <BtnSubmit loading={loading} label="Enviar link" />
              <button type="button" onClick={() => { setTab('login'); setErro(''); setSucesso(''); }} style={{ background:'none', border:'none', color:'rgba(255,182,193,0.6)', fontSize:'0.8rem', cursor:'pointer', width:'100%', marginTop:'12px', textAlign:'center' }}>
                ← Voltar ao login
              </button>
            </form>
          )}
        </div>

          <div style={{ textAlign:'center', marginTop:'24px', display:'flex', justifyContent:'center' }}>
            <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,182,193,0.15)', borderRadius:'12px', padding:'7px 14px', opacity:0.5 }}>
              <img src="/melquidev-logo.png" alt="MelquiDev" style={{ height:16, filter:'invert(1)' }} />
            </div>
          </div>
      </div>
    </div>
  );
}

function Input({ label, type, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom:'16px' }}>
      <label style={{ display:'block', color:'rgba(255,255,255,0.6)', fontSize:'0.75rem', fontWeight:700, marginBottom:'6px', textTransform:'uppercase' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required style={{
        width:'100%', padding:'13px 16px', borderRadius:'12px', border:'1px solid rgba(255,182,193,0.2)',
        background:'rgba(255,255,255,0.06)', color:'#fff', outline:'none', fontSize:'0.92rem'
      }} />
    </div>
  );
}

function InputSenha({ label, value, onChange, show, toggleShow }) {
  return (
    <div style={{ marginBottom:'16px' }}>
      <label style={{ display:'block', color:'rgba(255,255,255,0.6)', fontSize:'0.75rem', fontWeight:700, marginBottom:'6px', textTransform:'uppercase' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder="••••••" required minLength={6} style={{
          width:'100%', padding:'13px 46px 13px 16px', borderRadius:'12px', border:'1px solid rgba(255,182,193,0.2)',
          background:'rgba(255,255,255,0.06)', color:'#fff', outline:'none', fontSize:'0.92rem'
        }} />
        <button type="button" onClick={toggleShow} style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'0.85rem' }}>
          {show ? '●' : '○'}
        </button>
      </div>
    </div>
  );
}

function BtnSubmit({ loading, label }) {
  return (
    <button type="submit" disabled={loading} style={{
      width:'100%', padding:'15px', borderRadius:'14px', border:'none',
      background:'linear-gradient(90deg, #ffb6c1, #ff8da1)', color:'#fff',
      fontWeight:900, fontSize:'0.95rem', cursor:'pointer', transition:'0.3s',
      opacity: loading ? 0.7 : 1
    }}>
      {loading ? 'Aguarde...' : label}
    </button>
  );
}
