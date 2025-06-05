
import { NextResponse, type NextRequest } from 'next/server';
import { getActiveMockDocument } from '@/lib/mock-server-state';
import type { HttpMethod } from '@/lib/types';

// This special function handles all HTTP methods (GET, POST, PUT, DELETE, etc.)
export async function ALL(
  request: NextRequest,
  { params }: { params: { catchAll: string[] } }
) {
  const activeDoc = getActiveMockDocument();
  const method = request.method.toUpperCase() as HttpMethod;
  
  // Reconstruct the path from the catchAll array.
  // e.g., if URL is /api/mock/users/123, catchAll will be ['users', '123']
  // requestPath becomes /users/123
  const requestPath = params.catchAll && params.catchAll.length > 0 ? `/${params.catchAll.join('/')}` : '/';

  if (!activeDoc) {
    return NextResponse.json({ 
      error: 'No mock server is currently active in MockREST.',
      message: 'Please activate a document in the MockREST UI to enable its mock endpoints.'
    }, { status: 404 });
  }

  // The document itself might have an isMockActive flag from the UI, 
  // but getActiveMockDocument() is the source of truth for the server.
  // If we wanted to double-check: if (!activeDoc.isMockActive) { ... } but it's redundant here.

  const endpoint = activeDoc.endpoints.find(
    (ep) => ep.path.toLowerCase() === requestPath.toLowerCase() && ep.method.toUpperCase() === method
  );

  if (endpoint) {
    let responseBody;
    let contentType = 'text/plain'; // Default content type

    try {
      // Try to parse as JSON. If successful, it's JSON.
      responseBody = JSON.parse(endpoint.mockResponse);
      contentType = 'application/json; charset=utf-8';
    } catch (e) {
      // Not JSON, treat as plain text or try to infer other types
      responseBody = endpoint.mockResponse;
      if (endpoint.mockResponse.trim().startsWith('<') && endpoint.mockResponse.trim().endsWith('>')) {
        // Basic check for XML or HTML like structures
        if (endpoint.mockResponse.toLowerCase().includes("<html")) {
            contentType = 'text/html; charset=utf-8';
        } else {
            contentType = 'application/xml; charset=utf-8';
        }
      }
    }
    
    const bodyToReturn = (typeof responseBody === 'object' && contentType.includes('application/json')) 
                         ? JSON.stringify(responseBody) 
                         : endpoint.mockResponse;


    return new NextResponse(bodyToReturn, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-MockREST-Source-Document': encodeURIComponent(activeDoc.title),
      },
    });
  }

  return NextResponse.json(
    {
      error: `Mock endpoint not found for ${method} ${requestPath}`,
      message: `The active document "${activeDoc.title}" does not have a mock defined for this specific method and path.`,
      activeDocument: activeDoc.title,
      requestedMethod: method,
      requestedPath: requestPath,
      availableEndpointsInActiveDocument: activeDoc.endpoints.map(ep => `${ep.method} ${ep.path}`)
    },
    { status: 404 }
  );
}
