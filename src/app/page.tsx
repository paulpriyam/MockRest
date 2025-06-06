
"use client";

import { useState, useCallback, useEffect } from "react";
import { ConfluenceImportForm } from "@/components/import/ConfluenceImportForm";
import { EndpointGrid } from "@/components/endpoints/EndpointGrid";
import { ResponseEditorDialog } from "@/components/editor/ResponseEditorDialog";
import type { ApiEndpointDefinition, ConfluenceDocument, MockedEndpoint } from "@/lib/types";
import type { ParsedConfluenceData } from "@/actions/confluence";
import { updateActiveMockAction, type UpdateActiveMockResult } from "@/actions/mockAdmin";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
    // parsedData now comes from parseConfluenceLinkAction
    // its 'endpoints' field is ApiEndpointDefinition[]
    async (parsedData: ParsedConfluenceData) => {
      const newDocument: ConfluenceDocument = {
        id: parsedData.confluenceLink, 
        title: parsedData.title,
        confluenceLink: parsedData.confluenceLink,
        // Map ApiEndpointDefinition from parser to MockedEndpoint for UI state
        endpoints: parsedData.endpoints.map((def: ApiEndpointDefinition) => ({
          ...def, // spread all fields from ApiEndpointDefinition (method, path, desc, defaultResponse, exampleResponses)
          id: `ep_ui_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // Unique ID for UI purposes
          mockResponse: def.defaultResponse, // Initialize mockResponse from the parsed defaultResponse
        })),
        isMockActive: false, 
      };

      let reSyncActiveDoc = false;
      let docToResync: ConfluenceDocument | undefined;

      setConfluenceDocs((prevDocs) => {
        const existingDocIndex = prevDocs.findIndex(doc => doc.id === newDocument.id);
        let updatedDocs;
        if (existingDocIndex !== -1) {
          const oldDoc = prevDocs[existingDocIndex];
          // Create the updated version of the doc, preserving its active state from server perspective
          docToResync = { 
            ...newDocument, // new title, new endpoints from parsing
            isMockActive: oldDoc.id === serverActiveDocId, // Maintain its server active status
          };
          updatedDocs = [...prevDocs];
          updatedDocs[existingDocIndex] = docToResync;
          
          if (oldDoc.id === serverActiveDocId) {
            reSyncActiveDoc = true; // Mark for re-sync if it was the active one
          }
        } else {
          updatedDocs = [...prevDocs, newDocument];
        }
        return updatedDocs;
      });

      setSelectedDocId(newDocument.id); 

      if (reSyncActiveDoc && docToResync) {
        const result = await updateActiveMockAction(docToResync); 
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
        setServerActiveDocId(result.activeDocId); // Reflect server state in UI
      } else {
         toast({
          title: "Document Processed",
          description: `"${newDocument.title}" with ${newDocument.endpoints.length} endpoint(s) processed.`,
          variant: newDocument.endpoints.length === 0 && parsedData.title.includes("Error") ? "destructive" : "default"
        });
      }
    },
    [toast, serverActiveDocId] 
  );

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
  };

  const handleToggleMockActive = useCallback(async (docIdToToggle: string) => {
    const docToToggle = confluenceDocs.find(d => d.id === docIdToToggle);
    if (!docToToggle) return;

    let actionResult: UpdateActiveMockResult;
    
    // If the doc we are toggling is already active, toggling it means deactivation (send null)
    // If it's not active, toggling it means activation (send the doc)
    const isCurrentlyActiveOnServer = serverActiveDocId === docIdToToggle;
    actionResult = await updateActiveMockAction(isCurrentlyActiveOnServer ? null : docToToggle);


    if (actionResult.success) {
      setServerActiveDocId(actionResult.activeDocId); 
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
       setServerActiveDocId(actionResult.activeDocId); 
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
          // Check if this doc is the one active on the server
          if (doc.id === serverActiveDocId) {
            activeDocChangedOnServer = true;
            // Prepare the doc for server update, ensuring its isMockActive reflects server reality
            updatedDocForServer = { ...potentiallyUpdatedDoc, isMockActive: true }; 
          }
          return potentiallyUpdatedDoc;
        }
        return doc;
      })
    );
    
    setEditingInfo(null); // Close dialog
    toast({
      title: "Response Updated",
      description: `Mock response for endpoint has been saved locally.`,
    });

    // If the edited document was the active one on the server, send the update
    if (activeDocChangedOnServer && updatedDocForServer) {
      const result = await updateActiveMockAction(updatedDocForServer);
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
  }, [serverActiveDocId, toast]);

  // Effect to update the isMockActive flag on local confluenceDocs
  // whenever the serverActiveDocId changes (e.g., due to toggle or re-parse)
  useEffect(() => {
    setConfluenceDocs(prevDocs =>
      prevDocs.map(doc => ({
        ...doc,
        isMockActive: doc.id === serverActiveDocId,
      }))
    );
  }, [serverActiveDocId]);


  const selectedDocument = confluenceDocs.find(doc => doc.id === selectedDocId);
  // Use selectedDocument?.isMockActive which is synced with serverActiveDocId
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
          />
        </aside>
      )}

      <div className="flex-grow space-y-8 p-0 md:p-0 overflow-y-auto w-full">
        <ConfluenceImportForm onEndpointsParsed={handleDocumentParsed} />
        
        {confluenceDocs.length > 0 && (
          <>
            <Separator className="my-6" />
            {selectedDocument ? (
              <div key={selectedDocument.id}> {/* Key change to force re-render */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 sm:gap-2">
                  <h2 className="text-2xl font-headline font-semibold text-primary flex items-center">
                    <LayoutDashboard className="mr-3 h-7 w-7 flex-shrink-0" />
                    <span className="truncate max-w-xs sm:max-w-md md:max-w-lg">Endpoints for: <span className="ml-1 font-normal italic">{selectedDocument.title}</span></span>
                  </h2>
                  <div className="flex items-center space-x-3 pl-0 sm:pl-4 self-start sm:self-center">
                    {isSelectedDocActuallyMockActive ?
                      <Server className="h-5 w-5 text-green-500 flex-shrink-0" /> :
                      <ServerOff className="h-5 w-5 text-red-500 flex-shrink-0" />
                    }
                    <Label 
                      htmlFor={`mock-toggle-main-${selectedDocument.id}`} 
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {isSelectedDocActuallyMockActive ? "Mock Active" : "Mock Inactive"}
                    </Label>
                    <Switch
                      id={`mock-toggle-main-${selectedDocument.id}`}
                      checked={isSelectedDocActuallyMockActive}
                      onCheckedChange={() => handleToggleMockActive(selectedDocument.id)}
                      aria-label={`Toggle mock server for ${selectedDocument.title}`}
                    />
                  </div>
                </div>
                {selectedDocument.endpoints.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-6">
                      To use these mocks, ensure the mock server for this document is active. Your application can then hit paths under <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/mock/...</code>.
                    </p>
                    <EndpointGrid 
                      endpoints={selectedDocument.endpoints} 
                      onEditResponse={(endpointId) => selectedDocId && handleOpenEditDialog(selectedDocId, endpointId)}
                      isMockActive={isSelectedDocActuallyMockActive}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-12 bg-card rounded-lg shadow-sm">
                    <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2 font-headline">No Endpoints Parsed</h3>
                    <p className="text-muted-foreground">
                      The AI couldn't find any API endpoints in this document, or there was an error during parsing.
                    </p>
                  </div>
                )}
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
         {confluenceDocs.length === 0 && ( // Show only if no docs parsed yet, after the import form
          <div className="flex flex-col items-center justify-center text-center py-12 mt-8">
            <LayoutDashboard className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2 font-headline">Mock Your APIs</h3>
            <p className="text-muted-foreground max-w-md">
              Paste a Confluence link above to get started. The AI will parse the API endpoints, allowing you to manage and mock them instantly.
            </p>
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

