import { createClient } from 'npm:@supabase/supabase-js@2';

interface PaymentWebhookRequest {
  paymentId: string;
  status: string;
  paymentMethod: string;
  totalValue: number;
  pixCode?: string;
  utmQuery?: string;
  customer: {
    name: string;
    email: string;
    cpf: string;
    phone: string;
  };
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const webhookData: PaymentWebhookRequest = await req.json();
    
    console.log('Webhook received:', JSON.stringify(webhookData, null, 2));

    // Validate required fields
    if (!webhookData.paymentId || !webhookData.status || !webhookData.customer) {
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

    // Check if status is APPROVED
    if (webhookData.status === "APPROVED") {
      console.log(`Processing approved payment: ${webhookData.paymentId}`);
      
      // Extrair click_id da utmQuery se disponível
      let clickId: string | null = null;
      if (webhookData.utmQuery) {
        const urlParams = new URLSearchParams(webhookData.utmQuery);
        clickId = urlParams.get('click_id');
        console.log('Click ID extraído:', clickId);
      }

      // First, create or update customer
      const { data: existingCustomer, error: customerSelectError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', webhookData.customer.email)
        .single();

      let customerId: string;

      if (existingCustomer) {
        // Update existing customer
        const { data: updatedCustomer, error: customerUpdateError } = await supabase
          .from('customers')
          .update({
            name: webhookData.customer.name,
            cpf: webhookData.customer.cpf,
            phone: webhookData.customer.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCustomer.id)
          .select('id')
          .single();

        if (customerUpdateError) {
          console.error('Error updating customer:', customerUpdateError);
          throw customerUpdateError;
        }

        customerId = updatedCustomer.id;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerInsertError } = await supabase
          .from('customers')
          .insert({
            name: webhookData.customer.name,
            email: webhookData.customer.email,
            cpf: webhookData.customer.cpf,
            phone: webhookData.customer.phone
          })
          .select('id')
          .single();

        if (customerInsertError) {
          console.error('Error creating customer:', customerInsertError);
          throw customerInsertError;
        }

        customerId = newCustomer.id;
      }

      // Update or create transaction
      const { data: existingTransaction, error: transactionSelectError } = await supabase
        .from('transactions')
        .select('id')
        .eq('payment_id', webhookData.paymentId)
        .single();

      if (existingTransaction) {
        // Update existing transaction
        const { error: transactionUpdateError } = await supabase
          .from('transactions')
          .update({
            status: 'approved',
            customer_id: customerId,
            payment_method: webhookData.paymentMethod,
            total_value: webhookData.totalValue,
            pix_code: webhookData.pixCode || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTransaction.id);

        if (transactionUpdateError) {
          console.error('Error updating transaction:', transactionUpdateError);
          throw transactionUpdateError;
        }
      } else {
        // Create new transaction
        const { error: transactionInsertError } = await supabase
          .from('transactions')
          .insert({
            payment_id: webhookData.paymentId,
            customer_id: customerId,
            status: 'approved',
            payment_method: webhookData.paymentMethod,
            total_value: webhookData.totalValue,
            pix_code: webhookData.pixCode || null
          });

        if (transactionInsertError) {
          console.error('Error creating transaction:', transactionInsertError);
          throw transactionInsertError;
        }
      }

      // Execute liberar_acesso_ao_usuario function
      const { error: accessError } = await supabase.rpc('liberar_acesso_ao_usuario', {
        user_email: webhookData.customer.email,
        p_payment_id: webhookData.paymentId
      });

      if (accessError) {
        console.error('Error liberating user access:', accessError);
        // Don't throw here as the payment was processed successfully
        // Just log the error for monitoring
      }
      
      // Notificar conversão ao xTracky se temos click_id
      if (clickId) {
        try {
          console.log('Notificando conversão ao xTracky...');
          
          const conversionData = {
            click_id: clickId,
            conversion_value: webhookData.totalValue / 100, // Converter centavos para reais
            order_id: webhookData.paymentId,
            currency: 'BRL'
          };
          
          const conversionResponse = await fetch('https://cdn.xtracky.com/api/conversion', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(conversionData)
          });
          
          if (conversionResponse.ok) {
            console.log('Conversão notificada com sucesso ao xTracky');
          } else {
            console.error('Erro ao notificar conversão ao xTracky:', conversionResponse.status);
          }
        } catch (error) {
          console.error('Erro ao notificar conversão ao xTracky:', error);
        }
      } else {
        console.log('Nenhum click_id encontrado, conversão não notificada ao xTracky');
      }

      console.log(`Payment ${webhookData.paymentId} processed successfully`);
    } else {
      console.log(`Payment ${webhookData.paymentId} status: ${webhookData.status} - No action taken`);
    }

    // Return success response
    return new Response("OK", {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain",
      },
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
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