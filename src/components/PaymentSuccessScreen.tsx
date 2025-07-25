import React, { useState } from 'react';
import { gerarPix } from '../services/pixService';
import { Copy, Download, X } from 'lucide-react';

interface PaymentSuccessScreenProps {
  purchasedNumbers?: number;
  customerData?: {
    name: string;
    email: string;
    cpf: string;
    phone: string;
  };
  utmParams?: string;
}

const PaymentSuccessScreen: React.FC<PaymentSuccessScreenProps> = ({ 
  purchasedNumbers = 20, 
  customerData,
  utmParams = ''
}) => {
  const [showBoostOffer, setShowBoostOffer] = useState(true);
  const [isGeneratingBoostPix, setIsGeneratingBoostPix] = useState(false);
  const [boostPixData, setBoostPixData] = useState(null);
  const [showBoostPixModal, setShowBoostPixModal] = useState(false);

  // Gerar números aleatórios únicos para as rifas
  const generateRandomNumbers = (count: number) => {
    const numbers = new Set<number>();
    while (numbers.size < count) {
      numbers.add(Math.floor(Math.random() * 25000));
    }
    return Array.from(numbers).sort((a, b) => a - b);
  };

  const rifaNumbers = generateRandomNumbers(purchasedNumbers);

  const handleBoostClick = async () => {
    if (!customerData) {
      alert('Dados do cliente não encontrados');
      return;
    }

    setIsGeneratingBoostPix(true);
    
    try {
      const amountCentavos = 4900; // R$49,00 em centavos
      const itemName = '50.000 rifas - Boost de Chance';
      
      const pixResponse = await gerarPix(
        customerData.name,
        customerData.email,
        customerData.cpf,
        customerData.phone,
        amountCentavos,
        itemName,
        utmParams
      );
      
      setBoostPixData(pixResponse);
      setShowBoostPixModal(true);
      setShowBoostOffer(false);
      
    } catch (error) {
      console.error('Erro ao gerar PIX do boost:', error);
      alert(`Erro ao gerar PIX: ${error.message}`);
    } finally {
      setIsGeneratingBoostPix(false);
    }
  };

  const copyBoostPixCode = () => {
    if (boostPixData?.pixCode) {
      navigator.clipboard.writeText(boostPixData.pixCode);
      alert('Código PIX copiado!');
    }
  };

  const downloadBoostQRCode = () => {
    if (boostPixData?.pixQrCode) {
      const link = document.createElement('a');
      link.href = boostPixData.pixQrCode;
      link.download = 'qrcode-pix-boost.png';
      link.click();
    }
  };

  const handleCloseBoostPixModal = () => {
    setShowBoostPixModal(false);
    setBoostPixData(null);
  };

  if (showBoostPixModal && boostPixData) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 pb-24">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto shadow-2xl max-h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-green-800">
              💳 PAGAMENTO BOOST
            </h2>
            <button 
              onClick={handleCloseBoostPixModal}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Informações do Boost */}
          <div className="bg-gradient-to-r from-orange-100 to-red-200 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-black text-red-900 mb-1">
                50.000 rifas - Boost
              </div>
              <div className="text-2xl font-black text-red-800">
                R$49,00
              </div>
              <div className="text-sm text-red-700">
                +36% de chance de ganhar!
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
              <img 
                src={boostPixData.pixQrCode} 
                alt="QR Code PIX Boost" 
                className="w-48 h-48 mx-auto"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Escaneie o QR Code com seu app do banco
            </p>
          </div>

          {/* Código PIX */}
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2 text-sm">
              Ou copie o código PIX:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={boostPixData.pixCode}
                readOnly
                className="flex-1 p-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-xs font-mono"
              />
              <button
                onClick={copyBoostPixCode}
                className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-3">
            <button
              onClick={downloadBoostQRCode}
              className="w-full bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              BAIXAR QR CODE
            </button>
            
            <button
              onClick={copyBoostPixCode}
              className="w-full bg-green-500 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              COPIAR CÓDIGO PIX
            </button>
          </div>

          {/* Instruções */}
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-bold text-orange-800 mb-2">🚀 Boost Ativado!</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Pague o PIX para ativar o boost</li>
              <li>• +50.000 rifas serão adicionadas</li>
              <li>• +36% de chance de ganhar</li>
              <li>• Confirmação por WhatsApp</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 pb-24">
      <div className="bg-white rounded-2xl p-4 max-w-md w-full mx-auto shadow-2xl max-h-full overflow-y-auto">
        {showBoostOffer ? (
          <>
            {/* Números das Rifas */}
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 mb-3">
                🎉 Seus Números da Sorte! 🎉
              </h2>
              
              <div className="bg-green-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  Você comprou {purchasedNumbers} rifas:
                </p>
                
                <div className="grid grid-cols-5 gap-1 max-h-32 overflow-y-auto">
                  {rifaNumbers.map((number, index) => (
                    <div
                      key={index}
                      className="bg-green-500 text-white text-xs font-bold py-1 px-2 rounded text-center"
                    >
                      {number.toString().padStart(5, '0')}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Oferta de Boost */}
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-3 rounded-lg">
                <h3 className="font-black text-center text-sm mb-2">
                  ATENÇÃO — OPORTUNIDADE DE BOOST DESBLOQUEADA
                </h3>
              </div>
              
              <div className="text-gray-700 text-sm space-y-2">
                <p>
                  Você acaba de ativar a chance de turbinar suas probabilidades no sorteio da Super Rifa.
                </p>
                
                <div className="bg-blue-50 p-2 rounded">
                  <p className="font-semibold">💡 Como funciona:</p>
                  <p className="text-xs">
                    Essa oferta aparece só uma vez e é exclusiva pra quem já entrou no jogo.
                  </p>
                </div>
                
                <div className="bg-red-50 p-2 rounded">
                  <p className="font-bold text-red-600">
                    🔥 Compre 50.000 rifas por apenas R$49,00
                  </p>
                  <p className="text-xs">
                    e aumente em até 36% suas chances reais de ganhar o prêmio.
                  </p>
                </div>
                
                <p className="text-xs">
                  📈 É como dar um salto na frente dos outros — 
                  Enquanto muitos vão depender da sorte, você tá escolhendo estratégia.
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
                  <p className="font-bold text-yellow-800 text-xs">
                    🕒 Mas só vale agora. Quando essa tela fechar, já era.
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleBoostClick}
                disabled={isGeneratingBoostPix}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors duration-200 animate-pulse disabled:opacity-50"
              >
                {isGeneratingBoostPix ? 'GERANDO PIX...' : '👉 QUERO O BOOST DE CHANCE'}
              </button>
              
              <button
                onClick={() => setShowBoostOffer(false)}
                className="w-full text-gray-500 text-xs py-2"
              >
                Não, obrigado. Continuar sem boost.
              </button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-3">
            <div className="text-2xl mb-2">🎉</div>
            
            <h1 className="text-lg font-bold text-gray-800 mb-2">
              Parabéns! Seus números foram confirmados!
            </h1>
            
            <div className="bg-green-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-semibold text-green-800 mb-2">
                Seus {purchasedNumbers} números:
              </p>
              
              <div className="grid grid-cols-5 gap-1 max-h-32 overflow-y-auto">
                {rifaNumbers.map((number, index) => (
                  <div
                    key={index}
                    className="bg-green-500 text-white text-xs font-bold py-1 px-2 rounded text-center"
                  >
                    {number.toString().padStart(5, '0')}
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-sm text-gray-600">
              Boa sorte no sorteio! 🍀
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-xl text-sm transition-colors duration-200"
            >
              VOLTAR AO INÍCIO
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessScreen;