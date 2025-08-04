import React, { useState } from 'react';
import { Trophy, Gift, Star, Users, Clock, Shield, CheckCircle, User, Mail, Phone, CreditCard, Hash } from 'lucide-react';
import PaymentScreen from './components/PaymentScreen';
import RouletteScreen from './components/RouletteScreen';
import TaxPaymentScreen from './components/TaxPaymentScreen';
import { gerarPix } from './services/pixService';
import { validateCpf, formatCpf, cleanCpf } from './services/cpfValidationService';
import { PixResponse } from './types';
import { getUtmParamsFromSession } from './utils/utmTracker';

function App() {
  // Estados principais
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [showTaxPayment, setShowTaxPayment] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [winningNumber, setWinningNumber] = useState(0);

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    quantity: 20
  });

  // Estados de validação
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isValidatingCpf, setIsValidatingCpf] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formattedCpf = formatCpf(value);
      setFormData(prev => ({ ...prev, [name]: formattedCpf }));
      
      // Limpar erro do CPF quando o usuário começar a digitar
      if (errors.cpf) {
        setErrors(prev => ({ ...prev, cpf: '' }));
      }
    } else if (name === 'phone') {
      // Formatar telefone
      const numbers = value.replace(/\D/g, '');
      let formattedPhone = numbers;
      
      if (numbers.length <= 11) {
        if (numbers.length > 6) {
          formattedPhone = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
        } else if (numbers.length > 2) {
          formattedPhone = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        } else if (numbers.length > 0) {
          formattedPhone = `(${numbers}`;
        }
      }
      
      setFormData(prev => ({ ...prev, [name]: formattedPhone }));
    } else if (name === 'quantity') {
      const numValue = parseInt(value) || 1;
      const clampedValue = Math.max(1, Math.min(1000, numValue));
      setFormData(prev => ({ ...prev, [name]: clampedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = async () => {
    const newErrors: {[key: string]: string} = {};

    // Validar nome
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Validar CPF
    const cleanedCpf = cleanCpf(formData.cpf);
    if (!cleanedCpf) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (cleanedCpf.length !== 11) {
      newErrors.cpf = 'CPF deve ter 11 dígitos';
    } else {
      setIsValidatingCpf(true);
      try {
        const cpfValidation = await validateCpf(cleanedCpf);
        if (!cpfValidation.valid) {
          newErrors.cpf = cpfValidation.message || 'CPF inválido';
        }
      } catch (error) {
        console.error('Erro ao validar CPF:', error);
        newErrors.cpf = 'Erro ao validar CPF. Tente novamente.';
      } finally {
        setIsValidatingCpf(false);
      }
    }

    // Validar telefone
    const phoneNumbers = formData.phone.replace(/\D/g, '');
    if (!phoneNumbers) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      newErrors.phone = 'Telefone deve ter 10 ou 11 dígitos';
    }

    // Validar quantidade
    if (formData.quantity < 1) {
      newErrors.quantity = 'Quantidade deve ser pelo menos 1';
    } else if (formData.quantity > 1000) {
      newErrors.quantity = 'Quantidade máxima é 1000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;

    setIsGeneratingPix(true);

    try {
      const cleanedCpf = cleanCpf(formData.cpf);
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      const amountCentavos = formData.quantity * 50; // R$ 0,50 por bilhete
      const itemName = `${formData.quantity} bilhetes - Super Rifa SW4 + BMW`;
      
      // Capturar UTMs do sessionStorage
      const utmQuery = getUtmParamsFromSession();
      console.log('UTMs capturados para envio:', utmQuery);
      
      const pixResponse = await gerarPix(
        formData.name,
        formData.email,
        cleanedCpf,
        cleanedPhone,
        amountCentavos,
        itemName,
        utmQuery
      );
      
      setPixData(pixResponse);
      setShowPaymentScreen(true);
      
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      alert(`Erro ao gerar PIX: ${error.message}`);
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const handlePaymentConfirmed = () => {
    setShowPaymentScreen(false);
    setShowRoulette(true);
  };

  const handleRouletteComplete = () => {
    // Gerar número vencedor aleatório
    const randomWinningNumber = Math.floor(Math.random() * 25000);
    setWinningNumber(randomWinningNumber);
    setShowRoulette(false);
    setShowTaxPayment(true);
  };

  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Renderizar telas condicionalmente
  if (showTaxPayment) {
    return (
      <TaxPaymentScreen
        customerName={formData.name}
        winningNumber={winningNumber}
        prizeAmount={15000}
      />
    );
  }

  if (showRoulette) {
    return (
      <RouletteScreen
        onComplete={handleRouletteComplete}
        customerName={formData.name}
      />
    );
  }

  if (showPaymentScreen && pixData) {
    return (
      <PaymentScreen
        pixData={pixData}
        onPaymentConfirmed={handlePaymentConfirmed}
        purchasedNumbers={formData.quantity}
        totalAmount={formData.quantity * 50}
        customerName={formData.name}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background com gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        
        {/* Imagem de fundo */}
        <div className="relative h-96 bg-cover bg-center" style={{
          backgroundImage: 'url("https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1")'
        }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20"></div>
          
          {/* Conteúdo do Hero */}
          <div className="relative z-10 flex items-center justify-center h-full text-center text-white px-4">
            <div>
              <h1 className="text-4xl md:text-6xl font-black mb-4 text-yellow-300">
                🏆 SUPER RIFA 🏆
              </h1>
              <p className="text-xl md:text-2xl font-bold mb-2">
                SW4 0KM + MOTO BMW
              </p>
              <p className="text-lg text-yellow-200">
                Por apenas R$ 0,50 por número!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Prêmios */}
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center text-white mb-8">
            🎁 PRÊMIOS INCRÍVEIS 🎁
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Prêmio Principal */}
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-center shadow-2xl">
              <div className="text-4xl mb-4">🚗</div>
              <h3 className="text-2xl font-black text-white mb-2">1º PRÊMIO</h3>
              <p className="text-xl font-bold text-white mb-2">SW4 0KM</p>
              <p className="text-white/80">Toyota Hilux SW4 Zero Quilômetro</p>
            </div>

            {/* Segundo Prêmio */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-center shadow-2xl">
              <div className="text-4xl mb-4">🏍️</div>
              <h3 className="text-2xl font-black text-white mb-2">2º PRÊMIO</h3>
              <p className="text-xl font-bold text-white mb-2">MOTO BMW</p>
              <p className="text-white/80">BMW G 310 GS Zero Quilômetro</p>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-yellow-300">25.000</div>
              <div className="text-sm text-white/80">Números Disponíveis</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-green-400">R$ 0,50</div>
              <div className="text-sm text-white/80">Por Número</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-blue-400">100%</div>
              <div className="text-sm text-white/80">Transparente</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-orange-400">LOTEP</div>
              <div className="text-sm text-white/80">Auditado</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de Participação */}
      <div className="py-12 px-4 bg-white/5 backdrop-blur-sm">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-center text-gray-800 mb-6">
              🎯 PARTICIPE AGORA!
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full p-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
                  }`}
                  placeholder="Digite seu nome completo"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full p-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
                  }`}
                  placeholder="seu@email.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* CPF */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  CPF
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  className={`w-full p-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.cpf ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
                  }`}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {isValidatingCpf && (
                  <p className="text-blue-500 text-sm mt-1">Validando CPF...</p>
                )}
                {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Telefone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full p-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
                  }`}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  <Hash className="w-4 h-4 inline mr-2" />
                  Quantidade de Números
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  max="1000"
                  className={`w-full p-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.quantity ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
                  }`}
                />
                {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
                
                {/* Valor Total */}
                <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-sm text-green-700">Valor Total:</div>
                    <div className="text-2xl font-black text-green-800">
                      {formatCurrency(formData.quantity * 50)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Submit */}
              <button
                type="submit"
                disabled={isGeneratingPix || isValidatingCpf}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingPix ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    GERANDO PIX...
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5" />
                    PARTICIPAR AGORA
                  </>
                )}
              </button>
            </form>

            {/* Informações de Segurança */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Seguro</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Auditado</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-green-600" />
                  <span>Transparente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <footer className="py-8 px-4 bg-black/20">
        <div className="max-w-4xl mx-auto text-center text-white/80">
          <p className="text-sm">
            © 2024 Super Rifa. Sorteio auditado pela LOTEP. 
            Jogue com responsabilidade.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;