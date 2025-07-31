import React from 'react';
import { X } from 'lucide-react';

interface OrderBumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  isLoading?: boolean;
}

const OrderBumpModal: React.FC<OrderBumpModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl text-white relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎯</div>
          <h2 className="text-2xl font-black mb-2">
            OFERTA IMPERDÍVEL
          </h2>
          <p className="text-amber-100 text-sm">
            Aumente as suas chances de ganhar
          </p>
        </div>

        {/* Oferta Principal */}
        <div className="bg-white/10 rounded-xl p-4 mb-6 border-2 border-dashed border-white/30">
          <div className="text-center">
            <p className="text-lg font-bold mb-2">
              Adicionar <span className="text-yellow-300">+ 20 bilhetes</span> por apenas
            </p>
            <div className="text-3xl font-black text-yellow-300 mb-2">
              R$ 9,99
            </div>
            <p className="text-sm text-amber-100">
              Mais chances = Mais possibilidades de ganhar!
            </p>
          </div>
        </div>

        {/* Detalhes da Oferta */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
            <p className="text-sm">Oferta válida apenas agora</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
            <p className="text-sm">Números extras sorteados automaticamente</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
            <p className="text-sm">Aumente suas chances em até 300%</p>
          </div>
        </div>

        {/* Botões */}
        <div className="space-y-3">
          <button
            onClick={onAccept}
            disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                PROCESSANDO...
              </div>
            ) : (
              '✅ PAGAR AGORA'
            )}
          </button>
          
          <button
            onClick={onDecline}
            disabled={isLoading}
            className="w-full text-white/80 hover:text-white text-sm py-2 transition-colors duration-200 disabled:opacity-50"
          >
            Não, obrigado. Continuar sem bilhetes extras.
          </button>
        </div>

        {/* Urgência */}
        <div className="mt-4 text-center">
          <p className="text-xs text-amber-100">
            ⏰ Esta oferta expira quando você sair desta tela
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderBumpModal;