import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ShieldCheck } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LegalDocumentDialog } from "@/components/legal/LegalDocumentDialog";

type LegalConsentFieldsProps = {
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
};

export function LegalConsentFields({
  accepted,
  onAcceptedChange,
}: LegalConsentFieldsProps) {
  const [openDocument, setOpenDocument] = useState<"privacy" | "terms" | null>(null);

  return (
    <>
      <Alert className="border-primary/15 bg-primary/5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <AlertTitle className="font-medium">Aceite obrigatorio</AlertTitle>
        <AlertDescription className="space-y-3 pt-1">
          <p>
            O uso do KIP depende do aceite expresso dos documentos legais
            vigentes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setOpenDocument("terms")}
            >
              <FileText className="h-4 w-4" />
              Ler termos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setOpenDocument("privacy")}
            >
              <FileText className="h-4 w-4" />
              Ler politica
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="legal-accepted"
            checked={accepted}
            onCheckedChange={(checked) => onAcceptedChange(checked === true)}
            className="mt-1"
          />
          <Label
            htmlFor="legal-accepted"
            className="text-sm font-normal leading-6 text-foreground"
          >
            Li e aceito os{" "}
            <Link to="/terms-of-service" className="font-medium text-primary hover:underline">
              Termos de Servico
            </Link>
            {" "}e{" "}
            <Link to="/privacy-policy" className="font-medium text-primary hover:underline">
              Politica de Privacidade
            </Link>
            .
          </Label>
        </div>
      </div>

      <LegalDocumentDialog
        open={openDocument === "terms"}
        onOpenChange={(open) => setOpenDocument(open ? "terms" : null)}
        documentType="terms"
      />
      <LegalDocumentDialog
        open={openDocument === "privacy"}
        onOpenChange={(open) => setOpenDocument(open ? "privacy" : null)}
        documentType="privacy"
      />
    </>
  );
}
