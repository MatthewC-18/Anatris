// LAS ETIQUETAS VIVAS DEL LABORATORIO.
//
// "Que cada vez que se haga el movimiento se aprecie mejor lo que esta pasando
// con la info que va cambiando." Lo que cambia es QUIEN trabaja y CUANTO, y eso
// se escribe ahora junto al cuerpo: el nombre de cada musculo activo y su
// porcentaje, con una guia hasta el musculo. Esto comprueba las tres cosas que
// pueden estropearlo sin que nadie lo vea en una captura quieta.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import type * as THREE from 'three';
import { calloutChannel, MAX_CALLOUTS, type CalloutItem } from '../calloutChannel';

const malla = {} as THREE.Mesh;
const it_ = (id: string, level: number): CalloutItem => ({ id, role: 'assistant', level, mesh: malla });

describe('que musculos llevan etiqueta', () => {
  beforeEach(() => calloutChannel.set([]));

  it('el mas activo primero, y nunca mas de los que caben', () => {
    calloutChannel.set(
      Array.from({ length: 10 }, (_, i) => it_(`m${i}`, 0.2 + i * 0.08)),
    );
    const got = calloutChannel.get();
    expect(got).toHaveLength(MAX_CALLOUTS);
    expect(got[0].id).toBe('m9');
    for (let i = 1; i < got.length; i++) expect(got[i - 1].level).toBeGreaterThanOrEqual(got[i].level);
  });

  it('un musculo casi en silencio no lleva etiqueta', () => {
    calloutChannel.set([it_('a', 0.9), it_('b', 0.05)]);
    expect(calloutChannel.get().map((x) => x.id)).toEqual(['a']);
  });

  it('HISTERESIS: entra al 18% y no sale hasta bajar del 10%', () => {
    // Con un solo umbral, un musculo que ronda esa cifra apareceria y
    // desapareceria a cada grado del arco: una etiqueta que parpadea se lee como
    // un fallo del programa.
    calloutChannel.set([it_('a', 0.9), it_('b', 0.15)]);
    expect(calloutChannel.ids()).toEqual(['a']); // 15% no llega a entrar
    calloutChannel.set([it_('a', 0.9), it_('b', 0.19)]);
    expect(calloutChannel.ids()).toEqual(['a', 'b']); // entra
    calloutChannel.set([it_('a', 0.9), it_('b', 0.12)]);
    expect(calloutChannel.ids()).toEqual(['a', 'b']); // 12%: se queda
    calloutChannel.set([it_('a', 0.9), it_('b', 0.09)]);
    expect(calloutChannel.ids()).toEqual(['a']); // 9%: sale
  });

  it('la lamina solo se entera cuando cambia QUIEN esta, no cuanto', () => {
    // El porcentaje cambia a cada grado; si cada cambio volviera a pintar la
    // lamina con React, las etiquetas se renderizarian sesenta veces por
    // segundo durante el gesto. La cifra la escribe el proyector con
    // `textContent`.
    let avisos = 0;
    const off = calloutChannel.subscribe(() => {
      avisos++;
    });
    calloutChannel.set([it_('a', 0.5), it_('b', 0.4)]);
    expect(avisos).toBe(1);
    calloutChannel.set([it_('a', 0.61), it_('b', 0.33)]);
    calloutChannel.set([it_('b', 0.8), it_('a', 0.3)]); // cambia el orden, no quien
    expect(avisos).toBe(1);
    calloutChannel.set([it_('a', 0.61)]);
    expect(avisos).toBe(2);
    off();
  });
});

