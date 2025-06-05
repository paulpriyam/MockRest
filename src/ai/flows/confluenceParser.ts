import type { ApiEndpointDefinition } from '@/lib/types';

// This is a mock implementation. In a real scenario, this would involve complex parsing via Genkit AI.
// Assume this function is already instrumented and available as a Genkit flow.
export async function parseConfluenceApiDocumentation(url: string): Promise<ApiEndpointDefinition[]> {
  // console.log(`AI Flow: Parsing Confluence URL: ${url}`);
  // Simulate network delay and parsing
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (!url || (!url.includes("http://") && !url.includes("https://"))) {
    // Basic validation for a URL-like string
    // In a real scenario, more robust validation or specific Confluence link patterns would be checked.
    // For this mock, any non-empty string that looks vaguely like a URL might pass for "testing" purposes.
    // However, for the "happy path" simulation, we'll check for confluence keyword.
    if (url && !url.toLowerCase().includes("confluence")) {
       console.warn("URL does not seem to be a Confluence link, but proceeding with mock data for demonstration.");
    } else if (!url) {
      throw new Error("Invalid or empty Confluence URL provided.");
    }
  }


  // Simulate finding some API endpoints
  // These examples are more diverse
  return [
    {
      id: `ep_${Date.now()}_1`,
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
      id: `ep_${Date.now()}_2`,
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
      id: `ep_${Date.now()}_3`,
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
      id: `ep_${Date.now()}_4`,
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
      id: `ep_${Date.now()}_5`,
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
