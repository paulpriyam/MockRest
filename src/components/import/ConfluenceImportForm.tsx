
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, UploadCloud } from "lucide-react";
import { parseConfluenceLinkAction, type ParseResult } from "@/actions/confluence";
import type { ApiEndpointDefinition } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ConfluenceImportFormProps {
  onEndpointsParsed: (endpoints: ApiEndpointDefinition[]) => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Parsing...
        </>
      ) : (
        <>
          <UploadCloud className="mr-2 h-4 w-4" />
          Parse API Documentation
        </>
      )}
    </Button>
  );
}

export function ConfluenceImportForm({ onEndpointsParsed }: ConfluenceImportFormProps) {
  const initialState: ParseResult | null = null;
  const [state, formAction] = useActionState(parseConfluenceLinkAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success && state.data) {
      onEndpointsParsed(state.data);
      formRef.current?.reset(); 
    }
  }, [state, onEndpointsParsed]);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Import API Endpoints</CardTitle>
        <CardDescription>
          Paste your Confluence link below to automatically parse and set up mock API endpoints.
        </CardDescription>
      </CardHeader>
      <form action={formAction} ref={formRef}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confluenceLink" className="font-medium">Confluence Link</Label>
            <Input
              id="confluenceLink"
              name="confluenceLink"
              type="url"
              placeholder="https://your-company.confluence.net/wiki/spaces/API/pages/..."
              required
            />
          </div>
          {state && !state.success && state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Parsing Error</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
           {state && state.success && state.data && (
             <Alert variant="default" className="bg-green-50 border-green-300 dark:bg-green-900 dark:border-green-700">
              <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-700 dark:text-green-300">Success</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-400">
                {state.data.length} endpoint(s) parsed successfully.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
