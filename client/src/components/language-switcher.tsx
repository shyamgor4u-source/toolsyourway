import { useI18n, AVAILABLE_LANGS } from "@/lib/i18n";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, langName, currency, country } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" data-testid="button-language-switcher">
          <Globe className="w-3.5 h-3.5" />
          {compact ? (
            <span className="uppercase">{lang}</span>
          ) : (
            <>
              <span className="truncate max-w-[100px]">{langName.split(" ")[0]}</span>
              <span className="text-muted-foreground">· {currency}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto">
        <div className="text-xs text-muted-foreground px-2 py-1.5 border-b mb-1">
          Detected: {country} · {currency}
        </div>
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Global</DropdownMenuLabel>
        {AVAILABLE_LANGS.filter(l => ["en", "es", "fr", "pt"].includes(l.code)).map(l => (
          <LangItem key={l.code} l={l} active={lang === l.code} onClick={() => setLang(l.code)} />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">India / South Asia</DropdownMenuLabel>
        {AVAILABLE_LANGS.filter(l => ["hi", "bn", "ta", "te", "mr", "gu"].includes(l.code)).map(l => (
          <LangItem key={l.code} l={l} active={lang === l.code} onClick={() => setLang(l.code)} />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">MENA / SEA</DropdownMenuLabel>
        {AVAILABLE_LANGS.filter(l => ["ar", "id", "vi", "th"].includes(l.code)).map(l => (
          <LangItem key={l.code} l={l} active={lang === l.code} onClick={() => setLang(l.code)} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LangItem({ l, active, onClick }: { l: any; active: boolean; onClick: () => void }) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={active ? "bg-accent" : ""}
      data-testid={`menu-lang-${l.code}`}
    >
      <div className="flex-1">
        <div className="text-sm">{l.name}</div>
        <div className="text-[10px] text-muted-foreground">{l.region}</div>
      </div>
      <span className="text-xs text-muted-foreground uppercase">{l.code}</span>
    </DropdownMenuItem>
  );
}
