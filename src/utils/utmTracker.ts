/**
 * Utilitário para capturar dados UTM do sessionStorage
 * Usado para garantir que click_id e utm_source sejam sempre enviados para a RushPay
 */

export interface UtmData {
  click_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * Captura os dados UTM do sessionStorage onde o utm-handler.js os armazena
 * @returns string formatada como query parameters (ex: "click_id=123&utm_source=abc")
 */
export const getUtmParamsFromSession = (): string => {
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

        // Extrair os dados UTM do objeto
        const utmData: UtmData = {
          click_id: sessionObject.click_id,
          utm_source: sessionObject.utm_source,
          utm_medium: sessionObject.utm_medium,
          utm_campaign: sessionObject.utm_campaign,
          utm_term: sessionObject.utm_term,
          utm_content: sessionObject.utm_content
        };

        // Construir a query string
        const params: string[] = [];
        
        Object.entries(utmData).forEach(([key, value]) => {
          if (value && value.trim() !== '') {
            params.push(`${key}=${encodeURIComponent(value)}`);
          }
        });

        utmQuery = params.join('&');
        
        console.log('Dados UTM extraídos:', utmData);
        console.log('UTM Query construída:', utmQuery);
      }
    } catch (error) {
      console.error('Erro ao parsear dados do sessionStorage:', error);
      // Em caso de erro, utmQuery permanecerá vazia (fallback seguro)
    }
  } else {
    console.warn('Nenhum dado encontrado no sessionStorage para PREVIOUS_PAGE_VIEW');
  }

  return utmQuery;
};

/**
 * Fallback: tenta capturar UTMs diretamente da URL atual
 * Usado como backup caso o sessionStorage não tenha os dados
 */
export const getUtmParamsFromUrl = (): string => {
  const urlParams = new URLSearchParams(window.location.search);
  const params: string[] = [];

  // Lista de parâmetros UTM para capturar
  const utmParams = ['click_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  utmParams.forEach(param => {
    const value = urlParams.get(param);
    if (value && value.trim() !== '') {
      params.push(`${param}=${encodeURIComponent(value)}`);
    }
  });

  const utmQuery = params.join('&');
  console.log('UTM Query da URL (fallback):', utmQuery);
  
  return utmQuery;
};

/**
 * Função principal para obter dados UTM
 * Tenta primeiro do sessionStorage, depois da URL como fallback
 */
export const getUtmQuery = (): string => {
  // Primeiro tenta do sessionStorage (dados do utm-handler.js)
  let utmQuery = getUtmParamsFromSession();
  
  // Se não encontrou no sessionStorage, tenta da URL
  if (!utmQuery || utmQuery.trim() === '') {
    console.log('Tentando capturar UTMs da URL como fallback...');
    utmQuery = getUtmParamsFromUrl();
  }

  console.log('UTM Query final:', utmQuery);
  return utmQuery;
};