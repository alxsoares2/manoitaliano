import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendWhatsappText, SITE_URL } from "@/lib/zapi";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = "claude-sonnet-4-6";
const SESSION_TTL_MS = 30 * 60 * 1000;

type Message = { role: "user" | "assistant"; content: string };
type Session = {
  phone: string;
  state: Record<string, unknown>;
  messages: Message[];
  updated_at: string;
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

// ─── sessão ───────────────────────────────────────────────────────
async function getSession(phone: string): Promise<Session> {
  const { data } = await supabaseAdmin
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone", phone)
    .single();

  if (data) {
    const elapsed = Date.now() - new Date(data.updated_at).getTime();
    if (elapsed > SESSION_TTL_MS) {
      await supabaseAdmin
        .from("whatsapp_sessions")
        .update({ state: {}, messages: [], updated_at: new Date().toISOString() })
        .eq("phone", phone);
      return { phone, state: {}, messages: [], updated_at: new Date().toISOString() };
    }
    return {
      phone,
      state: (data.state as Record<string, unknown>) ?? {},
      messages: (data.messages as Message[]) ?? [],
      updated_at: data.updated_at,
    };
  }

  await supabaseAdmin.from("whatsapp_sessions").insert({ phone, state: {}, messages: [] });
  return { phone, state: {}, messages: [], updated_at: new Date().toISOString() };
}

async function saveSession(phone: string, state: Record<string, unknown>, messages: Message[]) {
  const trimmed = messages.slice(-40);
  await supabaseAdmin
    .from("whatsapp_sessions")
    .upsert({ phone, state, messages: trimmed, updated_at: new Date().toISOString() }, { onConflict: "phone" });
}

// ─── cardápio numerado ────────────────────────────────────────────
type MenuItem = {
  name: string;
  category_id: string;
  price: number | null;
  price_media: number | null;
  price_grande: number | null;
  description: string | null;
  options: string | null;
  kind: string;
};

async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .select("name, category_id, price, price_media, price_grande, description, options, is_active, kind")
    .eq("is_active", true)
    .order("sort_order");

  if (error) { console.error("[chatbot] getMenuItems error:", error); return []; }
  return (data ?? []) as MenuItem[];
}

function buildNumberedMenu(items: MenuItem[]): string {
  const nonBordas = items.filter((i) => i.category_id !== "bordas");
  if (!nonBordas.length) return "Cardápio indisponível no momento.";

  return nonBordas.map((item, i) => {
    const num = i + 1;
    if (item.price_media && item.price_grande) {
      return `${num}. ${item.name} — Média R$${Number(item.price_media).toFixed(2)} / Grande R$${Number(item.price_grande).toFixed(2)}${item.description ? `\n   ${item.description}` : ""}`;
    }
    if (item.options) {
      return `${num}. ${item.name} — R$${Number(item.price).toFixed(2)} (${item.options})`;
    }
    return `${num}. ${item.name} — R$${Number(item.price).toFixed(2)}${item.description ? ` — ${item.description}` : ""}`;
  }).join("\n");
}

function buildBordasList(items: MenuItem[]): string {
  const bordas = items.filter((i) => i.category_id === "bordas");
  if (!bordas.length) return "Sem bordas disponíveis.";
  return bordas.map((b) => `• ${b.name}: R$${Number(b.price).toFixed(2)}`).join("\n");
}

// ─── cliente recorrente ───────────────────────────────────────────
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

// ─── frete ────────────────────────────────────────────────────────
async function getDeliveryFee(neighborhood: string): Promise<{ fee: number; time: string; matchedName: string } | null> {
  const norm = normalize(neighborhood);
  const { data } = await supabaseAdmin
    .from("delivery_zones")
    .select("delivery_fee, estimated_time, neighborhood")
    .eq("active", true);

  if (!data) return null;
  const match = data.find((z) => normalize(z.neighborhood) === norm);
  if (!match) return null;
  return { fee: Number(match.delivery_fee), time: match.estimated_time, matchedName: match.neighborhood };
}

// ─── ViaCEP ───────────────────────────────────────────────────────
async function lookupCep(cep: string): Promise<{ bairro: string; logradouro: string; localidade: string } | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return { bairro: data.bairro ?? "", logradouro: data.logradouro ?? "", localidade: data.localidade ?? "" };
  } catch { return null; }
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

