
import type { ApiEndpointDefinition } from '@/lib/types';

// This is a mock implementation. In a real scenario, this would involve complex parsing via Genkit AI.
// Assume this function is already instrumented and available as a Genkit flow.
export async function parseConfluenceApiDocumentation(url: string): Promise<{ title: string; endpoints: ApiEndpointDefinition[] }> {
  // console.log(`AI Flow: Parsing Confluence URL: ${url}`);
  await new Promise(resolve => setTimeout(resolve, 1500));

  let title = "Untitled API Document";
  try {
    const urlObject = new URL(url);
    const pathParts = urlObject.pathname.split('/');
    let lastPart = pathParts.pop() || pathParts.pop(); // Get last non-empty part
    if (lastPart) {
      // Decode URI components and replace '+' or '-' with space, then take first 50 chars
      title = decodeURIComponent(lastPart.replace(/[+-]/g, ' ')).substring(0, 60);
      // Further clean up potential page IDs or trailing version numbers if they are purely numeric
      title = title.replace(/\s+\d+$/, '').trim(); // Removes trailing numbers if they seem like IDs
    } else if (urlObject.hostname) {
      title = `Doc from ${urlObject.hostname}`;
    }
  } catch (e) {
    // console.warn("Could not parse URL for title, using default.");
  }
  

  if (!url || (!url.includes("http://") && !url.includes("https://"))) {
    if (url && !url.toLowerCase().includes("confluence")) {
       console.warn("URL does not seem to be a Confluence link, but proceeding with mock data for demonstration.");
    } else if (!url) {
      throw new Error("Invalid or empty Confluence URL provided.");
    }
  }

  let returnedEndpoints: ApiEndpointDefinition[];
  const now = Date.now();

  if (url.toLowerCase().includes("edc")) {
    returnedEndpoints = [
      {
        id: `ep_edc_${now}_details`,
        method: 'GET',
        path: '/api/v1/edc/transaction/history',
        description: 'Retrieves detailed transaction history for EDC services.',
        defaultResponse: JSON.stringify({
          reportId: `EDC_REPORT_${now}`,
          generatedAt: new Date().toISOString(),
          filterCriteria: "LAST_7_DAYS",
          summary: {
            totalTransactions: 5,
            totalAmount: 750.00,
            currency: "IDR"
          },
          transactions: [
            { id: 'edc_tx_abc_123', amount: 150.75, status: 'completed', timestamp: new Date(Date.now() - 86400000).toISOString() },
            { id: 'edc_tx_def_456', amount: 88.00, status: 'completed', timestamp: new Date(Date.now() - 172800000).toISOString() }
          ]
        }, null, 2),
      }
    ];
  } else if (url.toLowerCase().includes("settlement")) {
    returnedEndpoints = [
      {
        id: `ep_settlement_${now}_1`,
        method: 'GET',
        path: '/api/v1/settlement/accounts',
        description: 'Retrieves a list of all settlement bank accounts.',
        defaultResponse: JSON.stringify({
          page: 1,
          pageSize: 10,
          totalAccounts: 2,
          accounts: [
            { accountId: `sa_${now}_1`, bankName: 'Bank Central Asia', accountNumber: '1234567890', accountHolderName: 'PT Jaya Abadi' },
            { accountId: `sa_${now}_2`, bankName: 'Bank Mandiri', accountNumber: '0987654321', accountHolderName: 'PT Sejahtera Selalu' }
          ]
        }, null, 2),
      },
      {
        id: `ep_settlement_${now}_2`,
        method: 'POST',
        path: '/api/v1/settlement/accounts',
        description: 'Adds a new settlement bank account.',
        defaultResponse: JSON.stringify({
          accountId: `sa_${now}_3`,
          bankName: 'Bank Permata',
          accountNumber: '1122334455',
          accountHolderName: 'CV Maju Bersama',
          status: 'pending_verification',
          createdAt: new Date().toISOString()
        }, null, 2),
      },
      {
        id: `ep_settlement_${now}_3`,
        method: 'GET',
        path: '/api/v1/settlement/accounts/{accountId}',
        description: 'Fetches details for a specific settlement bank account.',
        defaultResponse: JSON.stringify({
          accountId: `sa_${now}_1`,
          bankName: 'Bank Central Asia',
          accountNumber: '1234567890',
          accountHolderName: 'PT Jaya Abadi',
          currency: 'IDR',
          isActive: true,
          verifiedAt: new Date(Date.now() - 86400000 * 5).toISOString()
        }, null, 2),
      },
      {
        id: `ep_settlement_${now}_4`,
        method: 'PUT',
        path: '/api/v1/settlement/accounts/{accountId}',
        description: 'Updates an existing settlement bank account (e.g., holder name).',
        defaultResponse: JSON.stringify({
          accountId: `sa_${now}_1`,
          accountHolderName: 'PT Jaya Abadi Selamanya',
          status: 'updated',
          updatedAt: new Date().toISOString()
        }, null, 2),
      },
       {
        id: `ep_settlement_${now}_5`,
        method: 'GET',
        path: '/api/v1/settlements/history',
        description: 'Retrieves settlement history with filters.',
        defaultResponse: JSON.stringify({
          filter: { startDate: "2024-01-01", endDate: "2024-01-31", status: "completed" },
          totalRecords: 3,
          settlements: [
            { settlementId: `set_id_${now}_1`, amount: 5000000, currency: "IDR", settledAt: new Date(Date.now() - 86400000 * 2).toISOString(), destinationAccountId: `sa_${now}_1`},
            { settlementId: `set_id_${now}_2`, amount: 12500000, currency: "IDR", settledAt: new Date(Date.now() - 86400000 * 7).toISOString(), destinationAccountId: `sa_${now}_2`},
          ]
        }, null, 2),
      }
    ];
  } else {
    // The original set of 5 mock endpoints for other URLs
    returnedEndpoints = [
      {
        id: `ep_generic_${now}_1`,
        method: 'GET',
        path: '/api/v1/users',
        description: 'Retrieves a list of all users in the system. Supports pagination.',
        defaultResponse: JSON.stringify({
          page: 1,
          pageSize: 20,
          totalUsers: 150,
          users: [{ id: 'user123', name: 'Alice Wonderland', email: 'alice@example.com' }]
        }, null, 2),
      },
      {
        id: `ep_generic_${now}_2`,
        method: 'POST',
        path: '/api/v1/users',
        description: 'Creates a new user with the provided details.',
        defaultResponse: JSON.stringify({
          id: 'user456',
          name: 'Bob The Builder',
          email: 'bob@example.com',
          status: 'created',
          createdAt: new Date().toISOString()
        }, null, 2),
      },
      {
        id: `ep_generic_${now}_3`,
        method: 'GET',
        path: '/api/v1/products/{productId}',
        description: 'Fetches detailed information for a specific product by its ID.',
        defaultResponse: JSON.stringify({
          productId: 'prod789',
          name: 'Super Widget',
          price: 29.99,
          inStock: true,
          specs: { color: 'blue', weight: '250g' }
        }, null, 2),
      },
      {
        id: `ep_generic_${now}_4`,
        method: 'PUT',
        path: '/api/v1/products/{productId}',
        description: 'Updates an existing product. All fields are replaced.',
        defaultResponse: JSON.stringify({
          productId: 'prod789',
          name: 'Super Widget Deluxe',
          price: 32.50,
          inStock: true,
          status: 'updated',
          updatedAt: new Date().toISOString()
        }, null, 2),
      },
      {
        id: `ep_generic_${now}_5`,
        method: 'DELETE',
        path: '/api/v1/orders/{orderId}',
        description: 'Deletes a specific order. This action is irreversible.',
        defaultResponse: JSON.stringify({
          orderId: 'order101',
          status: 'deleted',
          deletedAt: new Date().toISOString()
        }, null, 2),
      }
    ];
  }

  return { title, endpoints: returnedEndpoints };
}

