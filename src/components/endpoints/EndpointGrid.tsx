import type { MockedEndpoint } from "@/lib/types";
import { EndpointCard } from "./EndpointCard";
import { PackageOpen } from "lucide-react";

interface EndpointGridProps {
  endpoints: MockedEndpoint[];
  onEditResponse: (endpointId: string) => void;
}

export function EndpointGrid({ endpoints, onEditResponse }: EndpointGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {endpoints.map((endpoint) => (
        <EndpointCard key={endpoint.id} endpoint={endpoint} onEditResponse={onEditResponse} />
      ))}
    </div>
  );
}
