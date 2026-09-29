export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-1 text-center">
        <p className="text-2xl font-semibold tracking-tight">Duolingo Helper</p>
      </div>
      {children}
    </main>
  );
}
