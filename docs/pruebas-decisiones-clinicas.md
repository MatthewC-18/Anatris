# Pruebas: decisiones clínicas abiertas

Revisión de las 80 pruebas contra su fuente (15-23 nov 2026). Lo que tenía fuente abierta ya está aplicado. Aquí queda solo lo que necesita tu criterio clínico: nada de esto se toca sin tu respuesta. Cada punto dice qué muestra hoy la app y en qué se apoya.

Al final de cada región, lo que pide trabajo del modelo 3D o del código (no es decisión clínica).

## Hombro

### 1. Press abdominal (belly-press)

¿Mantenemos la demostración del press abdominal con su aviso, aunque no enseña la palma sobre el abdomen, o la retiramos como la del lift-off?

- a) Mantenerla con el aviso actual: enseña la rotación casi en neutro y dice lo que falta.
- b) Retirarla y explicar en su lugar por qué no se puede enseñar, como en el lift-off.

Hoy: La demostración pone 5° de rotación interna con el codo a 90°, el antebrazo hacia delante y la mano de canto; la nota avisa de que faltan la palma sobre el abdomen y el empuje.

Fuentes: src/data/orthopedicTests/shoulder.ts:380-382 (maniobra y positivo), :391-415 (comentario), :416 (demostración y nota), :357-358 (lift-off sin demostración); Kilic 2024, PMID 38075394, PMC10698570 (Métodos: brazo al costado, codo flexionado, la palma aprieta el abdomen); Barth 2006, PMID 17027405 (el resumen no describe la maniobra)

### 2. Aprensión anterior

¿La maniobra de la aprensión debe nombrar también la variante de pie, o se enseña solo en supino porque así encadena con la recolocación y la sorpresa?

- a) Solo en supino, como hoy; la variante de pie se queda en la nota.
- b) Nombrar las dos posturas en la maniobra: en supino o de pie.

Hoy: La maniobra dice 'Paciente en supino'; solo la nota añade que la aprensión sola también se hace de pie, que es como la muestra el modelo.

Fuentes: src/data/orthopedicTests/shoulder.ts:427-442 (comentario con fuentes), :451-452 (maniobra), :476 (nota); Cotter 2018, PMID 29443643, PMC6044121 (las tres seguidas en supino); James 2022, PMID 35357960, PMC9069656 (supino con la escápula en la camilla); Valencia Mora 2017, PMID 29114336, PMC5646139 (de pie o en supino); Godinho 2021, PMID 34223405, PMC8246003 (lo atribuye a Rowe y Zarins 1981); Lo 2004, PMID 14977651 (el resumen no da la postura)

### 3. Aprensión anterior

En la aprensión, ¿enseñamos solo la rotación externa o también la otra mano detrás de la cabeza humeral empujándola hacia delante?

- a) Solo la rotación externa progresiva, sin empuje sobre la cabeza humeral.
- b) Rotación externa y, a la vez, la otra mano empujando la cabeza humeral hacia delante desde atrás.

Hoy: La maniobra dice solo que el explorador lleva a rotación externa progresiva; no dice dónde agarra y el modelo no dibuja su mano.

Fuentes: src/data/orthopedicTests/shoulder.ts:451-452 (maniobra), :462-472 (comentario: ninguna fuente abierta revisada dice dónde agarra), :476 (nota); PMC13125581 (Curr Rev Musculoskelet Med 2026): fuerza anterior sobre la cara posterior de la cabeza humeral; Lo 2004, PMID 14977651 (el resumen no describe la maniobra)

### 4. Test de Hawkins-Kennedy

En el test de Hawkins-Kennedy, ¿dónde apoya el explorador la mano que baja el antebrazo para forzar la rotación interna?

- a) En la muñeca.
- b) En el tercio distal del antebrazo.

Hoy: El modelo no dibuja la mano del explorador; la maniobra dice que fuerza la rotación interna descendiendo el antebrazo, sin decir dónde apoya esa mano ni dónde estabiliza la otra.

Fuentes: src/data/orthopedicTests/shoulder.ts:78-79 (maniobra), :93-102 (comentario: la mano genérica caía sobre el húmero), :112 (nota); Hawkins y Kennedy 1980, PMID 7377445 (el resumen no dice dónde apoya el explorador las manos)

### 5. Test de Neer

En el test de Neer, ¿la rotación interna se coloca antes de elevar y se eleva con ella puesta, o se fuerza al final de la elevación?

- a) Antes: se coloca la rotación interna y se eleva con ella, como dice hoy el texto.
- b) Al final: se eleva hasta el final del rango y ahí se fuerza la rotación interna, como hace hoy el modelo.

Hoy: El texto dice que se eleva con el hombro en rotación interna; el modelo eleva primero y añade la rotación interna al final.

Fuentes: src/data/orthopedicTests/shoulder.ts:36-37 (maniobra), :67 (demostración y nota, sin orden declarado); src/lib/demoTimeline.ts:35 (sin orden declarado: primero el gesto principal y después los componentes)

### 6. Compresión activa (O’Brien)

En la compresión activa (O’Brien), ¿el segundo tiempo se enseña como supinación completa del antebrazo con el brazo quieto, como en el artículo original, o como rotación externa del hombro?

- a) Supinación completa del antebrazo con el brazo en la misma posición, como O’Brien 1998.
- b) Rotación externa del hombro con la palma arriba, como dice hoy la maniobra.
- c) Nombrar las dos: rotación externa del hombro y supinación hasta la palma arriba.

Hoy: La maniobra dice 'luego en rotación externa (palma arriba)'; la nota dice que el segundo tiempo se repite sin mover el brazo, con la palma arriba.

Fuentes: src/data/orthopedicTests/shoulder.ts:539-540 (maniobra), :557-561 (comentario con la fuente), :566 (nota); O'Brien 1998, PMID 9784804 (resumen): con el brazo en la misma posición se supina del todo la palma y se repite

**Trabajo del modelo o del código**

- Test de Neer, Test de Hawkins-Kennedy, Aprensión anterior: La mano del explorador solo se coloca sobre el segmento del gesto principal y empujando hacia el brazo colgando; una prueba no puede decir dónde apoya ni hacia dónde empuja. Ganancia: Las tres pruebas pasivas volverían a enseñar la mano del explorador, hoy quitada porque no empujaba donde ni hacia donde pide la maniobra.
- Test de Hawkins-Kennedy, Test de Neer, Compresión activa (O’Brien): La cámara de la demostración sale del plano del gesto principal y una prueba no puede pedir otra vista. Ganancia: Hawkins enseñaría la rotación interna sin girar la cámara a mano, Neer se leería mejor y O’Brien podría enseñar su desviación hacia la línea media cuando exista la aducción horizontal.
- Compresión activa (O’Brien), Aducción cruzada: No existe la aducción horizontal del hombro como articulación que se pueda sumar a la flexión. Ganancia: La aducción cruzada tendría demostración y O’Brien sus 10-15° hacia la línea media.
- Compresión activa (O’Brien): El bucle de la demostración tiene una sola espera, así que no puede sostener dos tiempos seguidos. Ganancia: O’Brien enseñaría el pulgar abajo y después la palma arriba en la misma posición.
- Lata vacía (Jobe), Arco doloroso, Signo de retardo en rotación externa: La elevación solo existe en el plano frontal y en el sagital, y una elevación no se puede sumar a otro gesto como componente. Ganancia: Jobe y el arco doloroso irían en el plano de la escápula, y el retardo con sus ~20° de elevación en ese plano.
- Arco doloroso: Por encima de 150° la elevación inclina el tronco y arrastra el otro brazo hasta el muslo, así que la demostración se para en 150°. Ganancia: La demostración llegaría a la elevación completa que pide la maniobra.
- Arco doloroso: Una demostración que es un recorrido se rotula como una posición fija, la regla no marca la banda dolorosa mientras corre y con animación reducida se posa en el tope. Ganancia: Se leería el barrido con el tramo de ~60-120° marcado, que es lo que valora la prueba.
- Aprensión anterior, Recolocación (Jobe), Sorpresa / liberación anterior: El modelo solo está de pie: no se puede tumbar el cuerpo entero en supino. Ganancia: La tríada se vería en supino con la escápula apoyada, la postura en la que se encadenan las tres.
- Press abdominal (belly-press): No hay una postura que adelante el codo antes de la rotación interna, ni control de los dedos, ni contacto o empuje contra el tronco. Ganancia: Se vería la palma sobre el abdomen con el codo por delante, que es la prueba.
- Lift-off (Gerber): Una demostración no puede partir de la extensión del hombro: solo se acepta flexión de 0 a 180° y la holgura estética adelanta el brazo por debajo de 0°. Ganancia: El lift-off tendría demostración con el dorso de la mano en la región lumbar, si la pose medida no se confunde con la del press abdominal.
- Aprensión anterior, Recolocación (Jobe), Sorpresa / liberación anterior, Signo de retardo en rotación externa: Con el codo doblado asoma una pieza de músculo por fuera de la piel en el codo; la malla no está identificada. Ganancia: La posición de aprensión (abducción y codo a 90°) y la del retardo se verían limpias.

## Cervical

### 1. Prueba del ligamento alar

¿Qué versión de la prueba del ligamento alar enseñamos?

- a) De estrés: el explorador sujeta C2 y lleva la cabeza y el atlas. Lo normal es poca o ninguna inclinación con tope firme; es positiva con más rango que el otro lado o un tope blando.
- b) De palpación: se palpa la espinosa de C2 mientras se inclina la cabeza y lo normal es que se desplace en seguida; no la encontramos en ninguna fuente revisada abierta.

Hoy: La maniobra dice que se estabiliza C2 y a la vez que C2 debe rotar de inmediato, y el positivo pide movimiento excesivo sin arrastre de C2: mezcla las dos versiones.

Fuentes: Physiotutors, alar ligament stress test (no revisado por pares); blog de Pabau (versión de palpación, sin fuente revisada); Osmotherly 2012 PMID 22267548; Hidalgo-García 2020 PMID 31989964; Hutting 2013b PMID 23886844 (no describe las maniobras); cervical.ts:578-580 y 606-609

### 2. Prueba del ligamento alar

Si se elige la versión de estrés, ¿quitamos la demostración del ligamento alar?

