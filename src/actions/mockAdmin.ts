
'use server';

import type { ConfluenceDocument } from '@/lib/types';
import { setActiveMockDocument, getActiveMockDocument } from '@/lib/mock-server-state';

export interface UpdateActiveMockResult {
  success: boolean;
  message: string;
  activeDocId: string | null;
}

export async function updateActiveMockAction(
  docToActivate: ConfluenceDocument | null
): Promise<UpdateActiveMockResult> {
  try {
    setActiveMockDocument(docToActivate);
    if (docToActivate) {
      return {
        success: true,
        message: `Mock server now active for "${docToActivate.title}".`,
        activeDocId: docToActivate.id,
      };
    } else {
      return {
        success: true,
        message: 'Mock server is now deactivated.',
        activeDocId: null,
      };
    }
  } catch (error) {
    console.error("Error updating active mock:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unknown error occurred.",
      activeDocId: getActiveMockDocument()?.id || null,
    };
  }
}
