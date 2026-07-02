import { CouponRecord } from "@/types/coupon";

export async function printCoupon(coupon: CouponRecord) {
  const isPercent = coupon.type === "percent";
  const benefitText = isPercent
    ? `${coupon.value}% DE DESCONTO`
    : `R$${Number(coupon.value).toFixed(2).replace(".", ",")} DE DESCONTO`;

  const validadeText = coupon.valid_until
    ? `Valido ate ${new Date(coupon.valid_until).toLocaleDateString("pt-BR")}`
    : "Sem validade";

  const usosText = coupon.max_uses_per_customer
    ? `Valido ${coupon.max_uses_per_customer}x por cliente`
    : "Uso ilimitado";

  // Gera o QR server-side via API route (qrcode é pacote Node.js)
  const res = await fetch("/api/admin/qr?url=https%3A%2F%2Fbasilicopizzas.com.br");
  const { dataUrl: qrDataUrl } = await res.json();
  console.log("[printCoupon] QR data URL gerado, length:", qrDataUrl?.length, "prefix:", qrDataUrl?.slice(0, 40));

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Cupom ${coupon.code}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 80mm;
      max-width: 80mm;
      padding: 5mm 4mm 8mm;
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      line-height: 1.45;
    }
    .brand {
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
    }
    .sub {
      font-size: 10px;
      text-align: center;
      letter-spacing: 3px;
    }
    hr {
      border: none;
      border-top: 2px dashed #000;
      margin: 4mm 0;
    }
    hr.solid {
      border-top: 1px solid #000;
      margin: 3mm 0;
    }
    .headline {
      font-size: 13px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 2px;
    }
    .tagline {
      font-size: 10px;
      text-align: center;
      margin-top: 1mm;
    }
    .benefit {
      font-size: 52px;
      font-weight: bold;
      text-align: center;
      line-height: 1.05;
      margin: 3mm 0;
      word-break: break-word;
      letter-spacing: -1px;
    }
    .meta {
      font-size: 10px;
      text-align: center;
      margin: 1mm 0;
    }
    .code-section {
      text-align: center;
      margin: 3mm 0;
    }
    .code-label {
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .code-box {
      display: inline-block;
      border: 3px solid #000;
      padding: 2mm 5mm;
      margin-top: 1.5mm;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 5px;
    }
    .instructions {
      font-size: 10px;
      text-align: center;
      margin: 2mm 0;
      line-height: 1.5;
    }
    .qr-wrap {
      text-align: center;
      margin: 3mm 0 1.5mm;
    }
    .qr-wrap img {
      display: inline-block;
      width: 200px;
      height: 200px;
      image-rendering: pixelated;
    }
    .qr-label {
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 2mm;
    }
    .marketing { font-size: 11px; }
    .marketing p { margin: 1mm 0; }
    .marketing-title {
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
      margin-bottom: 2mm;
    }
    @media print {
      body { width: 80mm; max-width: 80mm; }
    }
  </style>
</head>
<body>

  <p class="brand">BASILICO PIZZAS</p>
  <p class="sub">PIZZARIA ARTESANAL</p>

  <hr />

  <p class="headline">*** PECA DIRETO E ECONOMIZE! ***</p>
  <p class="tagline">Economize mais pedindo direto pelo nosso site!</p>

  <hr />

  <p class="benefit">${benefitText}</p>

  <hr class="solid" />

  <p class="meta">${validadeText}</p>
  <p class="meta">${usosText}</p>

  <hr class="solid" />

  <div class="code-section">
    <p class="code-label">USE O CUPOM:</p>
    <div><span class="code-box">${coupon.code}</span></div>
  </div>

  <p class="instructions">
    Peca pelo nosso delivery proprio<br/>
    e use este cupom no checkout
  </p>

  <hr />

  <div class="qr-wrap">
    <img src="${qrDataUrl}" alt="QR Code basilicopizzas.com.br" />
  </div>
  <p class="qr-label">Aponte a camera e peca agora!</p>

  <hr />

  <p class="marketing-title">POR QUE PEDIR DIRETO?</p>
  <div class="marketing">
    <p>+ Cupons e promocoes exclusivos</p>
    <p>+ Sem taxas de intermediarios</p>
    <p>+ Atendimento direto com a gente</p>
    <p>+ Promocoes que so existem aqui</p>
    <p>+ Mais rapido e sem complicacao</p>
  </div>

  <hr />

  <script>
    window.onload = function() { window.focus(); window.print(); };
  <\/script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=340,height=800");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
