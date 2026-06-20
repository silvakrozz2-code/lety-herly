'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { calcularDiasRestantes, MELQUIDEV_WA, PLANO_VALOR } from '@/lib/plano';
import Image from 'next/image';

export default function PlanoGuard({ children }) {
  const [status, setStatus] = useState('loading'); // loading | ativo | vencido

  useEffect(() => {
    verificarPlano();
  }, []);

  const verificarPlano = async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'plano'));
      if (!snap.exists()) { setStatus('vencido'); return; }
      const { vencimento, ativo } = snap.data();
      if (!ativo) { setStatus('vencido'); return; }
      const dias = calcularDiasRestantes(vencimento);
      setStatus(dias > 0 ? 'ativo' : 'vencido');
    } catch (e) {
      // Em caso de erro de conexão, deixa passar
      setStatus('ativo');
    }
  };

  if (status === 'loading') return null;

  if (status === 'vencido') {
    const msg = `Olá! Preciso renovar o plano do meu site. Valor: R$ ${PLANO_VALOR},00`;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'linear-gradient(160deg, #2a0e18 0%, #1a0a0e 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', textAlign: 'center'
      }}>
        <div style={{ maxWidth: 380 }}>
          {/* Cadeado fofo com coração */}
          <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 20px' }}>
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 56, height: 56, borderRadius: '50% 50% 0 0',
              border: '10px solid #ffb6c1', borderBottom: 'none'
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: 100, height: 64, borderRadius: 22,
              background: 'linear-gradient(160deg, #ffc6d3, #ff8da1)',
              boxShadow: '0 12px 30px rgba(255,141,161,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
          </div>

          

          <h2 style={{ fontFamily: 'Playfair Display,serif', color: '#ffb6c1', fontSize: '1.7rem', fontWeight: 900, marginBottom: '10px' }}>
            Site em manutenção
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '4px' }}>
            Em breve estaremos de volta com novidades.
          </p>
          <p style={{ color: 'rgba(255,182,193,0.6)', fontSize: '0.85rem', marginBottom: '30px' }}>
            Obrigada pela compreensão
          </p>

          <a
            href={`https://wa.me/${MELQUIDEV_WA}?text=${encodeURIComponent(msg)}`}
            target="_blank"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(90deg,#ffb6c1,#ff8da1)', color: '#fff',
              padding: '15px 32px', borderRadius: '100px', textDecoration: 'none',
              fontWeight: 700, fontSize: '0.92rem',
              boxShadow: '0 10px 30px rgba(255,141,161,0.4)'
            }}
          >
            Falar com suporte
          </a>

          <div style={{ marginTop: '28px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,182,193,0.15)', borderRadius:'12px', padding:'7px 16px', display:'flex', alignItems:'center', gap:'8px', opacity:0.4 }}>
              <img src="/melquidev-logo.png" alt="MD" style={{ height: 15, filter: 'invert(1)' }} />
              <span style={{ color:'#fff', fontSize:'0.62rem', letterSpacing:'0.12em', fontWeight:500 }}>SOLUÇÕES WEB</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
