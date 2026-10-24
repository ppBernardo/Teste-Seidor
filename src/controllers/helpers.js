/**
 * Query strings podem chegar como array quando o parâmetro é repetido
 * (ex.: ?cor=azul&cor=preto). Para os filtros desta API só faz sentido um
 * valor textual, então qualquer outra coisa é ignorada.
 */
function filtroTexto(valor) {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : undefined;
}

module.exports = { filtroTexto };
