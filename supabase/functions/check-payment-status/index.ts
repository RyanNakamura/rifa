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

  // Only accept GET requests
  if (req.method !== "GET") {
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

    // Get payment ID from URL parameters
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('id');
    
    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "Payment ID is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log('Checking payment status for ID:', paymentId);

    // Make request to RushPay API
    const STATUS_CHECK_URL = `https://pay.rushpayoficial.com/api/v1/transaction/getPayment?id=${encodeURIComponent(paymentId)}`;
    
    const response = await fetch(STATUS_CHECK_URL, {
      method: 'GET',
      headers: {
        'Authorization': SECRET_KEY,
        'Accept': 'application/json'
      }
    });

    console.log('RushPay status check response:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        // Payment not found, return PENDING
        return new Response(
          JSON.stringify({ status: "PENDING" }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } else if (response.status === 403) {
        console.error('Access denied when checking payment status');
        return new Response(
          JSON.stringify({ status: "PENDING" }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        console.error(`Error checking payment status: ${response.status}`);
        return new Response(
          JSON.stringify({ status: "PENDING" }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    const responseText = await response.text();
    console.log('RushPay status response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Error parsing status response:', e);
      return new Response(
        JSON.stringify({ status: "PENDING" }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Map RushPay status to our internal status
    const status = data.status || 'PENDING';
    let mappedStatus;
    
    switch (status.toUpperCase()) {
      case 'APPROVED':
        mappedStatus = 'APPROVED';
        break;
      case 'PENDING':
        mappedStatus = 'PENDING';
        break;
      case 'CANCELLED':
      case 'CANCELED':
        mappedStatus = 'CANCELLED';
        break;
      case 'EXPIRED':
        mappedStatus = 'EXPIRED';
        break;
      default:
        mappedStatus = 'PENDING';
    }

    return new Response(
      JSON.stringify({ status: mappedStatus }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error('Status check error:', error);
    
    return new Response(
      JSON.stringify({ status: "PENDING" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});