- a) Sí: se queda sin demostración y se explica por qué, porque el modelo inclina el cuello entero, justo el movimiento que la sujeción de C2 impide.
- b) No: se mantiene la inclinación del cuello entero con la nota de hoy, que ya avisa de que no se ve lo que la prueba valora.

Hoy: Demostración de 15° de inclinación del cuello entero, repartida de C7 a C1, con una nota que avisa de que C2 se inclina con él, no hay mano del explorador y no se ve el tope.

Fuentes: cervical.ts:589-616 (demostración y nota); Osmotherly 2012 PMID 22267548 y Hidalgo-García 2020 PMID 31989964 (prueba con C2 fijado); boneMap.ts:1082-1085 (inclinación cervical repartida por igual)

### 3. Signo de Lhermitte

¿Qué variante del signo de Lhermitte enseñamos?

- a) La flexión cervical pasiva que hace el explorador con el paciente sentado (la de hoy).
- b) La flexión activa del propio paciente, de pie o sentado: la demostración de pie ya sería la maniobra.
- c) Las dos, nombradas en la maniobra y en la nota.

Hoy: Maniobra: sentado, el explorador hace una flexión cervical pasiva; la demostración flexiona el cuello hasta 45°, de pie y sin mano, y la nota lo avisa.

Fuentes: Jiang 2024 PMID 37903098, PMC11289551 (solo lo nombra como síntoma); Khare 2015 PMC4445188; Sprowls 2026 PMC13022657; Physiotutors, Lhermitte's sign (activa, de pie o sentado); cervical.ts:304 y 328-351

### 4. Signo de Hoffmann

¿Qué cifra principal enseñamos para el signo de Hoffmann?

- a) El 31/73 de la Tabla 2 de Cook 2010 con la duda en la nota (lo de hoy; el panel deriva una LR+ de 1,1).
- b) Solo la sensibilidad del 31% de Cook 2010, con la especificidad como s/d.
- c) Otro estudio con grupo control de la Tabla 5 de Jiang 2024: Rhee 2009 (59/84), Glaser 2001 (58/78) o Cook 2009 (44/74).

Hoy: Muestra 31/73 de la Tabla 2 de Cook 2010, con una nota que avisa de que la misma fila publica LR+ 4,9 y LR- 0,74, que no cuadran con esas cifras, y que su especificidad es dudosa.

Fuentes: Cook 2010 PMID 22131790, PMC3113267, Tabla 2 (fila del Hoffmann) y Tabla 3; Jiang 2024 PMID 37903098, PMC11289551, Tablas 5 y 6; cervical.ts:244-266

### 5. Signo de Hoffmann

Según la cifra que se elija, ¿con qué etiqueta e interpretación se presenta el Hoffmann aislado?

- a) Sigue en 'Equilibrado', que el panel explica como 'sensibilidad y especificidad parecidas', y con 'Aislado tiene valor moderado'.
- b) Pasa a 'En conjunto' ('poca precisión aislado: úsalo dentro de un grupo de tests') y la interpretación deja de decir que aislado tiene valor moderado.

Hoy: Etiqueta 'Equilibrado' e interpretación 'Aislado tiene valor moderado; gana potencia dentro del clúster de mielopatía'.

Fuentes: OrthopedicTestsPanel.tsx:114-125 (textos de 'Equilibrado' y 'En conjunto'); cervical.ts:261-262 y 268-270; Cook 2010 PMC3113267, Tabla 2

### 6. Signo del supinador invertido

¿Qué LR+ usa el panel para la probabilidad post-test del signo del supinador invertido?

- a) La que publica Cook 2010, 29,1 (IC 95% 5,1 a 171,5): con pre-test del 30% da un 93% (la de hoy).
- b) La que recalcula Jiang 2024 para el mismo estudio, 14,64, que según nuestra reconstrucción equivale a un falso positivo más: con pre-test del 30% da un 86%.

Hoy: Usa la LR+ de 29,1 que publica Cook 2010, con 18/99, y la nota cita el 14,6 que recalcula Jiang 2024.

Fuentes: Cook 2010 PMID 22131790, PMC3113267, Tablas 1 y 2; Jiang 2024 PMID 37903098, PMC11289551, Tabla 5; cervical.ts:384-404

**Trabajo del modelo o del código**

- Insuficiencia vertebrobasilar (rotación y extensión sostenidas), Test de tensión neural del MMSS (sesgo mediano), Test de Spurling: Un gesto del cuello no puede ir como componente de otro gesto ni con su propio lado: como componente solo valen articulaciones de un hueso. Ganancia: La vertebrobasilar sumaría la extensión a la rotación, el ULNT su inclinación cervical al lado contrario del brazo y se podría posar el Spurling B (inclinación con extensión y rotación).
- Rotación cervical < 60° al lado sintomático, Insuficiencia vertebrobasilar (rotación y extensión sostenidas), Test de Spurling: El cuello no lee el lado de la demostración: gira e inclina siempre hacia el mismo sitio, y con lado derecho la cara gira a la izquierda del paciente. Ganancia: La rotación y la vertebrobasilar girarían hacia el lado que dice la ficha, el Spurling podría inclinarse a cualquier lado y el caso clínico que habla de rotación a la derecha cuadraría con su demostración.
- Prueba del ligamento alar: No hay un control que mueva solo la cabeza y el atlas con C2 quieto: la inclinación se reparte por igual de C7 a C1. Ganancia: El alar enseñaría la cabeza y el atlas sobre un axis sujeto, que es lo que valora la versión de estrés; la de palpación pediría además que C2 gire al inclinar.
- Test de Sharp-Purser, Estrés del ligamento transverso, Distracción cervical: El modelo solo gira articulaciones: no desliza la cabeza y el atlas sobre C2 ni tracciona el cuello en su eje. Ganancia: Sharp-Purser enseñaría el deslizamiento posterior que la hace positiva, y el estrés del transverso (deslizamiento anterior) y la distracción (tracción axial) podrían tener demostración.
- Test de Sharp-Purser, Prueba del ligamento alar, Signo de Lhermitte: La mano del explorador solo se dibuja en gestos de los miembros, nunca sobre la cabeza ni el cuello. Ganancia: Se verían la mano en la frente con C2 fijado en Sharp-Purser, la sujeción de C2 en el alar y la mano que flexiona la cabeza en Lhermitte, si se enseña pasiva.
- Test de Spurling, Test de Sharp-Purser, Signo de Lhermitte, Test de tensión neural del MMSS (sesgo mediano), Insuficiencia vertebrobasilar (rotación y extensión sostenidas): El modelo está siempre de pie: ninguna demostración puede ponerlo sentado ni en supino. Ganancia: Spurling, Sharp-Purser y Lhermitte se verían sentados, el ULNT en supino y la vertebrobasilar sentada o en supino, y sus notas dejarían de avisar de que el cuerpo está de pie.
- Test de Sharp-Purser, Prueba del ligamento alar, Signo de Lhermitte: Marcar una prueba como pasiva imprime un texto fijo ('la fuerza la aplicas tú sobre el segmento distal') que nadie ha contrastado con estas pruebas, y sin la marca el aviso del botón dice 'Reproducir la maniobra en el modelo 3D'. Ganancia: Sharp-Purser, el alar y Lhermitte (si se enseña pasiva) llevarían la etiqueta Pasivo con un texto propio, y el aviso del botón diría que coloca la posición sin prometer la maniobra.

## Torácica

### 1. Percusión con puño cerrado

¿Se mantienen las cifras de Langdon 2010 y la etiqueta «Confirma», o se tienen en cuenta las dos series posteriores?

- a) Mantener 88/90 y «Confirma», solo con Langdon 2010.
- b) Mantener 88/90 y «Confirma», y añadir a la nota y a las citas Ueda 2025 (75,6/82,4) y Yamamoto 2026 (93/20).
- c) Revisar cifras y etiqueta con las tres series: en Yamamoto 2026 la especificidad fue del 20%.

Hoy: Cifras de Langdon 2010 (88/90 en 78 pacientes, un solo explorador) con la etiqueta «Confirma»; no nombra ninguna serie posterior.

Fuentes: PMC3025244 (Langdon 2010, Tabla 1); PMID 41091674 (Ueda 2025, Spine, resumen: 311 adultos, sin aclarar si la cifra es de toda la cohorte o del subgrupo con resonancia); PMID 42475485 (Yamamoto 2026, Clin Orthop Relat Res, resumen: 136 pacientes de 50 años o más, IC 95% de la especificidad de 9 a 38); thoracic.ts:86-93

### 2. Percusión con puño cerrado

¿Se reescribe la perla que pide radiografía cuando la percusión y el signo del supino salen positivos?

- a) Reescribirla según Langdon 2010: cada signo ayuda a decidir a quién pedir resonancia, sin exigir los dos.
- b) Mantenerla como pauta propia, diciendo que no sale de Langdon 2010.
- c) Quitarla.

Hoy: La perla dice que los dos signos positivos son «una indicación clara de radiografía»; la referencia de Langdon en la app dice que sirven para decidir a quién se pide resonancia.

Fuentes: PMC3025244 (Langdon 2010, texto completo: los signos deciden quién necesita resonancia, la radiografía simple no distingue una fractura aguda de una consolidada y el signo combinado es menos sensible y menos específico); thoracic.ts:94-95; references.ts:638-639

### 3. Prueba de Adams (flexión anterior)

¿Qué umbral del escoliómetro da la ficha, y para qué decisión?

- a) El de Horne 2014 (AAFP): radiografía desde 10°, reexplorar a los 6 meses entre 5° y 9°.
- b) Mantener 5° a 7° como umbral de derivación, buscando antes una fuente abierta.
- c) Quitar la cifra: el escoliómetro cuantifica la rotación, sin umbral.

Hoy: El positivo dice que «el umbral habitual de derivación es 5° a 7°» y la nota de cifras habla de «5° frente a 7°», las dos sin fuente abierta.

Fuentes: Horne 2014, Am Fam Physician (aafp.org/pubs/afp/issues/2014/0201/p193.html, apartado del escoliómetro: 10° o más pide radiografía con Cobb, de 5° a 9° reexploración a los 6 meses, menos de 5° sin seguimiento); thoracic.ts:188-191

### 4. Prueba de Adams (flexión anterior)

