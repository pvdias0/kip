import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  privacyPolicyDocument,
  termsOfServiceDocument,
} from "@/legal/legalContent";

type LegalDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: "privacy" | "terms";
};

const documentMap = {
  privacy: privacyPolicyDocument,
  terms: termsOfServiceDocument,
} as const;

export function LegalDocumentDialog({
  open,
  onOpenChange,
  documentType,
}: LegalDocumentDialogProps) {
  const document = documentMap[documentType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-border/70 bg-background/95 p-0 sm:rounded-3xl">
        <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-background to-income/10 px-6 py-5">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Versao {document.version}</Badge>
              <Badge variant="outline">Atualizado em {document.effectiveDateLabel}</Badge>
            </div>
            <DialogTitle className="text-2xl font-display">{document.title}</DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-6">
              Leia com atencao. Este documento regula o uso da plataforma e o
              tratamento dos dados vinculados a sua conta.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[70vh] space-y-8 overflow-y-auto px-6 py-6">
          <div className="space-y-4">
            {document.intro.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>

          {document.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h3 className="text-lg font-display font-semibold text-foreground">
                {section.heading}
              </h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.items ? (
                <ul className="space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                  {section.items.map((item) => (
                    <li key={item} className="list-disc">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
