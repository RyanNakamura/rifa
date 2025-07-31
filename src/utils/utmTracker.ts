// Utilitário para capturar dados de UTM do sessionStorage
export function getUtmParamsFromSession(): string {
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