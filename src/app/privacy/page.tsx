// src/app/privacy/page.tsx — Privacy Policy page

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Kaamly",
  description: "Privacy Policy for Kaamly – AI-powered job application platform",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          href="/"
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          ← Back to Home
        </Link>

        <h1 className="font-display text-3xl font-bold text-[var(--color-primary)]">
          Privacy Policy
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Last updated: March 16, 2026
        </p>

        <section className="space-y-4 text-[var(--color-foreground)] leading-relaxed">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p>
            Kaamly (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Kaamly web application.
            This Privacy Policy explains how we collect, use, and protect your information
            when you use our service.
          </p>

          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <p>When you sign in with Google, we receive:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Your name and email address from your Google profile</li>
            <li>Your profile picture (if available)</li>
          </ul>
          <p>When you use the app, we may also store:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Job application data and notes you create</li>
            <li>Resume and profile information you provide</li>
            <li>Email drafts generated through the platform</li>
          </ul>

          <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>To authenticate and identify you within the app</li>
            <li>To provide AI-powered job application features</li>
            <li>To send emails on your behalf (only with your explicit permission via Gmail)</li>
            <li>To improve our services</li>
          </ul>

          <h2 className="text-xl font-semibold">4. Gmail API Usage</h2>
          <p>
            If you connect your Gmail account, we request permission to send emails on your behalf.
            We do not read, store, or share the contents of your inbox. Gmail access can be revoked
            at any time from your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] underline"
            >
              Google Account permissions
            </a>.
          </p>

          <h2 className="text-xl font-semibold">5. Data Storage &amp; Security</h2>
          <p>
            Your data is stored securely using industry-standard cloud databases with encrypted
            connections. We do not sell or share your personal information with third parties.
          </p>

          <h2 className="text-xl font-semibold">6. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Google OAuth for authentication</li>
            <li>Gmail API for email sending (optional)</li>
            <li>AI services (Groq, Google Gemini) for content generation</li>
            <li>Vercel for hosting</li>
          </ul>

          <h2 className="text-xl font-semibold">7. Your Rights</h2>
          <p>You can:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Request deletion of your account and data</li>
            <li>Revoke Gmail access at any time</li>
            <li>Export your data by contacting us</li>
          </ul>

          <h2 className="text-xl font-semibold">8. Contact</h2>
          <p>
            For any privacy-related questions, contact us at{" "}
            <a
              href="mailto:anikeshuzumaki@gmail.com"
              className="text-[var(--color-primary)] underline"
            >
              anikeshuzumaki@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
