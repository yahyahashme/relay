import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/kit/button";
import { Card } from "@/components/kit/account";
import { Slip, TopNav } from "@/components/kit/layout";
import { T } from "@/lib/i18n";
import { PRONTO } from "@/lib/pronto";

// A page from the home page's footer that isn't written yet: it says so plainly and goes back home.

export function generateStaticParams() {
  return Object.keys(PRONTO).map((tema) => ({ tema }));
}

export default async function Pronto({ params }: { params: Promise<{ tema: string }> }) {
  const { tema } = await params;
  const page = PRONTO[tema];
  if (!page) notFound();
  return (
    <Slip>
      <TopNav back="/" backLabel={<T es="Inicio" en="Home" />} />
      <Card className="flex flex-col items-start gap-3 px-5 py-6">
        <span className="stamp stamp-warn text-label">
          <T es="En preparación" en="Coming soon" />
        </span>
        <h1 className="text-title leading-tight">
          <T es={page.es} en={page.en} />
        </h1>
        <p className="text-pretty">
          <T
            es="Esta página todavía se está preparando. Relay es una demostración: todo el dinero es de prueba y nada de lo que ve aquí es una oferta de crédito."
            en="This page is still being prepared. Relay is a demo: all the money is test money and nothing here is an offer of credit."
          />
        </p>
      </Card>
      <ButtonLink href="/">
        <T es="Volver al inicio" en="Back to home" />
      </ButtonLink>
    </Slip>
  );
}
