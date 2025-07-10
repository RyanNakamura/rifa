const CPF_VALIDATION_API_URL = 'https://apela-api.tech/';
const USER_ID = 'c2af4c30-ed08-4672-9b8a-f172ca2880cd';

export interface CpfValidationResponse {
  valid: boolean;
  message?: string;
  data?: any;
}

export async function validateCpf(cpf: string): Promise<CpfValidationResponse> {
  if (!cpf || cpf.length !== 11) {
    return {
      valid: false,
      message: 'CPF deve ter 11 dígitos'
    };
  }

  try {
    const url = `${CPF_VALIDATION_API_URL}?user=${USER_ID}&cpf=${cpf}`;
    
    console.log('Validating CPF with API:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('CPF validation API error:', response.status);
      return {
        valid: false,
        message: 'Erro ao validar CPF. Tente novamente.'
      };
    }

    const data = await response.json();
    console.log('CPF validation response:', data);

    // Assumindo que a API retorna um objeto com informações sobre a validade
    // Ajuste conforme a estrutura real da resposta da API
    return {
      valid: true,
      data: data
    };

  } catch (error) {
    console.error('Error validating CPF:', error);
    return {
      valid: false,
      message: 'Erro de conexão. Verifique sua internet e tente novamente.'
    };
  }
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