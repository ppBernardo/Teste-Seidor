const { criarApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;

criarApp().listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
