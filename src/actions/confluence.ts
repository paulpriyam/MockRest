
"use server";

import { z } from "zod";
import { parseConfluenceApiDocumentation } from "@/ai/flows/confluenceParser";
import type { ApiEndpointDefinition } from "@/lib/types";

const ConfluenceImportSchema = z.object({
  confluenceLink: z.string().min(1, "Confluence link cannot be empty.").url("Please enter a valid URL."),
});

export interface ParsedConfluenceData {
  title: string;
  confluenceLink: string;
  endpoints: ApiEndpointDefinition[];
}

export interface ParseResult {
  success: boolean;
  data?: ParsedConfluenceData;
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
    const { title, endpoints } = await parseConfluenceApiDocumentation(confluenceLink);
    
    return {
      success: true,
      data: {
        title,
        confluenceLink,
        endpoints,
      },
    };
  } catch (error) {
    console.error("Error parsing Confluence link:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred during parsing.",
    };
  }
}
