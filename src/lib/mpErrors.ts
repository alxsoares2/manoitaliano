// Traduz os status_detail de recusa do Mercado Pago em mensagens amigáveis.
// Referência: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/response-handling/collection-results
const CARD_ERROR_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: "Número do cartão incorreto. Confira e tente novamente.",
  cc_rejected_bad_filled_date: "Data de validade incorreta. Confira e tente novamente.",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) incorreto. Confira e tente novamente.",
  cc_rejected_bad_filled_other: "Dados do cartão incorretos. Revise as informações e tente novamente.",
  cc_rejected_insufficient_amount: "Cartão sem saldo ou limite suficiente. Tente outro cartão.",
  cc_rejected_high_risk: "Pagamento recusado por segurança. Tente outro cartão ou use PIX.",
  cc_rejected_call_for_authorize: "Seu banco precisa autorizar o pagamento. Entre em contato com ele e tente novamente.",
  cc_rejected_card_disabled: "Cartão desabilitado. Ligue para o seu banco para ativá-lo.",
  cc_rejected_duplicated_payment: "Pagamento duplicado. Você já realizou um pagamento com esse valor.",
  cc_rejected_card_error: "Não foi possível processar o cartão. Tente novamente em instantes.",
  cc_rejected_max_attempts: "Você atingiu o limite de tentativas. Tente outro cartão ou use PIX.",
  cc_rejected_invalid_installments: "Número de parcelas inválido para este cartão.",
  cc_rejected_blacklist: "Cartão não autorizado. Tente outro cartão ou use PIX.",
  cc_rejected_other_reason: "O banco recusou o pagamento. Tente outro cartão ou use PIX.",
};

export function friendlyCardError(statusDetail?: string | null): string {
  if (statusDetail && CARD_ERROR_MESSAGES[statusDetail]) {
    return CARD_ERROR_MESSAGES[statusDetail];
  }
  return "Pagamento não aprovado. Verifique os dados do cartão ou tente outro meio de pagamento.";
}
