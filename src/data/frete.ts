// Tabela de frete por bairro (João Pessoa e região).
// Os valores abaixo são a BASE; o frete cobrado adiciona R$0,99 a cada valor.
const FRETE_BASE: Record<string, number> = {
  "aeroclube": 9.99,
  "agua fria": 15.99,
  "altiplano cabo branco": 10.99,
  "anatolia": 12.99,
  "alto do mateus": 20.99,
  "bairro dos estados": 10.99,
  "bairro dos ipes": 10.99,
  "bairro das industrias": 22.99,
  "bairro dos novais": 18.99,
  "bancarios": 13.99,
  "bela vista": 13.99,
  "bessa": 10.99,
  "brisamar": 8.99,
  "bayeux": 22.99,
  "cabo branco": 9.99,
  "camboinha": 16.99,
  "castelo branco": 12.99,
  "centro joao pessoa": 13.99,
  "centro": 13.99,
  "centro cabedelo": 20.99,
  "centro santa rita": 27.99,
  "costa e silva": 20.99,
  "cristo redentor": 15.99,
  "cruz das armas": 17.99,
  "cuia": 17.99,
  "costa do sol": 18.99,
  "colibris": 15.99,
  "jaguaribe": 12.99,
  "ernani satiro": 18.99,
  "ernesto geisel": 17.99,
  "expedicionarios": 10.99,
  "funcionarios": 18.99,
  "gramame": 28.99,
  "grotao": 20.99,
  "ilha do bispo": 18.99,
  "intermares": 13.99,
  "jardim cidade universitaria": 13.99,
  "jardim sao paulo": 13.99,
  "jardim oceania": 10.99,
  "jardim planalto": 18.99,
  "joao agripino": 9.99,
  "jardim c. universitaria": 12.99,
  "joao paulo ii": 18.99,
  "jose americo": 15.99,
  "manaira": 7.99,
  "mandacaru": 10.99,
  "mangabeira": 16.99,
  "miramar": 9.99,
  "mucumagro": 22.99,
  "oitizeiro": 20.99,
  "varjao": 15.99,
  "padre ze": 10.99,
  "paratibe": 22.99,
  "pedro gondim": 10.99,
  "penha": 15.99,
  "poco": 15.99,
  "ponta de campina": 14.99,
  "ponta dos seixas": 15.99,
  "portal do sol": 12.99,
  "renascer": 12.99,
  "roger": 11.99,
  "santa rita": 28.99,
  "sao jose": 8.99,
  "tambau": 8.99,
  "tambauzinho": 10.99,
  "tambia": 12.99,
  "torre": 10.99,
  "treze de maio": 11.99,
  "trincheiras": 13.99,
  "varadouro": 12.99,
  "valentina": 20.99,
};

const SURCHARGE = 0.99;

/** Normaliza um nome de bairro: minúsculas, sem acentos, espaços colapsados. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Retorna o valor do frete (base + R$0,99) para o bairro, ou null se não estiver
 * na tabela de cobertura.
 */
export function lookupFrete(neighborhood: string): number | null {
  if (!neighborhood?.trim()) return null;
  const base = FRETE_BASE[normalize(neighborhood)];
  if (base == null) return null;
  return Math.round((base + SURCHARGE) * 100) / 100;
}
