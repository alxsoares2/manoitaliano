import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendWhatsappText, SITE_URL } from "@/lib/zapi";
import { formatPhoneForWhatsapp } from "@/lib/whatsapp";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = "claude-sonnet-4-6";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min — sessão expira e reseta

type Message = { role: "user" | "assistant"; content: string };
type Session = {
  phone: string;
  state: Record<string, unknown>;
  messages: Message[];
  updated_at: string;
};

// ─── buscar/criar sessão ──────────────────────────────────────────
async function getSession(phone: string): Promise<Session> {
  const { data } = await supabaseAdmin
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone", phone)
    .single();

  if (data) {
    const elapsed = Date.now() - new Date(data.updated_at).getTime();
    if (elapsed > SESSION_TTL_MS) {
      // Sessão expirada — reseta
      await supabaseAdmin
        .from("whatsapp_sessions")
        .update({ state: {}, messages: [], updated_at: new Date().toISOString() })
        .eq("phone", phone);
      return { phone, state: {}, messages: [], updated_at: new Date().toISOString() };
    }
    return {
      phone,
      state: data.state as Record<string, unknown>,
      messages: (data.messages as Message[]) ?? [],
      updated_at: data.updated_at,
    };
  }

  // Nova sessão
  await supabaseAdmin.from("whatsapp_sessions").insert({ phone, state: {}, messages: [] });
  return { phone, state: {}, messages: [], updated_at: new Date().toISOString() };
}

async function saveSession(phone: string, state: Record<string, unknown>, messages: Message[]) {
  // Limita histórico a 40 mensagens para não estourar contexto
  const trimmed = messages.slice(-40);
  await supabaseAdmin
    .from("whatsapp_sessions")
    .upsert({ phone, state, messages: trimmed, updated_at: new Date().toISOString() }, { onConflict: "phone" });
}

// ─── buscar dados do cardápio ─────────────────────────────────────
async function getMenuSummary(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .select("name, category_id, price, price_media, price_grande, description, options, is_active, kind")
    .eq("is_active", true)
    .order("category_id")
    .order("sort_order");

  if (error) { console.error("[chatbot] getMenuSummary error:", error); return "Cardápio indisponível no momento."; }
  if (!data?.length) return "Cardápio indisponível no momento.";

  const catLabels: Record<string, string> = {
    "favoritas-da-casa": "Pizzas Favoritas da Casa",
    "classicas": "Pizzas Clássicas",
    "especiais": "Pizzas Especiais",
    "doces": "Pizzas Doces",
    "entradas": "Entradas",
    "bebidas": "Bebidas",
    "bordas": "Bordas Recheadas",
  };

  const grouped: Record<string, string[]> = {};
  for (const item of data) {
    const cat = catLabels[item.category_id] || item.category_id;
    if (!grouped[cat]) grouped[cat] = [];
    if (item.price_media && item.price_grande) {
      grouped[cat].push(`• ${item.name}: Média R$${Number(item.price_media).toFixed(2)} / Grande R$${Number(item.price_grande).toFixed(2)}${item.description ? ` — ${item.description}` : ""}`);
    } else if (item.options) {
      grouped[cat].push(`• ${item.name}: R$${Number(item.price).toFixed(2)} (opções: ${item.options})${item.description ? ` — ${item.description}` : ""}`);
    } else {
      grouped[cat].push(`• ${item.name}: R$${Number(item.price).toFixed(2)}${item.description ? ` — ${item.description}` : ""}`);
    }
  }

  return Object.entries(grouped).map(([cat, items]) => `📋 ${cat}:\n${items.join("\n")}`).join("\n\n");
}

// ─── buscar dados do cliente recorrente ───────────────────────────
async function getCustomerByPhone(phone: string): Promise<Record<string, unknown> | null> {
  const digits = phone.replace(/\D/g, "");
  const search = digits.startsWith("55") ? digits.slice(2) : digits;
  const { data } = await supabaseAdmin
    .from("customers")
    .select("*")
    .or(`phone.like.%${search}%`)
    .limit(1)
    .single();
  return data as Record<string, unknown> | null;
}

// ─── buscar frete ─────────────────────────────────────────────────
async function getDeliveryFee(neighborhood: string): Promise<{ fee: number; time: string } | null> {
  const normalized = neighborhood.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const { data } = await supabaseAdmin
    .from("delivery_zones")
    .select("delivery_fee, estimated_time, neighborhood")
    .eq("active", true);

  if (!data) return null;
  const match = data.find((z) => {
    const n = z.neighborhood.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    return n === normalized;
  });
  if (!match) return null;
  return { fee: Number(match.delivery_fee), time: match.estimated_time };
}

// ─── criar pedido ─────────────────────────────────────────────────
async function createOrder(orderData: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert(orderData)
    .select("id")
    .single();
  if (error) { console.error("[chatbot] createOrder error:", error); return null; }
  return data.id;
}

