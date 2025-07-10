interface CPFResponse {
  status: number;
  nome: string;
  mae: string;
  nascimento: string;
  sexo: string;
  cpf: string;
  requisicoes_restantes: number;
}

const CPF_API_URL = 'https://apela-api.tech/';
const USER_ID = 'c2af4c30-ed08-4672-9b8a-f172ca2880cd';

export async function consultarCPF(cpf: string): Promise<CPFResponse | null> {
  // Remove formatação do CPF (pontos e traços)
  const cleanCPF = cpf.replace(/[.-]/g, '');
  
  // Valida se o CPF tem 11 dígitos
  if (cleanCPF.length !== 11) {
    throw new Error('CPF deve ter 11 dígitos');
  }

  try {
    const url = `${CPF_API_URL}?user=${USER_ID}&cpf=${cleanCPF}`;
    
    console.log('Consultando CPF:', cleanCPF);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('Erro na consulta do CPF:', response.status);
      return null;
    }

    const data: CPFResponse = await response.json();
    
    console.log('Resposta da API CPF:', data);
    
    // Verifica se a consulta foi bem-sucedida
    if (data.status === 200 && data.nome) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao consultar CPF:', error);
    return null;
  }
}

// Função para formatar CPF
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/[.-]/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Função para validar CPF
export function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/[.-]/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // CPFs com todos os dígitos iguais
  
  // Validação do algoritmo do CPF
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}