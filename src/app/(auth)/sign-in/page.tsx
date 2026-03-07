// [F05] src/app/(auth)/sign-in/page.tsx — Sign in page

import { signIn } from "@/lib/auth/server";

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="font-display text-xl font-semibold text-[var(--color-foreground)]">
          SIGN IN
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Continue with your Google account
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
          </svg>
          Continue with Google
        </button>
      </form>

      <p className="text-center text-xs text-[var(--color-muted-foreground)]">
        By signing in, you agree to store your job application data securely.
      </p>
    </div>
  );
}