// ─── system prompt ────────────────────────────────────────────────
function buildSystemPrompt(
  numberedMenu: string,
  bordas: string,
  sessionState: Record<string, unknown>,
  customerInfo: string | null,
): string {
  const cepConfirmed = sessionState.cep_confirmed === true;
  const neighborhood = sessionState.neighborhood as string | undefined;
  const frete = sessionState.frete as number | undefined;
  const freteTime = sessionState.frete_time as string | undefined;
  const address = sessionState.address as string | undefined;
  const cep = sessionState.cep as string | undefined;

  let addressContext = "";
  if (cepConfirmed && neighborhood) {
    addressContext = `\nENDEREÇO CONFIRMADO: Bairro ${neighborhood}, CEP ${cep ?? "?"}, Rua ${address ?? "?"}\nFrete: R$${frete?.toFixed(2) ?? "?"} (${freteTime ?? "?"})\n`;
  }

  const isFirstMessage = !sessionState.greeted;

  let firstInstruction = "";
  if (isFirstMessage) {
    firstInstruction = `
ATENÇÃO — PRIMEIRA MENSAGEM:
O cliente AINDA NÃO informou o CEP. Cumprimente-o, apresente brevemente a Basílico Pizzas e peça o CEP para verificar se entregamos na região dele. NÃO mostre o cardápio ainda.
Exemplo: "Olá! 🍕 Bem-vindo à Basílico Pizzas! Para começarmos, me diz seu CEP que verifico se entregamos na sua região."
EXCEÇÃO: Se o cliente já mencionou itens específicos do cardápio (ex: "quero uma calabresa grande"), reconheça o pedido, mas ainda peça o CEP primeiro antes de continuar.
`;
  }

  let cepPendingInstruction = "";
  if (!isFirstMessage && !cepConfirmed) {
    cepPendingInstruction = `
O CEP AINDA NÃO FOI CONFIRMADO. O cliente pode estar informando o CEP agora. Se a mensagem contiver 8 dígitos numéricos (com ou sem hífen), trate como CEP. Caso contrário, peça o CEP novamente educadamente.
Quando o sistema confirmar o bairro (você verá nos dados da sessão), aí sim mostre o cardápio.
`;
  }

  let menuInstruction = "";
  if (cepConfirmed) {
    menuInstruction = `
O cardápio está numerado. O cliente pode digitar o NÚMERO do item ou descrever o que quer em linguagem natural (ex: "quero o 3 grande" ou "quero uma calabresa grande com borda de chocolate").
Se o cliente mencionar itens diretamente sem ver o cardápio, identifique os itens pelo nome, monte o pedido e confirme com ele.
`;
  }

  return `Você é o atendente virtual da Basílico Pizzas, uma pizzaria artesanal premium em João Pessoa/PB.
Seu tom é amigável, simpático e eficiente. Use emojis com moderação (máximo 2-3 por mensagem). Seja direto.
Conversa via WhatsApp.
${firstInstruction}${cepPendingInstruction}${menuInstruction}
REGRAS:
- Responda SEMPRE em português brasileiro
- NÃO use markdown (sem **, ##, etc.). Use texto simples.
- Respostas curtas (máximo 4 parágrafos)
- Se quiser falar com humano: (83) 99322-8832 ou @basilicopizzas no Instagram
- Endereço: Av. Bananeiras, 190, Manaíra, João Pessoa/PB
- Horário: Seg-Qui 17h-22h, Sex-Dom 17h-23h
${addressContext}
${customerInfo ? `CLIENTE RECORRENTE:\n${customerInfo}\n` : ""}

CARDÁPIO NUMERADO:
${numberedMenu}

BORDAS RECHEADAS:
${bordas}

FLUXO (seja flexível — se o cliente pular etapas, acompanhe):
1. Pedir CEP → verificar bairro → confirmar frete
2. Mostrar cardápio numerado
3. Cliente escolhe item (número ou texto livre) → perguntar tamanho se for pizza
4. Perguntar meio a meio (S/N) → se sim, mostrar sabores
5. Perguntar borda recheada (S/N)
6. Perguntar se quer mais algo
7. Mostrar RESUMO com todos os itens + frete + total
8. Pedir nome (se não tiver)
9. Pedir número da casa e complemento (se não tiver)
10. Perguntar pagamento: PIX ou Cartão
11. Confirmar pedido

PEDIDO DIRETO: Se o cliente já disse o que quer na mensagem (ex: "quero uma calabresa grande e uma coca"), pule direto para o resumo após confirmar CEP/endereço. Não force o fluxo completo.

QUANDO FINALIZAR, inclua na última linha:
##ORDER_JSON##{"customer_name":"...","customer_phone":"...","address":"...","address_number":"...","neighborhood":"...","complement":"...","cep":"...","items":[{"name":"...","size":"Média ou Grande ou null","borda":"nome ou null","option":"sabor bebida ou null","qty":1,"unitPrice":0.00,"bordaPrice":0.00}],"subtotal":0.00,"delivery_fee":0.00,"total":0.00,"payment_method":"pix ou card","notes":null}##END_ORDER##

Preços: use unitPrice do tamanho escolhido. Meio a meio = preço da pizza mais cara. Só emita JSON com TODOS os dados completos e confirmação do cliente.`;
}

