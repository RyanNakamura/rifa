// Utilitários para integração com xTracky
export interface XTrackyData {
  clickId: string;
  utmSource: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

// Função para capturar dados do xTracky da URL
export function captureXTrackyData(): XTrackyData | null {
  const urlParams = new URLSearchParams(window.location.search);
  const clickId = urlParams.get('click_id');
  const utmSource = urlParams.get('utm_source');
  
  if (!clickId || !utmSource) {
    return null;
  }
  
  const xTrackyData: XTrackyData = {
    clickId,
    utmSource,
    utmMedium: urlParams.get('utm_medium') || undefined,
    utmCampaign: urlParams.get('utm_campaign') || undefined,
    utmContent: urlParams.get('utm_content') || undefined,
    utmTerm: urlParams.get('utm_term') || undefined,
  };
  
  // Armazenar no localStorage para persistir durante a sessão
  localStorage.setItem('xtracky_data', JSON.stringify(xTrackyData));
  
  return xTrackyData;
}

// Função para recuperar dados do xTracky do localStorage
export function getStoredXTrackyData(): XTrackyData | null {
  try {
    const stored = localStorage.getItem('xtracky_data');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Erro ao recuperar dados do xTracky:', error);
    return null;
  }
}

// Função para construir query string das UTMs
export function buildUtmQuery(data: XTrackyData): string {
  const params = new URLSearchParams();
  
  if (data.utmSource) params.append('utm_source', data.utmSource);
  if (data.utmMedium) params.append('utm_medium', data.utmMedium);
  if (data.utmCampaign) params.append('utm_campaign', data.utmCampaign);
  if (data.utmContent) params.append('utm_content', data.utmContent);
  if (data.utmTerm) params.append('utm_term', data.utmTerm);
  if (data.clickId) params.append('click_id', data.clickId);
  
  return params.toString();
}

// Função para notificar conversão ao xTracky
export async function notifyXTrackyConversion(
  clickId: string, 
  conversionValue: number,
  orderId: string
): Promise<boolean> {
  try {
    // URL correta da API do xTracky para notificar conversões
    const conversionUrl = `https://apela-api.tech/api/conversion`;
    
    const conversionData = {
      click_id: clickId,
      conversion_value: conversionValue,
      order_id: orderId,
      currency: 'BRL',
      token: '07c0b4b9-312a-4bbd-bd76-b227ffdc6f1d' // Seu token xTracky
    };
    
    console.log('Notificando conversão ao xTracky:', conversionData);
    
    const response = await fetch(conversionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 07c0b4b9-312a-4bbd-bd76-b227ffdc6f1d`
      },
      body: JSON.stringify(conversionData)
    });
    
    if (response.ok) {
      console.log('Conversão notificada com sucesso ao xTracky');
      return true;
    } else {
      const errorText = await response.text();
      console.error('Erro ao notificar conversão ao xTracky:', response.status, response.statusText, errorText);
      return false;
    }
  } catch (error) {
    console.error('Erro ao notificar conversão ao xTracky:', error);
    return false;
  }
}