¿Se mantiene que la actitud escoliótica por dismetría desaparece al flexionar el tronco?

- a) Mantener la perla.
- b) Matizarla: con dismetría, nivelar antes la pelvis (alza o explorar sentado); el cribado de la SRS pide comprobar que las crestas ilíacas estén niveladas.
- c) Quitar la frase de la dismetría.

Hoy: La perla dice que la actitud escoliótica funcional, por dismetría o contractura, DESAPARECE en la flexión.

Fuentes: srf-india.org/site-in-archive/?p=110 (cribado de la SRS: crestas ilíacas niveladas y mirada al frente para no ver falsas asimetrías rotacionales); clinicalgate.com/thoracic-spine (Evans, ADAMS POSITIONS: la curva funcional se endereza, sin tratar la dismetría); lo del alza o la sedestación es memoria clínica, sin fuente abierta; thoracic.ts:198-199

### 5. Expansión torácica (cirtometría)

¿Qué se hace con la frase de que el umbral fijo de 2,5 cm sobrediagnostica en mayores?

- a) Mantenerla.
- b) Reescribirla con lo que dice el criterio de 1984: comparar con los valores normales para la edad y el sexo.
- c) Quitarla.

Hoy: La nota dice que el umbral fijo de 2,5 cm «sobrediagnostica en mayores», sin fuente abierta; el resumen de 1984 llama al criterio «demasiado poco sensible».

Fuentes: PMID 6231933 (van der Linden 1984, resumen); spartangroup.org/?p=2297 (SPARTAN: el criterio de 1984 compara con valores corregidos por edad y sexo, sin cifra); thoracic.ts:269-282

### 6. Prueba de Roos (EAST)

¿Qué etiqueta de uso lleva la prueba de Roos, que no tiene sensibilidad propia comprobable?

- a) «Descarta», por razonamiento clínico y con su motivo declarado, como ahora.
- b) «En conjunto», como Adson y Wright.
- c) «En conjunto» y citar a Pesser 2022 (266 pacientes: área bajo la curva 0,62, valor predictivo negativo 53-58%), añadiendo la referencia.

Hoy: Etiqueta «Descarta» sin cifra, con el motivo escrito de que el descarte es razonamiento clínico; la ficha no cita a Pesser 2022.

Fuentes: PMID 35550394 (Pesser 2022, resumen: EAST medido por la duración en 266 pacientes con sospecha de desfiladero neurógeno); PMID 9562199 (Plewa 1998, solo sanos); PMID 11707008 (Gillard 2001, solo la media de los tests); thoracic.ts:317-337

### 7. Maniobra de Wright (hiperabducción)

¿Qué variante enseña la ficha de Wright?

- a) La hiperabducción directa por encima de la cabeza con el codo extendido, como ahora.
- b) La de Wright en dos tiempos: 90° de abducción con rotación externa durante un minuto y después hiperabducción.

Hoy: Enseña la hiperabducción directa por encima de la cabeza (el demo la posa a 150° con el codo extendido) y ya avisa de que el nombre se usa también para la variante en dos tiempos.

Fuentes: PMID 11707008 (Gillard 2001, resumen: nombra por separado la prueba de hiperabducción y la de Wright); physiotutors.com/wiki/wrights-test (dos tiempos); PMID 36277577 (hiperabducción pasiva de neutro a 180° con el codo extendido); PMID 25881097 y PMID 24459553 (Wright a 90° de abducción); thoracic.ts:447-476

### 8. Maniobra de Wright (hiperabducción)

¿Qué espacio del desfiladero atribuye la ficha a cada posición del brazo?

- a) La hiperabducción estrecha el espacio retropectoral, bajo el pectoral menor, como ahora.
- b) Como Physiotutors: el paso a 90° el espacio retropectoral y la hiperabducción el costoclavicular.
- c) Elevar el brazo estrecha los dos espacios, costoclavicular y retropectoral, como describe Uzun 2026 en sanos.

Hoy: El objetivo, la estructura que se enciende y la interpretación ponen la hiperabducción en el espacio retropectoral, bajo el pectoral menor.

Fuentes: physiotutors.com/wiki/wrights-test; PMC13205449 (Uzun 2026, 'Radiological Anatomy': en TC y RM de sanos elevar el brazo estrecha el espacio costoclavicular y el retropectoral); PMC10426640 (Ahmed 2022); thoracic.ts:444, 473-474, 538-539; clinicalStructures.ts:203-204, 214-215

### 9. Prueba de Schepelmann

¿Qué fuente respalda los lados del positivo: Magee, que la ficha cita sin haberlo abierto, u otra?

- a) Comprobarlo en tu ejemplar de Magee y dejarlo como cita si coincide.
- b) Citar además una de las fuentes abiertas que dan los lados (el diccionario médico en-academic o clinicalgate, atribuida a Evans).
- c) Dejar Magee sin comprobar, como ahora.

Hoy: La única cita es Magee, sin comprobar; los lados del positivo (neuralgia en el lado cóncavo, pleura en el convexo) salen de fuentes abiertas que no figuran en las citas.

Fuentes: medicine.en-academic.com/160816/Schepelmann_sign; clinicalgate.com/thoracic-spine (cap. 7; atribución a Evans inferida por el ISBN); orthofixar.com/?p=13577; thoracic.ts:593-611, 639; references.ts:129-137

### 10. Prueba de Schepelmann

¿Deben el objetivo y la finalidad nombrar el nervio intercostal, que es lo que señala el dolor en el lado cóncavo?

- a) Sí: nombrar el nervio intercostal en el objetivo, la finalidad y lo que el demo no puede mostrar.
- b) No: dejar «músculos intercostales frente a pleura».

Hoy: El objetivo dice «Músculos intercostales frente a pleura» y la finalidad, origen intercostal frente a pleural; el positivo pone la neuralgia intercostal en el lado cóncavo.

Fuentes: thoracic.ts:588-590, 610-611, 631-632; medicine.en-academic.com/160816/Schepelmann_sign; clinicalgate.com/thoracic-spine

### 11. Rotación torácica en sedestación

¿Cómo se define el positivo de la rotación torácica en sedestación?

- a) Solo asimetría entre lados o dolor reproducido, como en la ruta de Aprender.
- b) Además «rotación global claramente reducida», sin cifra y a juicio del explorador, como ahora.
- c) Con una cifra de amplitud; la única abierta sentado es de 26 sanos jóvenes (Ichikawa 2024: 42,13° ± 12,05 a la derecha).

Hoy: Positivo: asimetría clara entre lados o rotación global claramente reducida, con o sin dolor, sin cifra; Aprender lo define como asimetría marcada o dolor reproducido.

Fuentes: PMC10904216 (Ichikawa 2024, Tabla 1: protocolo con balón entre las piernas y barra, no a horcajadas); PMID 35459026 (Esteban-González 2022: cifras muy dispares según el protocolo); thoracic.ts:667-668; thoracicPhases.ts:265-268

### 12. Rotación torácica en sedestación

Si el positivo pide asimetría, ¿cuántos grados de diferencia entre lados cuentan?

- a) Ninguna cifra: «asimetría clara» a juicio del explorador, como ahora.
- b) Dar como orientación el error de medida de Johnson 2012 (2,8° a 6,3° entre dos exploradores), avisando de que no es un umbral validado.

Hoy: Dice «asimetría clara entre lados» sin grados.

Fuentes: PMID 22488230 (Johnson 2012, resumen: cambio mínimo detectable de 2,8° a 6,3° entre dos exploradores, para el conjunto de cinco técnicas; no está en las referencias de la app); PMID 40772113 (Bloemhof 2025, resumen: diferencia entre lados de -2,2° ± 9,5° en 98 golfistas sanos, postura no indicada); thoracic.ts:667-668

### 13. Rotación torácica en sedestación

¿Se mantiene la perla de que sentarse a horcajadas es lo que hace válida la prueba?

- a) Mantenerla.
- b) Matizarla: a horcajadas se limita la pelvis, pero la medida sentada sigue incluyendo algo de movimiento lumbar (Bucke 2017).
- c) Quitarla.

Hoy: La perla dice que a horcajadas «es lo que hace válida la prueba»; la finalidad habla de eliminar el aporte lumbar y pélvico, y la nota del demo, de que eso bloquea la pelvis.

Fuentes: PMID 28787176 (Bucke 2017, resumen: las medidas sentado de la rotación torácica incluyen movimiento lumbar); PMC10904216 (Ichikawa 2024: la medida sentada no se correlacionó con la resonancia, con balón entre las piernas); thoracic.ts:650-651, 675-676, 718

**Trabajo del modelo o del código**

- Prueba de Adams (flexión anterior), Maniobra de Adson, Prueba de Schepelmann, Rotación torácica en sedestación: Un demo mueve un solo tramo del raquis en un solo eje, el raquis no tiene lado y la pelvis no bascula. Ganancia: Adams hasta la espalda horizontal, Adson con rotación y extensión del cuello, y elegir hacia qué lado se inclina o gira el tronco.
- Prueba de Schepelmann, Prueba de Roos (EAST), Rotación torácica en sedestación: Un componente solo puede ser una articulación de un hueso y en el lado del demo: ni cadenas del hombro ni dos brazos a la vez. Ganancia: Schepelmann con los brazos elevados durante la inclinación, Roos con los dos brazos y la rotación con los brazos colocados en vez de colgando.
- Prueba de Adams (flexión anterior): La cámara del demo sale solo del plano del movimiento; no se puede pedir otra vista por prueba. Ganancia: Mirar Adams desde atrás, que es donde se busca la giba.
- Prueba de Roos (EAST), Maniobra de Wright (hiperabducción), Prueba de Schepelmann, Prueba de Adams (flexión anterior): Lo resaltado se pinta con la profundidad normal, sin pasada de rayos X, y la etiqueta no comprueba si su punto queda tapado. Ganancia: Ver escalenos, pectoral menor e intercostales bajo los músculos que los tapan, y saber si el longísimo de Adams se ve de perfil (sin medir).
- Maniobra de Wright (hiperabducción): Por encima de 150° la abducción del modelo inclina el tronco al otro lado, un demo no puede pedirla sin esa inclinación y no hay banco del brazo contra la cabeza. Ganancia: Llevar el brazo de Wright al final de su recorrido con el tronco recto.
- Prueba de Adams (flexión anterior): El músculo encendido en un demo lleva siempre el color y el título de motor principal (ya sin el 100%). Ganancia: Adams marcaría el longísimo del tórax como freno excéntrico, como dice su texto.
- Prueba de Roos (EAST), Maniobra de Wright (hiperabducción), Prueba de Schepelmann, Rotación torácica en sedestación: El modelo siempre está de pie: no hay postura de cuerpo entero por demo, tampoco sentado. Ganancia: Las cuatro pruebas sentado, y la rotación a horcajadas, como se hacen.
- Maniobra de Wright (hiperabducción): La mano del explorador solo sabe apoyarse en el segmento del gesto base y empujar hacia el reposo; en Wright está quitada. Ganancia: Dibujar la mano que lleva y sostiene el brazo en hiperabducción y la que palpa el pulso radial.

