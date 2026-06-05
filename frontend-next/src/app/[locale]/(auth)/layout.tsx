export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="auth-backdrop" aria-hidden="true" />
      <div className="relative z-[1] w-full max-w-4xl">{children}</div>
    </main>
  );
}
