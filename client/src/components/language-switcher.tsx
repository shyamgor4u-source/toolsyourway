import { useI18n, AVAILABLE_LANGS } from "@/lib/i18n";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, langName, currency, country } = useI18n();
  const current = AVAILABLE_LANGS.find((l) => l.code === lang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs h-8"
          data-testid="button-language-switcher"
        >
          <Globe className="w-3.5 h-3.5" />
          {compact ? (
            <span className="uppercase">{lang}</span>
          ) : (
            <>
              <span>{current?.name || langName}</span>
              <span className="text-muted-foreground">\u00b7 {currency}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <div className="text-xs text-muted-foreground px-2 py-1.5 border-b mb-1">
          Detected: {country} \u00b7 {currency}
        </div>
        {AVAILABLE_LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={lang === l.code ? "bg-accent" : ""}
            data-testid={`menu-lang-${l.code}`}
          >
            <span className="flex-1">{l.name}</span>
            <span className="text-xs text-muted-foreground uppercase">{l.code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