describe('las etiquetas siguen al cuerpo', () => {
  const src = readFileSync('src/components/movement/LabCallouts.tsx', 'utf8');
  const overlays = readFileSync('src/components/movement/RigOverlays.tsx', 'utf8');

  it('el ancla es un vertice con el esqueleto aplicado, no el centro de la caja', () => {
    // Las mallas son pieladas: el centro de su caja es el de la pose de LIGADO.
    // Con el brazo a 120 grados la guia seguiria apuntando a donde estaba el
    // deltoides con el brazo colgando.
    expect(src).toContain('sk.getVertexPosition(idx, v)');
    expect(src).toContain('v.applyMatrix4(mesh.matrixWorld).project(camera)');
  });

  it('la camara al dia antes de proyectar', () => {
    // Los controles de camara (useFrame de prioridad -1) giran la camara con
    // lookAt, que deja la inversa con la posicion nueva y el giro viejo hasta
    // el render. MEDIDO en Chrome con la grafica, fotograma a fotograma: sin la
    // llamada, las guias se separaban del cuerpo al menos 48 px al arrastrar
    // (3 grados por fotograma) y 111 px en un giro de 90 grados; con ella, 0.
    // Se mira el CODIGO, sin comentarios: una llamada comentada no cuenta.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const i = code.indexOf('camera.updateMatrixWorld();');
    expect(i).toBeGreaterThan(0);
    // Dentro del fotograma (no en el cuerpo del componente, que corre una vez)...
    expect(i).toBeGreaterThan(code.indexOf('useFrame(() => {'));
    // ...y antes de la PRIMERA proyeccion, que es la del eje del cuerpo.
    expect(i).toBeLessThan(code.indexOf('.project(camera)'));
    expect(i).toBeLessThan(code.indexOf('v.set(0, MIDLINE_Y, 0).project(camera)'));
  });

  it('el margen lo decide el EJE DEL CUERPO, no el centro del escenario', () => {
    // MEDIDO en la abduccion a 95 grados: el guardian de encuadre desplaza la
    // camara para meter la mano, el eje del cuerpo queda en x=439 de 728 y las
    // anclas del hombro (x=374..413) caian en la mitad DERECHA del lienzo: las
    // seis etiquetas se apilaban sobre el torax, al lado contrario del brazo.
    expect(src).toContain('v.set(0, MIDLINE_Y, 0).project(camera)');
    expect(src).toContain('left: sx < midX');
    expect(src).not.toContain('left: sx < size.width / 2');
  });

  it('las mallas salen del MISMO resolutor que el brillo', () => {
    // Una segunda resolucion de musculo a mallas en otro fichero es la forma
    // mas segura de que la etiqueta y el brillo dejen de coincidir.
    const i = overlays.indexOf('const callouts: CalloutItem[] = [];');
    const j = overlays.indexOf('calloutChannel.set(callouts);');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(overlays.slice(i, j)).toContain('forMuscleMeshes(h.muscleId');
    expect(src).not.toContain('buildMuscleResolution');
  });

  it('no se renderiza con React mientras el gesto corre', () => {
    expect(src).toContain('r.pct.textContent = `${cifra}%`');
    // La lamina se suscribe al canal que le toca (musculos o raices) y solo
    // vuelve a pintar cuando cambia QUIEN esta.
    expect(src).toContain('return channel.subscribe(setIds);');
  });
});

describe('la lectura del escenario', () => {
  const src = readFileSync('src/components/movement/StageReadout.tsx', 'utf8');

  it('es una anotacion: no intercepta el raton', () => {
    // El modelo tiene que seguir pudiendose girar por debajo del angulo y de la
    // regla del arco.
    for (const m of src.matchAll(/className=\{`([^`]*absolute[^`]*)`/g)) {
      if (/left-0 top-0|inset-x-0 bottom-0/.test(m[1])) expect(m[1]).toContain('pointer-events-none');
    }
    expect(src).toContain('stage-veil-top pointer-events-none');
    expect(src).toContain('stage-veil-bottom pointer-events-none');
  });

  it('el nombre de la fase pierde la coletilla de grados, y solo esa', () => {
    const re = /\s*\([^()]*\d[^()]*\)\s*$/;
    const limpia = (s: string) => s.replace(re, '').trim() || s;
    expect(limpia('Transición a la elevación (90-120°)')).toBe('Transición a la elevación');
    expect(limpia('Fase de ajuste (0-30°)')).toBe('Fase de ajuste');
    // Un parentesis con palabras es parte del nombre.
    expect(limpia('Rango medio (deltoides + manguito)')).toBe('Rango medio (deltoides + manguito)');
    expect(limpia('Final')).toBe('Final');
    // Y es la misma expresion que usa el componente, que desde el rediseño del
    // margen la toma de src/lib/phaseLabel.ts (la comparte con el paginador).
    expect(src).toContain("import { grados, sinRango } from '../../lib/phaseLabel';");
    expect(readFileSync('src/lib/phaseLabel.ts', 'utf8')).toContain(String(re));
  });
});
