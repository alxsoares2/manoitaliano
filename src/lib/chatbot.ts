import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendWhatsappText, SITE_URL } from "@/lib/zapi";
import { sendGroupAlert } from "@/lib/alertGroup";
import { normalizePhone } from "@/lib/upsertCustomer";
import { MercadoPagoConfig, Payment } from "mercadopago";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = "claude-sonnet-4-6";
const SESSION_TTL_MS = 30 * 60 * 1000;

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const mpPayment = new Payment(mp);

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

// ─── cardápio ─────────────────────────────────────────────────────
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

const SALGADAS_IDS = ["classicas", "favoritas-da-casa", "especiais-da-casa", "especial"];

async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .select("name, category_id, price, price_media, price_grande, description, options, is_active, kind")
    .eq("is_active", true)
    .order("sort_order");
  if (error) {
    console.error("[chatbot] getMenuItems error:", error);
    sendGroupAlert(error.message, "Supabase menu_items", "Verificar conexão com Supabase e estrutura da tabela menu_items").catch(() => {});
    return [];
  }
  return (data ?? []) as MenuItem[];
}

function buildCategoryMenu(): string {
  return `1. 🍕 Pizzas Salgadas\n2. 🍫 Pizzas Doces\n3. 🥗 Entradas\n4. 🥤 Bebidas`;
}

function buildCategoryItems(items: MenuItem[], categoryNum: number): string {
  let filtered: MenuItem[];
  switch (categoryNum) {
    case 1: filtered = items.filter((i) => SALGADAS_IDS.includes(i.category_id)); break;
    case 2: filtered = items.filter((i) => i.category_id === "doces"); break;
    case 3: filtered = items.filter((i) => i.category_id === "entradas"); break;
    case 4: filtered = items.filter((i) => i.category_id === "bebidas"); break;
    default: return "Categoria inválida.";
  }
  if (!filtered.length) return "Nenhum item disponível nesta categoria.";

  return filtered.map((item, i) => {
    const num = i + 1;
    if (item.price_media && item.price_grande) {
      return `${num}. ${item.name} — Méd R$${Number(item.price_media).toFixed(2)} / Grd R$${Number(item.price_grande).toFixed(2)}`;
    }
    if (item.options) {
      return `${num}. ${item.name} — R$${Number(item.price).toFixed(2)} (${item.options})`;
    }
    return `${num}. ${item.name} — R$${Number(item.price).toFixed(2)}`;
  }).join("\n");
}