## Lumbar

### 1. Test de inestabilidad en prono

Una revisión abierta (Ferrari 2015, Tabla 4) da a esta prueba 71% de sensibilidad y 57% de especificidad frente a radiografías dinámicas en flexión y extensión. Nuestra revisión las atribuye a Fritz, Piva y Childs 2005, porque coinciden los 49 pacientes y los 28 inestables. Pero la lista de referencias de esa revisión apunta a otros trabajos, y el texto original no está abierto. ¿Se añaden esas cifras a la prueba?

- a) Añadirlas citando a Fritz, Piva y Childs 2005, con su propia referencia y marcadas por verificar.
- b) Añadirlas citando la revisión abierta donde se leen (Ferrari 2015), marcadas por verificar.
- c) Dejar la prueba sin cifras y solo con su valor pronóstico, como hoy.

Hoy: Sin sensibilidad ni especificidad. La nota cita el 72% / 58% que circula, dice que no está en el resumen de Hicks y que, si sale de su texto, mide la respuesta al tratamiento y no un diagnóstico.

Fuentes: Ferrari 2015, PMID 25866618, PMC4392873, Tabla 4 (71,4% / 57,1%, LR+ 1,67, LR- 0,50; tabla 2x2 20/9/8/12, 49 pacientes); Fritz, Piva y Childs 2005, PMID 16047211 (resumen: 49 pacientes con sospecha de inestabilidad); PMC3489248 (solo la portada); lumbar.ts:386-395 (nota con el 72% / 58% en 387) y 409-426; references.ts:562-601 (Hicks 2005 y Rabin 2014; no hay entrada de Fritz 2005)

### 2. Extensión lumbar pasiva

El demo sostiene 30° de extensión lumbar, sin fuente y a 5° del tope del modelo (35°). Como cálculo ilustrativo, elevar 30 cm unas piernas de unos 90 cm de cadera a talón (longitud supuesta, no medida) las inclina unos 19,5°. Esa inclinación se reparte entre la extensión de cadera y la basculación de la pelvis, así que la extensión lumbar de la prueba podría ser menor. ¿Se mantiene el demo a 30°, se baja el ángulo o se quita?

- a) Mantener 30°.
- b) Bajarlo al ángulo que usted fije por criterio clínico.
- c) Quitar el demo: de pie, el modelo echa el tronco hacia atrás y no levanta las piernas, al revés que en la prueba.

Hoy: El modelo de pie extiende la columna lumbar a 30°; la nota avisa de que en la prueba el tronco queda en la camilla y suben las piernas, sin nombrar la cifra.

Fuentes: lumbar.ts:339 (30°), 340-351 (sin fuente, pendiente de criterio clínico) y 355 (nota); boneMap.ts:1046 (tope 35°); Kasai 2006, PMID 17033040 (el resumen no da grados); Physiotutors, passive-lumbar-extension-test (sin grados); Ferrari 2015 PMC4392873 y Rathod 2019 PMC6469328 (maniobra: piernas a unos 30 cm)

### 3. Tensión del nervio femoral (Lasègue invertido)

Suri 2011 midió las cifras en prono, sujetando el tobillo y con una flexión suave de rodilla, sin extensión de cadera. ¿El demo conserva los 15° de extensión de cadera, presentados como variante, o enseña solo la flexión de rodilla?

- a) Conservar los 15° de extensión de cadera como variante, con la nota que ya lo dice.
- b) Quitar la extensión de cadera y dejar solo la flexión de rodilla de la versión medida.

Hoy: El demo flexiona la rodilla a 90° y añade 15° de extensión de cadera; la nota dice que esa cadera es una variante que las cifras no cubren.

Fuentes: Suri 2011, PMID 20543768, PMC2978791, Métodos (prono, tobillo sujeto, flexión suave de rodilla); lumbar.ts:280-285 (decisión clínica pendiente), 289-291 (cadera 15°, rodilla 90°) y 293 (nota)

### 4. Tensión del nervio femoral (Lasègue invertido)

La maniobra nombra el decúbito lateral como una variante que las cifras de Suri 2011 no cubren. ¿Se sigue nombrando o se describe solo la versión en prono?

- a) Seguir nombrándolo como variante no cubierta por las cifras, como hoy.
- b) Quitarlo y describir solo la versión en prono con la que se midieron las cifras.

Hoy: La maniobra describe la versión en prono de Suri y añade que la extensión de cadera y el decúbito lateral son variantes que esas cifras no cubren.

Fuentes: Suri 2011, PMID 20543768, PMC2978791, Métodos (solo prono); lumbar.ts:247-249 (se nombran como variantes, no se borran) y 253-254 (maniobra)

### 5. Elevación de la pierna recta (Lasègue)

En este demo y en el de la Elevación cruzada de la pierna recta se dibuja una sola mano, en la cara anterior del muslo: la que mantiene la rodilla extendida. La que eleva la pierna sujeta el tobillo y no se dibuja, y la lectura del escenario dice que la fuerza la aplicas tú donde se apoya la mano. ¿Se deja esa mano en los dos demos o se quita?

- a) Dejar la mano del muslo, con la nota que explica cuál es, como hoy.
- b) Quitar la mano y dejar solo el aviso de prueba pasiva; la lectura dirá que el modelo no dibuja la mano.

Hoy: Una mano en la cara anterior del muslo distal; la nota dice que mantiene la rodilla extendida y que la que eleva desde el tobillo no se dibuja.

Fuentes: lumbar.ts:70, 82-91 y 103 (Lasègue), 140 y 155 (cruzado); RigOverlays.tsx:518 (contacto al 82% del muslo); RhythmReadout.tsx:355-357; EBMConsult, straight-leg-raising-test (una mano en el tobillo y otra en la cara anterior del muslo)

### 6. Elevación de la pierna recta (Lasègue)

De pie, al flexionar la cadera el modelo inclina el tronco hacia delante como contrapeso (unos 8,6° a 60°, calculado, no medido); es un ajuste que usted pidió y calibró en el laboratorio. En la prueba el raquis lumbar y la pelvis no se mueven, y un cambio de la curva lumbar la invalida. ¿Se quita esa inclinación en los demos del Lasègue y de la Elevación cruzada de la pierna recta?

- a) Dejarla, con el aviso de la nota, como hoy.
- b) Quitarla solo en el Lasègue y en la elevación cruzada.
- c) Quitarla en todos los demos cuyo gesto es la flexión de cadera: también la Prueba de fricción / cuadrante (scour), la Flexión de cadera resistida (Stinchfield) y el miotoma L2.

Hoy: El modelo inclina el tronco hacia delante al flexionar la cadera; las notas del Lasègue y del cruzado dicen que no es parte de la maniobra.

Fuentes: lumbar.ts:92-99 (8,6° calculado con las constantes, no medido), 103 y 155 (notas); RigModel.tsx:314-320 y 3512-3519 (se aplica también en los demos); hip.ts:338 y 628, neuro/lumbosacral.ts:71 (otros demos con la flexión de cadera como gesto base); EBMConsult, straight-leg-raising-test (un cambio de la curva lumbar invalida la prueba)

**Trabajo del modelo o del código**

- Maniobra de Gaenslen, Extensión lumbar pasiva, Prueba de Thomas: Los gestos que se añaden al demo no tienen lado propio: van todos al lado del demo, así que no se pueden posar las dos caderas a la vez. Ganancia: El Gaenslen tendría demo (una cadera en flexión máxima y la otra en extensión), la extensión lumbar pasiva podría posar las dos piernas a la vez y el Thomas posaría también la otra rodilla contra el pecho.
- Test de Slump: Un gesto añadido al demo solo puede ser una articulación: un tramo del raquis (torácico, cervical) se descarta. Ganancia: El Slump posaría la flexión torácica y la cervical sobre la lumbar, que hoy faltan, primer paso para enseñar la liberación cervical que interpreta la prueba.
- Elevación de la pierna recta (Lasègue), Elevación cruzada de la pierna recta, Tensión del nervio femoral (Lasègue invertido), Extensión lumbar pasiva, Test de Slump: El modelo siempre está de pie: un demo no puede ponerlo en supino, en prono ni sentado. Ganancia: Los cinco demos de la región saldrían en su postura real y sobraría el aviso de que el modelo está de pie, que hoy llevan todas sus notas.
- Elevación de la pierna recta (Lasègue), Elevación cruzada de la pierna recta, Tensión del nervio femoral (Lasègue invertido): La mano del explorador es siempre la misma: al 82% del segmento del gesto principal, en su cara de avance y empujando hacia el reposo, como en una prueba resistida. Ganancia: Con un punto de contacto y un sentido por prueba se dibujaría la mano que eleva la pierna desde el tobillo en los dos Lasègue y la que flexiona la rodilla desde el tobillo en la tensión femoral, que hoy no lleva mano.
- Test de Slump: Un gesto añadido solo va del reposo a un ángulo fijo: la rodilla no puede empezar flexionada y extenderse, y añadir la extensión de rodilla la doblaría. Ganancia: El Slump enseñaría su gesto real: con el tronco y la cadera ya flexionados, la rodilla que se extiende, en vez de la pierna que sube ya recta.

## Cadera

### 1. FADIR (pinzamiento anterior)

¿Qué variante del FADIR enseña la app: la cadera en flexión máxima o a 90° de flexión?

