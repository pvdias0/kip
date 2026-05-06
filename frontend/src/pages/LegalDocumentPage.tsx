import { Link } from "react-router-dom";
import { ArrowLeft, BadgeCheck, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { KipLogo } from "@/components/ui/KipLogo";
import {
  privacyPolicyDocument,
  termsOfServiceDocument,
} from "@/legal/legalContent";

type LegalDocumentPageProps = {
  documentType: "privacy" | "terms";
};

const documentMap = {
  privacy: privacyPolicyDocument,
  terms: termsOfServiceDocument,
} as const;

export default function LegalDocumentPage({
  documentType,
}: LegalDocumentPageProps) {
  const document = documentMap[documentType];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <KipLogo size="sm" animated={false} />
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex-1">
          <Card className="overflow-hidden border-border/60 shadow-xl">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-background to-income/10">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  Versao {document.version}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1">
                  <FileText className="h-4 w-4 text-primary" />
                  Atualizado em {document.effectiveDateLabel}
                </span>
              </div>
              <CardTitle className="pt-4 text-3xl font-display">
                {document.title}
              </CardTitle>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                Este documento foi preparado para regular o uso do KIP e o
                tratamento dos dados associados a conta do usuario.
              </p>
            </CardHeader>

            <CardContent className="space-y-8 px-6 py-8 sm:px-8">
              <div className="space-y-4">
                {document.intro.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>

              {document.sections.map((section) => (
                <section key={section.heading} className="space-y-3">
                  <h2 className="text-xl font-display font-semibold text-foreground">
                    {section.heading}
                  </h2>
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

              <div className="flex flex-wrap gap-3 border-t border-border/60 pt-6">
                <Link to="/register">
                  <Button>Ir para cadastro</Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
