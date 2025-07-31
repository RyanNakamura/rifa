// Utilitário para capturar dados de UTM do sessionStorage
export function getUtmParamsFromSession(): string {
  // Primeiro, tentar capturar UTMs da URL atual
  const urlParams = new URLSearchParams(window.location.search);
  const utmFromUrl = [];
  
  // Capturar UTMs da URL atual
  const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'click_id'];
  utmParams.forEach(param => {
    const value = urlParams.get(param);
    if (value) {
      utmFromUrl.push(`${param}=${encodeURIComponent(value)}`);
    }
  });
  
  if (utmFromUrl.length > 0) {
    console.log('UTMs capturados da URL atual:', utmFromUrl.join('&'));
    return utmFromUrl.join('&');
  }
  
  // Se não encontrou na URL, tentar no sessionStorage
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

        const params = [];
        if (clickId) {
          params.push(`click_id=${encodeURIComponent(clickId)}`);
        }
        if (utmSource) {
          params.push(`utm_source=${encodeURIComponent(utmSource)}`);
        }

        utmQuery = params.join('&');
        console.log('UTM Query construída:', utmQuery);
      }
    } catch (error) {
      console.error('Erro ao parsear dados do sessionStorage:', error);
      // Em caso de erro, utmQuery permanecerá vazia
    }
  }

  return utmQuery;
}

// Nova função para capturar UTMs diretamente da URL
export function getUtmParamsFromUrl(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const utmParams = [];
  
  // Lista de parâmetros UTM e outros parâmetros de tracking
  const trackingParams = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'click_id', 'fbclid', 'gclid', 'ttclid'
  ];
  
  trackingParams.forEach(param => {
    const value = urlParams.get(param);
    if (value) {
      utmParams.push(`${param}=${encodeURIComponent(value)}`);
    }
  });
  
  const result = utmParams.join('&');
  console.log('UTMs capturados da URL:', result);
  return result;
}