export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface ApiEndpointDefinition {
  id: string;
  method: HttpMethod;
  path: string;
  description?: string;
  defaultResponse: string; // JSON string or other text format
}

export interface MockedEndpoint extends ApiEndpointDefinition {
  mockResponse: string; // Editable mock response, initially same as defaultResponse
}
