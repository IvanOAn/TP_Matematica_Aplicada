# MerkleViz

Aplicación educativa para explorar la verificación de integridad de archivos mediante árboles de Merkle. Los archivos se procesan localmente en el navegador: MerkleViz no los sube a un servidor.

## Objetivos

- Calcular hojas y nodos con SHA-256 real mediante Web Crypto API.
- Visualizar la estructura jerárquica y el hash asociado a cada nodo.
- Simular una alteración de un bit y observar su propagación hasta la raíz.
- Generar y verificar pruebas de inclusión para hojas individuales.

## Tecnologías

React, TypeScript estricto, Vite, Tailwind CSS, `@xyflow/react`, Lucide React, Vitest y Web Crypto API.

## Requisitos y ejecución

Se necesita Node.js 20 o posterior y npm. Desde la carpeta del proyecto:

```bash
npm install
npm run dev
```

Para generar la versión de producción y servirla localmente:

```bash
npm run build
npm run preview
```

Ejecutá las pruebas con:

```bash
npm test
```

## Algoritmo

Cada archivo se representa como una hoja. La separación de dominios distingue hojas de nodos internos:

```text
H_hoja   = SHA-256(0x00 || bytes_del_archivo)
H_padre  = SHA-256(0x01 || hash_izquierdo || hash_derecho)
```

La concatenación se realiza con bytes. Los hashes permanecen como bytes en el motor y se convierten a hexadecimal para mostrarlos. Las hojas conservan el orden en que se cargaron. Cuando un nivel tiene una cantidad impar de nodos mayor que uno, el último hash se duplica para formar la pareja final. Para una sola hoja, esa hoja es la raíz.

Los identificadores se basan en el nivel y la posición (`nivel-N-pos-M`), no en el hash, de modo que dos archivos idénticos siguen representados por hojas diferentes.

## Uso

1. Arrastrá archivos o elegilos desde el dispositivo. Cada archivo puede tener hasta 100 MiB.
2. Explorá el árbol y seleccioná nodos para ver hashes y operaciones.
3. En el Laboratorio de Integridad, elegí un archivo, una posición de byte y un bit. Iniciá la simulación y avanzá, retrocedé o reproducí los pasos.
4. En el Explorador Matemático, generá una prueba para verificar que una hoja pertenece a la raíz mostrada.

Los archivos originales no se modifican: la simulación altera una copia temporal. Un archivo vacío puede formar parte del árbol, pero no permite seleccionar un byte para alterar.

## Arquitectura

- `src/core/`: SHA-256, árbol, pruebas de inclusión y mutación de bytes.
- `src/components/`: carga y lista de archivos, grafo, integridad, detalles, simulación y explorador matemático.
- `src/types/`: modelos de nodos, árboles, pruebas y archivos.
- `tests/`: pruebas unitarias con referencias SHA-256 calculadas mediante `node:crypto`.

## Alcance y limitaciones

- La API `SubtleCrypto.digest` procesa cada archivo completo en memoria y no ofrece hashing incremental en este diseño. El límite es de 100 MiB por archivo.
- La raíz inicial de la sesión es la referencia para comparar la simulación. Para obtener una garantía de integridad, la raíz de referencia debe venir de una fuente confiable independiente.
- El orden de carga forma parte del conjunto verificado; cambiar el orden puede cambiar la raíz.
- El árbol no agrega metadatos como nombre o tamaño a los hashes: la hoja representa los bytes del contenido.