function buildFullMenuForClaude(items: MenuItem[]): string {
  const nonBordas = items.filter((i) => i.category_id !== "bordas");
  return nonBordas.map((item) => {
    if (item.price_media && item.price_grande) {
      return `- ${item.name} [${item.category_id}]: Média R$${Number(item.price_media).toFixed(2)} / Grande R$${Number(item.price_grande).toFixed(2)}${item.description ? ` (${item.description})` : ""}`;
    }
    if (item.options) {
      return `- ${item.name} [${item.category_id}]: R$${Number(item.price).toFixed(2)} (opções: ${item.options})`;
    }
    return `- ${item.name} [${item.category_id}]: R$${Number(item.price).toFixed(2)}${item.description ? ` (${item.description})` : ""}`;
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

// ─── último pedido do cliente ──────────────────────────────────────
async function getLastOrder(phone: string): Promise<Record<string, unknown> | null> {
  const digits = phone.replace(/\D/g, "");
  const search = digits.startsWith("55") ? digits.slice(2) : digits;
  const { data } = await supabaseAdmin
    .from("orders")
    .select("*")
    .or(`customer_phone.like.%${search}%`)
    .not("status", "eq", "cancelado")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data as Record<string, unknown> | null;
}

function formatLastOrderSummary(order: Record<string, unknown>): string {
  const items = order.items as { name: string; qty: number; size?: string; unitPrice: number; bordaPrice?: number }[];
  const lines = items.map((i) => {
    let desc = `${i.qty}x ${i.name}`;
    if (i.size) desc += ` (${i.size})`;
    return desc;
  });
  const total = Number(order.total).toFixed(2).replace(".", ",");
  return `${lines.join(", ")} — R$${total}`;
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

// ─── criar pedido como pendente (aguardando pagamento) ────────────
async function createPendingOrder(orderData: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert({ ...orderData, status: "pendente" })
    .select("id")
    .single();
  if (error) { console.error("[chatbot] createOrder error:", error); return null; }
  return data.id;
}

// ─── gerar PIX via Mercado Pago ───────────────────────────────────
async function createPixPayment(orderId: string, total: number, customerName: string): Promise<{ qrCode: string; paymentId: string } | null> {
  try {
    const result = await mpPayment.create({
      body: {
        transaction_amount: total,
        payment_method_id: "pix",
        description: "Pedido Basílico Pizzas",
        external_reference: orderId,
        notification_url: "https://basilicopizzas.com.br/api/payment/webhook",
        payer: {
          email: "cliente@basilicopizzas.com.br",
          first_name: customerName.split(" ")[0],
          last_name: customerName.split(" ").slice(1).join(" ") || customerName,
        },
      },
    });

    const qrCode = result.point_of_interaction?.transaction_data?.qr_code;
    if (!qrCode) return null;

    await supabaseAdmin.from("orders").update({ payment_id: String(result.id) }).eq("id", orderId);
    return { qrCode, paymentId: String(result.id) };
  } catch (err) {
    console.error("[chatbot] createPixPayment error:", err);
    sendGroupAlert(
      String(err instanceof Error ? err.message : err),
      "Mercado Pago PIX",
      "Verificar credenciais do Mercado Pago e saldo da conta"
    ).catch(() => {});
    return null;
  }
}

// ─── system prompt ────────────────────────────────────────────────
function buildSystemPrompt(
  fullMenu: string,
  bordas: string,
  state: Record<string, unknown>,
  customerInfo: string | null,
): string {
  const cepConfirmed = state.cep_confirmed === true;
  const neighborhood = state.neighborhood as string | undefined;
  const frete = state.frete as number | undefined;
  const freteTime = state.frete_time as string | undefined;
  const address = state.address as string | undefined;
  const cep = state.cep as string | undefined;

  let addressContext = "";
  if (cepConfirmed && neighborhood) {
    addressContext = `\nENDEREÇO CONFIRMADO: Bairro ${neighborhood}, CEP ${cep}, Rua ${address ?? "?"}\nFrete: R$${frete?.toFixed(2)} (${freteTime})\n`;
  }

  const isFirstMessage = !state.greeted;

  let firstInstruction = "";
  if (isFirstMessage) {
    firstInstruction = `
PRIMEIRA MENSAGEM — peça o CEP:
"Olá! 🍕 Bem-vindo à Basílico Pizzas! Para começar, me diz seu CEP que verifico se realizamos entregas na sua região."
Se o cliente já mencionou itens, reconheça mas ainda peça o CEP primeiro.
`;
  }

  let cepPendingInstruction = "";
  if (!isFirstMessage && !cepConfirmed) {
    cepPendingInstruction = `
CEP AINDA NÃO CONFIRMADO. Se a mensagem tem 8 dígitos, trate como CEP. Senão, peça novamente.
`;
  }

  let menuInstruction = "";
  if (cepConfirmed) {
    menuInstruction = `
CARDÁPIO POR CATEGORIAS — O cliente vê 4 categorias e escolhe uma. Depois vê os itens numerados (SEM descrição).
Se o cliente perguntar ingredientes de um item, mostre a descrição DAQUELE item específico.
Se o cliente mencionar um item diretamente pelo nome, identifique-o e prossiga sem forçar o menu.

As 4 categorias:
1. Pizzas Salgadas (Clássicas + Favoritas da Casa + Especiais)
2. Pizzas Doces
3. Entradas
4. Bebidas
`;
  }

  return `Você é o atendente virtual da Basílico Pizzas, pizzaria artesanal em João Pessoa/PB.
Tom amigável, simpático, eficiente. Máximo 2-3 emojis por mensagem. Direto ao ponto.
Conversa via WhatsApp — texto simples, SEM markdown (nada de **, ##, -, etc.).
${firstInstruction}${cepPendingInstruction}${menuInstruction}
REGRAS:
- Português brasileiro sempre
- Respostas curtas (máx 4 parágrafos)
- Falar com humano: (83) 99322-8832 ou @basilicopizzas
- Endereço: Av. Bananeiras, 190, Manaíra, JP/PB
- Horário: Seg-Qui 17h-22h, Sex-Dom 17h-23h
${addressContext}
${customerInfo ? `CLIENTE RECORRENTE:\n${customerInfo}\n` : ""}

CARDÁPIO COMPLETO (referência interna — NÃO mostre tudo de uma vez):
${fullMenu}

BORDAS RECHEADAS:
${bordas}

FLUXO OBRIGATÓRIO (siga CADA passo, NÃO pule nenhum):
1. Pedir CEP → confirmar bairro/frete
2. Mostrar 4 categorias
3. Cliente escolhe categoria → mostrar itens numerados (nome + preço, SEM descrição)
4. Cliente escolhe pizza → perguntar tamanho (Média/Grande)
5. OBRIGATÓRIO: "Quer adicionar borda recheada? (S/N)" → se S, mostrar as opções de borda com preço
6. OBRIGATÓRIO: "Quer meio a meio com outro sabor? (S/N)" → se S, mostrar sabores disponíveis
7. OBRIGATÓRIO: "Quer adicionar mais uma pizza? (S/N)" → se S, voltar às categorias
8. OBRIGATÓRIO: "Quer adicionar uma bebida? (S/N)" → se S, mostrar bebidas
9. OBRIGATÓRIO: "Quer uma Pizza Nutella Individual de sobremesa por R$25,99? (S/N)"
10. Mostrar RESUMO completo com todos os itens + frete + total
11. Pedir nome + número da casa + complemento (se não tiver)
12. Pagamento: PIX ou Cartão
13. Confirmar pedido

IMPORTANTE: as perguntas 5 a 9 são OBRIGATÓRIAS. Faça UMA pergunta por mensagem, espere a resposta, depois faça a próxima. NÃO pule nenhuma mesmo que o cliente pareça com pressa.

PEDIDO DIRETO: se o cliente já mencionou itens na conversa, identifique-os mas AINDA faça as perguntas de upsell (borda, meio a meio, mais pizza, bebida, Nutella) antes de ir pro resumo.

QUANDO CONFIRMAR O PEDIDO, inclua na ÚLTIMA linha:
##ORDER_JSON##{"customer_name":"...","customer_phone":"...","address":"...","address_number":"...","neighborhood":"...","complement":"...","cep":"...","items":[{"name":"...","size":"Média ou Grande ou null","borda":"nome ou null","option":"sabor ou null","qty":1,"unitPrice":0.00,"bordaPrice":0.00}],"subtotal":0.00,"delivery_fee":0.00,"total":0.00,"payment_method":"pix ou card","notes":null}##END_ORDER##

unitPrice = preço do tamanho. Meio a meio = preço da mais cara. Só emita JSON com dados completos + confirmação.

OBSERVAÇÕES DO PEDIDO:
Se o cliente mencionar QUALQUER modificação, restrição ou pedido especial (ex: "sem cebola", "bem passado", "sem pimenta", "tirar tomate", "pouco sal", "extra queijo", "alergia a camarão"), capture TUDO no campo "notes" do JSON. Junte todas as observações num texto único separado por vírgula. Se não houver observações, use null.`;
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
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: systemPrompt, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[chatbot] Claude API error:", res.status, err);
    sendGroupAlert(
      `Status ${res.status}: ${err.slice(0, 200)}`,
      "Claude API (chatbot)",
      "Verificar ANTHROPIC_API_KEY e saldo da conta Anthropic"
    ).catch(() => {});
    return "Desculpe, estou com dificuldade técnica. Tente novamente ou ligue (83) 99322-8832.";
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "Desculpe, não consegui processar sua mensagem.";
}

// ─── processar pedido + pagamento ─────────────────────────────────
async function processOrderFromResponse(response: string, phone: string): Promise<{ finalMessage: string; orderId: string } | null> {
  const match = response.match(/##ORDER_JSON##([\s\S]*?)##END_ORDER##/);
  if (!match) return null;

  try {
    const order = JSON.parse(match[1].trim());
    const cleanResponse = response.replace(/##ORDER_JSON##[\s\S]*?##END_ORDER##/, "").trim();

    const orderId = await createPendingOrder({
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
    });

    if (!orderId) return null;

    // Upsert customer
    const cleanPhone = normalizePhone(phone);
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

    if (order.payment_method === "pix") {
      const pix = await createPixPayment(orderId, order.total, order.customer_name);
      if (pix) {
        const finalMessage = `${cleanResponse}\n\n💰 PIX Copia e Cola:\n\n${pix.qrCode}\n\nCopie o código acima e cole no app do seu banco. Após o pagamento, seu pedido será confirmado automaticamente!\n\n📦 Acompanhe: ${SITE_URL}/pedido/${orderId}`;
        return { finalMessage, orderId };
      }
      return { finalMessage: `${cleanResponse}\n\nOcorreu um erro ao gerar o PIX. Entre em contato: (83) 99322-8832.`, orderId };
    }

    // Cartão — envia link de pagamento
    const paymentUrl = `${SITE_URL}/pedido/${orderId}/pagamento`;
    const finalMessage = `${cleanResponse}\n\n💳 Finalize o pagamento com cartão:\n${paymentUrl}\n\nApós a aprovação, seu pedido será confirmado automaticamente!\n\n📦 Acompanhe: ${SITE_URL}/pedido/${orderId}`;
    return { finalMessage, orderId };
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

  // --- CEP não confirmado: verificar se o texto contém CEP ---
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

          // Verificar se é cliente recorrente com pedidos anteriores
          const [customer, lastOrder] = await Promise.all([
            getCustomerByPhone(phone),
            getLastOrder(phone),
          ]);

          if (customer && lastOrder) {
            const firstName = String(customer.name ?? "").split(" ")[0];
            const orderSummary = formatLastOrderSummary(lastOrder);
            state.last_order = lastOrder;
            state.customer_data = customer;

            const msg = `CEP ${cepDigits} confirmado! ✅\nBairro: ${frete.matchedName}\nFrete: R$${frete.fee.toFixed(2)} (${frete.time})\n\nOlá ${firstName}, que bom ter você de volta! 🎉\n\nSeu último pedido foi:\n${orderSummary}\n\nDeseja repetir o mesmo pedido? (S/N)`;

            session.messages.push({ role: "assistant", content: msg });
            await saveSession(phone, state, session.messages);
            await sendWhatsappText(phone, msg);
            return;
          }

          const categories = buildCategoryMenu();
          const msg = `CEP ${cepDigits} confirmado! ✅\nBairro: ${frete.matchedName}\nRua: ${via.logradouro}\nFrete: R$${frete.fee.toFixed(2)} (${frete.time})\n\nÓtimo, entregamos na sua região! 🎉\n\nEscolha a categoria do cardápio:\n\n${categories}\n\nDigite o número da categoria!`;

          session.messages.push({ role: "assistant", content: msg });
          await saveSession(phone, state, session.messages);
          await sendWhatsappText(phone, msg);
          return;
        } else {
          state.greeted = true;
          const msg = `Poxa, infelizmente ainda não entregamos no bairro "${via.bairro}" (${via.localidade}). 😢\n\nVocê pode tentar outro endereço ou retirar no balcão:\nAv. Bananeiras, 190, Manaíra.\n\n(83) 99322-8832`;
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

    // Sem CEP na mensagem — se for primeira msg, pedir CEP
    if (!state.greeted) {
      state.greeted = true;
      const msg = "Olá! 🍕 Bem-vindo à Basílico Pizzas, pizzaria artesanal em João Pessoa!\n\nPara começar, me diz seu CEP que verifico se realizamos entregas na sua região.";
      session.messages.push({ role: "assistant", content: msg });
      await saveSession(phone, state, session.messages);
      await sendWhatsappText(phone, msg);
      return;
    }

    // Já foi saudado mas não mandou CEP
    const msg = "Para continuar, preciso do seu CEP para verificar se realizamos entregas na sua região. 📍\n\nDigite o CEP no formato 00000-000.";
    session.messages.push({ role: "assistant", content: msg });
    await saveSession(phone, state, session.messages);
    await sendWhatsappText(phone, msg);
    return;
  }

  // --- Cliente recorrente: verificar resposta "repetir pedido?" ---
  if (state.cep_confirmed && state.last_order && !state.repeat_answered) {
    const lower = normalize(text);
    const yes = lower === "s" || lower === "sim" || lower.includes("sim") || lower.includes("mesmo") || lower.includes("repet");

    state.repeat_answered = true;

    if (yes) {
      // Repetir último pedido — pular para Claude com contexto de repetição
      const lastOrder = state.last_order as Record<string, unknown>;
      const customer = state.customer_data as Record<string, unknown>;
      state.category_shown = true;

      // Injetar contexto para o Claude montar o resumo e pedir pagamento
      const repeatInfo = `O cliente quer REPETIR o último pedido. Dados do pedido anterior:
Itens: ${JSON.stringify(lastOrder.items)}
Subtotal: R$${Number(lastOrder.subtotal ?? lastOrder.total).toFixed(2)}
Frete: R$${Number(state.frete).toFixed(2)}
Total anterior: R$${Number(lastOrder.total).toFixed(2)}
Cliente: ${customer.name}
Endereço: ${customer.address}, ${customer.number}
Bairro: ${state.neighborhood}
CEP: ${state.cep}
Complemento: ${customer.complement || "N/A"}

Mostre o resumo do pedido repetido, confirme o endereço (já tem os dados acima), calcule o total (itens + frete atual R$${Number(state.frete).toFixed(2)}) e pergunte a forma de pagamento (PIX ou Cartão). NÃO faça perguntas de upsell — o cliente quer repetir exatamente o mesmo.`;

      session.messages.push({ role: "user", content: `Sim, quero repetir o mesmo pedido. ${repeatInfo}` });
      // Remove a msg real do user e usa a enriquecida
      session.messages = session.messages.filter((m) => m.content !== text);

      await saveSession(phone, state, session.messages);
      // Não retorna — cai no fluxo do Claude abaixo
    } else {
      // Não quer repetir — mostrar categorias
      delete state.last_order;
      delete state.customer_data;
      const categories = buildCategoryMenu();
      const msg = `Sem problema! 😊\n\nEscolha a categoria do cardápio:\n\n${categories}\n\nDigite o número da categoria!`;
      session.messages.push({ role: "assistant", content: msg });
      await saveSession(phone, state, session.messages);
      await sendWhatsappText(phone, msg);
      return;
    }
  }

  // --- CEP confirmado: verificar se escolheu categoria ---
  if (state.cep_confirmed && !state.category_shown) {
    const catNum = parseInt(text.trim());
    if (catNum >= 1 && catNum <= 4) {
      const menuItems = await getMenuItems();
      const itemsList = buildCategoryItems(menuItems, catNum);
      const catNames = ["Pizzas Salgadas", "Pizzas Doces", "Entradas", "Bebidas"];
      state.category_shown = true;
      state.current_category = catNum;

      const msg = `${catNames[catNum - 1]}:\n\n${itemsList}\n\nDigite o número do item ou me diga o que deseja!`;
      session.messages.push({ role: "assistant", content: msg });
      await saveSession(phone, state, session.messages);
      await sendWhatsappText(phone, msg);
      return;
    }
    // Se não é número de categoria, deixa o Claude processar (pode ser pedido direto)
  }

  // --- Pedido já criado: verificar se quer trocar pagamento ---
  if (state.order_completed && state.pending_order_id) {
    const orderId = state.pending_order_id as string;
    const lower = normalize(text);
    const wantsCard = lower.includes("cartao") || lower.includes("cartão") || lower.includes("credito") || lower.includes("debito") || lower.includes("card");
    const wantsPix = lower.includes("pix") || lower.includes("copia e cola");

    if (wantsCard) {
      // Verificar se o pedido ainda está pendente
      const { data: order } = await supabaseAdmin.from("orders").select("status, total").eq("id", orderId).single();
      if (order && order.status === "pendente") {
        await supabaseAdmin.from("orders").update({ payment_method: "card" }).eq("id", orderId);
        const paymentUrl = `${SITE_URL}/pedido/${orderId}/pagamento`;
        const msg = `Sem problema! 💳 Mudei para pagamento com cartão.\n\nFinalize aqui:\n${paymentUrl}\n\nApós a aprovação, seu pedido será confirmado automaticamente!`;
        session.messages.push({ role: "assistant", content: msg });
        await saveSession(phone, state, session.messages);
        await sendWhatsappText(phone, msg);
        return;
      }
    }

    if (wantsPix) {
      const { data: order } = await supabaseAdmin.from("orders").select("status, total, customer_name").eq("id", orderId).single();
      if (order && order.status === "pendente") {
        await supabaseAdmin.from("orders").update({ payment_method: "pix" }).eq("id", orderId);
        const pix = await createPixPayment(orderId, Number(order.total), order.customer_name);
        if (pix) {
          const msg = `Sem problema! 💰 Mudei para PIX.\n\nCopia e Cola:\n\n${pix.qrCode}\n\nCole no app do seu banco. Após o pagamento, seu pedido será confirmado automaticamente!`;
          session.messages.push({ role: "assistant", content: msg });
          await saveSession(phone, state, session.messages);
          await sendWhatsappText(phone, msg);
          return;
        }
      }
    }

    // Verificar se pedido já foi pago — se sim, resetar sessão
    const { data: order } = await supabaseAdmin.from("orders").select("status").eq("id", orderId).single();
    if (order && order.status !== "pendente") {
      // Pedido já processado, resetar
      await saveSession(phone, {}, []);
      const msg = "Seu pedido já foi confirmado! 🎉\n\nSe quiser fazer um novo pedido, é só mandar uma mensagem.";
      await sendWhatsappText(phone, msg);
      return;
    }

    // Outra mensagem com pedido pendente — responder sobre o pedido
    const msg = `Seu pedido está aguardando pagamento. 📋\n\nPara pagar com PIX, já enviei o código acima.\nPara pagar com cartão, digite "quero cartão".\n\nPrecisa de mais alguma coisa?`;
    session.messages.push({ role: "assistant", content: msg });
    await saveSession(phone, state, session.messages);
    await sendWhatsappText(phone, msg);
    return;
  }

  // --- Conversa normal com Claude ---
  const [menuItems, customer] = await Promise.all([
    getMenuItems(),
    getCustomerByPhone(phone),
  ]);

  const fullMenu = buildFullMenuForClaude(menuItems);
  const bordas = buildBordasList(menuItems);

  const customerInfo = customer
    ? `Nome: ${customer.name}\nTelefone: ${customer.phone}\nEndereço: ${customer.address}, ${customer.number}\nBairro: ${customer.neighborhood}\nCEP: ${customer.cep}\nComplemento: ${customer.complement || "N/A"}`
    : null;

  if (!state.greeted) state.greeted = true;
  if (!state.category_shown) state.category_shown = true;

  const systemPrompt = buildSystemPrompt(fullMenu, bordas, state, customerInfo);
  const response = await callClaude(systemPrompt, session.messages);

  // Verifica pedido finalizado
  const orderResult = await processOrderFromResponse(response, phone);

  let finalResponse: string;
  if (orderResult) {
    finalResponse = orderResult.finalMessage;
    // Salva orderId no state para permitir troca de pagamento (PIX→Cartão)
    state.pending_order_id = orderResult.orderId;
    state.order_completed = true;
    session.messages.push({ role: "assistant", content: finalResponse });
    await saveSession(phone, state, session.messages);
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
