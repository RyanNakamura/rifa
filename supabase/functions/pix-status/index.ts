import { corsHeaders } from '../_shared/cors.ts';

const SECRET_KEY = 'c6b41266-2357-4a6c-8e07-aa3873690c1a';
const PUBLIC_KEY = '4307a311-e352-47cd-9d24-a3c05e90db0d';
const GHOSTSPAY_STATUS_URL = 'https://app.ghostspaysv1.com/api/v1/transaction.getPayment';

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
    // Get payment ID from query parameters
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

    // Make request to GhostsPay API
    const statusUrl = `${GHOSTSPAY_STATUS_URL}?id=${encodeURIComponent(paymentId)}`;
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': SECRET_KEY,
        'X-Public-Key': PUBLIC_KEY,
        'Accept': 'application/json'
      }
    });

    console.log('GhostsPay status response:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Payment not found, returning PENDING');
        return new Response(
          JSON.stringify({ status: 'PENDING' }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } else if (response.status === 403) {
        console.error('Access denied when checking status');
        return new Response(
          JSON.stringify({ status: 'PENDING' }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        console.error(`Error checking status: ${response.status}`);
        return new Response(
          JSON.stringify({ status: 'PENDING' }),
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
    console.log('GhostsPay status response body:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Error parsing status response:', e);
      return new Response(
        JSON.stringify({ status: 'PENDING' }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Map API status to our internal status
    const status = data.status || 'PENDING';
    let mappedStatus = 'PENDING';

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

    console.log('Payment status:', mappedStatus);

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
    
    // Return PENDING on error to continue polling
    return new Response(
      JSON.stringify({ status: 'PENDING' }),
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