// ─── buscar bordas disponíveis ────────────────────────────────────
async function getBordasSummary(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("menu_items")
    .select("name, price")
    .eq("category_id", "bordas")
    .eq("is_active", true);
  if (!data?.length) return "Sem bordas disponíveis.";
  return data.map((b) => `• ${b.name}: R$${Number(b.price).toFixed(2)}`).join("\n");
}

// ─── system prompt ────────────────────────────────────────────────
function buildSystemPrompt(menu: string, bordas: string, customerInfo: string | null, isFirstMessage = false): string {
  const firstMessageInstruction = isFirstMessage
    ? `\nATENÇÃO: Esta é a PRIMEIRA mensagem do cliente. Independente do que ele escreveu, cumprimente-o calorosamente, apresente a Basílico Pizzas em 1-2 frases e IMEDIATAMENTE mostre as categorias do cardápio (só os nomes das categorias, sem listar todos os itens). Exemplo: "Temos Pizzas Clássicas, Favoritas da Casa, Especiais, Doces, Entradas e Bebidas. Qual categoria te interessa?"\n`
    : "";

  return `Você é o atendente virtual da Basílico Pizzas, uma pizzaria artesanal premium em João Pessoa/PB.
${firstMessageInstruction}
Seu tom é amigável, simpático e eficiente. Use emojis com moderação. Seja direto mas acolhedor.
Você está conversando via WhatsApp com um cliente.

REGRAS IMPORTANTES:
- Responda SEMPRE em português brasileiro
- NÃO use markdown. WhatsApp não renderiza markdown. Use texto simples com emojis para organizar.
- Mantenha respostas curtas (máximo 3-4 parágrafos por mensagem)
- Quebre em mensagens menores quando tiver muita informação
- Se o cliente pedir algo que não está no cardápio, informe educadamente
- Se o cliente quiser falar com humano, diga para ligar (83) 99322-8832 ou ir ao Instagram @basilicopizzas
- O endereço da loja é Av. Bananeiras, 190, Manaíra, João Pessoa/PB
- Horário: Seg-Qui 17h-22h, Sex-Dom 17h-23h

CARDÁPIO COMPLETO:
${menu}

BORDAS RECHEADAS DISPONÍVEIS:
${bordas}

${customerInfo ? `DADOS DO CLIENTE RECORRENTE:\n${customerInfo}\n` : ""}

FLUXO DE ATENDIMENTO (siga esta ordem, mas seja flexível se o cliente pular etapas):
1. Cumprimente e pergunte o que deseja
2. Quando pedir o cardápio, mostre as CATEGORIAS primeiro (Pizzas Salgadas, Pizzas Doces, Entradas, etc.)
3. Quando escolher categoria, mostre os itens COM PREÇOS
4. Quando escolher pizza, pergunte o tamanho (Média ou Grande)
5. Pergunte se quer meio a meio (só pizza). Se sim, mostre sabores da mesma categoria
6. Pergunte se quer borda recheada. Se sim, mostre opções e preços
7. Pergunte se quer adicionar mais pizzas
8. Pergunte se quer bebida (refrigerantes/água)
9. Pergunte se quer Pizza Nutella individual (sobremesa)
10. Mostre o RESUMO do pedido com todos os itens e valores
11. Pergunte o telefone do cliente (se ainda não tiver)
12. Se for cliente recorrente, confirme o endereço salvo. Se novo, peça CEP, número e complemento
13. Calcule o frete pelo bairro (informe ao cliente)
14. Mostre o TOTAL FINAL (itens + frete)
15. Pergunte forma de pagamento: PIX ou Cartão
16. Confirme o pedido e envie link de acompanhamento

QUANDO O PEDIDO FOR FINALIZADO:
Responda EXATAMENTE neste formato na última linha (o sistema vai extrair o JSON):
##ORDER_JSON##{"customer_name":"...","customer_phone":"...","address":"...","address_number":"...","neighborhood":"...","complement":"...","cep":"...","items":[{"name":"...","size":"Média ou Grande","borda":"nome da borda ou null","option":"sabor se for bebida ou null","qty":1,"unitPrice":0.00,"bordaPrice":0.00}],"subtotal":0.00,"delivery_fee":0.00,"total":0.00,"payment_method":"pix ou card","notes":"observações ou null"}##END_ORDER##

O unitPrice é o preço da pizza/item. O bordaPrice é o preço da borda (0 se sem borda).
Use o preço do tamanho escolhido (média ou grande).
Para meio a meio: cobre o valor da pizza MAIS CARA entre as duas metades.

IMPORTANTE: só emita o JSON quando tiver TODOS os dados: nome, endereço completo, itens, e confirmação do cliente.
Quando o cliente confirmar o pedido, inclua o JSON E a mensagem de confirmação.`;
}

