const { ValidationError } = require('../errors/AppError');

/**
 * Garante que o valor é um texto não vazio e o devolve sem espaços nas pontas.
 */
function textoObrigatorio(valor, campo) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ValidationError(`O campo "${campo}" é obrigatório e deve ser um texto não vazio.`);
  }
  return valor.trim();
}

/**
 * Converte o valor em Date, aceitando strings ISO 8601 ou instâncias de Date.
 */
function dataValida(valor, campo) {
  const ehTipoAceito = typeof valor === 'string' || valor instanceof Date;
  const data = new Date(valor);

  if (!ehTipoAceito || Number.isNaN(data.getTime())) {
    throw new ValidationError(`O campo "${campo}" deve ser uma data válida no formato ISO 8601.`);
  }
  return data;
}

/**
 * Monta o objeto de atualização parcial: considera apenas os campos permitidos
 * que foram enviados, validando cada um como texto obrigatório.
 */
function camposTextoParaAtualizar(dados, camposPermitidos) {
  const alteracoes = {};

  for (const campo of camposPermitidos) {
    if (dados[campo] !== undefined) {
      alteracoes[campo] = textoObrigatorio(dados[campo], campo);
    }
  }

  if (Object.keys(alteracoes).length === 0) {
    throw new ValidationError(
      `Informe ao menos um campo para atualizar: ${camposPermitidos.join(', ')}.`
    );
  }

  return alteracoes;
}

/** Comparação de textos sem diferenciar maiúsculas/minúsculas. */
function textosIguais(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Verifica se `texto` contém `trecho`, sem diferenciar maiúsculas/minúsculas. */
function textoContem(texto, trecho) {
  return texto.toLowerCase().includes(trecho.trim().toLowerCase());
}

module.exports = {
  textoObrigatorio,
  dataValida,
  camposTextoParaAtualizar,
  textosIguais,
  textoContem,
};
