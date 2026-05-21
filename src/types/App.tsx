import { useAnatomyIndex } from '@/hooks/useAnatomyIndex';
import { useAnatomyStore } from '@/store/anatomyStore';
import type { AnatomyLayer } from '@/types/anatomy';

const ALL_LAYERS: AnatomyLayer[] = [
  'bones',
  'muscles',
  'ligaments',
  'nerves',
  'vessels',
  'organs',
  'skin',
  'reference',
  'uncategorized',
];

function App() {
  const { rawIndex, loading, error } = useAnatomyIndex();
  const activeLayers = useAnatomyStore((s) => s.activeLayers);
  const toggleLayer = useAnatomyStore((s) => s.toggleLayer);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <p>Cargando índice anatómico…</p>
      </div>
    );
  }

  if (error || !rawIndex) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-red-400">
        <p>Error: {error ?? 'no se pudo cargar el índice'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <h1 className="text-2xl font-bold mb-4">Fisio — Test fase 3</h1>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Índice cargado</h2>
        <p className="text-sm text-slate-300">
          Total de mallas: <span className="font-mono">{rawIndex.totalMeshes}</span>
        </p>
        <ul className="mt-2 text-sm font-mono">
          {(Object.entries(rawIndex.entriesByLayer) as [AnatomyLayer, number][]).map(
            ([layer, count]) => (
              <li key={layer}>
                {layer}: {count}
              </li>
            ),
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Capas activas (toggle)</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_LAYERS.map((layer) => {
            const isActive = activeLayers.has(layer);
            return (
              <button
                key={layer}
                onClick={() => toggleLayer(layer)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500 text-slate-900'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {layer}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Activas: {[...activeLayers].join(', ') || '(ninguna)'}
        </p>
      </section>
    </div>
  );
}

export default App;