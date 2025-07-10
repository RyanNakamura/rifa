import React from 'react';

const PaymentSuccessScreen: React.FC = () => {
  const handleWhatsAppClick = () => {
    const message = encodeURIComponent('Quero resgatar meu premio agora!');
    window.open(`https://wa.me/5563992141134?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 pb-24">
      <div className="bg-white rounded-2xl p-4 max-w-md w-full mx-auto shadow-2xl max-h-full overflow-y-auto">
        <div className="text-center space-y-2">
          <div className="text-2xl mb-2">🎉</div>
          
          <h1 className="text-lg font-bold text-gray-800 mb-2">
            Parabéns! Você é o milésimo comprador da Super Rifa!
          </h1>
          
          <div className="text-2xl mb-2">🎉</div>
          
          <div className="space-y-1 text-gray-700">
            <p className="font-medium text-sm">
              E como forma de agradecimento, você acabou de desbloquear um prêmio exclusivo.
            </p>
            
            <p className="font-semibold text-xs">
              Sim, é isso mesmo…
            </p>
            
            <p className="text-red-600 font-bold text-xs">
              👉 Mas atenção: para receber, você precisa chamar AGORA no WhatsApp.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-1.5">
              <p className="text-yellow-800 font-semibold text-xs">
                ⏳ O prêmio só será liberado nas próximas 2 horas.
              </p>
              <p className="text-red-600 font-bold text-xs">
                Se passar do tempo… perde!
              </p>
            </div>
          </div>
          
          <button
            onClick={handleWhatsAppClick}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-xl text-sm transition-colors duration-200 mt-3 animate-pulse"
          >
            🎁 CLIQUE AQUI para garantir seu prêmio
          </button>
          
          <p className="text-xs text-gray-500 italic">
            (Mas seja rápido, essa chance é única.)
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessScreen;