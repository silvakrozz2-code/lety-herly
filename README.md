# Lety Harley Lashdesigner — by MelquiDev

## Como rodar localmente
```bash
npm install
npm run dev
```

## Como publicar no Vercel
1. Crie conta em vercel.com
2. Importe este projeto do GitHub ou faça upload da pasta
3. Clique em Deploy — pronto!

## Após publicar no Vercel
Adicione o domínio do Vercel no Firebase:
- Firebase Console → Authentication → Sign-in method → Domínios autorizados
- Adicione: seu-app.vercel.app

## Trocar o email admin
Em `src/lib/firebase.js`, altere:
```js
export const ADMIN_EMAIL = "email-da-lety@gmail.com";
```

## Estrutura
- `/src/app/page.js` — Página principal
- `/src/app/login/page.js` — Tela de login
- `/src/app/perfil/page.js` — Perfil do usuário
- `/src/app/admin/page.js` — Painel da Lety
- `/src/lib/firebase.js` — Configuração Firebase
- `/src/lib/services.js` — Serviços e preços

## Desenvolvido por MelquiDev
WhatsApp: (41) 99713-4896
