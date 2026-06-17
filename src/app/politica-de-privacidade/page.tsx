import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Basílico Pizzas",
  description: "Saiba como a Basílico Pizzas coleta, usa e protege seus dados pessoais conforme a LGPD.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}

export default function PoliticaDePrivacidade() {
  const updated = "17 de junho de 2025";

  return (
    <div className="min-h-screen bg-background">
      {/* Header simples */}
      <header className="border-b border-border bg-background-elevated">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted transition hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao cardápio
          </Link>
          <span className="font-display text-lg font-semibold text-foreground">basílico</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10">
          <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-muted">Última atualização: {updated}</p>
        </div>

        <div className="mb-10 rounded-xl border border-border bg-background-elevated p-5 text-sm leading-relaxed text-foreground/80">
          A Basílico Pizzas respeita sua privacidade. Esta política explica, em linguagem simples, quais dados
          coletamos quando você faz um pedido pelo nosso site, como os usamos e quais são os seus direitos —
          tudo em conformidade com a{" "}
          <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>.
        </div>

        <Section title="1. Quem somos">
          <p>
            <strong>Basílico Pizzas</strong> é uma pizzaria localizada na Av. Bananeiras, 190, Manaíra,
            João Pessoa/PB. Somos os responsáveis pelo tratamento dos seus dados pessoais coletados por
            meio do site <strong>basilicopizzas.com.br</strong>.
          </p>
          <p>
            Contato do responsável (Encarregado de Dados):{" "}
            <a href="mailto:contato@basilicopizzas.com.br" className="text-gold-soft underline hover:no-underline">
              contato@basilicopizzas.com.br
            </a>{" "}
            ou pelo WhatsApp{" "}
            <a href="https://wa.me/5583993228832" target="_blank" rel="noopener noreferrer" className="text-gold-soft underline hover:no-underline">
              (83) 99322-8832
            </a>.
          </p>
        </Section>

        <Section title="2. Quais dados coletamos">
          <p>Ao realizar um pedido, coletamos apenas os dados necessários para entregá-lo:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Nome completo</strong> — para identificar o pedido e o cliente.</li>
            <li><strong>Número de telefone (WhatsApp)</strong> — para enviar confirmação e atualizações do pedido.</li>
            <li><strong>Endereço de entrega</strong> — logradouro, número, complemento, bairro e CEP.</li>
            <li><strong>Conteúdo do pedido</strong> — itens, tamanhos, sabores e valor total.</li>
            <li><strong>Método de pagamento</strong> — PIX ou cartão (não armazenamos dados do cartão; o processamento é feito diretamente pelo Mercado Pago).</li>
          </ul>
          <p>
            Não coletamos dados sensíveis como CPF, data de nascimento, dados de saúde ou informações de
            menores de idade.
          </p>
        </Section>

        <Section title="3. Para que usamos seus dados">
          <p>Seus dados são usados exclusivamente para:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Processar e entregar seu pedido</strong> — base legal: execução de contrato (art. 7º, V, LGPD).</li>
            <li><strong>Enviar confirmação e atualizações via WhatsApp</strong> — notificações como "pedido recebido", "saiu para entrega" e link de acompanhamento em tempo real — base legal: execução de contrato.</li>
            <li>
              <strong>Melhorar nosso atendimento</strong> — análise agregada e anônima do histórico de pedidos
              para entender preferências e oferecer um serviço melhor — base legal: legítimo interesse (art. 7º, IX, LGPD).
            </li>
            <li>
              <strong>Contato pontual via CRM</strong> — eventualmente podemos enviar uma mensagem informando
              promoções ou novidades. Você pode pedir para não receber mais a qualquer momento — base legal: legítimo
              interesse ou consentimento.
            </li>
          </ul>
          <p>Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins de marketing.</p>
        </Section>

        <Section title="4. Compartilhamento de dados">
          <p>Seus dados podem ser acessados por:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Mercado Pago</strong> — processador de pagamentos. Recebe apenas o valor da transação
              e o nome do pagador para autorizar o pagamento. Consulte a{" "}
              <a href="https://www.mercadopago.com.br/privacidade" target="_blank" rel="noopener noreferrer" className="text-gold-soft underline hover:no-underline">
                Política de Privacidade do Mercado Pago
              </a>.
            </li>
            <li>
              <strong>Z-API</strong> — plataforma de envio de mensagens via WhatsApp. Recebe o número de
              telefone e o texto da mensagem de confirmação. Os dados trafegam de forma segura e não são
              retidos pela plataforma além do necessário para o envio.
            </li>
            <li>
              <strong>Supabase</strong> — banco de dados em nuvem onde os pedidos são armazenados, hospedado
              em servidores seguros na União Europeia (AWS Frankfurt), com criptografia em repouso e em
              trânsito.
            </li>
          </ul>
          <p>Não transferimos dados para países sem nível adequado de proteção sem as garantias exigidas pela LGPD.</p>
        </Section>

        <Section title="5. Por quanto tempo guardamos seus dados">
          <p>
            Mantemos seu histórico de pedidos por <strong>até 5 (cinco) anos</strong> após a data do pedido,
            prazo alinhado às obrigações fiscais e contábeis previstas na legislação brasileira.
          </p>
          <p>
            Após esse período, os dados são excluídos de forma segura ou anonimizados, de modo que não seja
            mais possível identificar você.
          </p>
        </Section>

        <Section title="6. Seus direitos como titular">
          <p>A LGPD garante a você os seguintes direitos, que podem ser exercidos a qualquer momento:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Confirmação e acesso</strong> — saber se tratamos seus dados e receber uma cópia deles.</li>
            <li><strong>Correção</strong> — solicitar a correção de dados incompletos ou desatualizados.</li>
            <li><strong>Exclusão</strong> — pedir a exclusão dos seus dados, quando não houver obrigação legal de retenção.</li>
            <li><strong>Portabilidade</strong> — receber seus dados em formato legível por máquina.</li>
            <li><strong>Oposição</strong> — opor-se ao tratamento baseado em legítimo interesse.</li>
            <li><strong>Revogação do consentimento</strong> — retirar seu consentimento para envio de mensagens promocionais a qualquer momento.</li>
            <li><strong>Informação sobre compartilhamento</strong> — saber com quem seus dados são compartilhados.</li>
          </ul>
          <p>
            Para exercer qualquer um desses direitos, entre em contato pelo e-mail{" "}
            <a href="mailto:contato@basilicopizzas.com.br" className="text-gold-soft underline hover:no-underline">
              contato@basilicopizzas.com.br
            </a>{" "}
            ou pelo WhatsApp <strong>(83) 99322-8832</strong>. Responderemos em até 15 dias úteis.
          </p>
        </Section>

        <Section title="7. Segurança">
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Comunicação criptografada via HTTPS (TLS 1.2+).</li>
            <li>Acesso ao banco de dados restrito por políticas de segurança em nível de linha (RLS).</li>
            <li>Credenciais e chaves de API armazenadas em variáveis de ambiente seguras, nunca expostas no código.</li>
            <li>Acesso administrativo protegido por senha.</li>
          </ul>
          <p>
            Em caso de incidente de segurança que possa afetar seus dados, comunicaremos você e a Autoridade
            Nacional de Proteção de Dados (ANPD) conforme exigido pela lei.
          </p>
        </Section>

        <Section title="8. Cookies e rastreamento">
          <p>
            Nosso site não utiliza cookies de rastreamento, publicidade ou análise de terceiros.
            Utilizamos apenas o armazenamento local do navegador (<em>localStorage</em>) para manter
            seu carrinho de compras ativo durante a visita — essas informações ficam exclusivamente no
            seu dispositivo e não são enviadas a nenhum servidor.
          </p>
        </Section>

        <Section title="9. Alterações nesta política">
          <p>
            Podemos atualizar esta política periodicamente. A data da última revisão sempre ficará indicada
            no topo da página. Alterações relevantes serão comunicadas de forma destacada no site.
          </p>
          <p>
            O uso continuado do site após a publicação de alterações implica aceitação da política atualizada.
          </p>
        </Section>

        <Section title="10. Contato e reclamações">
          <p>
            Dúvidas, solicitações ou reclamações relacionadas à privacidade podem ser enviadas para:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>E-mail:</strong>{" "}
              <a href="mailto:contato@basilicopizzas.com.br" className="text-gold-soft underline hover:no-underline">
                contato@basilicopizzas.com.br
              </a>
            </li>
            <li>
              <strong>WhatsApp:</strong>{" "}
              <a href="https://wa.me/5583993228832" target="_blank" rel="noopener noreferrer" className="text-gold-soft underline hover:no-underline">
                (83) 99322-8832
              </a>
            </li>
          </ul>
          <p>
            Caso sua solicitação não seja atendida de forma satisfatória, você tem o direito de apresentar
            reclamação à{" "}
            <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-gold-soft underline hover:no-underline">
              Autoridade Nacional de Proteção de Dados (ANPD)
            </a>.
          </p>
        </Section>

        <div className="mt-12 border-t border-border pt-8 text-center text-xs text-muted">
          © {new Date().getFullYear()} Basílico Pizzas · João Pessoa/PB ·{" "}
          <Link href="/" className="hover:text-foreground transition">
            Voltar ao cardápio
          </Link>
        </div>
      </main>
    </div>
  );
}
