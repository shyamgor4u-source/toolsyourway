import { Link } from "wouter";

interface SignupLegalTextProps {
  action?: string;
  className?: string;
}

export default function SignupLegalText({
  action = "creating your account",
  className = "",
}: SignupLegalTextProps) {
  return (
    <p className={"text-xs text-muted-foreground leading-relaxed " + className}>
      By {action}, you agree to ToolsYourWay's{" "}
      <Link href="/terms" className="underline underline-offset-2 hover:text-primary transition">
        Terms & Conditions
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline underline-offset-2 hover:text-primary transition">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
