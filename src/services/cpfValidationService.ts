const CPF_VALIDATION_API_URL = 'https://apela-api.tech/api/cpf';
const CPF_VALIDATION_API_URL_BASE = 'https://apela-api.tech/';
const USER_ID = 'c2af4c30-ed08-4672-9b8a-f172ca2880cd';

export interface CpfValidationResponse {
  valid: boolean;
  message?: string;
  data?: {
    status: number;
    nome: string;
    mae: string;
    nascimento: string;
    sexo: string;
    cpf: string;
    requisicoes_restantes: number;
  };
}

export async function validateCpf(cpf: string): Promise<CpfValidationResponse> {
  if (!cpf || cpf.length !== 11) {
    return {
      valid: false,
      message: 'CPF deve ter 11 dígitos'
    };
  }

  // Validação básica de CPF (apenas formato)
  const isValidFormat = /^\d{11}$/.test(cpf);
  
  if (!isValidFormat) {
    return {
      valid: false,
      message: 'CPF deve conter apenas números'
    };
  }

  // Validação do algoritmo do CPF
  const isValidCpf = validateCpfAlgorithm(cpf);
  
  if (!isValidCpf) {
    return {
      valid: false,
      message: 'CPF inválido'
    };
  }

  return {
    valid: true,
    message: 'CPF válido'
  };
}

// Função para validar o algoritmo do CPF
function validateCpfAlgorithm(cpf: string): boolean {
  // CPFs com todos os dígitos iguais são inválidos
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  
  let remainder = (sum * 10) % 11;
  let digit1 = remainder === 10 ? 0 : remainder;

  if (digit1 !== parseInt(cpf.charAt(9))) {
    return false;
  }

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  let digit2 = remainder === 10 ? 0 : remainder;

  return digit2 === parseInt(cpf.charAt(10));
}

// Função para formatar CPF (xxx.xxx.xxx-xx)
export function formatCpf(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  } else if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  } else {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
}

// Função para limpar formatação do CPF
export function cleanCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}