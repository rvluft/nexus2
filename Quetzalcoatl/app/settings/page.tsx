export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Configuracoes</h2>
      <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">Configure variaveis de ambiente em .env e use prisma migrate deploy no pipeline de producao.</p>
    </div>
  );
}