// ─── Claude ───────────────────────────────────────────────────────
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
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[chatbot] Claude API error:", res.status, err);
    return "Desculpe, estou com dificuldade técnica. Tente novamente ou ligue (83) 99322-8832.";
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

// ─── principal ────────────────────────────────────────────────────
export async function handleIncomingMessage(phone: string, text: string) {
  const session = await getSession(phone);
  const state = { ...session.state } as Record<string, unknown>;

  session.messages.push({ role: "user", content: text });

  // --- Passo intermediário: verificar CEP se ainda não confirmado ---
  if (!state.cep_confirmed) {
    const cepMatch = text.match(/\d{5}[-.\s]?\d{3}/);
    if (cepMatch) {
      const cepDigits = cepMatch[0].replace(/\D/g, "");
      const via = await lookupCep(cepDigits);
      if (via) {
        const frete = await getDeliveryFee(via.bairro);
        if (frete) {
          state.cep = cepDigits;
          state.cep_confirmed = true;
          state.neighborhood = frete.matchedName;
          state.frete = frete.fee;
          state.frete_time = frete.time;
          state.address = via.logradouro;
          state.greeted = true;

          // Busca o cardápio para incluir na mensagem de confirmação
          const menuItems = await getMenuItems();
          const numberedMenu = buildNumberedMenu(menuItems);

          // Injeta uma mensagem de sistema informando o resultado do CEP
          session.messages.push({
            role: "assistant",
            content: `CEP ${cepDigits} confirmado! Bairro: ${frete.matchedName}. Rua: ${via.logradouro}. Frete: R$${frete.fee.toFixed(2)} (${frete.time}).\n\nAgora vou mostrar nosso cardápio:\n\n${numberedMenu}\n\nQual item te interessa? Pode digitar o número ou me dizer o que quer!`,
          });

          await saveSession(phone, state, session.messages);
          const chunks = splitMessage(session.messages[session.messages.length - 1].content);
          for (const chunk of chunks) {
            await sendWhatsappText(phone, chunk);
            if (chunks.length > 1) await delay(800);
          }
          return;
        } else {
          // Bairro não atendido
          state.greeted = true;
          const msg = `Poxa, infelizmente ainda não entregamos no bairro "${via.bairro}" (${via.localidade}). 😢\n\nNosso delivery cobre bairros de João Pessoa e região. Você pode tentar outro endereço ou fazer a retirada no balcão: Av. Bananeiras, 190, Manaíra.\n\nQualquer dúvida: (83) 99322-8832`;
          session.messages.push({ role: "assistant", content: msg });
          await saveSession(phone, state, session.messages);
          await sendWhatsappText(phone, msg);
          return;
        }
      } else {
        state.greeted = true;
        const msg = "Não encontrei esse CEP. Pode verificar e enviar novamente? O formato é 00000-000.";
        session.messages.push({ role: "assistant", content: msg });
        await saveSession(phone, state, session.messages);
        await sendWhatsappText(phone, msg);
        return;
      }
    }
  }

  // --- Busca dados ---
  const [menuItems, customer] = await Promise.all([
    getMenuItems(),
    getCustomerByPhone(phone),
  ]);

  const numberedMenu = buildNumberedMenu(menuItems);
  const bordas = buildBordasList(menuItems);

  const customerInfo = customer
    ? `Nome: ${customer.name}\nTelefone: ${customer.phone}\nEndereço: ${customer.address}, ${customer.number}\nBairro: ${customer.neighborhood}\nCEP: ${customer.cep}\nComplemento: ${customer.complement || "N/A"}`
    : null;

  // Marca como saudado
  if (!state.greeted) state.greeted = true;

  const systemPrompt = buildSystemPrompt(numberedMenu, bordas, state, customerInfo);
  const response = await callClaude(systemPrompt, session.messages);

  // Verifica pedido finalizado
  const orderResult = await processOrderFromResponse(response, phone);

  let finalResponse: string;
  if (orderResult) {
    const trackingUrl = `${SITE_URL}/pedido/${orderResult.orderId}`;
    finalResponse = orderResult.cleanResponse + `\n\n📦 Acompanhe seu pedido: ${trackingUrl}`;
    await saveSession(phone, {}, []);
  } else {
    finalResponse = response;
    session.messages.push({ role: "assistant", content: response });
    await saveSession(phone, state, session.messages);
  }

  const chunks = splitMessage(finalResponse);
  for (const chunk of chunks) {
    await sendWhatsappText(phone, chunk);
    if (chunks.length > 1) await delay(800);
  }
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

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
