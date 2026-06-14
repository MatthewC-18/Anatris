# Anatris

Aplicación educativa de anatomía y biomecánica en 3D, orientada a fisioterapia.
Permite explorar el cuerpo humano por regiones (hombro, codo, rodilla, columna),
inspeccionar músculos, revisar rangos de movimiento (ROM) y seguir un recorrido
pedagógico guiado.

> ⚠️ **Solo con fines educativos.** No sustituye el criterio clínico ni el
> diagnóstico profesional. La app muestra un aviso legal que debe aceptarse
> antes de usarse.

## Stack

- **React 18** + **TypeScript**
- **Vite** (bundler y dev server)
- **Three.js** vía **@react-three/fiber** y **@react-three/drei** (escena 3D)
- **Zustand** (estado global)
- **Tailwind CSS** (estilos)
- **Git LFS** para los modelos `.glb`

## Requisitos previos

- **Node.js 18+** (probado con Node 22)
- **Git LFS** — los modelos 3D (`*.glb`) se almacenan con Git LFS. Sin él solo
  obtendrás punteros de texto en lugar del modelo real.

```bash
git lfs install
git lfs pull
```

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Descargar los modelos 3D vía Git LFS (si no se hizo en el clon)
git lfs pull

# 3. Generar el índice anatómico a partir del modelo
#    (crea public/anatomy-index.json, requerido por la app)
npm run build-anatomy

# 4. Arrancar el servidor de desarrollo
npm run dev
```

La app quedará disponible en la URL que imprime Vite (por defecto
`http://localhost:5173`).

## Scripts

| Script                  | Descripción                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run dev`           | Servidor de desarrollo con HMR.                                    |
| `npm run build`         | Typecheck (`tsc -b`) + build de producción en `dist/`.            |
| `npm run preview`       | Sirve el build de producción localmente.                          |
| `npm run build-anatomy` | Regenera `public/anatomy-index.json` desde `public/modelo-opt.glb`. |

> El índice anatómico (`public/anatomy-index.json`) se construye recorriendo el
> modelo con el mismo `GLTFLoader` de Three.js que usa el visor, de modo que
> los nombres de malla coinciden 1:1 con los del runtime. Si la app muestra el
> error "No se pudo cargar el índice anatómico", ejecuta `npm run build-anatomy`.

## Cuentas y suscripción

Anatris tiene un modo de suscripción (Supabase + Stripe). **Hombro** y
**Fundamentos** son gratuitos; el resto de regiones requiere plan Premium.

- **Sin configurar nada**, la app corre en **modo demo**: usa un backend de
  autenticación simulado en `localStorage`, así que todo el embudo (registro →
  muro de pago → "suscribirme" → premium) es probable sin cuentas reales.
- Para activar el backend real, define `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY` (ver [`.env.example`](.env.example)) y sigue la guía
  de [`supabase/README.md`](supabase/README.md).

La política free/premium vive en `src/auth/entitlements.ts`.

## Estructura del proyecto

```
src/
├── components/   Componentes de UI y de la escena 3D (Viewer, AnatomyModel, paneles…)
├── data/         Datos anatómicos por región (músculos, ROM, fases, conceptos)
├── hooks/        Hooks de carga del índice y resolución de músculos
├── lib/          Utilidades puras (parseo de nombres, colores, índices ROM…)
├── store/        Estado global (Zustand)
├── types/        Definiciones de tipos TypeScript
├── App.tsx       Layout de nivel superior (modos Explorar / Aprender)
└── main.tsx      Punto de entrada

public/
├── modelo-opt.glb       Modelo 3D optimizado (Git LFS) que carga el visor
└── anatomy-index.json   Índice generado (build-anatomy)

scripts/         Scripts de build/diagnóstico (build-anatomy-index, diagnose-glb)
```

## Modelos 3D

- `public/modelo-opt.glb` — modelo optimizado que carga la app en runtime.
- `cuerpo_completo.glb` — modelo fuente completo (referencia).

Ambos se versionan con Git LFS.
