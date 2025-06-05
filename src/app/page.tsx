
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


  const handleDocumentParsed = useCallback((parsedData: ParsedConfluenceData) => {
    const newDocument: ConfluenceDocument = {
      id: parsedData.confluenceLink, 
      title: parsedData.title,
      confluenceLink: parsedData.confluenceLink,
      endpoints: parsedData.endpoints.map(def => ({
        ...def, 
        mockResponse: def.defaultResponse, 
      })),
      isMockActive: false, 
    };

    setConfluenceDocs(prevDocs => {
      const existingDocIndex = prevDocs.findIndex(doc => doc.id === newDocument.id);
      let updatedDocs;
      if (existingDocIndex !== -1) {
        updatedDocs = [...prevDocs];
        updatedDocs[existingDocIndex] = { 
          ...newDocument, 
          // Preserve UI active state if re-parsed, server will decide true active
          isMockActive: prevDocs[existingDocIndex].isMockActive 
        };
      } else {
        updatedDocs = [...prevDocs, newDocument];
      }
      return updatedDocs;
    });

    if (!selectedDocId || confluenceDocs.length === 0) {
      setSelectedDocId(newDocument.id);
    }
    
    toast({
      title: "Document Parsed",
      description: `"${newDocument.title}" with ${newDocument.endpoints.length} endpoint(s) processed.`,
      variant: "default",
    });
  }, [toast, selectedDocId, confluenceDocs.length]);

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
  };

  const handleToggleMockActive = useCallback(async (docIdToToggle: string) => {
    const docToToggle = confluenceDocs.find(d => d.id === docIdToToggle);
    if (!docToToggle) return;

    const newUiMockState = !docToToggle.isMockActive;
    let actionResult: UpdateActiveMockResult;

    if (newUiMockState) { // User wants to activate this document
      actionResult = await updateActiveMockAction(docToToggle);
    } else { // User wants to deactivate this document
      // If this is the one currently active on the server, tell server to deactivate all.
      // Otherwise, it's just a UI change for a doc that wasn't server-active.
      if (serverActiveDocId === docIdToToggle) {
        actionResult = await updateActiveMockAction(null);
      } else {
        // Simulate success for UI change if it wasn't the server-active one
        actionResult = { success: true, message: `"${docToToggle.title}" UI mock state toggled off.`, activeDocId: serverActiveDocId };
      }
    }

    if (actionResult.success) {
      setServerActiveDocId(actionResult.activeDocId);
      setConfluenceDocs(prevDocs =>
        prevDocs.map(doc => ({
          ...doc,
          // The `isMockActive` in UI reflects which doc is active on the SERVER
          isMockActive: doc.id === actionResult.activeDocId,
        }))
      );
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
    }
  }, [confluenceDocs, toast, serverActiveDocId]);

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

  const handleSaveResponse = (docId: string, endpointId: string, newResponse: string) => {
     let activeDocChanged = false;
    setConfluenceDocs(prevDocs =>
      prevDocs.map(doc => {
        if (doc.id === docId) {
          const updatedEndpoints = doc.endpoints.map(ep =>
            ep.id === endpointId ? { ...ep, mockResponse: newResponse } : ep
          );
          // If this document is the currently active one on the server, we need to re-sync its state
          if (doc.id === serverActiveDocId) {
            activeDocChanged = true;
            return { ...doc, endpoints: updatedEndpoints, isMockActive: true }; // Ensure isMockActive is true
          }
          return { ...doc, endpoints: updatedEndpoints };
        }
        return doc;
      })
    );
    setEditingInfo(null); 
    toast({
      title: "Response Updated",
      description: `Mock response for endpoint has been saved.`,
    });

    // If the edited document was the active one, update the server state
    if (activeDocChanged) {
      const updatedDoc = confluenceDocs.find(d => d.id === docId);
      if (updatedDoc) {
         // Find the specific document from state that just got updated
        const freshDoc = confluenceDocs.find(d => d.id === docId);
        if (freshDoc) {
            const freshEndpoints = freshDoc.endpoints.map(ep => 
                ep.id === endpointId ? { ...ep, mockResponse: newResponse } : ep
            );
            updateActiveMockAction({...freshDoc, endpoints: freshEndpoints, isMockActive: true});
        }
      }
    }
  };

  // Reflect server-side active doc on initial load or if serverActiveDocId changes
  useEffect(() => {
    // This effect primarily ensures UI consistency if serverActiveDocId is ever out of sync
    // with the confluenceDocs' isMockActive states.
    setConfluenceDocs(prevDocs =>
      prevDocs.map(doc => ({
        ...doc,
        isMockActive: doc.id === serverActiveDocId,
      }))
    );
  }, [serverActiveDocId]);


  const selectedDocument = confluenceDocs.find(doc => doc.id === selectedDocId);
  // The true mock active status comes from serverActiveDocId reflected in each doc's isMockActive
  const isSelectedDocActuallyMockActive = selectedDocument ? selectedDocument.isMockActive : false;


  return (
    <div className="flex flex-row flex-grow space-x-0 md:space-x-6 h-[calc(100vh-theme(spacing.16)-theme(spacing.16))]">
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

      <div className="flex-grow space-y-8 p-0 md:p-0 overflow-y-auto">
        <ConfluenceImportForm onEndpointsParsed={handleDocumentParsed} />
        
        {(selectedDocument || confluenceDocs.length > 0) && <Separator className="my-6" />}

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
          confluenceDocs.length > 0 && (
             <div className="flex flex-col items-center justify-center text-center py-12 bg-card rounded-lg shadow-sm">
              <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2 font-headline">Select a Document</h3>
              <p className="text-muted-foreground">
                Choose a parsed document from the sidebar to view its mocked endpoints.
              </p>
            </div>
          )
        )}
         {confluenceDocs.length === 0 && (
            <div>
                <h2 className="text-2xl font-headline font-semibold mb-6 text-primary flex items-center">
                    <LayoutDashboard className="mr-3 h-7 w-7" />
                    Mocked Endpoints Dashboard
                </h2>
                <EndpointGrid endpoints={[]} onEditResponse={() => {}} isMockActive={false} />
            </div>
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
