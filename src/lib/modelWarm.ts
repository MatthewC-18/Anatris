// src/lib/modelWarm.ts
//
// DOS SEGUNDOS DE ESPERA EN LOS QUE NO SE DESCARGABA NADA.
//
// Medido en el laboratorio del hombro (`performance.getEntriesByType('resource')`):
// la petición del rig arrancaba a los 2.034 ms de abrir la página. No porque el
// archivo sea grande -- eso viene después -- sino porque hasta entonces nadie lo
// había pedido. La cadena era: bundle de entrada -> resolver la ruta -> cargar el
// trozo diferido de MovementView -> RigViewer -> Suspense -> RigModel -> y ahí,
// por fin, el `fetch`. Dos segundos de red ociosa con 9 MB por traer.
//
// Este módulo rompe esa cadena: sabiendo la ruta inicial se sabe ya qué modelo
// hará falta, así que la descarga empieza en paralelo con el JavaScript en vez de
// después de él.
//
// POR QUÉ ESTÁ APARTE de compressedGLTF.ts, que es donde encaja: ese módulo
// importa three + GLTFLoader + MeshoptDecoder en su primera línea. Llamarlo desde
// `main.tsx` metería todo three en el bundle de entrada, que es exactamente lo
// que las cinco vistas diferidas evitan. Aquí no hay más dependencia que `fetch`.
//
// Y por qué se ENTREGA la respuesta en vez de confiar en la caché del navegador:
// vercel.json cachea los .glb un día, así que una segunda petición normalmente
// saldría de la caché -- pero "normalmente" no es una garantía (en `vite dev` no
// sale, y un modo privado o una caché llena tampoco), y el precio de equivocarse
// es descargar 9 MB dos veces. Entregar el `Response` no depende de nada.

import type { AppMode } from '../components/TopBar';
import { parseRoute } from './routing';

/** El rig con piel del laboratorio de movimiento. */
export const RIG_URL = '/cuerpo-rig.opt.glb?v=8';
/** El atlas estático de Explorar / Aprender. */
export const ATLAS_URL = '/modelo-opt.dec.glb';

/** `/a/b.glb?v=7` -> `/a/b.glb.gz?v=7`: el sufijo va en la RUTA, no en la query. */
export function gzUrl(url: string): string {
  const q = url.indexOf('?');
  return q < 0 ? `${url}.gz` : `${url.slice(0, q)}.gz${url.slice(q)}`;
}

/** Lo que una precarga deja listo: la respuesta y si viene comprimida. */
export interface WarmModel {
  res: Response;
  /** True cuando es la copia `.glb.gz` y hay que inflarla. */
  compressed: boolean;
}

/** Peticiones ya lanzadas, por URL del modelo (la del .glb, no la del .gz). */
const warm = new Map<string, Promise<WarmModel | null>>();

/** True cuando el navegador sabe inflar gzip por nosotros. Todo WebGL2 sabe. */
const canInflate = () => typeof DecompressionStream !== 'undefined';

/**
 * Empieza a traer los bytes de un modelo sin parsearlo. Repetirlo es gratis.
 *
 * Prefiere la copia comprimida, que es la mitad de bytes, y cae al `.glb` plano
 * cuando no está -- que es el caso NORMAL en `vite dev`, donde public/ se sirve
 * tal cual. Sin esa caída la precarga no hacía nada en desarrollo, que es donde
 * se mide, ni en ningún despliegue anterior al que escribe los `.gz`.
 *
 * Nunca lanza: una precarga que falla no puede romper el arranque.
 */
export function warmModel(url: string): void {
  if (warm.has(url)) return;
  warm.set(
    url,
    (async (): Promise<WarmModel | null> => {
      if (canInflate()) {
        try {
          const res = await fetch(gzUrl(url));
          // OJO: en `vite dev` esto NO da 404. El servidor reescribe cualquier
          // ruta desconocida a index.html y responde 200, así que `res.ok` dice
          // que sí a una página HTML de 5 KB. Mirar el tipo es lo que distingue
          // el modelo comprimido de la portada de la aplicación.
          if (res.ok && res.body && !/text\/html/i.test(res.headers.get('content-type') ?? ''))
            return { res, compressed: true };
        } catch {
          /* sigue con el plano */
        }
      }
      try {
        const res = await fetch(url);
        if (res.ok && res.body) return { res, compressed: false };
      } catch {
        /* sin precarga; quien lo necesite lo pedirá él */
      }
      return null;
    })(),
  );
}

/**
 * Reclama la descarga adelantada de `url`, si la hubo. La saca del mapa: el
 * cuerpo de un `Response` se lee una sola vez, así que el segundo en pedirlo
 * tiene que hacer su propia petición.
 */
export function claimWarmModel(url: string): Promise<WarmModel | null> | undefined {
  const p = warm.get(url);
  if (p) warm.delete(url);
  return p;
}

/**
 * Qué modelo hace falta en un modo, o null si ninguno.
 *
 * `repasar` no tiene 3D y la portada tampoco: ahí no se adelanta nada, porque
 * 9 MB que nadie va a usar son peores que los dos segundos que ahorran.
 */
export function modelForMode(mode: AppMode): string | null {
  if (mode === 'movement') return RIG_URL;
  if (mode === 'explore' || mode === 'learn') return ATLAS_URL;
  return null; // 'study': sin 3D
}

/**
 * Lo mismo, a partir de una ruta. La ruta se interpreta con `parseRoute`, no
 * partiendo la cadena a mano: los slugs ya cambiaron una vez (`/estudiar` ->
 * `/repasar`) y una segunda tabla de slugs aquí se habría quedado atrás en
 * silencio, precargando el modelo equivocado.
 */
export function modelForPath(pathname: string): string | null {
  const route = parseRoute(pathname);
  return route ? modelForMode(route.mode) : null;
}

/**
 * Adelanta el modelo que hará falta en `mode`.
 *
 * NO se llama al arrancar sin más: se llama cuando el visitante ya ha pasado el
 * aviso médico. Precargar antes significaba traer 9 MB para alguien que todavía
 * está leyendo el aviso y puede cerrarlo -- ancho de banda pagado por nadie. Aun
 * esperando, se adelanta a toda la cadena de componentes diferidos, que es de
 * donde salían los dos segundos.
 *
 * `?sinprecarga=1` lo desactiva, que es la forma de volver a medir esto sin
 * recompilar: se abre la misma ruta dos veces y se compara el .glb en
 * `performance.getEntriesByType('resource')`. Medido sobre `npm run build` +
 * `vite preview`, dos pasadas de cada:
 *
 *   sin precarga   la petición arranca a 2.963 / 1.265 ms, bytes a 3.261 / 1.577
 *   con precarga   arranca a 475 / 557 ms,                 bytes a 1.024 / 1.032
 *
 * (El panel de vista previa oculto estrangula los temporizadores, de ahí la
 * dispersión; lo que no varía es que la descarga deja de esperar a la cadena de
 * componentes.)
 */
export function warmModelForMode(mode: AppMode): void {
  if (typeof location !== 'undefined' && /(^|[?&])sinprecarga=1(&|$)/.test(location.search)) return;
  const url = modelForMode(mode);
  if (url) warmModel(url);
}
