# Como ativar/renovar o plano da Lety

Quando ela pagar o Pix, acesse o Firebase e siga:

## Pelo Firebase Console (mais fácil)

1. Acesse console.firebase.google.com
2. Projeto: lashiachat
3. Firestore Database
4. Coleção: `config`
5. Documento: `plano`
6. Edite os campos:

```
ativo: true
vencimento: "2025-07-16"   ← coloque a data de hoje + 30 dias
```

## Quando o plano vencer
- O site trava automaticamente com tela "em manutenção"
- Ela clica em "Falar com suporte" → cai no seu WhatsApp
- Você recebe o Pix → entra no Firebase → muda a data → site volta

## Calculando a data (+30 dias)
- Hoje: 16/06/2025 → vencimento: 2025-07-16
- Hoje: 01/07/2025 → vencimento: 2025-07-31

Formato sempre: AAAA-MM-DD

---
MelquiDev — silvakrozz2@gmail.com
