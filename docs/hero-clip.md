# Cómo grabar el clip del hero (y la imagen de compartir)

> El único paso de la Sesión 1 que no se puede automatizar desde aquí: el canvas
> WebGL del rig **no se puede capturar** desde el navegador embebido de las
> herramientas (queda a 300×150 y `screenshot` se cuelga; ver memoria
> `movement-lab-visual-verify`). Tiene que salir de tu máquina.
>
> El código ya está listo: en cuanto los archivos existan en `public/`, la
> landing los usa sola. Mientras no existan, cae al goniómetro SVG de siempre.

---

## 1. Qué grabar (importa más que cómo)

El clip tiene que enseñar **lo que ninguna otra app puede enseñar**, no un
modelo bonito girando. En orden de fuerza:

**Opción A — normal vs. patológico (la mejor).** Es tu diferenciador estrella.

1. `/hombro/movimiento`, abducción, lado derecho.
2. Arrastra 0 → 180 despacio. Que se vea el goniómetro llenándose, el músculo
   protagonista cambiando y el ratio húmero/escápula.
3. Cambia "Estado" a **Discinesia escapular**.
4. Vuelve a arrastrar. El ratio salta de ~2:1 a 6.7:1 y se resalta el serrato.

**Opción B — solo abducción normal.** Más simple, sigue siendo mejor que el SVG.
Arrastra 0 → 180 → 0 en bucle limpio.

Reglas:

- **Sin cursor visible** si tu grabadora lo permite (OBS: desmarca "Capturar cursor").
- **Sin UI del navegador.** F11 pantalla completa, o recorta después.
- **3–6 segundos.** Más largo no se ve; más corto no se entiende.
- Que **empiece y termine en la misma pose** para que el bucle no dé un salto.
- Deja fuera el banner legal y la barra superior si puedes: encuadra el visor.

---

## 2. Grabar

**Windows, sin instalar nada:** `Win + Alt + R` (barra de juego de Xbox) graba la
ventana activa en MP4. Suficiente.

**Mejor calidad:** [OBS Studio](https://obsproject.com) → Captura de ventana →
1920×1080, 60 fps, sin cursor.

Guarda el original como `raw.mp4` fuera del repo.

---

## 3. Convertir a los dos formatos que espera el código

Necesitas [ffmpeg](https://ffmpeg.org). El componente busca, en este orden,
`/hero-lab.webm` y `/hero-lab.mp4`.

Recorta primero al trozo bueno (aquí, del segundo 4 al 9):

```bash
ffmpeg -i raw.mp4 -ss 00:00:04 -t 5 -an -vf "scale=1280:-2" hero-cut.mp4
```

WebM (VP9 — el que usarán casi todos, pesa menos):

```bash
ffmpeg -i hero-cut.mp4 -an -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 public/hero-lab.webm
```

MP4 (H.264 — respaldo para Safari antiguo):

```bash
ffmpeg -i hero-cut.mp4 -an -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart public/hero-lab.mp4
```

- `-an` quita el audio. **Es obligatorio**: sin pista de audio ningún navegador
  bloquea el autoplay.
- **Objetivo de peso: por debajo de 800 KB el WebM.** Si se pasa, sube el `-crf`
  (36, 38) o baja a `scale=1024:-2`. Este archivo se descarga antes que el
  producto: si pesa más que el motor 3D, has empeorado la página.

Comprueba el tamaño:

```bash
ls -lh public/hero-lab.webm public/hero-lab.mp4
```

---

## 4. La imagen de compartir (og:image)

Hoy hay un **marcador de posición generado**:

```bash
npm run gen-og-image
```

Escribe `public/og-image.png` (1200×630) con la marca, el goniómetro y las
cifras reales del producto. Funciona, pero **un fotograma real del laboratorio
convierte mucho mejor**. Cuando tengas el clip:

1. Saca un fotograma bueno:
   ```bash
   ffmpeg -i hero-cut.mp4 -ss 00:00:02 -frames:v 1 frame.png
   ```
2. Recórtalo a 1200×630 dejando el rig a la derecha y aire a la izquierda para
   el texto.
3. Añade encima el título y la marca (Figma, o el SVG del script como base).
4. Guárdalo como `public/og-image.png`, sustituyendo el generado.

---

## 5. Comprobar que funciona

Local:

```bash
npm run dev
```

La landing debe reproducir el vídeo en bucle en el panel derecho. Si sigues
viendo el goniómetro, los archivos no están en `public/` o el nombre no coincide.

La tarjeta de compartir **solo se puede probar en producción** (los validadores
necesitan una URL pública). Tras desplegar:

- WhatsApp: pégate el enlace a ti mismo.
- LinkedIn: <https://www.linkedin.com/post-inspector/>
- Genérico: <https://opengraph.dev>

Si LinkedIn muestra una versión vieja, usa el Post Inspector para forzar el
refresco de su caché.

---

## 6. Reutiliza el clip

El mismo material sirve para: el vídeo de 90 s de la candidatura a los eAwards
(S4 del plan maestro), LinkedIn, Instagram y la ficha de la PWA. Grábalo una vez
en buena calidad y guarda el original.
