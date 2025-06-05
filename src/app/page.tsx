
"use client";

import { useState, useCallback } from "react";
import { ConfluenceImportForm } from "@/components/import/ConfluenceImportForm";
import { EndpointGrid } from "@/components/endpoints/EndpointGrid";
import { ResponseEditorDialog } from "@/components/editor/ResponseEditorDialog";
import type { ApiEndpointDefinition, ConfluenceDocument, MockedEndpoint } from "@/lib/types";
import type { ParsedConfluenceData } from "@/actions/confluence";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ConfluenceDocsList } from "@/components/confluence/ConfluenceDocsList";
import { LayoutDashboard } from "lucide-react";

export default function HomePage() {
  const [confluenceDocs, setConfluenceDocs] = useState<ConfluenceDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState<{ docId: string; endpoint: MockedEndpoint } | null>(null);
  const { toast } = useToast();

  const handleDocumentParsed = useCallback((parsedData: ParsedConfluenceData) => {
    const newDocument: ConfluenceDocument = {
      id: parsedData.confluenceLink, // Use link as a unique ID for the document
      title: parsedData.title,
      confluenceLink: parsedData.confluenceLink,
      endpoints: parsedData.endpoints.map(def => ({
        ...def, // Includes id, method, path, description, defaultResponse
        mockResponse: def.defaultResponse, // Initialize mockResponse
      })),
    };

    setConfluenceDocs(prevDocs => {
      const existingDocIndex = prevDocs.findIndex(doc => doc.id === newDocument.id);
      let updatedDocs;
      if (existingDocIndex !== -1) {
        updatedDocs = [...prevDocs];
        updatedDocs[existingDocIndex] = newDocument; // Replace if link parsed again
      } else {
        updatedDocs = [...prevDocs, newDocument];
      }
      return updatedDocs;
    });

    // If no doc is selected or this is the first doc, select it
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
    setConfluenceDocs(prevDocs =>
      prevDocs.map(doc =>
        doc.id === docId
          ? {
              ...doc,
              endpoints: doc.endpoints.map(ep =>
                ep.id === endpointId ? { ...ep, mockResponse: newResponse } : ep
              ),
            }
          : doc
      )
    );
    setEditingInfo(null); // Close dialog after save
    toast({
      title: "Response Updated",
      description: `Mock response for endpoint has been saved.`,
    });
  };

  const selectedDocument = confluenceDocs.find(doc => doc.id === selectedDocId);
  const endpointsToDisplay = selectedDocument ? selectedDocument.endpoints : [];

  return (
    <div className="flex flex-row flex-grow space-x-0 md:space-x-6 h-[calc(100vh-theme(spacing.16)-theme(spacing.16))]"> {/* Adjust height considering header & page padding */}
      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="flex-grow space-y-8 p-0 md:p-0 overflow-y-auto"> {/* Remove p-6 to use container padding */}
        <ConfluenceImportForm onEndpointsParsed={handleDocumentParsed} />
        
        {(selectedDocument || confluenceDocs.length > 0) && <Separator className="my-6" />}

        {selectedDocument ? (
          <div>
            <h2 className="text-2xl font-headline font-semibold mb-6 text-primary flex items-center">
              <LayoutDashboard className="mr-3 h-7 w-7" />
              Endpoints for: <span className="ml-2 font-normal italic truncate ">{selectedDocument.title}</span>
            </h2>
            <EndpointGrid 
              endpoints={endpointsToDisplay} 
              onEditResponse={(endpointId) => selectedDocId && handleOpenEditDialog(selectedDocId, endpointId)} 
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
         {/* Fallback for when no documents exist at all, handled by EndpointGrid's empty state */}
         {confluenceDocs.length === 0 && (
            <div>
                <h2 className="text-2xl font-headline font-semibold mb-6 text-primary flex items-center">
                    <LayoutDashboard className="mr-3 h-7 w-7" />
                    Mocked Endpoints Dashboard
                </h2>
                <EndpointGrid endpoints={[]} onEditResponse={() => {}} />
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