- a) Flexión máxima: el FADIR de Pålsson 2020, de donde sale la especificidad del 25% que se muestra.
- b) 90° de flexión: la que Pålsson 2020 llama prueba de pinzamiento anterior, con 80% y 26%.
- c) Las dos, como hoy, y la ruta de Aprender pasa a nombrar también las dos.

Hoy: La ficha nombra las dos variantes y da las dos cifras; la ruta de Aprender sigue diciendo 90°, y el nombre lleva 'pinzamiento anterior', que en Pålsson es la variante a 90°.

Fuentes: Pålsson 2020, PMID 32335699, PMC7511272 (leyenda de la Fig. 1 y Tabla 4); Wong 2022, PMID 35171468, PMC9076795 (apartado FADDIR); Reiman 2015, PMID 25515771 (el resumen no da el grado); hip.ts:66-67, 72-96; hipPhases.ts:169-176

### 2. FADIR (pinzamiento anterior)

Si se monta el demo del FADIR, ¿se acepta la rodilla a 90°, que ninguna fuente abierta fija?

- a) Sí, rodilla a 90°, y la nota dice que es un valor de demostración.
- b) No: el clínico fija el ángulo de rodilla para la variante elegida.
- c) No montar el demo mientras ninguna fuente fije la rodilla.

Hoy: Sin demostración: la postura combinada no está medida. La receta del verificador dobla la rodilla porque, con la rodilla recta, el giro del fémur no se ve.

Fuentes: Verificador de J23: Wong 2022 (PMC9076795), Pålsson 2020 (PMC7511272) y PMID 42999507 (PMC13743882) no fijan la rodilla; hip.ts:103-142

### 3. Rotación interna pasiva en neutro

¿La perla debe enseñar a comparar con la cadera contraria como ayuda práctica, o quedarse solo con el criterio de Pålsson?

- a) Solo el criterio de la fuente: rango completo o disminuido, a juicio del explorador.
- b) Añadir la comparación con la otra cadera como ayuda, diciendo que no es el criterio de Pålsson y que no sirve si las dos caderas están afectadas.

Hoy: La maniobra no pide el lado sano y la perla dice que la fuente no describe comparación con el otro lado.

Fuentes: Pålsson 2020, PMID 32335699, PMC7511272 (Métodos, Passive ROM; Discusión); hip.ts:156-164, 181-184, 193-194

### 4. Prueba de fricción / cuadrante (scour)

¿Desde qué posición empieza el scour que enseña la app?

- a) Desde flexión con rotación interna, como Wong 2022.
- b) Desde flexión con aducción, como Cibulka 2009.
- c) Dejar el texto general, como hoy, sin fijar desde dónde empieza.

Hoy: La maniobra describe un arco de aducción a abducción con rotación y carga axial sin decir desde dónde empieza; el demo solo pone cadera y rodilla a 90°.

Fuentes: pasada1.json, entrada hip, skipped C30 (aducción opcional en el scour: las fuentes no coinciden en la partida); Wong 2022, PMC9076795 (apartado Scour Test); Cibulka 2009, PMID 19352008, PMC3963282 (The Scour Test); hip.ts:281-282, 336-341

### 5. Prueba de fricción / cuadrante (scour)

¿Vale 90° de flexión de rodilla en el demo del scour?

- a) Sí, 90° como valor de demostración, como hoy.
- b) Sí, y que la nota diga que ninguna fuente da la posición de la rodilla.
- c) No: el clínico fija otro ángulo de rodilla.

Hoy: El demo dobla la rodilla a 90° y la nota lo da sin aviso; ni Wong 2022 ni Cibulka 2009 dan la posición de la rodilla.

Fuentes: Wong 2022, PMC9076795; Cibulka 2009, PMID 19352008, PMC3963282; hip.ts:318-320, 341-342

### 6. Prueba de fricción / cuadrante (scour)

¿En qué orden se mueve el demo del scour?

- a) Como hoy: la pierna sube recta hasta 90° durante el 61% de la ida y después dobla la rodilla.
- b) Cadera y rodilla a la vez durante toda la subida.
- c) Primero la rodilla y después la cadera.

Hoy: La pierna sube recta hasta 90° (3,46 de 5,71 s de la ida) y solo después dobla la rodilla; la maniobra dice 'cadera y rodilla en flexión'.

Fuentes: hip.ts:281-282, 330-332

### 7. Log roll (rodamiento)

¿Qué hace la ficha del log roll con Maksoud 2026, que lo midió ante la sospecha de fractura oculta del cuello femoral?

- a) Añadirlo a la nota como otra diana: sensibilidad 0,96 y especificidad por debajo de 0,35.
- b) Solo corregir la frase de que ningún estudio publica sensibilidad ni especificidad, sin dar sus cifras.
- c) Ceñir la ficha al origen intraarticular: etiqueta 'Confirma' sin cifras y la frase limitada a esa diana.

Hoy: La nota y la explicación de su etiqueta 'Confirma' dicen que no hay estudio con sensibilidad ni especificidad del log roll y lo llaman 'la única' maniobra que mueve el fémur 'bajo el acetábulo'; el objetivo ya dice 'una de las más específicas'.

Fuentes: Maksoud 2026, Injury, PMID 42715915 (resumen, según el verificador de U36); Wong 2022, PMID 35171468, PMC9076795; hip.ts:19, 30, 377-378, 383, 386-387

### 8. Log roll (rodamiento)

¿Se mantiene el demo del log roll con la rodilla doblada a 90°, o se queda sin demostración porque la prueba rueda la pierna extendida?

- a) Mantener el demo con la nota que lo explica, como hoy.
- b) Dejarlo sin demostración, con el motivo escrito en su lugar.

Hoy: Rotación externa a 40°, de pie y con la rodilla a 90°; la nota dice que la prueba se hace en supino con la pierna extendida y que solo se muestra la rotación externa.

Fuentes: Wong 2022, PMC9076795 (examen en supino); hip.ts:390-410

### 9. Prueba de Thomas

¿Vale 90° de flexión de rodilla para la pierna que cuelga del borde de la camilla en el demo de Thomas?

- a) Sí, 90° como valor de demostración, como hoy.
- b) No: el clínico fija el ángulo de rodilla del resultado normal.

Hoy: Cadera a 15° de extensión y rodilla a 90° como resultado normal; ninguna fuente abierta da ese ángulo de rodilla y la nota no da cifra.

Fuentes: Vigotsky 2016, PMID 27602291, PMC4991856 (Thomas al borde de la camilla); Wong 2022, PMC9076795; hip.ts:440-481

### 10. Prueba de Thomas

En Thomas, ¿el recto femoral corto se lee como una rodilla que se extiende además del muslo elevado, o como un signo aparte del iliopsoas?

- a) Además, como hoy: la rodilla que se extiende se suma al muslo elevado.
- b) Signo aparte: la rodilla que se extiende sugiere recto femoral corto aunque el muslo baje a la camilla.

Hoy: El positivo, la nota del demo y la ruta de Aprender dicen que, si además la rodilla se extiende, sugiere acortamiento del recto femoral.

Fuentes: hip.ts:430-431, 481; hipPhases.ts:196

### 11. Prueba de Ober

¿Se monta un demo del Ober con la cadera extendida 20° y una aducción de 10°, o sigue sin demostración?

- a) Seguir sin demostración, con el motivo escrito de hoy.
- b) Montarlo tras capturarlo en la app, sabiendo que la pierna pasa por detrás de la de apoyo y que la cifra grande diría extensión.

Hoy: Sin demostración: la aducción del modelo adelanta la pierna con hasta 25° de flexión, lo contrario de la extensión que pide la maniobra.

Fuentes: hip.ts:519-545 (candidata medida por el verificador: 0,0 cm dentro de la pierna de apoyo, sin captura en la app); Wong 2022, PMC9076795 (final del apartado Thomas Test)

### 12. Prueba de Ober

Tras Willett 2016, ¿el objetivo y el propósito del Ober siguen siendo la banda iliotibial y el tensor de la fascia lata, o se añaden el glúteo medio y menor y la cápsula?

- a) Mantener el objetivo clásico, con la duda dicha en la nota, como hoy.
- b) Añadir al objetivo y al propósito el glúteo medio y menor y la cápsula de la cadera.

Hoy: Objetivo y propósito: banda iliotibial y tensor de la fascia lata; la nota, la explicación de su etiqueta y la interpretación ya citan la duda de Willett, y la ruta de Aprender da la banda por retraída.

Fuentes: Willett 2016, PMID 26755689 (resumen); Wang 2006, PMID 17023254; Besomi 2021, PMID 33975135; hip.ts:491-492, 496-518; hipPhases.ts:222, 230, 373

### 13. Flexión de cadera resistida (Stinchfield)

¿A qué flexión de cadera se enseña el Stinchfield: unos 30° o 45°?

- a) Unos 30°, como hoy (Troelsen 2009, figura 3).
- b) 45°, como Wong 2022 y, según el verificador, Frangiamore 2017.
- c) Nombrar las dos alturas en la maniobra y dejar el demo a 30°.

Hoy: La maniobra dice unos 30° y el demo pone la cadera a 30°; la nota no da ángulo.

Fuentes: Troelsen 2009, PMC2823204 (figura 3); Wong 2022, PMC9076795 (Stinchfield: 45°, rodilla extendida); Frangiamore 2017, PMC5792748 (según el verificador de U31); Maslowski 2010, PMID 20359681 (de donde sale el 0,32; su resumen no describe la maniobra); hip.ts:615-616, 625-646

**Trabajo del modelo o del código**

