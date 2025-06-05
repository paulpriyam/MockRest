import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MockedEndpoint, HttpMethod } from "@/lib/types";
import { ArrowRightCircle, PlusCircle, Replace, Trash2, FileCode, Edit3 } from "lucide-react";

interface EndpointCardProps {
  endpoint: MockedEndpoint;
  onEditResponse: (endpointId: string) => void;
}

const getMethodColors = (method: HttpMethod) => {
  switch (method) {
    case 'GET': return "bg-sky-500 hover:bg-sky-600";
    case 'POST': return "bg-green-500 hover:bg-green-600";
    case 'PUT': return "bg-yellow-500 hover:bg-yellow-600 text-black"; // Ensure text is visible on yellow
    case 'DELETE': return "bg-red-500 hover:bg-red-600";
    case 'PATCH': return "bg-orange-500 hover:bg-orange-600";
    default: return "bg-gray-500 hover:bg-gray-600";
  }
};

const getMethodIcon = (method: HttpMethod) => {
  const iconProps = { className: "h-4 w-4" }; // Removed mr-1 to be handled by gap in Badge or flex
  switch (method) {
    case 'GET': return <ArrowRightCircle {...iconProps} />;
    case 'POST': return <PlusCircle {...iconProps} />;
    case 'PUT': return <Replace {...iconProps} />;
    case 'DELETE': return <Trash2 {...iconProps} />;
    default: return <FileCode {...iconProps} />;
  }
};

export function EndpointCard({ endpoint, onEditResponse }: EndpointCardProps) {
  const summary = endpoint.mockResponse.substring(0, 100) + (endpoint.mockResponse.length > 100 ? "..." : "");

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge 
            variant="secondary" 
            className={`text-xs font-bold uppercase text-white ${getMethodColors(endpoint.method)} flex items-center gap-1 px-2.5 py-1`}
          >
            {getMethodIcon(endpoint.method)}
            <span>{endpoint.method}</span>
          </Badge>
        </div>
        <CardTitle className="font-headline text-lg break-all">{endpoint.path}</CardTitle>
        {endpoint.description && (
          <CardDescription className="text-sm text-muted-foreground pt-1">{endpoint.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow pt-0 pb-3">
        <p className="text-xs text-muted-foreground mb-1 font-medium">Current Mock Response (Preview):</p>
        <pre className="text-xs bg-secondary p-2 rounded-md overflow-x-auto max-h-24 font-code">
          {summary || "No response configured."}
        </pre>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={() => onEditResponse(endpoint.id)} className="w-full hover:bg-accent hover:text-accent-foreground">
          <Edit3 className="mr-2 h-4 w-4" /> Edit Response
        </Button>
      </CardFooter>
    </Card>
  );
}
