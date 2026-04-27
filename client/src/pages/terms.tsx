import { useEffect } from "react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import "@/components/legal/legal.css";

const EFFECTIVE_DATE = "April 27, 2026";
const LAST_UPDATED = "April 27, 2026";

const TOC = [
  { id: "acceptance", label: "1. Acceptance of terms" },
  { id: "eligibility", label: "2. Account & eligibility" },
  { id: "subscriptions", label: "3. Subscriptions, trials & billing" },
  { id: "ai-outputs", label: "4. AI-generated outputs" },
  { id: "connected-accounts", label: "5. Connected accounts & OAuth" },
  { id: "publishing", label: "6. Publishing approvals" },
  { id: "user-content", label: "7. Your content & IP" },
  { id: "third-party", label: "8. Third-party services" },
  { id: "acceptable-use", label: "9. Acceptable use" },
  { id: "prohibited", label: "10. Prohibited automation" },
  { id: "data-security", label: "11. Data & security" },
  { id: "service-changes", label: "12. Service changes & beta" },
  { id: "termination", label: "13. Suspension & termination" },
  { id: "disclaimers", label: "14. Disclaimers" },
  { id: "liability", label: "15. Limitation of liability" },
  { id: "indemnity", label: "16. Indemnity" },
  { id: "governing-law", label: "17. Governing law" },
  { id: "contact", label: "18. Contact" },
];