- FADIR (pinzamiento anterior), FABER (Patrick), Prueba de Ober, Prueba de fricción / cuadrante (scour): Ningún banco mide una pierna con giros sumados: el de recorrido solo mira el brazo dentro del tronco y el de choque entre piernas no los acepta. Ganancia: Medir el muslo contra el abdomen y contra la otra pierna, y la pierna sobre la otra en FABER, para publicar esas posturas.
- FADIR (pinzamiento anterior), Signo de Trendelenburg, Prueba de Ober: La vista y la cifra grande salen siempre del movimiento base y de su lado; no hay vista propia por demo. Ganancia: FADIR con la aducción y la rotación interna de frente, Trendelenburg mirado desde atrás y el Ober candidato con la aducción como cifra.
- Prueba de Thomas, Signo de Trendelenburg: Base, giros añadidos y resalte van todos al lado del demo: no se mueve ni se enciende la otra pierna. Ganancia: Thomas con la rodilla contraria al pecho y Trendelenburg con el glúteo medio de la pierna de apoyo encendido mientras se levanta la otra.
- Signo de Trendelenburg: El modelo no tiene movimiento de pelvis. Ganancia: Enseñar la caída de la hemipelvis del lado que no apoya.
- Flexión de cadera resistida (Stinchfield), Prueba de fricción / cuadrante (scour): Hay una sola mano del explorador: en la cara del segmento que mira hacia arriba, a 3,2 cm de la línea entre las dos articulaciones (hundida en el muslo), empujando hacia el reposo. Ganancia: Stinchfield con la mano sobre la cara anterior del muslo en todo el bucle (hoy cae detrás en el reposo) y el scour con la mano en la rodilla cargando a lo largo del fémur.
- FADIR (pinzamiento anterior): Todos los giros añadidos entran con un mismo ritmo: no puede entrar uno con la base y los demás después. Ganancia: FADIR en su secuencia: cadera y rodilla flexionadas y después aducción y rotación interna.
- Rotación interna pasiva en neutro, Log roll (rodamiento): Con la rodilla a 90° de la postura de lectura asoma una punta roja de músculo bajo la rodilla, fuera de la piel; malla y causa sin medir (la rótula que no desliza es una de tres posibles). Ganancia: Rodilla sin tejido fuera de la piel en los dos demos de rotación; la punta sigue en sus capturas del 23 nov.
- FABER (Patrick), Prueba de Ober, Prueba de Thomas: El modelo está siempre de pie: no hay postura de cuerpo entero en supino, prono o de lado. Ganancia: FABER con el tobillo sobre la otra rodilla, Ober de lado y Thomas tumbado al borde de la camilla.

## Rodilla

### 1. Test de Thessaly (20°)

Las barras y la probabilidad post-test del Thessaly usan 89/97 de Karachalios 2005, y su resumen no da esa cifra: solo la exactitud (94% medial, 96% lateral). ¿Qué cifra deben pintar?

- a) Mantener 89/97 de Karachalios 2005, el estudio original.
- b) Pintar 90/98 de Harrison 2009: abierta, pero serie retrospectiva de un centro de referencia.
- c) Pintar 64/53 de Goossens 2015: 593 pacientes, fisioterapeutas y artroscopia (LR+ 1,37).

Hoy: Barras y post-test con 89/97 de Karachalios 2005 (LR+ cercana a 30) y etiqueta Equilibrado; la nota ya da Harrison 90/98, Blyth 66/39 y 62/55 y Goossens 64/53.

Fuentes: PMID 15866956 (Karachalios 2005, resumen: exactitud 94% medial y 96% lateral); PMID 19124977 (Harrison 2009, resumen); PMID 26243431 (Blyth 2015, resumen); PMID 25420009 (Goossens 2015, resumen); knee.ts:506-513 y 533-552

### 2. Test de Thessaly (20°)

¿Se marca como 'por verificar' la cita de Karachalios 2005 mientras nadie lea la tabla de su texto completo, que es de pago?

- a) Sí: la cita dirá 'por verificar' y el bloque post-test avisará de cifras no comprobadas.
- b) No: se deja como verificada, por ejemplo tras leer el 89/97 en la tabla del texto completo.

Hoy: La cita de Karachalios 2005 sale como verificada ('medial 89/97 (original)'), sin el aviso 'por verificar'.

Fuentes: PMID 15866956 (resumen sin sensibilidad ni especificidad; texto completo de suscripción); knee.ts:7-15 y 534; references.ts:785-800; OrthopedicTestsPanel.tsx:1262 y 1326-1331

### 3. Test de McMurray

¿Qué cuenta como positivo en el McMurray? Hing 2009 recomienda contar también el dolor reproducido, aunque no haya chasquido.

- a) Mantener el chasquido o clic doloroso en la interlínea, con un solo texto en la ficha y en la ruta.
- b) Ampliar a dolor reproducido en la interlínea o chasquido, en la ficha y en la ruta.

Hoy: Ficha: 'Clic o chasquido doloroso reproducible sobre la interlínea'; ruta de aprendizaje: 'Chasquido o resalte doloroso palpable en la interlínea'.

Fuentes: Hing 2009, PMID 20046563, PMC2704345 (tabla 4 y discusión); knee.ts:355-364; kneePhases.ts:399-401

### 4. Test de McMurray

¿Se añade a la nota del McMurray el golpe sordo en la interlínea medial de Evans 1993? Su resumen da sensibilidad 16% y especificidad 98% en 104 pacientes antes de una artroscopia.

- a) Sí, solo ese signo, con su cifra, como hallazgo aparte del chasquido doloroso.
- b) Sí, y además que cada estudio cuenta distinto el positivo (Hing 2009, tabla 4).
- c) No: la nota se queda con las cifras agrupadas de Hegedus 2007.

Hoy: La nota solo da 70/71 agrupadas de Hegedus 2007 y su heterogeneidad; Evans 1993 no está entre las fuentes.

Fuentes: Evans 1993, PMID 8368424 (resumen); Hing 2009, PMID 20046563, PMC2704345 (tabla 4); knee.ts:365-369 y 425-431

### 5. Compresión de Apley

¿Qué rotación de la tibia debe sostener el demo de Apley? McMurray une el menisco medial con la rotación externa y Maffulli 2010 describe la compresión en rotación externa. Ninguna fuente abierta asigna en Apley una dirección a cada menisco.

- a) Mantener 25° de rotación interna con el menisco medial encendido.
- b) Pasar a rotación externa, como la describe Maffulli 2010, con el menisco medial encendido.
- c) Rotar hacia dentro y hacia fuera, como dice la maniobra; hoy el modelo no puede, sostiene un solo ángulo.

Hoy: Rodilla a 90° con 25° de rotación interna y el menisco medial encendido; la nota dice que en la prueba se rota a los dos lados.

Fuentes: Maffulli 2010, PMID 24198542, PMC3781854; Asokan 2023, PMID 36755559, PMC9900019; knee.ts:403 (McMurray) y 574-602

### 6. Cajón posterior

Wilebski 2026 (tabla 2, a partir de la revisión de Kopkow 2013) da 69/98 para el cajón posterior. Avisa de que sale de un solo estudio de casos y controles, y Kopkow concluye que la precisión de las pruebas del LCP se desconoce en gran parte. ¿Se añade esa cautela a la nota?

- a) Añadir la cautela y mantener el 90/99 de Rubinstein 1994 y la etiqueta Confirma.
- b) Añadir la cautela y nombrar también en la nota el 69/98 de Wilebski 2026.
- c) Dejar la nota como está.

Hoy: Barras con 90/99 de Rubinstein 1994 (39 sujetos, 19 roturas crónicas) y etiqueta Confirma; la nota no trae esa cautela.

Fuentes: Wilebski 2026, PMID 41657676 (tabla 2); Kopkow 2013, PMID 24175598 (resumen); Rubinstein 1994, PMID 7943523; knee.ts:230-237 y 271-282

### 7. Signo del cajón posterior en reposo (sag)

Wilebski 2026 (tabla 2, a partir de Kopkow 2013) da 79/100 para el sag, con el mismo aviso: sale de un solo estudio de casos y controles. ¿El sag sigue sin cifra o la recupera con esa fuente?

- a) Seguir sin cifra y añadir en la nota el 79/100 de Wilebski 2026 con su cautela.
- b) Pintar 79/100 citando Wilebski 2026 y Kopkow 2013, con la cautela en la nota.
- c) Dejar la nota como está.

Hoy: Sin cifra propia: la nota dice que el 79/100 que se mostraba antes se atribuía a Malanga 2003, que no lo publica, y se apoya en Rubinstein 1994; etiqueta Confirma.

Fuentes: Wilebski 2026, PMID 41657676 (tabla 2); Kopkow 2013, PMID 24175598 (resumen); knee.ts:295-300 y 330-341

**Trabajo del modelo o del código**

- Estrés en valgo, Test de McMurray, Dolor en la interlínea articular, Test de Thessaly (20°), Compresión de Apley: El demo se abre siempre de perfil por el lado que se mueve; no puede pedir otra vista de cámara. Ganancia: El colateral medial y el menisco medial, en la cara interna, podrían verse desde un oblicuo anteromedial, si una captura lo confirma.
- Estrés en valgo, Estrés en varo, Pivot shift, Test de McMurray: La rodilla no tiene valgo ni varo: el rig solo la flexiona, la extiende y rota la tibia. Ganancia: Valgo y varo podrían dejar de ser la misma imagen, y pivot shift y McMurray llevar su valgo o varo; la piel en ese plano está sin medir.
- Test de Lachman, Cajón anterior, Cajón posterior, Signo del cajón posterior en reposo (sag), Compresión de Apley: El rig gira articulaciones pero no desliza la tibia sobre el fémur, ni hacia delante o atrás ni a lo largo de su eje. Ganancia: Lachman, los cajones y el sag podrían enseñar la traslación, y Apley la compresión y la distracción; nadie ha medido la piel con la tibia deslizada.
- Test de Lachman, Cajón anterior, Cajón posterior, Compresión de Apley, Estrés en valgo, Estrés en varo: La mano del explorador solo se apoya en la pierna distal y empuja hacia la posición de reposo; no hay contacto ni dirección de fuerza por prueba. Ganancia: Lachman, los cajones y Apley podrían llevar la mano en su sitio (tibia proximal, pie) y valgo y varo enseñar hacia dónde empuja.
- Test de Lachman, Cajón anterior, Pivot shift, Cajón posterior, Signo del cajón posterior en reposo (sag), Test de McMurray, Estrés en valgo, Estrés en varo, Compresión de Apley: El modelo está siempre de pie: no se puede tumbar en supino ni en prono. Ganancia: Las nueve pruebas que hoy avisan de que el modelo está de pie podrían verse en su postura (ocho en supino, Apley en prono).
- Compresión de Apley: Cada componente del demo se sostiene en un solo ángulo todo el bucle: no puede alternar rotación interna y externa. Ganancia: Apley podría rotar la tibia hacia dentro y hacia fuera, como dice su maniobra.
- Test de Thessaly (20°): El rig no carga la pierna explorada ni gira el cuerpo sobre el pie apoyado: dobla la rodilla con el pie atrás y el talón levantado. Ganancia: Thessaly podría verse en apoyo monopodal con el pie plano y el cuerpo girando a los dos lados.

