import { useEffect } from "react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import "@/components/legal/legal.css";

const EFFECTIVE_DATE = "April 27, 2026";
const LAST_UPDATED = "April 27, 2026";

const TOC = [
  { id: "controller", label: "1. Who we are" },
  { id: "data-collected", label: "2. Data we collect" },
  { id: "oauth-tokens", label: "3. Integrations & OAuth" },
  { id: "prompts-content", label: "4. Prompts, files & AI" },
  { id: "payments", label: "5. Payment information" },
  { id: "logs-device", label: "6. Logs & device data" },
  { id: "cookies", label: "7. Cookies & analytics" },
  { id: "purposes", label: "8. Purposes of processing" },
  { id: "lawful-basis", label: "9. Lawful bases" },
  { id: "ai-subprocessors", label: "10. AI & subprocessors" },
  { id: "transfers", label: "11. Cross-border transfers" },
  { id: "retention", label: "12. Retention" },
  { id: "security", label: "13. Security" },
  { id: "children", label: "14. Children's privacy" },
  { id: "rights-india", label: "15. India (DPDP) rights" },
  { id: "rights-eu-uk", label: "16. GDPR / UK rights" },
  { id: "rights-california", label: "17. California rights" },
  { id: "rights-global", label: "18. Singapore & global" },
  { id: "deletion", label: "19. Deletion & withdrawal" },
  { id: "breach", label: "20. Breach notification" },
  { id: "changes", label: "21. Changes" },
  { id: "contact", label: "22. Contact & grievance" },
];

