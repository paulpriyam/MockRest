
import type { MockedEndpoint } from "@/lib/types";
import { EndpointCard } from "./EndpointCard";
import { PackageOpen, Construction } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EndpointGridProps {
  endpoints: MockedEndpoint[];
  onEditResponse: (endpointId: string) => void;
  isMockActive: boolean; // New prop
}

export function EndpointGrid({ endpoints, onEditResponse, isMockActive }: EndpointGridProps) {
  if (endpoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 bg-card rounded-lg shadow-sm">
        <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2 font-headline">No Endpoints Yet</h3>
        <p className="text-muted-foreground">
          Import your API documentation from Confluence to start managing mock endpoints.
        </p>
      </div>
    );
  }

  return (
    <>
      {!isMockActive && (
        <Alert variant="default" className="mb-6 bg-amber-50 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400">
          <Construction className="h-5 w-5 !text-amber-600 dark:!text-amber-500" />
          <AlertTitle className="font-semibold">Mock Server Inactive</AlertTitle>
          <AlertDescription>
            Activate the mock server for this document (using the switch in the sidebar) to make these endpoints available for testing.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {endpoints.map((endpoint) => (
          <EndpointCard 
            key={endpoint.id} 
            endpoint={endpoint} 
            onEditResponse={onEditResponse} 
          />
        ))}
      </div>
    </>
  );
}
