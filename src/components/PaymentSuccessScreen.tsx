import React from 'react';

const PaymentSuccessScreen: React.FC = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5563992141134', '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl">
        <div className="text-center space-y-4">
          <div className="text-4xl mb-4">🎉</div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Parabéns! Você é o milésimo comprador da Super Rifa!
          </h1>
          
          <div className="text-4xl mb-4">🎉</div>
          
          <div className="space-y-3 text-gray-700">
            <p className="font-medium">
              E como forma de agradecimento, você acabou de desbloquear um prêmio exclusivo.
            </p>
            
            <p className="font-semibold">
              Sim, é isso mesmo…
            </p>
            
            <p className="text-red-600 font-bold">
              👉 Mas atenção: para receber, você precisa chamar AGORA no WhatsApp.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 font-semibold">
                ⏳ O prêmio só será liberado nas próximas 2 horas.
              </p>
              <p className="text-red-600 font-bold">
                Se passar do tempo… perde!
              </p>
            </div>
          </div>
          
          <button
            onClick={handleWhatsAppClick}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors duration-200 mt-6 animate-pulse"
          >
            🎁 CLIQUE AQUI para garantir seu prêmio
          </button>
          
          <p className="text-sm text-gray-500 italic">
            (Mas seja rápido, essa chance é única.)
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessScreen;