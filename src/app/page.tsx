"use client";

import { useState, useCallback } from "react";
import { ConfluenceImportForm } from "@/components/import/ConfluenceImportForm";
import { EndpointGrid } from "@/components/endpoints/EndpointGrid";
import { ResponseEditorDialog } from "@/components/editor/ResponseEditorDialog";
import type { ApiEndpointDefinition, MockedEndpoint } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [mockedEndpoints, setMockedEndpoints] = useState<MockedEndpoint[]>([]);
  const [editingEndpoint, setEditingEndpoint] = useState<MockedEndpoint | null>(null);
  const { toast } = useToast();

  const handleEndpointsParsed = useCallback((parsedDefs: ApiEndpointDefinition[]) => {
    const newMockedEndpoints: MockedEndpoint[] = parsedDefs.map(def => ({
      ...def,
      mockResponse: def.defaultResponse, // Initialize mockResponse with defaultResponse
    }));
    setMockedEndpoints(prevEndpoints => {
      // Simple merge: add new, update existing based on path and method
      const updatedEndpoints = [...prevEndpoints];
      newMockedEndpoints.forEach(newEp => {
        const existingIndex = updatedEndpoints.findIndex(e => e.path === newEp.path && e.method === newEp.method);
        if (existingIndex !== -1) {
          updatedEndpoints[existingIndex] = newEp; // Replace if already exists
        } else {
          updatedEndpoints.push(newEp);
        }
      });
      return updatedEndpoints;
    });
    toast({
      title: "Endpoints Processed",
      description: `${parsedDefs.length} endpoint(s) have been imported and are ready to be mocked.`,
      variant: "default",
    });
  }, [toast]);

  const handleOpenEditDialog = (endpointId: string) => {
    const endpointToEdit = mockedEndpoints.find(ep => ep.id === endpointId);
    if (endpointToEdit) {
      setEditingEndpoint(endpointToEdit);
    }
  };

  const handleCloseEditDialog = () => {
    setEditingEndpoint(null);
  };

  const handleSaveResponse = (endpointId: string, newResponse: string) => {
    setMockedEndpoints(prevEndpoints =>
      prevEndpoints.map(ep =>
        ep.id === endpointId ? { ...ep, mockResponse: newResponse } : ep
      )
    );
    toast({
      title: "Response Updated",
      description: `Mock response for endpoint ID ${endpointId.substring(0,8)}... has been saved.`,
    });
  };

  return (
    <div className="space-y-8">
      <ConfluenceImportForm onEndpointsParsed={handleEndpointsParsed} />
      
      {mockedEndpoints.length > 0 && <Separator className="my-8" />}

      <div>
        <h2 className="text-2xl font-headline font-semibold mb-6 text-primary">Mocked Endpoints Dashboard</h2>
        <EndpointGrid endpoints={mockedEndpoints} onEditResponse={handleOpenEditDialog} />
      </div>

      {editingEndpoint && (
        <ResponseEditorDialog
          endpoint={editingEndpoint}
          isOpen={!!editingEndpoint}
          onClose={handleCloseEditDialog}
          onSave={handleSaveResponse}
        />
      )}
    </div>
  );
}