// ─── chamar Claude ────────────────────────────────────────────────
async function callClaude(systemPrompt: string, messages: Message[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[chatbot] Claude API error:", res.status, err);
    return "Desculpe, estou com dificuldade técnica no momento. Tente novamente em instantes ou ligue (83) 99322-8832.";
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "Desculpe, não consegui processar sua mensagem.";
}

// ─── processar pedido do JSON ─────────────────────────────────────
async function processOrderFromResponse(response: string, phone: string): Promise<{ orderId: string; cleanResponse: string } | null> {
  const match = response.match(/##ORDER_JSON##([\s\S]*?)##END_ORDER##/);
  if (!match) return null;

  try {
    const order = JSON.parse(match[1].trim());
    const orderId = await createOrder({
      customer_name: order.customer_name,
      customer_phone: phone,
      address: order.address,
      address_number: order.address_number,
      neighborhood: order.neighborhood,
      complement: order.complement || null,
      cep: order.cep || null,
      items: order.items,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      total: order.total,
      payment_method: order.payment_method,
      notes: order.notes || null,
      status: "recebido",
    });

    if (!orderId) return null;

    // Upsert customer
    const digits = phone.replace(/\D/g, "");
    const cleanPhone = digits.startsWith("55") ? digits.slice(2) : digits;
    await supabaseAdmin.from("customers").upsert(
      {
        phone: cleanPhone,
        name: order.customer_name,
        address: order.address,
        number: order.address_number,
        neighborhood: order.neighborhood,
        complement: order.complement || null,
        cep: order.cep || null,
      },
      { onConflict: "phone" }
    );

    const cleanResponse = response.replace(/##ORDER_JSON##[\s\S]*?##END_ORDER##/, "").trim();
    return { orderId, cleanResponse };
  } catch (e) {
    console.error("[chatbot] Failed to parse order JSON:", e);
    return null;
  }
}

// ─── principal: processar mensagem ────────────────────────────────
export async function handleIncomingMessage(phone: string, text: string) {
  const session = await getSession(phone);

  // Adiciona mensagem do usuário
  session.messages.push({ role: "user", content: text });

  // Busca contexto
  const [menu, bordas, customer] = await Promise.all([
    getMenuSummary(),
    getBordasSummary(),
    getCustomerByPhone(phone),
  ]);

  // Busca frete se o cliente já informou bairro (estado da sessão)
  let freteInfo = "";
  const neighborhood = (session.state as Record<string, unknown>).neighborhood as string | undefined;
  if (neighborhood) {
    const frete = await getDeliveryFee(neighborhood);
    if (frete) freteInfo = `\nFrete para ${neighborhood}: R$${frete.fee.toFixed(2)} (${frete.time})`;
    else freteInfo = `\nBairro "${neighborhood}" não está na área de entrega.`;
  }

  const customerInfo = customer
    ? `Nome: ${customer.name}\nTelefone: ${customer.phone}\nEndereço: ${customer.address}, ${customer.number}\nBairro: ${customer.neighborhood}\nCEP: ${customer.cep}\nComplemento: ${customer.complement || "N/A"}`
    : null;

  const isFirstMessage = session.messages.length === 1;
  const systemPrompt = buildSystemPrompt(menu + freteInfo, bordas, customerInfo, isFirstMessage);

  // Chama Claude
  const response = await callClaude(systemPrompt, session.messages);

  // Verifica se tem pedido finalizado
  const orderResult = await processOrderFromResponse(response, phone);

  let finalResponse: string;
  if (orderResult) {
    const trackingUrl = `${SITE_URL}/pedido/${orderResult.orderId}`;
    finalResponse = orderResult.cleanResponse + `\n\n📦 Acompanhe seu pedido: ${trackingUrl}`;
    // Reseta sessão após pedido
    await saveSession(phone, {}, []);
  } else {
    finalResponse = response;
    // Salva sessão com histórico atualizado
    session.messages.push({ role: "assistant", content: response });

    // Tenta extrair bairro da conversa para calcular frete no próximo turno
    const bairroMatch = response.match(/[Bb]airro[:\s]+([^\n,]+)/);
    if (bairroMatch) {
      session.state = { ...session.state, neighborhood: bairroMatch[1].trim() };
    }

    await saveSession(phone, session.state as Record<string, unknown>, session.messages);
  }

  // Envia resposta via Z-API (quebra em mensagens se muito longa)
  const chunks = splitMessage(finalResponse);
  for (const chunk of chunks) {
    await sendWhatsappText(phone, chunk);
    // Pequeno delay entre mensagens para parecer natural
    if (chunks.length > 1) await new Promise((r) => setTimeout(r, 800));
  }
}

// Quebra mensagem longa em partes de ~1500 chars respeitando quebras de linha
function splitMessage(text: string, maxLen = 1500): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let cutAt = remaining.lastIndexOf("\n\n", maxLen);
    if (cutAt < maxLen / 2) cutAt = remaining.lastIndexOf("\n", maxLen);
    if (cutAt < maxLen / 2) cutAt = maxLen;
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