## Codo

### 1. Test de Maudsley

¿Qué variante del Maudsley se enseña: la de Saroja 2014, de donde salen el 88% y el 0%, o la del codo extendido que describe hoy la ficha?

- a) La de Saroja 2014: sentado, codo a 90° y antebrazo pronado; cambian la maniobra y el demo, y el modelo sigue de pie.
- b) La de hoy: codo extendido y antebrazo pronado, con la nota que avisa de que las cifras se midieron con el codo a 90°.

Hoy: Ficha y demo con el codo extendido y el antebrazo pronado, sin la mano del explorador; la nota de cifras dice que el 88% y el 0% salen de la variante sentada con el codo a 90°.

Fuentes: Saroja 2014, doi 10.16965/ijpr.2014.699 (texto completo, p. 817-818 y tabla 4, p. 820); PMC13412883 (Biedroń 2026: antebrazo pronado, sin precisar el codo); Physiotutors (codo extendido, sin revisión por pares); src/data/orthopedicTests/elbow.ts:229-230, 242, 265-279

### 2. Test de epicondilalgia medial

¿Con qué posición del codo se enseña la prueba de epicondilalgia medial?

- a) Codo extendido y antebrazo supinado, como hoy en la maniobra y en el demo.
- b) Codo a 90° para aislar el pronador redondo, variante sin fuente abierta: cambian a la vez la maniobra y el demo.

Hoy: Maniobra y demo con el codo extendido y el antebrazo supinado, flexión de muñeca contra resistencia y sin cifras; la variante a 90° solo se vio en un resumen de buscador.

Fuentes: PMID 28249855 (Zwerus 2018, resumen: ningún artículo sobre epicondilalgia medial); StatPearls NBK557869 sin abrir (la variante a 90° solo en un resumen de buscador); src/data/orthopedicTests/elbow.ts:299-300, 335-347

### 3. Moving valgus stress test

¿Qué debe enseñar el demo del valgo dinámico (Moving valgus stress test)?

- a) La posición de la prueba: hombro a 90° de abducción con rotación externa como movimiento principal y codo a 90°; la cifra grande leería la abducción y el codo no se extendería desde la flexión completa.
- b) Como hoy: el codo como movimiento principal hasta 90°, con el brazo junto al cuerpo y la nota que dice que la prueba va al revés.

Hoy: El codo va de 0° a 90° con el brazo junto al cuerpo, se sostiene en 90° y vuelve; la nota dice que la prueba va al revés, desde la flexión completa con el hombro a 90° de abducción y en rotación externa.

Fuentes: PMID 15701609 (O'Driscoll 2005, resumen: valgo constante desde la flexión completa y extensión rápida; dolor máximo medio a 90°); PMID 40308989, PMC11950621 (Pottanat 2025: hombro a 90° de abducción y rotación externa máxima, hasta unos 30°); src/data/orthopedicTests/elbow.ts:371-372, 419-432; src/data/orthopedicTests/shoulder.ts:476 (aprensión: hombro de base con codo y rotación como componentes)

### 4. Moving valgus stress test

En el Moving valgus stress test y en el Estrés en valgo del codo, ¿se deja la mano del explorador o se quita en los dos?

- a) Dejarla en los dos con su aviso, como hoy y como en los estrés en valgo y en varo de la rodilla.
- b) Quitarla en los dos y conservar la etiqueta y las instrucciones de prueba pasiva, como en los cajones de la rodilla.

Hoy: En los dos se dibuja la mano en el antebrazo distal empujando hacia la extensión, no en valgo, y el aviso de cada demo dice que la dirección del valgo no se ve.

Fuentes: src/data/orthopedicTests/elbow.ts:385-401, 419-425, 459-481; src/data/orthopedicTests/knee.ts:112-156 y 220-268 (cajones, mano oculta), 615-655 y 672-699 (colaterales, mano con aviso)

### 5. Signo de Tinel del cubital

¿Se busca el texto completo de Novak 1994 para la especificidad del Tinel y de la Flexión-compresión del codo, o se dejan sin ella?

- a) Conseguir el texto completo y poner la especificidad solo si está en él.
- b) Dejar las dos sin especificidad y decir que el resumen no la publica, sin afirmar nada del artículo completo.

Hoy: Las dos fichas dicen que el estudio no publica especificidad, y la del Tinel que el 98% que suele citarse no está en la fuente; solo se leyó el resumen.

Fuentes: PMID 7806810 (Novak 1994, resumen; texto completo de pago, sin leer); Physiotutors, secundaria y sin verificar (98% de especificidad de la compresión a 30 s; 89% de sensibilidad a 60 s, que es 39 de 44); src/data/orthopedicTests/elbow.ts:507, 511, 542; src/data/references.ts:857-861

### 6. Test de epicondilalgia medial

¿Se mantiene en la nota que el diagnóstico de la epicondilalgia medial es clínico, atribuido a Zwerus 2018?

- a) Mantenerla como criterio clínico propio, sin atribuirla a Zwerus 2018.
- b) Quitarla y dejar solo que Zwerus 2018 no encontró ningún estudio sobre esta lesión.
- c) Conseguir el texto completo de Zwerus 2018 y mantener la cita solo si lo dice.

Hoy: La nota de cifras lo atribuye a Zwerus 2018, cuyo resumen solo dice que no encontró ningún artículo sobre esta lesión.

Fuentes: PMID 28249855 (Zwerus 2018, resumen por E-utilities; texto completo no abierto); src/data/orthopedicTests/elbow.ts:303; src/data/references.ts:876-893

### 7. Test de Maudsley

¿Cómo se nombra el objetivo del Test de Maudsley?

- a) Dejarlo como está: extensor común / extensor propio del 3.º dedo.
- b) Cambiarlo por el extensor de los dedos, como dice ya el aviso del demo.

Hoy: Objetivo: extensor común / extensor propio del 3.º dedo, que no está en la lista del grupo extensor de la app; el aviso del demo dice que la prueba aísla el extensor de los dedos.

Fuentes: src/data/orthopedicTests/elbow.ts:221, 273-274; src/data/muscles/elbow.ts:340 (el grupo: extensor radial corto del carpo, extensor de los dedos, extensor del meñique y extensor cubital del carpo)

**Trabajo del modelo o del código**

- Test de Cozen, Test de Maudsley, Test de epicondilalgia medial, Moving valgus stress test, Estrés en valgo del codo: La mano del explorador solo sabe apoyarse al 82% del antebrazo y empujar hacia el brazo colgando: no hay punto de contacto ni dirección por prueba. Ganancia: Cozen resistiría en el dorso de la mano, la epicondilalgia medial en la palma y el Maudsley en el tercer dedo; los dos valgos empujarían en valgo, y en el Estrés en valgo del codo la otra mano estabilizaría en la cara lateral del codo.
- Moving valgus stress test, Estrés en valgo del codo: El codo del modelo solo flexiona, extiende y prona o supina: no tiene eje de valgo. Ganancia: Los dos valgos enseñarían el valgo que pone el explorador y la apertura medial que se valora.
- Moving valgus stress test: La abducción del hombro es una cadena y no se puede sostener como componente bajo un movimiento de codo. Ganancia: El valgo dinámico se haría con el hombro a 90° de abducción y en rotación externa sin que la cifra grande deje de leer el codo.
- Moving valgus stress test: El demo solo barre entre 0° y el ángulo pedido y se sostiene en un extremo; la extensión desde la flexión completa existe, pero se sostiene en 0° y no se ha medido en este demo. Ganancia: El valgo dinámico iría de la flexión completa a unos 30°, en el sentido de la prueba, atravesando el arco de 120° a 70°.
- Moving valgus stress test, Estrés en valgo del codo, Test de epicondilalgia medial: La cámara del demo sale del plano del movimiento principal y mira la cara lateral del codo, y lo resaltado se pinta con profundidad normal: no hay vista por demo ni pasada de rayos X. Ganancia: Se verían el colateral cubital y el grupo flexor-pronador de la cara medial, y un empuje en valgo no iría hacia la cámara; con el brazo colgando esa cara mira al tronco, así que la vista sola puede no bastar.
- Test de Maudsley, Test de Cozen: El modelo no mueve los dedos ni desvía la muñeca: el eje radial y cubital de la mano existe, pero ningún movimiento lo conduce. Ganancia: El Maudsley enseñaría la extensión del tercer dedo contra resistencia, y el Cozen el puño y la desviación radial pasiva del final.
- Test de Maudsley: El extensor de los dedos no tiene ficha en la región: el resalte del origen extensor solo enciende los dos radiales y el cubital del carpo. Ganancia: El Maudsley encendería el músculo que aísla, en lugar del grupo extensor.
- Test de Mill, Test de epicondilalgia medial: Al flexionar la muñeca, la cola de los músculos y de la fascia del antebrazo no sigue a la mano y asoma como un bloque rojo sobre la piel. Ganancia: El Mill y la epicondilalgia medial se verían sin ese muñón en la muñeca.
- Signo de Tinel del cubital, Moving valgus stress test, Flexión-compresión del codo: Con el codo doblado, dos placas naranjas, probablemente las inserciones del bíceps y del braquial pegadas al húmero, se quedan detrás del olécranon y asoman por fuera de la piel. Ganancia: Los demos con el codo a 90° y en flexión máxima se verían limpios y con esas inserciones en el antebrazo.
- Test de Maudsley, Test de Cozen, Estrés en valgo del codo: Con la piel de cristal, la unión del antebrazo con la mano opaca deja ver un anillo abierto con el extremo del hueso dentro; las capturas que lo enseñan son de antes de pronar Cozen y Maudsley, y no hay banco que lo mida desde la cámara del demo. Ganancia: Los demos con la mano en línea con el antebrazo no enseñarían ese hueco en la muñeca.

## Tobillo

### 1. Cajón anterior de tobillo

