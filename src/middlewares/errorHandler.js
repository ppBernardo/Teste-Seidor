const { AppError } = require('../errors/AppError');

/**
 * Converte exceções em respostas JSON padronizadas no formato { erro: "..." }.
 *
 * - AppError (e subclasses): usa o status HTTP definido no próprio erro.
 * - JSON malformado no corpo: 400.
 * - Qualquer outra exceção: 500, sem expor detalhes internos ao cliente.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ erro: err.message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Corpo da requisição inválido: JSON malformado.' });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: `Rota ${req.method} ${req.originalUrl} não encontrada.` });
}

module.exports = { errorHandler, rotaNaoEncontrada };
