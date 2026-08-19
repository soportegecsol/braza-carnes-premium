require("dotenv").config();
const { createApp } = require("./app");

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Braza backend escuchando en http://localhost:${PORT}`);
  console.log(`Frontend disponible en http://localhost:${PORT}/index.html`);
});
