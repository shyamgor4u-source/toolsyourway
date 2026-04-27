import { ReactNode } from "react";
import { Link } from "wouter";

interface LegalPageLayoutProps {
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  children: ReactNode;
  toc?: { id: string; label: string }[];
}

export default function LegalPageLayout({
  title,
  effectiveDate,
  lastUpdated,
  children,
  toc,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FDFCF8] dark:bg-[#0B0820] text-[#1E1650] dark:text-[#F5F2FF]">
      <header className="border-b border-[#E8E3F5] dark:border-[#241B4A] bg-white/80 dark:bg-[#0B0820]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[#1E1650] dark:text-[#F5F2FF] hover:opacity-80 transition">
            <span className="inline-block w-7 h-7 rounded-md bg-gradient-to-br from-[#1E1650] to-[#3A2A8C] dark:from-[#C98A1A] dark:to-[#E0A93A]" />
            <span>ToolsYourWay</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/terms" className="hover:text-[#C98A1A] transition">Terms</Link>
            <Link href="/privacy" className="hover:text-[#C98A1A] transition">Privacy</Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md bg-[#1E1650] text-white dark:bg-[#C98A1A] dark:text-[#0B0820] font-medium hover:opacity-90 transition"
            >
              Back to app
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-[#C98A1A] font-semibold mb-2">
            Legal
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
            {title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#5A4F87] dark:text-[#B5ACD9]">
            <span><strong className="font-semibold">Effective date:</strong> {effectiveDate}</span>
            <span><strong className="font-semibold">Last updated:</strong> {lastUpdated}</span>
          </div>

          <div className="mt-6 rounded-lg border border-[#E0D3A6] bg-[#FBF6E6] dark:bg-[#241B4A] dark:border-[#3D2F73] p-4 text-sm leading-relaxed">
            <strong className="font-semibold">Disclaimer:</strong> This document provides
            template legal terms drafted in plain language for transparency. It is not legal
            advice. Before any commercial launch, please have a qualified attorney review
            and adapt this content to your specific entity, jurisdictions, and product
            scope.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
          {toc && toc.length > 0 && (
            <aside className="hidden lg:block">
              <nav
                aria-label="On this page"
                className="sticky top-24 text-sm border-l border-[#E8E3F5] dark:border-[#241B4A] pl-4"
              >
                <p className="font-semibold mb-2 text-[#1E1650] dark:text-[#F5F2FF]">
                  On this page
                </p>
                <ul className="space-y-1.5">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-[#5A4F87] dark:text-[#B5ACD9] hover:text-[#C98A1A] transition block"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}

          <article className="legal-prose max-w-none">
            {children}
          </article>
        </div>
      </main>

      <footer className="border-t border-[#E8E3F5] dark:border-[#241B4A] mt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-[#5A4F87] dark:text-[#B5ACD9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ToolsYourWay. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-[#C98A1A] transition">Terms</Link>
            <Link href="/privacy" className="hover:text-[#C98A1A] transition">Privacy</Link>
            <a href="mailto:support@toolsyourway.com" className="hover:text-[#C98A1A] transition">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
