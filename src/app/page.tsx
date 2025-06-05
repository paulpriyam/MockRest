
"use client";

import { useState, useCallback, useEffect } from "react";
import { ConfluenceImportForm } from "@/components/import/ConfluenceImportForm";
import { EndpointGrid } from "@/components/endpoints/EndpointGrid";
import { ResponseEditorDialog } from "@/components/editor/ResponseEditorDialog";
import type { ApiEndpointDefinition, ConfluenceDocument, MockedEndpoint } from "@/lib/types";
import type { ParsedConfluenceData } from "@/actions/confluence";
import { updateActiveMockAction, type UpdateActiveMockResult } from "@/actions/mockAdmin";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConfluenceDocsList } from "@/components/confluence/ConfluenceDocsList";
import { LayoutDashboard, Server, ServerOff } from "lucide-react";

export default function HomePage() {
  const [confluenceDocs, setConfluenceDocs] = useState<ConfluenceDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState<{ docId: string; endpoint: MockedEndpoint } | null>(null);
  const { toast } = useToast();
  const [serverActiveDocId, setServerActiveDocId] = useState<string | null>(null);


  const handleDocumentParsed = useCallback(
    async (parsedData: ParsedConfluenceData) => {
      const newDocument: ConfluenceDocument = {
        id: parsedData.confluenceLink,
        title: parsedData.title,
        confluenceLink: parsedData.confluenceLink,
        endpoints: parsedData.endpoints.map((def) => ({
          ...def,
          mockResponse: def.defaultResponse,
        })),
        isMockActive: false, // Default for a new doc or re-parsed one before server sync
      };

      let reSyncActiveDoc = false;
      let docToResync: ConfluenceDocument | undefined;

      setConfluenceDocs((prevDocs) => {
        const existingDocIndex = prevDocs.findIndex(doc => doc.id === newDocument.id);
        let updatedDocs;
        if (existingDocIndex !== -1) {
          const oldDoc = prevDocs[existingDocIndex];
          updatedDocs = [...prevDocs];
          docToResync = { // Prepare the document with fresh data
            ...newDocument,
            // its isMockActive status will be true if it *is* the serverActiveDocId
            isMockActive: oldDoc.id === serverActiveDocId, 
          };
          updatedDocs[existingDocIndex] = docToResync;
          
          if (oldDoc.id === serverActiveDocId) {
            reSyncActiveDoc = true;
          }
        } else {
          updatedDocs = [...prevDocs, newDocument];
        }
        return updatedDocs;
      });

      setSelectedDocId(newDocument.id); // Always select the newly parsed/updated document

      if (reSyncActiveDoc && docToResync) {
        const result = await updateActiveMockAction(docToResync); // Send updated doc to server
        if (result.success) {
          toast({
            title: "Active Mock Refreshed",
            description: `"${docToResync.title}" was re-parsed and its active mock data has been updated on the server.`,
          });
        } else {
          toast({
            title: "Error Refreshing Active Mock",
            description: result.message || "Failed to update active mock data.",
            variant: "destructive",
          });
        }
        // Sync local serverActiveDocId with the actual state from the server action response
        setServerActiveDocId(result.activeDocId);
      } else {
        toast({
          title: "Document Parsed",
          description: `"${newDocument.title}" with ${newDocument.endpoints.length} endpoint(s) processed.`,
        });
      }
    },
    [toast, serverActiveDocId, updateActiveMockAction] // updateActiveMockAction is stable
  );

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
  };

  const handleToggleMockActive = useCallback(async (docIdToToggle: string) => {
    const docToToggle = confluenceDocs.find(d => d.id === docIdToToggle);
    if (!docToToggle) return;

    let actionResult: UpdateActiveMockResult;

    // If user is trying to activate this doc, or if it's already the active one and they're deactivating it.
    if (docIdToToggle !== serverActiveDocId || !docToToggle.isMockActive) { // Trying to activate a new doc, or deactivating the current
         actionResult = await updateActiveMockAction(docToToggle.isMockActive ? null : docToToggle);
    } else { // Trying to activate a doc that is already active (no change) or deactivating an inactive doc (no change to server)
        // This case should ideally not happen if UI is in sync, but as a fallback:
        actionResult = { success: true, message: "No change to server mock state.", activeDocId: serverActiveDocId };
    }


    if (actionResult.success) {
      setServerActiveDocId(actionResult.activeDocId); // This will trigger the useEffect below
      toast({
        title: actionResult.activeDocId ? `Mock Server Active` : 'Mock Server Deactivated',
        description: actionResult.message,
        variant: actionResult.activeDocId ? "default" : "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: actionResult.message || "Failed to update mock server state.",
        variant: "destructive",
      });
       setServerActiveDocId(actionResult.activeDocId); // Reflect server state even on failure
    }
  }, [confluenceDocs, toast, serverActiveDocId, updateActiveMockAction]);

  const handleOpenEditDialog = (docId: string, endpointId: string) => {
    const doc = confluenceDocs.find(d => d.id === docId);
    const endpointToEdit = doc?.endpoints.find(ep => ep.id === endpointId);
    if (doc && endpointToEdit) {
      setEditingInfo({ docId: doc.id, endpoint: endpointToEdit });
    }
  };

  const handleCloseEditDialog = () => {
    setEditingInfo(null);
  };

  const handleSaveResponse = useCallback(async (docId: string, endpointId: string, newResponse: string) => {
    let activeDocChangedOnServer = false;
    let updatedDocForServer: ConfluenceDocument | null = null;

    setConfluenceDocs(prevDocs =>
      prevDocs.map(doc => {
        if (doc.id === docId) {
          const updatedEndpoints = doc.endpoints.map(ep =>
            ep.id === endpointId ? { ...ep, mockResponse: newResponse } : ep
          );
          const potentiallyUpdatedDoc = { ...doc, endpoints: updatedEndpoints };
          if (doc.id === serverActiveDocId) {
            activeDocChangedOnServer = true;
            updatedDocForServer = potentiallyUpdatedDoc; // This has the new response
          }
          return potentiallyUpdatedDoc;
        }
        return doc;
      })
    );
    
    setEditingInfo(null);
    toast({
      title: "Response Updated",
      description: `Mock response for endpoint has been saved locally.`,
    });

    if (activeDocChangedOnServer && updatedDocForServer) {
      // Ensure the document sent to server has isMockActive as true
      const result = await updateActiveMockAction({...updatedDocForServer, isMockActive: true});
      if(result.success) {
        toast({
          title: "Active Mock Updated",
          description: "The active mock on the server has been updated with the new response."
        });
      } else {
         toast({
          title: "Server Update Failed",
          description: "Failed to update the active mock on the server.",
          variant: "destructive",
        });
      }
      setServerActiveDocId(result.activeDocId); // Reflect server state
    }
  }, [serverActiveDocId, toast, updateActiveMockAction]);

  useEffect(() => {
    setConfluenceDocs(prevDocs =>
      prevDocs.map(doc => ({
        ...doc,
        isMockActive: doc.id === serverActiveDocId,
      }))
    );
  }, [serverActiveDocId]);


  const selectedDocument = confluenceDocs.find(doc => doc.id === selectedDocId);
  const isSelectedDocActuallyMockActive = selectedDocument ? selectedDocument.isMockActive : false;


  return (
    <div className="flex flex-row flex-grow space-x-0 md:space-x-6 h-[calc(100vh-theme(spacing.16)-theme(spacing.16))]">
      {confluenceDocs.length > 0 && (
        <aside className="w-full md:w-1/4 lg:w-1/5 xl:w-1/6 border-r bg-card hidden md:flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-headline font-semibold text-primary">Parsed Documents</h2>
          </div>
          <ConfluenceDocsList
            documents={confluenceDocs}
            selectedDocId={selectedDocId}
            onSelectDoc={handleSelectDoc}
            onToggleMockActive={handleToggleMockActive}
          />
        </aside>
      )}

      <div className="flex-grow space-y-8 p-0 md:p-0 overflow-y-auto w-full">
        <ConfluenceImportForm onEndpointsParsed={handleDocumentParsed} />
        
        {confluenceDocs.length > 0 && (
          <>
            <Separator className="my-6" />
            {selectedDocument ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-2xl font-headline font-semibold text-primary flex items-center">
                    <LayoutDashboard className="mr-3 h-7 w-7" />
                    Endpoints for: <span className="ml-2 font-normal italic truncate max-w-xs">{selectedDocument.title}</span>
                  </h2>
                  <Badge variant={isSelectedDocActuallyMockActive ? "default" : "secondary"} className="whitespace-nowrap">
                    {isSelectedDocActuallyMockActive ? 
                      <Server className="mr-2 h-4 w-4" /> : 
                      <ServerOff className="mr-2 h-4 w-4" />
                    }
                    {isSelectedDocActuallyMockActive ? "Mock Active" : "Mock Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  To use these mocks, ensure the mock server for this document is active. Your application can then hit paths under <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/mock/...</code>.
                </p>
                <EndpointGrid 
                  endpoints={selectedDocument.endpoints} 
                  onEditResponse={(endpointId) => selectedDocId && handleOpenEditDialog(selectedDocId, endpointId)}
                  isMockActive={isSelectedDocActuallyMockActive}
                />
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center text-center py-12 bg-card rounded-lg shadow-sm">
                <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2 font-headline">Select a Document</h3>
                <p className="text-muted-foreground">
                  Choose a parsed document from the sidebar to view its mocked endpoints, or parse a new one.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {editingInfo && editingInfo.endpoint && (
        <ResponseEditorDialog
          endpoint={editingInfo.endpoint}
          isOpen={!!editingInfo}
          onClose={handleCloseEditDialog}
          onSave={(endpointId, newResponse) => handleSaveResponse(editingInfo.docId, endpointId, newResponse)}
        />
      )}
    </div>
  );
}

