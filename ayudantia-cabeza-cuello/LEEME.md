# Ayudantía en vivo — cabeza y cuello

Quiz tipo Kahoot con preguntas de emparejamiento, sin cuentas para los alumnos.

## Estructura de archivos

La carpeta tiene que quedar exactamente así, con `index.html` dentro de una
subcarpeta llamada `public`. Si el archivo queda suelto en la raíz, el servidor
levanta pero la página sale en blanco.

    ayudantia/
    ├── package.json
    ├── server.js
    ├── .gitignore
    └── public/
        └── index.html

## Probarlo en tu computador primero (opcional)

Necesitas Node.js instalado. En la terminal, dentro de la carpeta:

    npm install
    npm start

Abre `http://localhost:3000` en dos pestañas: una como proyector y otra como
alumno. Si funciona ahí, va a funcionar en Render.

## Subirlo a Render

1. Crea una cuenta en github.com si no tienes.
2. Crea un repositorio nuevo, público o privado, con el nombre que quieras.
3. Sube los cuatro archivos respetando la carpeta `public`. Desde la web de
   GitHub: "Add file" → "Upload files", y arrastra la carpeta completa.
4. Crea una cuenta en render.com y entra con GitHub.
5. "New" → "Web Service" → elige tu repositorio.
6. Configura así:
   - Language / Runtime: **Node**
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Instance Type: **Free**
7. "Create Web Service" y espera unos minutos. Al terminar, arriba aparece una
   dirección del tipo `https://algo.onrender.com`. Esa es la que reparten.

No configures la variable PORT. Render la asigna sola y el servidor la lee.

## Antes de cada clase

La capa gratuita duerme el servicio cuando nadie lo usa. La primera visita
después de un rato tarda cerca de un minuto en despertar. Abre la dirección diez
minutos antes de entrar a la sala y déjala cargada.

## Agregar preguntas

Todas las preguntas están en `server.js`, en el bloque `QUESTIONS` del principio.
Copia un bloque completo, pégalo debajo y edita los textos. Reglas:

- Cada `id` tiene que ser único dentro de su pregunta.
- El campo `match` de cada opción indica a qué origen corresponde. Es la
  respuesta correcta y nunca se envía al navegador del alumno.
- Los cuatro colores mantienen la convención de los atlas: primer arco coral,
  segundo ámbar, tercero verde azulado, cuarto a sexto violeta.
- Respeta las comas y las comillas. Si el servidor no levanta después de editar,
  casi siempre es una coma de más al final de una lista.

Cada vez que subas cambios a GitHub, Render vuelve a desplegar solo.

## Limitaciones conocidas de este esqueleto

- Las salas viven en memoria: si Render reinicia el servicio, las salas abiertas
  se pierden y hay que crear una nueva.
- Si el proyector se desconecta, la sala se cierra y los alumnos ven un aviso.
- Un alumno que recarga la página sale de la sala y tiene que volver a entrar.
- Solo hay preguntas de emparejamiento. Los clics sobre imagen, el arrastrar
  etiquetas y el ordenar secuencias todavía no están.
