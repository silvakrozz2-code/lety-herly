import { db } from './firebase';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';

// Cada foto vira um documento próprio em fotos/{servicoId}_principal ou fotos/{servicoId}_carrossel_{i}
// Assim cada uma tem seu próprio limite de 1MB do Firestore, sem risco de estourar somando todas.

const MAX_SIZE = 1200; // px
const QUALITY = 0.75;

function comprimirImagem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = QUALITY;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Se ainda estiver perto do limite (1MB = ~1.398.000 chars em base64), reduz a qualidade
        while (dataUrl.length > 1300000 && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function docId(servicoId, tipo, indexCarrossel) {
  return tipo === 'principal' ? `${servicoId}_principal` : `${servicoId}_carrossel_${indexCarrossel}`;
}

export async function buscarFotosCustomizadas() {
  // Não usado mais para escrita em lote, mantido para compatibilidade
  return {};
}

export function ouvirFotosCustomizadas(callback) {
  return onSnapshot(collection(db, 'fotos'), (snap) => {
    const out = {};
    snap.forEach(d => {
      const data = d.data();
      const id = d.id; // ex: "1_principal" ou "1_carrossel_0"
      const match = id.match(/^(.+)_(principal|carrossel)(?:_(\d))?$/);
      if (!match) return;
      const [, servicoId, tipo, idx] = match;
      if (!out[servicoId]) out[servicoId] = { principal: null, carrossel: [null, null, null] };
      if (tipo === 'principal') out[servicoId].principal = data.url;
      else out[servicoId].carrossel[Number(idx)] = data.url;
    });
    callback(out);
  }, () => callback({}));
}

export async function salvarFotoServico(servicoId, tipo, file, indexCarrossel = null) {
  const base64 = await comprimirImagem(file);
  const id = docId(servicoId, tipo, indexCarrossel);
  await setDoc(doc(db, 'fotos', id), { url: base64, atualizadoEm: Date.now() });
  return base64;
}

// Aplica as fotos customizadas sobre a lista padrão de serviços
export function aplicarFotosCustomizadas(services, fotosCustom) {
  return services.map(s => {
    const custom = fotosCustom[s.id];
    if (!custom) return s;
    const image = custom.principal || s.image;
    const carouselImgs = s.carouselImgs.map((img, i) =>
      custom.carrossel && custom.carrossel[i] ? custom.carrossel[i] : img
    );
    return { ...s, image, carouselImgs };
  });
}
