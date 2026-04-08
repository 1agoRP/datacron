/**
 * Datacron Intelligence Utils
 * Regras de Senha aplicadas automaticamente por concessionária.
 */

export function generatePdfPassword(concessionaria: 'Enel' | 'Sabesp' | 'Comgás' | string, cnpj: string): string {
  // Limpa o CNPJ de formatações (pontos, barras, traços)
  const cleanCnpj = cnpj.replace(/\D/g, '');

  switch (concessionaria.toLowerCase()) {
    case 'enel':
      // Regra: 5 primeiros dígitos do CNPJ
      return cleanCnpj.substring(0, 5);
    
    case 'sabesp':
    case 'comgás':
    case 'comgas':
      // Regra: 3 primeiros dígitos do CNPJ
      return cleanCnpj.substring(0, 3);
    
    default:
      // Fallback: Retorna null ou mensagem de erro para revisão manual
      return '';
  }
}

/**
 * Utilitário para formatar moedas
 */
export function formatCurrency(value: number): string {
  const ceiledValue = Math.ceil(value * 100) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ceiledValue);
}

/**
 * Utilitário para formatar moedas com arredondamento para cima e retornando apenas o valor (sem R$)
 * Isso é útil para lugares onde o 'R$' já é renderizado fora da máscara
 */
export function formatCurrencyCeil(value: number): string {
  const ceiledValue = Math.ceil(value * 100) / 100;
  return ceiledValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Utilitário para formatar datas no padrão BR
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

/**
 * Lógica de Identificação de Variação Relevante
 */
export function isVariationRelevant(currentValue: number, averageValue: number, threshold = 0.2): boolean {
  const variation = Math.abs(currentValue - averageValue) / averageValue;
  return variation > threshold;
}
