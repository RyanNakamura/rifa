// Listas de nomes e sobrenomes brasileiros
const firstNames = [
  'Ana', 'Maria', 'João', 'José', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Marcos', 'Antonio',
  'Francisco', 'Daniel', 'Rafael', 'Felipe', 'Bruno', 'Eduardo', 'Roberto', 'Fernando', 'Gustavo', 'Diego',
  'Gabriel', 'Rodrigo', 'Alexandre', 'Adriano', 'Fabio', 'Marcelo', 'Julio', 'Andre', 'Leandro', 'Thiago',
  'Juliana', 'Patricia', 'Fernanda', 'Adriana', 'Marcia', 'Leticia', 'Carla', 'Camila', 'Priscila', 'Vanessa',
  'Sandra', 'Monica', 'Claudia', 'Simone', 'Cristina', 'Luciana', 'Renata', 'Daniela', 'Tatiana', 'Viviane'
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
  'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
  'Rocha', 'Dias', 'Monteiro', 'Mendes', 'Cardoso', 'Reis', 'Araujo', 'Cavalcanti', 'Nascimento', 'Moreira',
  'Campos', 'Freitas', 'Cunha', 'Pinto', 'Farias', 'Castro', 'Correia', 'Teixeira', 'Machado', 'Nunes'
];

// Domínios de email comuns
const emailDomains = [
  'gmail.com', 'hotmail.com', 'yahoo.com.br', 'outlook.com', 'uol.com.br', 
  'terra.com.br', 'ig.com.br', 'bol.com.br', 'globo.com', 'r7.com'
];

// Função para gerar CPF válido
export function generateValidCPF(): string {
  const cpf = [];
  
  // Gera os 9 primeiros dígitos
  for (let i = 0; i < 9; i++) {
    cpf[i] = Math.floor(Math.random() * 10);
  }
  
  // Calcula o primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += cpf[i] * (10 - i);
  }
  let remainder = sum % 11;
  cpf[9] = remainder < 2 ? 0 : 11 - remainder;
  
  // Calcula o segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += cpf[i] * (11 - i);
  }
  remainder = sum % 11;
  cpf[10] = remainder < 2 ? 0 : 11 - remainder;
  
  return cpf.join('');
}

// Função para gerar telefone válido
export function generateValidPhone(): string {
  const ddd = Math.floor(Math.random() * 89) + 11; // DDDs de 11 a 99
  const firstDigit = Math.random() > 0.5 ? 9 : 8; // 9 para celular, 8 para fixo
  const remainingDigits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  
  return `${ddd}${firstDigit}${remainingDigits}`;
}

// Função para gerar nome completo aleatório
export function generateRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName1 = lastNames[Math.floor(Math.random() * lastNames.length)];
  const lastName2 = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  // Evita sobrenomes iguais
  const finalLastName2 = lastName2 === lastName1 
    ? lastNames[(lastNames.indexOf(lastName1) + 1) % lastNames.length]
    : lastName2;
  
  return `${firstName} ${lastName1} ${finalLastName2}`;
}

// Função para gerar email aleatório
export function generateRandomEmail(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)].toLowerCase();
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)].toLowerCase();
  const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
  const randomNumber = Math.floor(Math.random() * 999) + 1;
  
  return `${firstName}.${lastName}${randomNumber}@${domain}`;
}

// Função principal para gerar dados aleatórios completos
export function generateRandomUserData() {
  return {
    name: generateRandomName(),
    email: generateRandomEmail(),
    cpf: generateValidCPF(),
    phone: generateValidPhone()
  };
}