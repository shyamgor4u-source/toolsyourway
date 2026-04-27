import { Link } from "wouter";

interface LegalFooterLinksProps {
  className?: string;
}

export default function LegalFooterLinks({ className = "" }: LegalFooterLinksProps) {
  return (
    <nav
      aria-label="Legal"
      className={"flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground " + className}
    >
      <Link href="/terms" className="hover:text-primary transition">
        Terms
      </Link>
      <Link href="/privacy" className="hover:text-primary transition">
        Privacy
      </Link>
      <a href="mailto:support@toolsyourway.com" className="hover:text-primary transition">
        Contact
      </a>
    </nav>
  );
}
