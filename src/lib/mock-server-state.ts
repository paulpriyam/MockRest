
import type { ConfluenceDocument } from '@/lib/types';

interface ActiveMockState {
  document: ConfluenceDocument | null;
}

// Helper to initialize and retrieve the store from globalThis
// This makes it more resilient to HMR in development.
const initializeGlobalStore = (): ActiveMockState => {
  const g = globalThis as any; // Use 'any' for simplicity to attach to globalThis
  if (!g.__MOCK_REST_APP_STATE_STORE__) {
    g.__MOCK_REST_APP_STATE_STORE__ = { document: null };
    // console.log('[MockState] Initialized global store for MockREST');
  }
  return g.__MOCK_REST_APP_STATE_STORE__;
};

// Get the store. In dev, this helps survive HMR.
// In prod, for a single server instance, module scope would also work, but this is safer.
// For serverless, state isn't shared across invocations anyway without an external store.
const activeMockStoreInstance = initializeGlobalStore();

export function getActiveMockDocument(): ConfluenceDocument | null {
  // console.log('[MockState] GET: Active document is', activeMockStoreInstance.document ? activeMockStoreInstance.document.title : null);
  return activeMockStoreInstance.document;
}

export function setActiveMockDocument(doc: ConfluenceDocument | null): void {
  activeMockStoreInstance.document = doc;
  // console.log('[MockState] SET: Active document to', doc ? doc.title : null);
}

