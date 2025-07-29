import { createClient } from 'npm:@supabase/supabase-js@2';

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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
    // Get the secret key from environment variables
    const SECRET_KEY = Deno.env.get('RUSHPAY_SECRET_KEY');
    if (!SECRET_KEY) {
      console.error('RUSHPAY_SECRET_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse request body
    const requestData: PixRequest = await req.json();
    
    console.log('PIX request received:', {
      email: requestData.email,
      amount: requestData.amount,
      utmQuery: requestData.utmQuery
    });

    // Validate required fields
    if (!requestData.name || !requestData.email || !requestData.cpf || !requestData.phone || !requestData.amount) {
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

    // Make request to RushPay API
    const API_URL = 'https://pay.rushpayoficial.com/api/v1/transaction/purchase';
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': SECRET_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    console.log('RushPay API response status:', response.status);

    const responseText = await response.text();
    console.log('RushPay API response:', responseText);

    if (!response.ok) {
      let errorMessage = 'Erro no servidor de pagamento';
      
      if (response.status === 404) {
        errorMessage = 'Endpoint não encontrado na API RushPay';
      } else if (response.status === 403) {
        errorMessage = 'Acesso negado. Credenciais inválidas';
      } else if (response.status === 500) {
        errorMessage = 'Erro interno do servidor RushPay';
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

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Error parsing RushPay response:', e);
      return new Response(
        JSON.stringify({ error: "Erro ao processar resposta do servidor" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate response data
    if (!data.pixQrCode || !data.pixCode || !data.status || !data.id) {
      console.error('Invalid RushPay response:', data);
      return new Response(
        JSON.stringify({ error: "Resposta incompleta do servidor" }),
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
    console.error('Edge function error:', error);
    
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