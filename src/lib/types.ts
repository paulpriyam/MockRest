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

export interface ConfluenceDocument {
  id: string; // Unique ID for this parsed document, typically the confluenceLink
  title: string;
  confluenceLink: string;
  endpoints: MockedEndpoint[];
}