export default function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy · ToolsYourWay";
  }, []);

  return (
    <LegalPageLayout
      title="Privacy Policy"
      effectiveDate={EFFECTIVE_DATE}
      lastUpdated={LAST_UPDATED}
      toc={TOC}
    >
      <p>
        This Privacy Policy explains how ToolsYourWay collects, uses, shares, and
        protects personal data when you use our website, web application, APIs, AI
        features, and related services (the <strong>"Service"</strong>). It applies to
        all users globally and is designed to align with India's Digital Personal Data
        Protection Act, 2023 (<strong>DPDP Act</strong>) and the IT Act framework, the
        EU and UK General Data Protection Regulation (<strong>GDPR / UK GDPR</strong>),
        the California Consumer Privacy Act as amended by the CPRA
        (<strong>CCPA/CPRA</strong>), Singapore's Personal Data Protection Act
        (<strong>PDPA</strong>), and other applicable privacy laws.
      </p>

      <section id="controller">
        <h2>1. Who we are</h2>
        <p>
          The data controller / data fiduciary for personal data processed under this
          policy is:
        </p>
        <ul>
          <li><strong>Entity:</strong> <span className="placeholder">[Legal Entity Name]</span></li>
          <li><strong>Registered address:</strong> <span className="placeholder">[Registered Address]</span></li>
          <li><strong>Privacy contact / DPO:</strong> <span className="placeholder">[DPO/Privacy Contact Email]</span></li>
          <li><strong>India Grievance Officer (under the IT Rules and DPDP Act):</strong> <span className="placeholder">[Grievance Officer Name]</span>, <span className="placeholder">[Grievance Officer Email]</span></li>
        </ul>
        <p>
          When you use the Service to process personal data of your own contacts,
          customers, or subscribers, you are the controller / data fiduciary of that
          data and ToolsYourWay acts as your processor / data processor.
        </p>
      </section>

      <section id="data-collected">
        <h2>2. Categories of personal data we collect</h2>
        <p>We collect personal data in the following categories:</p>
        <ul>
          <li><strong>Account data:</strong> name, email address, password (hashed), language and region preferences, organization name, role, profile photo.</li>
          <li><strong>Plan and billing data:</strong> subscription tier (Ultra / Pro / Premium), trial status, invoices, billing address, GSTIN or VAT number, last four digits of payment methods, processor IDs.</li>
          <li><strong>Connected Account data:</strong> account identifiers, profile details, OAuth scopes, refresh and access tokens, and limited content from third parties such as LinkedIn, X (Twitter), Gmail, Apollo, Runway, and similar services.</li>
          <li><strong>User content:</strong> prompts, instructions, uploaded files, brand assets, contact lists, drafts, AI-generated outputs, scheduled and published posts, messages, and approvals.</li>
          <li><strong>Usage and device data:</strong> IP address, approximate location derived from IP, device type, operating system, browser, language, time zone, referrer, pages viewed, in-app events, error logs.</li>
          <li><strong>Communications:</strong> support messages, survey responses, sales enquiries, feedback.</li>
        </ul>
        <p>
          We do not intentionally collect special-category or sensitive personal data
          (such as biometric, health, or financial account credentials beyond what
          payment processors require). Please do not submit such data through prompts or
          uploads unless you have a clear lawful basis to do so.
        </p>
      </section>

      <section id="oauth-tokens">
        <h2>3. Integrations and OAuth token handling</h2>
        <p>
          When you connect a third-party account (e.g., LinkedIn, X, Gmail, Apollo,
          Runway), we receive an access token and, where applicable, a refresh token
          from that provider in line with the scopes you authorize.
        </p>
        <ul>
          <li>OAuth tokens are stored encrypted at rest and isolated per user.</li>
          <li>Tokens are used solely to perform the actions you have configured (for example, drafting posts, publishing approved content, reading necessary metadata).</li>
          <li>We do not sell access tokens or third-party content.</li>
          <li>You can disconnect any integration from your account settings, which revokes our access on a best-effort basis. You may also revoke access directly with the third-party provider.</li>
        </ul>
      </section>

      <section id="prompts-content">
        <h2>4. Prompts, files, and AI-generated content</h2>
        <p>
          Prompts you submit, files you upload, and AI Outputs you generate are
          processed to operate the Service for you. Specifically:
        </p>
        <ul>
          <li>Prompts and inputs are sent to our AI model providers (subprocessors) for the sole purpose of generating the requested output.</li>
          <li>By default, we do <strong>not</strong> use your prompts, uploads, or AI Outputs to train our or our providers' generative models. Where a provider's default differs, we will configure no-training settings where the provider supports them, and disclose any limitations in our subprocessor list.</li>
          <li>You can delete your prompts, files, and AI Outputs from within the Service. We may retain a short-term audit copy for security and abuse prevention as described in §12.</li>
        </ul>
      </section>

      <section id="payments">
        <h2>5. Payment information</h2>
        <p>
          Payments are handled by third-party payment processors. ToolsYourWay does not
          store full card numbers, CVVs, UPI PINs, or full bank account credentials. We
          receive limited payment metadata such as masked card or UPI identifiers,
          processor reference IDs, country, and billing details necessary for invoicing
          and tax compliance.
        </p>
      </section>

      <section id="logs-device">
        <h2>6. Logs and device data</h2>
        <p>
          We collect server logs, application logs, and device metadata to operate,
          secure, and debug the Service. These logs may include IP address, request
          path, user agent, error stacks, and event timestamps. We restrict access to
          logs to authorized personnel and rotate them on a defined schedule.
        </p>
      </section>

      <section id="cookies">
        <h2>7. Cookies and similar technologies</h2>
        <p>
          We use first-party cookies and local storage that are strictly necessary for
          authentication, security, language preferences, and core functionality. With
          your consent (where required), we may also use:
        </p>
        <ul>
          <li><strong>Analytics cookies</strong> to understand product usage and improve features;</li>
          <li><strong>Performance and error monitoring</strong> to detect and fix problems;</li>
          <li><strong>Marketing pixels</strong>, only on public marketing pages and only if you have consented in regions where consent is required.</li>
        </ul>
        <p>
          You can manage cookies through your browser settings and, where available, our
          in-product cookie controls.
        </p>
      </section>

      <section id="purposes">
        <h2>8. Purposes of processing</h2>
        <p>We process personal data to:</p>
        <ul>
          <li>Create and manage your account and subscription;</li>
          <li>Provide, personalize, and improve the Service, including AI features and integrations;</li>
          <li>Process payments, prevent fraud, and meet financial and tax obligations;</li>
          <li>Operate Connected Accounts and publishing workflows on your instruction;</li>
          <li>Communicate with you about the Service, security, and policy changes;</li>
          <li>Respond to support requests, grievances, and legal claims;</li>
          <li>Comply with applicable law and respond to lawful requests from authorities;</li>
          <li>Detect, prevent, and address fraud, abuse, and security incidents;</li>
          <li>With your consent, send marketing communications and product updates, which you can opt out of at any time.</li>
        </ul>
      </section>

      <section id="lawful-basis">
        <h2>9. Lawful bases (for users in the EU, UK, and similar regimes)</h2>
        <p>We rely on the following lawful bases:</p>
        <ul>
          <li><strong>Contract:</strong> to provide the Service you signed up for and meet our contractual obligations;</li>
          <li><strong>Legitimate interests:</strong> to operate, secure, and improve the Service, prevent abuse, and pursue our reasonable business interests, balanced against your rights;</li>
          <li><strong>Consent:</strong> where required, including for non-essential cookies and certain marketing;</li>
          <li><strong>Legal obligation:</strong> to meet tax, accounting, anti-fraud, and other legal duties.</li>
        </ul>
        <p>
          For users in India under the DPDP Act, processing is generally based on your
          consent at signup or on legitimate uses recognized by the Act (such as
          performance of subscription contracts and compliance with law).
        </p>
      </section>

      <section id="ai-subprocessors">
        <h2>10. AI providers and subprocessors</h2>
        <p>
          To provide the Service, we engage trusted subprocessors, including:
        </p>
        <ul>
          <li><strong>Cloud infrastructure</strong> for hosting, storage, and CDN;</li>
          <li><strong>AI model providers</strong> for generative text, image, audio, and video features;</li>
          <li><strong>Payment processors</strong> for billing;</li>
          <li><strong>Email and notification providers</strong> for transactional and (with consent) marketing messages;</li>
          <li><strong>Analytics, monitoring, and customer support tools</strong>.</li>
        </ul>
        <p>
          A current list of subprocessors is available on request from{" "}
          <span className="placeholder">[DPO/Privacy Contact Email]</span>. We bind
          subprocessors to confidentiality and data-protection obligations consistent
          with applicable law.
        </p>
      </section>

      <section id="transfers">
        <h2>11. Cross-border data transfers</h2>
        <p>
          ToolsYourWay operates globally. Your personal data may be processed in India,
          the United States, the European Union, Singapore, and other jurisdictions
          where our infrastructure or subprocessors operate. Where required, we use
          appropriate transfer mechanisms, including:
        </p>
        <ul>
          <li>Standard Contractual Clauses (EU and UK) and supplementary measures where needed;</li>
          <li>Transfers to jurisdictions notified or permitted under the DPDP Act;</li>
          <li>Equivalent contractual safeguards for transfers under PDPA, PIPL, and other regimes.</li>
        </ul>
      </section>

      <section id="retention">
        <h2>12. Retention</h2>
        <ul>
          <li><strong>Account data:</strong> retained while your account is active and for a reasonable period after closure for legal, accounting, and security purposes (typically up to 7 years for invoices in India under tax law).</li>
          <li><strong>Prompts, files, and AI Outputs:</strong> retained until you delete them or close your account, plus a short-term backup window.</li>
          <li><strong>OAuth tokens:</strong> retained until you disconnect the integration or close your account.</li>
          <li><strong>Logs:</strong> typically 30 to 180 days, longer for security-relevant events.</li>
          <li><strong>Marketing data:</strong> until you opt out, or based on engagement decay.</li>
        </ul>
      </section>

      <section id="security">
        <h2>13. Security</h2>
        <p>
          We use reasonable administrative, technical, and physical safeguards
          appropriate to the risk, including encryption in transit (TLS), encryption at
          rest for sensitive fields and tokens, role-based access controls, audit
          logging, secret management, periodic security reviews, and incident response
          procedures. No system is perfectly secure; you are responsible for keeping
          your credentials safe and notifying us of suspected incidents.
        </p>
      </section>

      <section id="children">
        <h2>14. Children's privacy</h2>
        <p>
          The Service is not directed to children under 18 and is not intended for them.
          We do not knowingly collect personal data from children. If you believe a
          child has provided us with personal data, please contact us at{" "}
          <span className="placeholder">[DPO/Privacy Contact Email]</span> and we will
          take appropriate steps to delete it.
        </p>
      </section>

      <section id="rights-india">
        <h2>15. Your rights under the India DPDP Act, 2023</h2>
        <p>If you are in India, subject to the Act and applicable rules, you may:</p>
        <ul>
          <li>Access a summary of personal data we process about you;</li>
          <li>Request correction or completion of inaccurate or incomplete data;</li>
          <li>Request erasure of your personal data, subject to retention required by law;</li>
          <li>Withdraw consent at any time (this will not affect processing already completed);</li>
          <li>Nominate another individual to exercise your rights in case of incapacity or death;</li>
          <li>Lodge a grievance with our Grievance Officer (see §22) and, if unresolved, with the Data Protection Board of India.</li>
        </ul>
      </section>

      <section id="rights-eu-uk">
        <h2>16. Your rights under GDPR / UK GDPR</h2>
        <p>If you are in the EU, UK, or a similar regime, you may:</p>
        <ul>
          <li>Access your personal data;</li>
          <li>Request rectification or erasure;</li>
          <li>Restrict or object to processing, including direct marketing;</li>
          <li>Data portability where applicable;</li>
          <li>Withdraw consent where processing is based on consent;</li>
          <li>Lodge a complaint with your local supervisory authority (e.g., the ICO in the UK or your national DPA in the EU).</li>
        </ul>
      </section>

      <section id="rights-california">
        <h2>17. Your rights under CCPA / CPRA (California)</h2>
        <p>If you are a California resident, you may:</p>
        <ul>
          <li>Know what personal information we collect, use, and disclose;</li>
          <li>Request deletion of your personal information;</li>
          <li>Request correction of inaccurate personal information;</li>
          <li>Opt out of the "sale" or "sharing" of personal information for cross-context behavioral advertising — we do not sell personal information for money, and any "sharing" is limited to what we disclose here;</li>
          <li>Limit the use of sensitive personal information beyond what is necessary;</li>
          <li>Be free from retaliation for exercising your rights.</li>
        </ul>
        <p>
          You may submit requests via{" "}
          <span className="placeholder">[DPO/Privacy Contact Email]</span>. Authorized
          agents may submit requests on your behalf with verifiable authorization.
        </p>
      </section>

      <section id="rights-global">
        <h2>18. Singapore and other global rights</h2>
        <p>
          Singapore (PDPA), Australia, Canada, UAE, Brazil (LGPD), and other regions
          grant rights similar to access, correction, deletion, and complaint to a local
          authority. We honor these rights to the extent applicable. Contact details for
          all such requests are in §22.
        </p>
      </section>

      <section id="deletion">
        <h2>19. Data deletion and consent withdrawal</h2>
        <p>
          You can delete data and close your account at any time from within the
          Service or by writing to{" "}
          <span className="placeholder">[DPO/Privacy Contact Email]</span>. After
          account closure:
        </p>
        <ul>
          <li>We delete or anonymize personal data on a defined schedule, subject to legal retention obligations;</li>
          <li>We instruct subprocessors to delete copies on commercially reasonable timelines;</li>
          <li>You may withdraw consent for marketing or non-essential cookies at any time without affecting the lawfulness of prior processing.</li>
        </ul>
      </section>

      <section id="breach">
        <h2>20. Breach notification</h2>
        <p>
          If we become aware of a personal data breach likely to result in risk to your
          rights and freedoms, we will notify the relevant supervisory authority and
          affected users without undue delay and within timelines required by applicable
          law (including the DPDP Act, GDPR, and other regimes), with a summary of the
          incident, likely impact, and the steps we are taking.
        </p>
      </section>

      <section id="changes">
        <h2>21. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be
          notified by email or in-product notice. The "Last updated" date at the top of
          this page indicates the latest revision.
        </p>
      </section>

      <section id="contact">
        <h2>22. Contact and grievance redressal</h2>
        <p>
          For privacy questions, requests, or complaints:
        </p>
        <ul>
          <li><strong>Privacy contact / DPO:</strong> <span className="placeholder">[DPO/Privacy Contact Email]</span></li>
          <li><strong>Support:</strong> <a href="mailto:support@toolsyourway.com">support@toolsyourway.com</a></li>
          <li><strong>India Grievance Officer:</strong> <span className="placeholder">[Grievance Officer Name]</span>, <span className="placeholder">[Grievance Officer Email]</span></li>
          <li><strong>Postal:</strong> <span className="placeholder">[Registered Address]</span></li>
        </ul>
        <p>
          We aim to acknowledge requests within 7 days and resolve them within the
          timelines required by applicable law (typically within 30 days, extendable
          where allowed).
        </p>
      </section>

      <hr />
      <p className="text-sm text-[#5A4F87] dark:text-[#B5ACD9]">
        This Privacy Policy is read together with our{" "}
        <a href="/terms">Terms & Conditions</a>. Where local mandatory law grants you
        stronger rights, those rights apply.
      </p>
    </LegalPageLayout>
  );
}
