
'use server';
/**
 * @fileOverview Parses Confluence API documentation using Genkit AI.
 * - parseConfluenceApiDocumentation - Fetches and parses a Confluence page.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit'; 
import type { ApiEndpointDefinition, ExampleResponse as AppExampleResponse, HttpMethod } from '@/lib/types';

// Define Zod schemas for the LLM prompt's input and output structure
const ExampleResponseSchema = z.object({
  statusCode: z.number().describe("The HTTP status code for this example response (e.g., 200, 400, 404)."),
  body: z.string().describe("The example response body, typically as a JSON string. Ensure JSON is correctly formatted if it's JSON. Preserve formatting like newlines and indentation if present in the source."),
  description: z.string().optional().describe("An optional description for this specific response scenario (e.g., 'Successful retrieval', 'Invalid input', 'User not found').")
});

const ParsedApiEndpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]).describe("The HTTP method."),
  path: z.string().describe("The API path (e.g., /users/{id}). Extract path parameters in curly braces if present. Do not include the base URL or hostname."),
  description: z.string().optional().describe("A brief description of the endpoint's purpose, functionality, and any important notes about its usage. Capture details about headers or query parameters if mentioned."),
  exampleResponses: z.array(ExampleResponseSchema).min(1).describe("An array of example responses. Try to find responses for different status codes (e.g., 200, 400, 401, 404, 500). Prioritize successful (200-299) responses if multiple are found.")
});

const ConfluenceParseOutputSchema = z.object({
  title: z.string().describe("The main title of the Confluence page. If not obvious, use the last part of the URL path, formatted nicely."),
  endpoints: z.array(ParsedApiEndpointSchema).describe("An array of API endpoints parsed from the page content.")
});

// Define the Genkit prompt
const confluenceParserPrompt = ai.definePrompt({
  name: 'confluenceApiParserPrompt',
  input: { schema: z.object({ pageUrl: z.string(), pageContent: z.string() }) },
  output: { schema: ConfluenceParseOutputSchema },
  prompt: `You are an expert API documentation parser. Given the content of a Confluence page (which might be HTML or plain text), your task is to extract API endpoint definitions.

Confluence Page URL: {{{pageUrl}}}

Page Content:
\`\`\`
{{{pageContent}}}
\`\`\`

Please parse the content and identify all API endpoints. For each endpoint, provide:
1.  HTTP Method (e.g., GET, POST, PUT, DELETE).
2.  Path (e.g., /users, /items/{itemId}, /edc-adapter/settlement/bank?terminal_id=yyy&is_primary=true). Do NOT include the base URL or hostname (like localhost:9080). Extract query parameters as part of the path if they are defining the endpoint.
3.  A concise description of the endpoint, including any details about required headers or parameters if specified.
4.  Example responses, including the HTTP status code and the response body. Try to capture different scenarios like success (200-299), client errors (400-499), and server errors (500-599) if examples are provided in the text. Ensure response bodies are complete and correctly formatted (e.g., valid JSON if the example is JSON). Preserve original formatting of the response body.

If the page content is HTML, focus on the textual content that describes APIs. Pay attention to pre-formatted code blocks (often in <pre> or <code> tags), tables, and headings that might indicate API structures.
The title of the page should be extracted. If a clear title isn't obvious from the content, derive a sensible title from the last segment of the page URL.

If no API endpoints are found, return an empty array for the 'endpoints' field.

Structure your output strictly according to the provided JSON schema.
`,
});

// Define the Genkit flow
const parseConfluenceFlow = ai.defineFlow(
  {
    name: 'parseConfluenceFlow',
    inputSchema: z.object({ url: z.string().url("Invalid Confluence URL provided.") }),
    outputSchema: z.object({
        title: z.string(),
        endpoints: z.array(z.object({ 
            id: z.string(), 
            method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]),
            path: z.string(),
            description: z.string().optional(),
            defaultResponse: z.string(),
            exampleResponses: z.array(z.object({
                statusCode: z.number(),
                body: z.string(),
                description: z.string().optional(),
            })),
        }))
    })
  },
  async (input) => {
    let pageContent = '';
    let derivedTitleForError = "UntitledPage";
    try {
      const urlObject = new URL(input.url);
      derivedTitleForError = decodeURIComponent(urlObject.pathname.split('/').pop() || 'UntitledPage').replace(/[+-]/g, ' ');
    } catch (e) { /* ignore error in deriving title for error cases */ }


    try {
      console.log(`[ConfluenceParser] Fetching URL: ${input.url}`);
      const response = await fetch(input.url);
      if (!response.ok) {
        let errorBody = '';
        try {
            errorBody = await response.text();
        } catch (e) { /* ignore if cannot read body */ }
        console.error(`[ConfluenceParser] Failed to fetch Confluence page: ${response.status} ${response.statusText}. URL: ${input.url}. Body: ${errorBody.substring(0, 500)}`);
        throw new Error(`Failed to fetch Confluence page: ${response.status} ${response.statusText}. Check if the URL is publicly accessible and correct.`);
      }
      pageContent = await response.text();
      console.log(`[ConfluenceParser] Fetched content length for ${input.url}: ${pageContent.length} bytes.`);
    } catch (error) {
      console.error(`[ConfluenceParser] Error fetching Confluence page ${input.url}:`, error);
      return { title: `${derivedTitleForError} (Error: ${(error as Error).message})`, endpoints: [] };
    }

    if (!pageContent.trim()) {
        console.warn(`[ConfluenceParser] Fetched empty page content for ${input.url}.`);
        return { title: `${derivedTitleForError} (Error: Fetched empty content)`, endpoints: [] };
    }
    
    const MAX_CONTENT_LENGTH = 500000; 
    if (pageContent.length > MAX_CONTENT_LENGTH) { 
        console.warn(`[ConfluenceParser] Confluence page content for ${input.url} is very large (${pageContent.length} bytes). Truncating to ${MAX_CONTENT_LENGTH} bytes for AI processing.`);
        pageContent = pageContent.substring(0, MAX_CONTENT_LENGTH);
    }

    console.log(`[ConfluenceParser] Calling AI prompt for ${input.url}. Content length sent: ${pageContent.length}`);
    const { output } = await confluenceParserPrompt({ pageUrl: input.url, pageContent });

    if (process.env.NODE_ENV === 'development') {
        console.log(`[ConfluenceParser] Raw AI Output for ${input.url}: ${JSON.stringify(output, null, 2)}`);
    }

    if (!output) {
      console.error(`[ConfluenceParser] AI prompt returned null or undefined for URL: ${input.url}. This might indicate a failure in the LLM call or schema mismatch.`);
      return { title: `${derivedTitleForError} (AI Parsing Error - No Output from LLM)`, endpoints: [] };
    }
    
    const { title: llmTitle, endpoints: parsedEndpointsFromLLM } = output;

    if (!parsedEndpointsFromLLM || parsedEndpointsFromLLM.length === 0) {
        console.warn(`[ConfluenceParser] AI returned 0 endpoints for ${input.url}. LLM Title: "${llmTitle}".`);
        const finalTitle = llmTitle || `${derivedTitleForError} (0 Endpoints Found by AI)`;
        return { title: finalTitle, endpoints: [] };
    }
    
    console.log(`[ConfluenceParser] AI successfully parsed ${parsedEndpointsFromLLM.length} endpoint(s) for ${input.url}. Title: "${llmTitle}".`);

    const transformedEndpoints: ApiEndpointDefinition[] = parsedEndpointsFromLLM.map((ep, index) => {
      let defaultResponseBody = "";
      const successResponse = ep.exampleResponses.find(r => r.statusCode >= 200 && r.statusCode < 300);
      if (successResponse) {
        defaultResponseBody = successResponse.body;
      } else if (ep.exampleResponses.length > 0) {
        defaultResponseBody = ep.exampleResponses[0].body;
        console.warn(`[ConfluenceParser] No 2xx response found for endpoint ${ep.method} ${ep.path} in ${input.url}. Using first available response (Status: ${ep.exampleResponses[0].statusCode}) as default.`);
      } else {
        console.warn(`[ConfluenceParser] No example responses found for endpoint ${ep.method} ${ep.path} in ${input.url}. Default response will be empty.`);
      }
      
      let finalPath = ep.path.trim();
      if(finalPath && !finalPath.startsWith('/')) {
        finalPath = '/' + finalPath;
      }

      return {
        id: `temp_id_llm_${index}_${Math.random().toString(16).slice(2)}`,
        method: ep.method as HttpMethod,
        path: finalPath,
        description: ep.description,
        defaultResponse: defaultResponseBody,
        exampleResponses: ep.exampleResponses.map(er => ({
            statusCode: er.statusCode,
            body: er.body,
            description: er.description,
        } as AppExampleResponse)),
      };
    });

    return { title: llmTitle, endpoints: transformedEndpoints };
  }
);

export async function parseConfluenceApiDocumentation(url: string): Promise<{ title: string; endpoints: ApiEndpointDefinition[] }> {
  if (!url || typeof url !== 'string' || (!url.startsWith("http://") && !url.startsWith("https://"))) {
     console.error("[ConfluenceParserClient] Invalid URL provided:", url);
     throw new Error("Invalid or empty Confluence URL provided. Must be a valid HTTP/HTTPS URL.");
  }
  try {
    return await parseConfluenceFlow({ url });
  } catch (error) {
    console.error(`[ConfluenceParserClient] Error in parseConfluenceFlow for URL ${url}:`, error);
    let title = "ProcessingError";
    try {
      title = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'Untitled').replace(/[+-]/g, ' ');
    } catch(e) {/*ignore*/}
    return { title: `${title} (Flow Error: ${(error as Error).message})`, endpoints: [] };
  }
}
