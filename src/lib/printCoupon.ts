import { CouponRecord } from "@/types/coupon";

export function printCoupon(coupon: CouponRecord) {
  const isPercent = coupon.type === "percent";
  const benefitText = isPercent
    ? `${coupon.value}% DE DESCONTO`
    : `R$${Number(coupon.value).toFixed(2).replace(".", ",")} DE DESCONTO`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Cupom ${coupon.code}</title>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 80mm;
      padding: 6mm 4mm;
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      line-height: 1.4;
    }
    .center { text-align: center; }
    .brand {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
    }
    .separator {
      border: none;
      border-top: 2px dashed #000;
      margin: 5mm 0;
    }
    .separator-thin {
      border: none;
      border-top: 1px solid #000;
      margin: 3mm 0;
    }
    .headline {
      font-size: 13px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 2px;
    }
    .benefit {
      font-size: 44px;
      font-weight: bold;
      text-align: center;
      line-height: 1.1;
      margin: 4mm 0;
      word-break: break-word;
    }
    .code-label {
      font-size: 11px;
      text-align: center;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .code-value {
      font-size: 22px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 4px;
      border: 2px solid #000;
      padding: 2mm 4mm;
      margin: 2mm auto;
      display: inline-block;
    }
    .code-wrap {
      text-align: center;
      margin: 2mm 0;
    }
    .instructions {
      font-size: 11px;
      text-align: center;
      line-height: 1.5;
      margin: 2mm 0;
    }
    #qrcode {
      display: flex;
      justify-content: center;
      margin: 4mm 0 1mm;
    }
    #qrcode canvas {
      display: block;
    }
    .qr-label {
      font-size: 11px;
      text-align: center;
      font-weight: bold;
    }
    @media print {
      body { width: 80mm; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <p class="brand">BASILICO PIZZAS</p>
  <p class="center" style="font-size:10px;letter-spacing:2px;">PIZZARIA ARTESANAL</p>

  <hr class="separator" />

  <p class="headline">*** PECA DIRETO E ECONOMIZE! ***</p>

  <hr class="separator-thin" />

  <p class="benefit">${benefitText}</p>

  <hr class="separator-thin" />

  <div class="code-wrap">
    <p class="code-label">USE O CUPOM:</p>
    <div>
      <span class="code-value">${coupon.code}</span>
    </div>
  </div>

  <p class="instructions">
    Peca pelo nosso delivery proprio<br/>
    e use este cupom no checkout
  </p>

  <hr class="separator" />

  <div id="qrcode"></div>
  <p class="qr-label">Aponte a camera e peca agora!</p>

  <hr class="separator" />

  <script>
    function generate() {
      if (typeof QRCode === "undefined") {
        setTimeout(generate, 100);
        return;
      }
      QRCode.toCanvas("https://basilicopizzas.com.br", {
        width: 180,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" }
      }, function(err, canvas) {
        if (!err) document.getElementById("qrcode").appendChild(canvas);
        window.focus();
        window.print();
      });
    }
    window.onload = generate;
  <\/script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=340,height=700");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
