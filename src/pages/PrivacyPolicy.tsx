import { Link } from "react-router-dom";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useSEO } from "@/hooks/useSEO";
import { formatLagos } from "@/lib/dateUtils";

export default function PrivacyPolicy() {
  useSEO({
    title: "Privacy Policy",
    description: "Read R2PConnect's privacy policy. Learn how we collect, use, and protect your data on our research and collaboration platform.",
    url: "/privacy",
  });
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicHeader />

      {/* Content */}
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {formatLagos(new Date())}</p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground mb-4">
                R2P CONNECT ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Account information (name, email, phone number, institution)</li>
                <li>Research papers and related metadata</li>
                <li>Profile information and professional credentials</li>
                <li>Communications with us and other users</li>
                <li>Payment information for subscriptions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Connect researchers with institutions and industry partners</li>
                <li>Send technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Detect, prevent, and address technical issues</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Information Sharing</h2>
              <p className="text-muted-foreground mb-4">
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>With your consent or at your direction</li>
                <li>With service providers who assist our operations</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and prevent fraud</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Your Rights</h2>
              <p className="text-muted-foreground mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-muted-foreground">
                Email: privacy@r2pconnect.ng<br />
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
