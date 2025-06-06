
import { NextResponse, type NextRequest } from 'next/server';
import { getActiveMockDocument } from '@/lib/mock-server-state';
import type { HttpMethod } from '@/lib/types';

async function handleMockRequest(
  request: NextRequest,
  { params }: { params: { catchAll: string[] } }
) {
  const activeDoc = getActiveMockDocument();
  // request.method is always uppercase in Next.js route handlers for NextRequest
  const method = request.method as HttpMethod; 
  
  const requestPath = params.catchAll && params.catchAll.length > 0 ? `/${params.catchAll.join('/')}` : '/';

  if (!activeDoc) {
    return NextResponse.json({ 
      error: 'No mock server is currently active in MockREST.',
      message: 'Please activate a document in the MockREST UI to enable its mock endpoints.'
    }, { status: 404 });
  }

  const endpoint = activeDoc.endpoints.find(
    (ep) => ep.path.toLowerCase() === requestPath.toLowerCase() && ep.method.toUpperCase() === method.toUpperCase()
  );

  if (endpoint) {
    // For HEAD requests, we should not return a body.
    // NextResponse might handle this, but being explicit is safer.
    if (method === 'HEAD') {
      // Determine content type without parsing body if possible, or use a default/stored one
      let contentType = 'text/plain'; 
      try {
        // Attempt to infer content type from the mockResponse structure
        JSON.parse(endpoint.mockResponse); // Check if JSON
        contentType = 'application/json; charset=utf-8';
      } catch (e) {
        if (endpoint.mockResponse.trim().startsWith('<') && endpoint.mockResponse.trim().endsWith('>')) {
          if (endpoint.mockResponse.toLowerCase().includes("<html")) {
              contentType = 'text/html; charset=utf-8';
          } else {
              contentType = 'application/xml; charset=utf-8';
          }
        }
      }
      return new NextResponse(null, { // No body for HEAD
        status: 200,
        headers: {
          'Content-Type': contentType,
          'X-MockREST-Source-Document': encodeURIComponent(activeDoc.title),
          // Potentially 'Content-Length' if we knew it from the GET response
        },
      });
    }

    let responseBody;
    let contentType = 'text/plain'; 

    try {
      responseBody = JSON.parse(endpoint.mockResponse);
      contentType = 'application/json; charset=utf-8';
    } catch (e) {
      responseBody = endpoint.mockResponse; // Keep as string if not JSON
      if (endpoint.mockResponse.trim().startsWith('<') && endpoint.mockResponse.trim().endsWith('>')) {
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

export async function GET(request: NextRequest, { params }: { params: { catchAll: string[] } }) {
  return handleMockRequest(request, { params });
}

export async function POST(request: NextRequest, { params }: { params: { catchAll: string[] } }) {
  return handleMockRequest(request, { params });
}

export async function PUT(request: NextRequest, { params }: { params: { catchAll: string[] } }) {
  return handleMockRequest(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: { catchAll: string[] } }) {
  return handleMockRequest(request, { params });
}

export async function PATCH(request: NextRequest, { params }: { params: { catchAll: string[] } }) {
  return handleMockRequest(request, { params });
}

export async function HEAD(request: NextRequest, { params }: { params: { catchAll: string[] } }) {
  return handleMockRequest(request, { params });
}

export async function OPTIONS(request: NextRequest, { params }: { params: { catchAll: string[] } }) {
  // For OPTIONS, typically you'd return allowed methods and CORS headers if applicable.
  // For a simple mock, just indicating success or delegating might be enough.
  // Or, find if an OPTIONS endpoint is defined.
  // For now, let's delegate to common handler which will 404 if no OPTIONS mock is defined.
  // A more robust OPTIONS would inspect activeDoc.endpoints for the path and list allowed methods.
  // However, for basic mocking, just having it not 405 is a start.
  // It might be better to return a generic 200 OK or 204 No Content for OPTIONS if no specific mock.
  
  // Basic OPTIONS handling:
  // Check if an OPTIONS mock is defined for the path
  const activeDoc = getActiveMockDocument();
  const requestPath = params.catchAll && params.catchAll.length > 0 ? `/${params.catchAll.join('/')}` : '/';
  if (activeDoc) {
    const optionsEndpoint = activeDoc.endpoints.find(
      (ep) => ep.path.toLowerCase() === requestPath.toLowerCase() && ep.method.toUpperCase() === 'OPTIONS'
    );
    if (optionsEndpoint) {
      return handleMockRequest(request, { params }); // Handle as a normal mock
    }
  }
  // If no specific OPTIONS mock, provide default allowed methods for the path if any other method exists
  let allowedMethods = 'OPTIONS';
  if (activeDoc) {
      const methodsForPath = new Set<string>();
      activeDoc.endpoints.forEach(ep => {
          if (ep.path.toLowerCase() === requestPath.toLowerCase()) {
              methodsForPath.add(ep.method.toUpperCase());
          }
      });
      if (methodsForPath.size > 0) {
          allowedMethods = Array.from(methodsForPath).sort().join(', ');
      } else {
         // No endpoint for this path at all, could 404 from OPTIONS too.
         // For now, just returning a generic allow for basic CORS.
         allowedMethods = 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS';
      }
  } else {
    // No active doc, still provide generic allowed methods for basic CORS.
    allowedMethods = 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS';
  }


  return new NextResponse(null, {
    status: 204, // No Content is common for OPTIONS
    headers: {
      'Allow': allowedMethods,
      // Add CORS headers if your client (Postman/Android app) needs them from a different origin
      // 'Access-Control-Allow-Origin': '*', // Or specific origin
      // 'Access-Control-Allow-Methods': allowedMethods,
      // 'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Or specific headers
    },
  });
}
