import { corsHeaders } from '../_shared/cors.ts';

const SECRET_KEY = 'c6b41266-2357-4a6c-8e07-aa3873690c1a';
const PUBLIC_KEY = '4307a311-e352-47cd-9d24-a3c05e90db0d';
const GHOSTSPAY_API_URL = 'https://app.ghostspaysv1.com/api/v1/transaction.purchase';

interface PixRequest {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  paymentMethod: 'PIX';
  amount: number;
  traceable: boolean;
  utmQuery?: string;
  items: Array<{
    unitPrice: number;
    title: string;
    quantity: number;
    tangible: boolean;
  }>;
}

interface PixResponse {
  pixQrCode: string;
  pixCode: string;
  status: string;
  id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    // Parse request body
    const requestBody: PixRequest = await req.json();
    
    console.log('PIX request received:', {
      email: requestBody.email,
      amount: requestBody.amount,
      utmQuery: requestBody.utmQuery
    });

    // Validate required fields
    if (!requestBody.name || !requestBody.email || !requestBody.cpf || 
        !requestBody.phone || !requestBody.amount || !requestBody.items) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Make request to GhostsPay API
    const response = await fetch(GHOSTSPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': SECRET_KEY,
        'X-Public-Key': PUBLIC_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('GhostsPay response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GhostsPay error:', errorText);
      
      let errorMessage = 'Erro no processamento do pagamento';
      
      if (response.status === 404) {
        errorMessage = 'API não encontrada. Por favor, tente novamente mais tarde.';
      } else if (response.status === 403) {
        errorMessage = 'Acesso negado. Verifique se as chaves de API estão corretas.';
      } else if (response.status === 500) {
        errorMessage = 'Erro no servidor. Por favor, aguarde alguns minutos e tente novamente.';
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const responseText = await response.text();
    console.log('GhostsPay response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Error parsing GhostsPay response:', e);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar resposta do servidor' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate response structure
    if (!data.pixQrCode || !data.pixCode || !data.status || !data.id) {
      console.error('Invalid GhostsPay response structure:', data);
      return new Response(
        JSON.stringify({ error: 'Resposta incompleta do servidor' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Return successful response
    const pixResponse: PixResponse = {
      pixQrCode: data.pixQrCode,
      pixCode: data.pixCode,
      status: data.status,
      id: data.id
    };

    return new Response(
      JSON.stringify(pixResponse),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error('PIX generation error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor",
        message: error.message 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});