export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms & Conditions · ToolsYourWay";
  }, []);

  return (
    <LegalPageLayout
      title="Terms & Conditions"
      effectiveDate={EFFECTIVE_DATE}
      lastUpdated={LAST_UPDATED}
      toc={TOC}
    >
      <p>
        Welcome to ToolsYourWay. These Terms & Conditions (the <strong>"Terms"</strong>)
        govern your access to and use of the ToolsYourWay website, web application,
        APIs, AI features, and related services (collectively, the <strong>"Service"</strong>),
        operated by Toolsyourway, with
        registered office at Nisarg Palladium, Vadodara
        {" "}(<strong>"ToolsYourWay,"</strong> <strong>"we,"</strong> <strong>"us,"</strong> or <strong>"our"</strong>).
      </p>
      <p>
        Please read these Terms carefully. By creating an account, subscribing to a
        plan, or otherwise using the Service, you agree to be bound by these Terms and
        by our <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use
        the Service.
      </p>

      <section id="acceptance">
        <h2>1. Acceptance of terms</h2>
        <p>
          By clicking "Sign up," "I agree," or any equivalent button, or by accessing or
          using the Service, you confirm that you have read, understood, and accepted
          these Terms. If you are using the Service on behalf of an organization, you
          represent that you have authority to bind that organization, and "you" refers
          to both you personally and that organization.
        </p>
        <p>
          We may update these Terms from time to time. Material changes will be notified
          by email or in-product notice at least 14 days before they take effect, where
          feasible. Continued use after the effective date constitutes acceptance.
        </p>
      </section>

      <section id="eligibility">
        <h2>2. Account & eligibility</h2>
        <ul>
          <li>You must be at least 18 years old, or the age of majority in your jurisdiction, to use the Service.</li>
          <li>You agree to provide accurate, complete, and current information during signup and to keep it updated.</li>
          <li>You are responsible for safeguarding your credentials, including OAuth tokens for connected accounts, and for all activity under your account.</li>
          <li>You must notify us promptly at <a href="mailto:admin@toolsyourway.com">admin@toolsyourway.com</a> of any unauthorized access or security incident affecting your account.</li>
          <li>One account per individual or organization, unless we agree otherwise in writing.</li>
        </ul>
      </section>

      <section id="subscriptions">
        <h2>3. Subscriptions, trials & billing</h2>
        <h3>Plans</h3>
        <p>
          ToolsYourWay offers tiered subscription plans, including <strong>Ultra</strong>,
          {" "}<strong>Pro</strong>, and <strong>Premium</strong>. Each plan's features,
          usage limits, and pricing are described on our pricing page and may be updated
          from time to time. The plan you select at checkout governs your subscription.
        </p>
        <h3>Trials</h3>
        <p>
          We may offer free trials at our discretion. Trials may have feature, usage, or
          time limits and may convert to a paid plan at the end of the trial period if
          you have provided payment details. We will display the conversion terms before
          you start a trial.
        </p>
        <h3>Billing</h3>
        <ul>
          <li>Fees are billed in advance on a recurring basis (monthly or annually) per the plan you select.</li>
          <li>Prices are exclusive of applicable taxes (including GST in India and VAT/sales tax elsewhere), which will be added where required by law.</li>
          <li>Payments are processed by third-party payment processors. By providing payment information, you authorize us and our processors to charge the applicable fees.</li>
          <li>Failure to pay may result in suspension of the Service and the loss of usage credits, scheduled posts, or queued jobs.</li>
        </ul>
        <h3>Refunds & cancellations</h3>
        <p>
          You may cancel your subscription at any time from your account settings.
          Cancellation takes effect at the end of the current billing cycle, and you
          retain access until that date. Except where required by applicable law (for
          example, certain consumer protection rules), <strong>fees already paid are
          non-refundable</strong>, including for partial billing periods, unused credits,
          and unused AI generations.
        </p>
        <h3>Price changes</h3>
        <p>
          We may change pricing for new billing cycles with at least 30 days' prior
          notice by email or in-product. Price changes will not affect the current paid
          billing period.
        </p>
      </section>

      <section id="ai-outputs">
        <h2>4. AI-generated outputs and your responsibility</h2>
        <p>
          The Service uses generative AI models to produce text, images, video, audio,
          analyses, drafts, and other outputs (<strong>"AI Outputs"</strong>) based on
          your prompts and connected data.
        </p>
        <ul>
          <li>
            <strong>No guarantee of accuracy.</strong> AI Outputs may be inaccurate,
            incomplete, biased, or unsuitable for your purpose. You are responsible for
            reviewing, verifying, and editing AI Outputs before relying on, publishing,
            or otherwise using them.
          </li>
          <li>
            <strong>No professional advice.</strong> AI Outputs do not constitute
            legal, medical, financial, tax, regulatory, or other professional advice.
          </li>
          <li>
            <strong>Ownership.</strong> Subject to your compliance with these Terms and
            payment of applicable fees, you may use AI Outputs you generate for your
            lawful business and personal purposes. The same or similar outputs may be
            generated for other users; AI Outputs are not exclusive to you.
          </li>
          <li>
            <strong>Compliance.</strong> You must ensure your use of AI Outputs complies
            with applicable laws, third-party platform policies (including LinkedIn, X,
            Gmail, and others), advertising rules, and any disclosure requirements for
            AI-generated content in your jurisdiction.
          </li>
        </ul>
      </section>

      <section id="connected-accounts">
        <h2>5. Connected accounts & OAuth permissions</h2>
        <p>
          The Service lets you connect third-party accounts and services such as
          LinkedIn, X (Twitter), Gmail, Apollo, Runway, and others, via OAuth or API
          keys (each a <strong>"Connected Account"</strong>).
        </p>
        <ul>
          <li>By connecting an account, you authorize us to access and use it as needed to provide the requested feature, within the scopes you grant.</li>
          <li>You confirm you have the right to grant access to each Connected Account and that doing so does not violate the terms of the relevant third party.</li>
          <li>We will only use Connected Account data to operate the Service for you, as further described in our <a href="/privacy">Privacy Policy</a>.</li>
          <li>You may revoke access at any time by disconnecting the account in ToolsYourWay or directly from the third-party provider. Revocation may disable related features.</li>
          <li>Third parties may change their APIs, scopes, rate limits, or policies at any time. This may affect or interrupt features that depend on them.</li>
        </ul>
      </section>

      <section id="publishing">
        <h2>6. Publishing approvals and outbound actions</h2>
        <p>
          The Service can prepare and publish content, send messages, run outreach, or
          take other outbound actions through your Connected Accounts (e.g., posting to
          LinkedIn or X, sending emails through Gmail, queuing publications).
        </p>
        <ul>
          <li>You are solely responsible for the content of any publication, message, or action carried out through your Connected Accounts, including AI-assisted drafts you approve.</li>
          <li>By approving or scheduling a publication, you confirm that you have the right to publish the content and that it complies with applicable laws and the destination platform's terms.</li>
          <li>We may block or delay actions that we reasonably believe violate these Terms, applicable law, or platform rules.</li>
          <li>You must not use the Service to send unsolicited bulk messages, spam, or any communication that violates anti-spam, telemarketing, or data-protection laws (including India's IT Rules, the EU ePrivacy Directive, the US CAN-SPAM Act, and equivalents).</li>
        </ul>
      </section>

      <section id="user-content">
        <h2>7. Your content and intellectual property</h2>
        <h3>Your content</h3>
        <p>
          "Your Content" means the prompts, text, files, images, audio, brand assets,
          contact lists, and other materials you upload, submit, or generate using the
          Service, including your AI Outputs. You retain all rights you have in Your
          Content.
        </p>
        <h3>License to operate the Service</h3>
        <p>
          You grant us a worldwide, non-exclusive, royalty-free license to host, store,
          reproduce, transmit, display, modify, and process Your Content solely as
          necessary to operate, secure, support, and improve the Service for you, and as
          described in our <a href="/privacy">Privacy Policy</a>. You may revoke this
          license by deleting Your Content or your account, subject to backups and
          retention required for security or by law.
        </p>
        <h3>Our IP</h3>
        <p>
          The Service, including its software, design, logos, models, and documentation
          (excluding Your Content), is owned by ToolsYourWay or its licensors and is
          protected by intellectual property laws. We grant you a limited, non-exclusive,
          non-transferable, revocable license to use the Service in line with these Terms
          for the duration of your subscription. No other rights are granted.
        </p>
        <h3>Feedback</h3>
        <p>
          If you send us feedback or suggestions, you grant us a worldwide, perpetual,
          royalty-free license to use them without restriction or compensation.
        </p>
      </section>

      <section id="third-party">
        <h2>8. Third-party services</h2>
        <p>
          The Service depends on third-party providers, including AI model providers,
          cloud infrastructure, payment processors, OAuth providers, and analytics
          tools. We are not responsible for the availability, accuracy, or actions of
          third-party services. Use of those services may be subject to their own terms
          and privacy notices.
        </p>
      </section>

      <section id="acceptable-use">
        <h2>9. Acceptable use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Violate any applicable law, regulation, or third-party right;</li>
          <li>Generate or distribute content that is unlawful, defamatory, harassing, hateful, sexually explicit involving minors, deceptive, or that infringes intellectual property;</li>
          <li>Impersonate any person, entity, or brand, or misrepresent your affiliation;</li>
          <li>Interfere with, disrupt, probe, or compromise the security or integrity of the Service or any connected systems;</li>
          <li>Reverse engineer, decompile, or attempt to extract the source code of the Service, except to the extent permitted by law;</li>
          <li>Use the Service to develop a competing product or to train competing AI models;</li>
          <li>Resell, sublicense, or commercially redistribute the Service, except as expressly permitted in writing.</li>
        </ul>
      </section>

      <section id="prohibited">
        <h2>10. Prohibited automation, spam, and scraping</h2>
        <ul>
          <li>You must not use the Service to send spam, unsolicited bulk messages, or unwanted commercial communications.</li>
          <li>You must not use the Service to scrape, harvest, or collect data from any platform in violation of that platform's terms or applicable law.</li>
          <li>You must comply with all rate limits, quotas, and policies of Connected Accounts and integrated third parties (including LinkedIn, X, Gmail, Apollo, Runway).</li>
          <li>You must not attempt to evade detection systems, ban controls, or anti-abuse measures of any third-party platform.</li>
          <li>Automated actions through the Service must be initiated, supervised, and approved by an authorized human user; fully autonomous mass-outreach without human review is not permitted.</li>
        </ul>
      </section>

      <section id="data-security">
        <h2>11. Data and security</h2>
        <p>
          We implement reasonable administrative, technical, and physical safeguards to
          protect Your Content and account data, including encryption in transit,
          access controls, and credential isolation for OAuth tokens. However, no system
          can be guaranteed fully secure. Please review our{" "}
          <a href="/privacy">Privacy Policy</a> for more details on how we collect, use,
          retain, and protect personal data.
        </p>
      </section>

      <section id="service-changes">
        <h2>12. Service changes & beta features</h2>
        <p>
          We continually improve the Service. We may add, modify, or remove features at
          any time. We will give reasonable notice of material adverse changes to paid
          features. Beta or experimental features are provided "as is," may be
          discontinued at any time, and may have additional restrictions described
          in-product.
        </p>
      </section>

      <section id="termination">
        <h2>13. Suspension and termination</h2>
        <p>
          You may close your account at any time. We may suspend or terminate your
          access to all or part of the Service if:
        </p>
        <ul>
          <li>You materially breach these Terms or our acceptable use rules;</li>
          <li>Your account is overdue on payment;</li>
          <li>We reasonably believe continued access poses a security, legal, or reputational risk;</li>
          <li>We are required to do so by law, court order, or competent authority.</li>
        </ul>
        <p>
          Where reasonable and lawful, we will provide notice and an opportunity to cure.
          Upon termination, your right to use the Service ceases. We may retain data as
          needed to comply with legal obligations or as described in the Privacy Policy.
        </p>
      </section>

      <section id="disclaimers">
        <h2>14. Disclaimers</h2>
        <p>
          To the fullest extent permitted by applicable law, the Service is provided
          {" "}<strong>"as is"</strong> and <strong>"as available"</strong>, without
          warranties of any kind, whether express, implied, statutory, or otherwise. We
          disclaim all implied warranties, including merchantability, fitness for a
          particular purpose, non-infringement, and any warranty arising out of course
          of dealing or usage of trade. We do not warrant that the Service will be
          uninterrupted, error-free, secure, or that AI Outputs will be accurate,
          complete, or fit for your purpose.
        </p>
      </section>

      <section id="liability">
        <h2>15. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by applicable law:
        </p>
        <ul>
          <li>Neither party will be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost revenue, lost data, business interruption, or loss of goodwill, even if advised of the possibility.</li>
          <li>Our total aggregate liability arising out of or relating to the Service or these Terms will not exceed the greater of (a) the fees you paid us in the twelve (12) months immediately preceding the event giving rise to liability, or (b) one hundred US dollars (USD 100) or its equivalent in your local currency.</li>
        </ul>
        <p>
          Some jurisdictions do not allow certain limitations; in those cases, our
          liability is limited to the maximum extent permitted by law.
        </p>
      </section>

      <section id="indemnity">
        <h2>16. Indemnity</h2>
        <p>
          You agree to defend, indemnify, and hold harmless ToolsYourWay, its
          affiliates, officers, employees, and agents from and against any claims,
          damages, losses, liabilities, and expenses (including reasonable legal fees)
          arising out of or related to: (a) Your Content; (b) your use of AI Outputs and
          Connected Accounts; (c) your violation of these Terms or applicable law; or
          (d) your infringement of any third-party right.
        </p>
      </section>

      <section id="governing-law">
        <h2>17. Governing law and dispute resolution</h2>
        <p>
          These Terms are governed by the laws of India, without regard to conflict-of-laws
          principles. Subject to applicable mandatory consumer protections in your
          jurisdiction, the courts at Vadodara, Gujarat, India{" "}
          will have exclusive jurisdiction over any dispute arising out of or relating
          to the Service or these Terms.
        </p>
        <p>
          For users outside India, mandatory local laws (including consumer rights under
          the EU/UK, US state laws, Singapore, UAE, Australia, and others) continue to
          apply where they grant you stronger rights than these Terms.
        </p>
      </section>

      <section id="contact">
        <h2>18. Contact</h2>
        <p>
          For questions, notices, or requests regarding these Terms:
        </p>
        <ul>
          <li><strong>Entity:</strong> Toolsyourway</li>
          <li><strong>Address:</strong> Nisarg Palladium, Vadodara</li>
          <li><strong>Support / initial contact:</strong> <a href="mailto:admin@toolsyourway.com">admin@toolsyourway.com</a></li>
          <li><strong>Grievance Officer (India):</strong> Shyam Gor &mdash; initial contact: <a href="mailto:admin@toolsyourway.com">admin@toolsyourway.com</a></li>
        </ul>
      </section>

      <hr />
      <p className="text-sm text-[#5A4F87] dark:text-[#B5ACD9]">
        Thank you for using ToolsYourWay. These Terms together with the{" "}
        <a href="/privacy">Privacy Policy</a> constitute the entire agreement between
        you and ToolsYourWay regarding the Service.
      </p>
    </LegalPageLayout>
  );
}
