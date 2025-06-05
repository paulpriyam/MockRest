
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MockedEndpoint } from "@/lib/types";
import { Save, X } from "lucide-react";

interface ResponseEditorDialogProps {
  endpoint: MockedEndpoint | null; // docId is now part of editingInfo in parent
  isOpen: boolean;
  onClose: () => void;
  onSave: (endpointId: string, newResponse: string) => void; // docId will be passed from parent's state
}

export function ResponseEditorDialog({ endpoint, isOpen, onClose, onSave }: ResponseEditorDialogProps) {
  const [responseBody, setResponseBody] = useState("");

  useEffect(() => {
    if (endpoint) {
      setResponseBody(endpoint.mockResponse);
    }
  }, [endpoint]);

  if (!endpoint) return null;

  const handleSave = () => {
    onSave(endpoint.id, responseBody); // Parent (page.tsx) will use its 'editingInfo.docId'
    // onClose(); // Closing is now handled by parent after save for better state management
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">Edit Mock Response</DialogTitle>
          <DialogDescription>
            Modify the response for <span className="font-semibold text-primary">{endpoint.method} {endpoint.path}</span>.
            Changes will be reflected immediately for this mock endpoint.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow grid gap-4 py-4 overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="responseBody" className="font-medium">
              Response Body (JSON, XML, Text, etc.)
            </Label>
            <Textarea
              id="responseBody"
              value={responseBody}
              onChange={(e) => setResponseBody(e.target.value)}
              className="min-h-[300px] flex-grow font-code text-sm"
              placeholder='{ "message": "Custom mock response" }'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Save className="mr-2 h-4 w-4" />
            Save Response
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
