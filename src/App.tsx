import React, { useState, useEffect } from 'react';
import { Car, Gift, Users, Clock, Shield, CheckCircle, AlertCircle, Copy, QrCode } from 'lucide-react';
import { gerarPix, verificarStatusPagamento } from './services/pixService';
import { validateCpf, formatCpf, cleanCpf } from './services/cpfValidationService';
import { PixResponse } from './types';
import PaymentSuccessScreen from './components/PaymentSuccessScreen';

function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'cancelled' | 'expired'>('pending');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Função para obter parâmetros UTM do sessionStorage
  const getUtmParamsFromSession = () => {
    const sessionDataRaw = sessionStorage.getItem('PREVIOUS_PAGE_VIEW');
    let utmQuery = '';

    console.log('Dados brutos do sessionStorage (PREVIOUS_PAGE_VIEW):', sessionDataRaw);

    if (sessionDataRaw) {
      try {
        // O valor é um array que contém uma string JSON
        const sessionArray = JSON.parse(sessionDataRaw);
        if (Array.isArray(sessionArray) && sessionArray.length > 0) {
          const sessionObject = JSON.parse(sessionArray[0]);

          console.log('Objeto parseado do sessionStorage:', sessionObject);

          const clickId = sessionObject.click_id;
          const utmSource = sessionObject.utm_source;
          const fingerPrintId = sessionObject.finger_print_id;
          const productId = sessionObject.product_id;

          const params = [];
          if (clickId) {
            params.push(`click_id=${encodeURIComponent(clickId)}`);
          }
          if (utmSource) {
            params.push(`utm_source=${encodeURIComponent(utmSource)}`);
          }
          if (fingerPrintId) {
            params.push(`finger_print_id=${encodeURIComponent(fingerPrintId)}`);
          }
          if (productId) {
            params.push(`product_id=${encodeURIComponent(productId)}`);
          }

          utmQuery = params.join('&');

          console.log('UTM Query construída:', utmQuery);
        }
      } catch (error) {
        console.error('Erro ao parsear dados do sessionStorage:', error);
        // Em caso de erro, utmQuery permanecerá vazia, o que é um fallback seguro.
      }
    } else {
      console.log('Nenhum dado encontrado no sessionStorage para PREVIOUS_PAGE_VIEW');
    }

    return utmQuery;
  };

  // Verificar status do pagamento periodicamente
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (pixData && paymentStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const status = await verificarStatusPagamento(pixData.id);
          console.log('Status verificado:', status);
          
          if (status === 'APPROVED') {
            setPaymentStatus('approved');
            setShowPaymentSuccess(true);
            clearInterval(interval);
          } else if (status === 'CANCELLED' || status === 'EXPIRED') {
            setPaymentStatus(status.toLowerCase() as 'cancelled' | 'expired');
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 3000); // Verificar a cada 3 segundos
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [pixData, paymentStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formattedCpf = formatCpf(value);
      setFormData(prev => ({ ...prev, [name]: formattedCpf }));
      
      // Validar CPF em tempo real
      if (formattedCpf.length === 14) { // CPF formatado tem 14 caracteres
        const cleanedCpf = cleanCpf(formattedCpf);
        validateCpf(cleanedCpf).then(result => {
          if (!result.valid) {
            setCpfError(result.message || 'CPF inválido');
          } else {
            setCpfError('');
          }
        });
      } else {
        setCpfError('');
      }
    } else if (name === 'phone') {
      // Formatar telefone
      const phoneValue = value.replace(/\D/g, '');
      let formattedPhone = phoneValue;
      
      if (phoneValue.length <= 11) {
        if (phoneValue.length <= 2) {
          formattedPhone = phoneValue;
        } else if (phoneValue.length <= 7) {
          formattedPhone = `(${phoneValue.slice(0, 2)}) ${phoneValue.slice(2)}`;
        } else {
          formattedPhone = `(${phoneValue.slice(0, 2)}) ${phoneValue.slice(2, 7)}-${phoneValue.slice(7)}`;
        }
      }
      
      setFormData(prev => ({ ...prev, [name]: formattedPhone }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validar CPF antes de enviar
      const cleanedCpf = cleanCpf(formData.cpf);
      const cpfValidation = await validateCpf(cleanedCpf);
      
      if (!cpfValidation.valid) {
        setCpfError(cpfValidation.message || 'CPF inválido');
        setLoading(false);
        return;
      }

      // Obter parâmetros UTM do sessionStorage
      const utmQuery = getUtmParamsFromSession();
      console.log('UTM Query que será enviada para gerarPix:', utmQuery);

      // Limpar telefone para envio
      const cleanedPhone = formData.phone.replace(/\D/g, '');

      const response = await gerarPix(
        formData.name,
        formData.email,
        cleanedCpf,
        cleanedPhone,
        100, // R$ 1,00 em centavos
        'Número da Super Rifa - SW4 0KM + Moto BMW',
        utmQuery // Passar a UTM query capturada do sessionStorage
      );

      setPixData(response);
      setPaymentStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.pixCode) {
      try {
        await navigator.clipboard.writeText(pixData.pixCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Erro ao copiar:', err);
      }
    }
  };

  const resetForm = () => {
    setPixData(null);
    setPaymentStatus('pending');
    setError('');
    setCpfError('');
    setShowPaymentSuccess(false);
  };

  if (showPaymentSuccess) {
    return <PaymentSuccessScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <img 
          src="https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
          alt="SW4 Toyota" 
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-2xl font-black mb-1">SUPER RIFA</h1>
            <p className="text-sm font-medium">SW4 0KM + Moto BMW</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Prêmios */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <h2 className="text-white font-bold text-lg mb-3 text-center">🏆 Prêmios Incríveis</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl p-3 text-center">
              <Car className="w-8 h-8 mx-auto mb-1 text-yellow-800" />
              <p className="font-bold text-yellow-800 text-sm">SW4 0KM</p>
              <p className="text-xs text-yellow-700">Toyota Hilux</p>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-3 text-center">
              <Gift className="w-8 h-8 mx-auto mb-1 text-blue-100" />
              <p className="font-bold text-blue-100 text-sm">Moto BMW</p>
              <p className="text-xs text-blue-200">0 Quilômetro</p>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 text-center border border-white/20">
            <Users className="w-5 h-5 mx-auto mb-1 text-green-400" />
            <p className="text-white font-bold text-xs">8.547</p>
            <p className="text-white/80 text-xs">Participantes</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 text-center border border-white/20">
            <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
            <p className="text-white font-bold text-xs">15</p>
            <p className="text-white/80 text-xs">Dias</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 text-center border border-white/20">
            <Shield className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <p className="text-white font-bold text-xs">100%</p>
            <p className="text-white/80 text-xs">Seguro</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 text-center border border-white/20">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-400" />
            <p className="text-white font-bold text-xs">LOTEP</p>
            <p className="text-white/80 text-xs">Auditado</p>
          </div>
        </div>

        {/* Preço Destaque */}
        <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl p-4 text-center shadow-xl ring-4 ring-yellow-300">
          <p className="text-yellow-800 font-medium text-sm mb-1">Cada número por apenas</p>
          <p className="text-3xl font-black text-yellow-900">R$ 1,00</p>
          <p className="text-yellow-700 text-xs font-medium">💳 Pagamento via PIX instantâneo</p>
        </div>

        {!pixData ? (
          /* Formulário */
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <h3 className="text-white font-bold text-lg mb-4 text-center">🎯 Garantir Meu Número</h3>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  name="name"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/70 focus:border-yellow-400 focus:outline-none"
                />
              </div>
              
              <div>
                <input
                  type="email"
                  name="email"
                  placeholder="E-mail"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/70 focus:border-yellow-400 focus:outline-none"
                />
              </div>
              
              <div>
                <input
                  type="text"
                  name="cpf"
                  placeholder="CPF"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  maxLength={14}
                  required
                  className={`w-full px-3 py-2.5 rounded-xl bg-white/20 border text-white placeholder-white/70 focus:outline-none ${
                    cpfError ? 'border-red-500 focus:border-red-500' : 'border-white/30 focus:border-yellow-400'
                  }`}
                />
                {cpfError && (
                  <p className="text-red-400 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {cpfError}
                  </p>
                )}
              </div>
              
              <div>
                <input
                  type="text"
                  name="phone"
                  placeholder="Telefone/WhatsApp"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength={15}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/70 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-3">
                  <p className="text-red-100 text-sm flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!cpfError}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-yellow-900 font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-900 mr-2"></div>
                    Gerando PIX...
                  </div>
                ) : (
                  '🎯 GERAR PIX - R$ 1,00'
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Tela do PIX */
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="text-center mb-4">
              <h3 className="text-white font-bold text-lg mb-2">
                {paymentStatus === 'pending' && '⏳ Aguardando Pagamento'}
                {paymentStatus === 'approved' && '✅ Pagamento Aprovado!'}
                {paymentStatus === 'cancelled' && '❌ Pagamento Cancelado'}
                {paymentStatus === 'expired' && '⏰ PIX Expirado'}
              </h3>
              
              {paymentStatus === 'pending' && (
                <p className="text-white/80 text-sm">Escaneie o QR Code ou copie o código PIX</p>
              )}
            </div>

            {paymentStatus === 'pending' && (
              <>
                {/* QR Code */}
                <div className="bg-white rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-center mb-3">
                    <QrCode className="w-6 h-6 text-gray-600 mr-2" />
                    <span className="text-gray-700 font-medium">QR Code PIX</span>
                  </div>
                  <div className="flex justify-center">
                    <img 
                      src={pixData.pixQrCode} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 border-2 border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* Código PIX */}
                <div className="bg-white/20 rounded-xl p-3 mb-4">
                  <p className="text-white text-sm font-medium mb-2">Código PIX:</p>
                  <div className="bg-gray-800/50 rounded-lg p-2 mb-2">
                    <p className="text-white text-xs font-mono break-all leading-relaxed">
                      {pixData.pixCode}
                    </p>
                  </div>
                  <button
                    onClick={copyPixCode}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copied ? 'Copiado!' : 'Copiar Código PIX'}
                  </button>
                </div>

                {/* Status de verificação */}
                <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-3 mb-4">
                  <div className="flex items-center">
                    <div className="animate-pulse w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    <p className="text-blue-100 text-sm">Verificando pagamento automaticamente...</p>
                  </div>
                </div>
              </>
            )}

            {paymentStatus === 'approved' && (
              <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 text-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-green-100 font-medium">Seu número foi reservado com sucesso!</p>
                <p className="text-green-200 text-sm mt-1">Você receberá a confirmação por e-mail</p>
              </div>
            )}

            {(paymentStatus === 'cancelled' || paymentStatus === 'expired') && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 text-center mb-4">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <p className="text-red-100 font-medium">
                  {paymentStatus === 'cancelled' ? 'Pagamento foi cancelado' : 'PIX expirou'}
                </p>
                <p className="text-red-200 text-sm mt-1">Tente novamente para garantir seu número</p>
              </div>
            )}

            <button
              onClick={resetForm}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-xl transition-colors duration-200"
            >
              Voltar ao Formulário
            </button>
          </div>
        )}

        {/* Garantias */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <h3 className="text-white font-bold text-center mb-3">🛡️ Suas Garantias</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-white/90">
              <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
              <span>Sorteio auditado pela LOTEP</span>
            </div>
            <div className="flex items-center text-white/90">
              <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
              <span>Pagamento 100% seguro via PIX</span>
            </div>
            <div className="flex items-center text-white/90">
              <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
              <span>Transmissão ao vivo do sorteio</span>
            </div>
            <div className="flex items-center text-white/90">
              <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
              <span>Suporte 24h via WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;