¿Se mantiene la etiqueta 'Confirma' en el cajón anterior de tobillo? La especificidad agrupada es del 87%, pero su intervalo de confianza baja al 63%, la heterogeneidad es alta y los estudios son de calidad baja.

- a) Mantener 'Confirma', que es la conclusión de la propia revisión: el cajón confirma y la palpación descarta.
- b) Volver a 'Equilibrado' por el intervalo de la especificidad y la calidad baja de los estudios.

Hoy: Marca 'Confirma' con 54% de sensibilidad y 87% de especificidad (IC 95% 63 a 96), LR+ 3,97 y LR- 0,54, de Netterström-Wedin 2022.

Fuentes: Netterström-Wedin 2022: PMID 34286639 (resumen, 54% y 87%) y PMC9109591 (texto completo, razones de verosimilitud y heterogeneidad); src/data/orthopedicTests/ankle.ts:102-113

### 2. Cajón anterior de tobillo

¿El demo del cajón anterior de tobillo debe enseñar la rodilla flexionada, como se explora sentado o en supino, o basta la rodilla recta con la nota que lo avisa?

- a) Rodilla recta, con la nota actual.
- b) Rodilla a 90° con el modelo de pie: la pierna queda horizontal hacia atrás y la rótula y el giro de la tibia no acompañan la flexión.
- c) Cadera y rodilla a 90°, como sentado: la rótula tampoco acompaña y falta medir cómo se ve en pantalla.

Hoy: Posa 15° de flexión plantar con el modelo de pie y la rodilla recta; la nota avisa de que la prueba suele hacerse sentado o en supino con la rodilla flexionada.

Fuentes: PMC9109591 (Netterström-Wedin 2022, Resultados: la mayoría de los estudios explora con la rodilla flexionada, en supino o sentado); src/data/orthopedicTests/ankle.ts:87-88, 143-163

### 3. Cajón anterior de tobillo

¿A cuántos grados de flexión plantar se coloca el tobillo en el demo del cajón anterior? Kovaleski 2008 midió la laxitud máxima a 10° con la rodilla a 90°. De perfil, el ligamento peroneoastragalino anterior se ve un 19% a 15° y un 94% a 0° (reconstrucción fuera de la app).

- a) Mantener 15°, como hoy.
- b) Bajar a 10°, la posición de laxitud máxima de Kovaleski 2008 (sin medir cuánto se ve el ligamento a 10°).

Hoy: El demo posa 15° de flexión plantar; la maniobra de la ficha cita los 10° de Kovaleski 2008 con la rodilla a 90°.

Fuentes: Kovaleski 2008, PMID 18523573 (resumen); verificador de U60 (reconstrucción con rayos: 19% visible a 15° y 94% a 0°, sin medir en la app); src/data/orthopedicTests/ankle.ts:88, 155-156

### 4. Inclinación astragalina (talar tilt)

¿Qué se hace con el demo de la inclinación astragalina a 30° de inversión? El modelo no tiene subastragalina: el astrágalo se inclina 28,1° con la tibia quieta y se separa del peroné de 2,9 a 14,8 mm. Además, desde la cámara frontal del demo casi no se ven los ligamentos resaltados (calculado, sin captura: 0% del calcaneoperoneo y 5% del LPAA).

- a) Mantenerlo a 30° con el aviso actual.
- b) Bajarlo a 15°: el astrágalo sigue inclinándose 13,8° y separándose 9,0 mm del peroné.
- c) Dejar la prueba sin demostración en 3D y explicar por qué.

Hoy: Invierte 30° el pie derecho y avisa de que el astrágalo gira con el pie como una sola pieza y se separa del peroné, un límite del modelo y no un hallazgo.

Fuentes: Medidas del rig en CPU citadas en src/data/orthopedicTests/ankle.ts:227-243 (28,1° y 14,8 mm a 30°; 13,8° y 9,0 mm a 15°); visibilidad calculada por el verificador de U60; PMC9109591 (Discusión: el calcaneoperoneo cruza la talocrural y la subastragalina)

### 5. Inclinación astragalina (talar tilt)

¿Se acepta la etiqueta 'Confirma' en la inclinación astragalina sin cifra agrupada? Hay cuatro estudios sin agrupar, con sensibilidad del 17 a 66% y especificidad del 82 a 100%, y solo uno, George 2020, tiene bajo riesgo de sesgo en todos los apartados.

- a) Mantener 'Confirma' con la explicación que ya enseña la ficha.
- b) Pasar a 'En conjunto' (poca precisión aislada) mientras no haya cifra agrupada.

Hoy: Marca 'Confirma' con su explicación: sin cifra agrupada, cuatro estudios con 17 a 66% de sensibilidad y 82 a 100% de especificidad (Netterström-Wedin 2022).

Fuentes: PMC9109591 (Netterström-Wedin 2022, Resultados y riesgo de sesgo); Rosen 2015, PMID 24995627 (resumen); src/data/orthopedicTests/ankle.ts:213-222

### 6. Prueba de rotación externa (Kleiger)

La ficha del laboratorio describe la prueba de rotación externa (Kleiger) con el tobillo en dorsiflexión, y el paso de tests clínicos de Aprender, con el tobillo neutro: ¿se unifican las dos en la versión en dorsiflexión o se presentan como dos variantes, cada una con su nombre?

- a) Unificar las dos en la versión en dorsiflexión, la que miden Sman 2015 y Baltes 2022.
- b) Presentar dos variantes con su nombre; la del tobillo neutro iría sin cifra propia, porque el resumen de de César 2011 no dice en qué posición midió su 20%.

Hoy: La ficha enseña la versión en dorsiflexión con el 71% y el 63% de Sman 2015; Aprender la describe con la rodilla flexionada y el tobillo neutro, citando a Magee sin página verificada.

Fuentes: Sman 2015, PMID 24255766 (resumen); Baltes 2022, PMC9568458 (Tabla 3); de César 2011, PMID 22381194 (resumen, sin la posición del tobillo); Larkins 2020, PMC7853358 (Tabla 2); src/data/orthopedicTests/ankle.ts:327-328, 353; src/data/anklePhases.ts:189-191

### 7. Prueba de rotación externa (Kleiger)

Si se añade al modelo el giro del pie sobre la pierna quieta para montar el demo de la prueba de rotación externa (Kleiger), ¿cuántos grados debe girar el pie? Ninguna fuente abierta lo dice. En tobillos sanos el peroné solo gira de 2 a 5° con el estrés en rotación externa (Beumer 2003, según el verificador), y con el pie fijo la rotación externa más allá de neutro ocurre sobre todo en la astragalonavicular y la subastragalina (Lundberg 1989), mientras que el modelo la pondría toda en el tobillo.

- a) 20°, declarados en la nota como ilustrativos, para que el giro se lea en pantalla.
- b) Un giro menor, a tu criterio, aunque se vea menos.
- c) Seguir sin demostración en 3D: el modelo no abriría la sindesmosis ni resaltaría el deltoideo.

Hoy: Sin demostración en 3D: la ficha dice que es una rotación externa del pie con la pierna estabilizada y el tobillo en dorsiflexión, un giro que el modelo no tiene.

Fuentes: Beumer 2003, PMID 12899556, y Lundberg 1989, PMID 2744673 (resúmenes, según el verificador de J30); src/data/orthopedicTests/ankle.ts:358-378

**Trabajo del modelo o del código**

- Prueba de rotación externa (Kleiger): No existe el giro del pie sobre la pierna quieta (el eje está en el hueso del pie, pero ningún movimiento lo conduce) y el ligamento deltoideo no está entre las estructuras que se pueden resaltar. Ganancia: Kleiger tendría demo: dorsiflexión y luego el pie girando hacia fuera con la pierna quieta, con la sindesmosis y el deltoideo encendidos (la mortaja no se abriría: el peroné va unido a la tibia).
- Inclinación astragalina (talar tilt): El modelo no tiene articulación subastragalina: astrágalo, calcáneo, escafoides y cuboides giran como una sola pieza con el pie, así que toda la inversión cae en la mortaja. Ganancia: Se podría invertir el retropié sin sacar el astrágalo de la mortaja: arreglaría este demo y los arcos de inversión y eversión del laboratorio.
- Inclinación astragalina (talar tilt): Los ligamentos laterales resaltados viajan casi enteros con el pie: a 30° de inversión el extremo peroneo del calcaneoperoneo queda a 7,9 y 13,8 mm del peroné. Ganancia: Cada ligamento quedaría anclado al peroné y al astrágalo o al calcáneo y se estiraría entre sus inserciones; sin subastragalina, ese estiramiento seguiría siendo el del modelo.
- Cajón anterior de tobillo, Inclinación astragalina (talar tilt), Prueba de rotación externa (Kleiger): La cámara del demo sale solo del plano del movimiento y los ligamentos resaltados no llevan rótulo: de perfil el LPAA queda casi de canto y tras el maléolo. Ganancia: Con una vista propia por demo, el LPAA del cajón pasaría de unos 4 a unos 50 a 58 píxeles a la vista (reconstrucción), y se podría elegir desde dónde mirar la inclinación y el giro de Kleiger.
- Cajón anterior de tobillo, Prueba de Thompson (Simmonds), Inclinación astragalina (talar tilt): El encuadre del tobillo no reserva la franja de la regla del arco al pie de la pantalla: con la flexión plantar los dedos quedan debajo de la regla. Ganancia: El pie entero quedaría a la vista en los tres demos del tobillo.
- Cajón anterior de tobillo, Inclinación astragalina (talar tilt), Prueba de Thompson (Simmonds), Prueba de rotación externa (Kleiger): La mano del explorador no se puede dibujar en el pie ni en la pantorrilla: no hay punto de apoyo en el talón y la mano genérica solo empuja hacia el reposo. Ganancia: El cajón enseñaría el tirón del talón con la tibia fija, la inclinación la mano que invierte el retropié, Thompson la compresión de la pantorrilla y Kleiger la mano que gira el pie.
- Cajón anterior de tobillo, Prueba de rotación externa (Kleiger), Prueba de Thompson (Simmonds): El modelo está siempre de pie, y una rodilla flexionada añadida a la pose no arrastra la rótula ni el giro de la tibia. Ganancia: El cajón y Kleiger enseñarían la rodilla flexionada de su maniobra, y Thompson el prono con los pies fuera de la camilla.
