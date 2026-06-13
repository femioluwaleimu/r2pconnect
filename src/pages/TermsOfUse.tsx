import { Link } from "react-router-dom";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useSEO } from "@/hooks/useSEO";
import { formatLagos } from "@/lib/dateUtils";

export default function TermsOfUse() {
  useSEO({
    title: "Terms of Use",
    description: "Review R2PConnect's terms and conditions. Understand the rules and guidelines for using our AI-powered research platform.",
    url: "/terms",
  });
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicHeader />

      {/* Content */}
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Use</h1>
          <p className="text-muted-foreground mb-8">Last updated: {formatLagos(new Date())}</p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing or using R2P CONNECT, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. User Accounts</h2>
              <p className="text-muted-foreground mb-4">
                When you create an account with us, you must provide accurate, complete, and current information. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Research Content</h2>
              <p className="text-muted-foreground mb-4">
                By uploading research to our platform, you represent and warrant that:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>You own or have the necessary rights to the content</li>
                <li>The content does not infringe on any intellectual property rights</li>
                <li>The content is accurate and not misleading</li>
                <li>The content complies with applicable laws and regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Intellectual Property</h2>
              <p className="text-muted-foreground mb-4">
                The platform and its original content, features, and functionality are owned by R2P CONNECT and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. User Conduct</h2>
              <p className="text-muted-foreground mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Use the platform for any unlawful purpose</li>
                <li>Violate any intellectual property rights</li>
                <li>Transmit any malicious code or viruses</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Engage in any conduct that restricts others' use of the platform</li>
                <li>Impersonate any person or entity</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Subscriptions and Payments</h2>
              <p className="text-muted-foreground mb-4">
                Some features of R2P CONNECT require a paid subscription. By subscribing:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>You authorize us to charge your payment method</li>
                <li>Subscriptions renew automatically unless cancelled</li>
                <li>Refunds are handled according to our refund policy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-4">
                R2P CONNECT shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Termination</h2>
              <p className="text-muted-foreground mb-4">
                We may terminate or suspend your account immediately, without prior notice, for any reason whatsoever, including breach of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Changes to Terms</h2>
              <p className="text-muted-foreground mb-4">
                We reserve the right to modify or replace these Terms at any time. We will provide notice of any material changes through the platform or via email.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Governing Law</h2>
              <p className="text-muted-foreground mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have questions about these Terms, please contact us at:
              </p>
              <p className="text-muted-foreground">
                Email: legal@r2pconnect.ng<br />
                Address: Lagos, Nigeria
              </p>
            </section>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
