
import type { ConfluenceDocument } from '@/lib/types';

interface ActiveMockState {
  document: ConfluenceDocument | null;
}

// This is an in-memory store. It will be reset if the server restarts
// and won't be shared across multiple server instances in a scaled environment.
const activeMockStore: ActiveMockState = {
  document: null,
};

export function getActiveMockDocument(): ConfluenceDocument | null {
  return activeMockStore.document;
}

export function setActiveMockDocument(doc: ConfluenceDocument | null): void {
  activeMockStore.document = doc;
  if (doc) {
    // console.log(`Mock server state: Activated for document "${doc.title}" (ID: ${doc.id})`);
  } else {
    // console.log('Mock server state: Deactivated.');
  }
}
