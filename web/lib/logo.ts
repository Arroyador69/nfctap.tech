export const LOGO_MASK = 40;

export function prepareLogo(file: File): Promise<{ dataUrl: string; mask: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 420;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo leer el logo"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = LOGO_MASK;
      maskCanvas.height = LOGO_MASK;
      const mx = maskCanvas.getContext("2d");
      if (!mx) {
        reject(new Error("No se pudo leer el logo"));
        return;
      }
      mx.fillStyle = "#fff";
      mx.fillRect(0, 0, LOGO_MASK, LOGO_MASK);
      mx.drawImage(img, 0, 0, LOGO_MASK, LOGO_MASK);
      const data = mx.getImageData(0, 0, LOGO_MASK, LOGO_MASK).data;
      let mask = "";
      for (let i = 0; i < data.length; i += 4) {
        const g = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        mask += g < 200 && data[i + 3] > 40 ? "1" : "0";
      }
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.82), mask });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("El archivo no es una imagen válida"));
    };
    img.src = url;
  });
}

export function resizeLogo(file: File) {
  return prepareLogo(file).then((r) => r.dataUrl);
}

export function isReviewUrl(value: string) {
  const t = value.trim();
  if (!/^https?:\/\/\S+/i.test(t)) return false;
  return /g\.page|google\.|goo\.gl|maps\.app/i.test(t);
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isPhone(value: string) {
  return value.replace(/\D/g, "").length >= 9;
}

export function isPostalCode(value: string) {
  return /^\d{5}$/.test(value.trim());
}
