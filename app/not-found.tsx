import { ButtonLink, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Logo className="text-lg" />
        <h1 className="mt-8 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted">This link may be mistyped, or the event or ticket no longer exists.</p>
        <ButtonLink href="/" variant="secondary" className="mt-6">
          Go home
        </ButtonLink>
      </div>
    </main>
  );
}
