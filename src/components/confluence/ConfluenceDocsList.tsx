
"use client";

import type { ConfluenceDocument } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { List, Server, ServerOff } from "lucide-react";

interface ConfluenceDocsListProps {
  documents: ConfluenceDocument[];
  selectedDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onToggleMockActive: (docId: string) => void;
}

export function ConfluenceDocsList({ documents, selectedDocId, onSelectDoc, onToggleMockActive }: ConfluenceDocsListProps) {
  if (!documents || documents.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        <List className="mx-auto mb-2 h-8 w-8" />
        No documents parsed yet.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {documents.map((doc) => (
          <div 
            key={doc.id} 
            className={`flex items-center justify-between p-1 rounded-md hover:bg-muted/10 ${selectedDocId === doc.id ? 'bg-muted/20' : ''}`}
          >
            <Button
              variant={"ghost"}
              className={`flex-grow justify-start text-left h-auto py-2 px-3 mr-2 focus-visible:ring-0 focus-visible:ring-offset-0 ${selectedDocId === doc.id ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'hover:bg-accent/10'}`}
              onClick={() => onSelectDoc(doc.id)}
            >
              <span className="truncate text-sm font-medium">{doc.title}</span>
            </Button>
            <div className="flex-shrink-0 flex items-center pl-2" onClick={(e) => e.stopPropagation()}>
              {doc.isMockActive ? <Server className="h-4 w-4 text-green-500 mr-1.5" /> : <ServerOff className="h-4 w-4 text-red-500 mr-1.5"/>}
              <Switch
                id={`mock-toggle-${doc.id}`}
                checked={doc.isMockActive}
                onCheckedChange={() => onToggleMockActive(doc.id)}
                aria-label={`Toggle mock server for ${doc.title}`}
              />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
