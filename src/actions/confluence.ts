
"use server";

import { z } from "zod";
import { parseConfluenceApiDocumentation } from "@/ai/flows/confluenceParser";
import type { ApiEndpointDefinition, ConfluenceDocument } from "@/lib/types"; // Ensure ApiEndpointDefinition is imported

const ConfluenceImportSchema = z.object({
  confluenceLink: z.string().min(1, "Confluence link cannot be empty.").url("Please enter a valid URL."),
});

export interface ParsedConfluenceData {
  title: string;
  confluenceLink: string;
  endpoints: ApiEndpointDefinition[]; // This should be the type returned by the parser
}

export interface ParseResult {
  success: boolean;
  data?: ParsedConfluenceData; // This data should align with what the form expects to pass to onEndpointsParsed
  error?: string;
}

export async function parseConfluenceLinkAction(
  prevState: ParseResult | null,
  formData: FormData
): Promise<ParseResult> {
  try {
    const validatedFields = ConfluenceImportSchema.safeParse({
      confluenceLink: formData.get("confluenceLink"),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.flatten().fieldErrors.confluenceLink?.join(", ") || "Invalid input.",
      };
    }

    const confluenceLink = validatedFields.data.confluenceLink;
    // parseConfluenceApiDocumentation now returns { title: string; endpoints: ApiEndpointDefinition[] }
    // where ApiEndpointDefinition includes id (temp), method, path, description, defaultResponse, exampleResponses
    const { title, endpoints: parsedEndpointsFromFlow } = await parseConfluenceApiDocumentation(confluenceLink);
    
    // The structure passed to onEndpointsParsed via `data` should be ParsedConfluenceData
    // which means its `endpoints` field should be ApiEndpointDefinition[]
    // The mapping to MockedEndpoint (which includes unique ID generation and setting mockResponse)
    // happens inside page.tsx's handleDocumentParsed.
    // So, we directly pass what the flow returns.
    const resultData: ParsedConfluenceData = {
        title,
        confluenceLink,
        endpoints: parsedEndpointsFromFlow, // These are ApiEndpointDefinition[]
    };
    
    return {
      success: true,
      data: resultData,
    };
  } catch (error) {
    console.error("Error parsing Confluence link in action:", error);
    // Ensure error message is a string
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during parsing.";
    // Attempt to get a title even in error for better UX
    let titleFromError = "Error Page";
    const linkAttempt = formData.get("confluenceLink") as string;
    if (linkAttempt) {
      try {
         const urlObject = new URL(linkAttempt);
         const pathParts = urlObject.pathname.split('/');
         let lastPart = pathParts.pop() || pathParts.pop();
         if (lastPart) {
            titleFromError = decodeURIComponent(lastPart.replace(/[+-]/g, ' ')).substring(0, 60);
            titleFromError = titleFromError.replace(/\s+\d+$/, '').trim();
         }
      } catch (e) { /* ignore */ }
    }

    // Return a ParsedConfluenceData-like structure with empty endpoints in case of error,
    // so the UI can still potentially show a title.
    return {
      success: false,
      error: errorMessage,
      data: { // Provide minimal data structure so UI doesn't break if it expects data on error
          title: titleFromError,
          confluenceLink: linkAttempt || "",
          endpoints: [],
      }
    };
  }
}
