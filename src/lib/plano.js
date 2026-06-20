export const MELQUIDEV_WA = "554196824913";
export const PLANO_DIAS = 30;
export const PLANO_VALOR = 120;
export const PLANO_PIX = "silvakrozz2@gmail.com";

export function calcularDiasRestantes(dataVencimento) {
  if (!dataVencimento) return 0;
  const venc = new Date(dataVencimento);
  const hoje = new Date();
  return Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
}

export function formatarData(iso) {
  if (!iso) return '—';
  return iso.split('-').reverse().join('/');
}
