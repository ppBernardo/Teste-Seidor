const { randomUUID } = require('node:crypto');

/**
 * Repositório genérico em memória.
 *
 * Os registros ficam em um Map indexado por id. Todos os métodos devolvem
 * cópias dos objetos para que quem consome o repositório não consiga alterar
 * o estado interno por acidente.
 */
class InMemoryRepository {
  constructor() {
    this.registros = new Map();
  }

  create(dados) {
    const registro = { id: randomUUID(), ...dados };
    this.registros.set(registro.id, registro);
    return { ...registro };
  }

  findById(id) {
    const registro = this.registros.get(id);
    return registro ? { ...registro } : null;
  }

  /**
   * @param {(registro: object) => boolean} [filtro] predicado opcional
   */
  findAll(filtro = () => true) {
    return [...this.registros.values()]
      .filter(filtro)
      .map((registro) => ({ ...registro }));
  }

  update(id, dados) {
    const existente = this.registros.get(id);
    if (!existente) {
      return null;
    }
    // O id nunca pode ser sobrescrito pelos dados recebidos.
    const atualizado = { ...existente, ...dados, id };
    this.registros.set(id, atualizado);
    return { ...atualizado };
  }

  delete(id) {
    return this.registros.delete(id);
  }

  clear() {
    this.registros.clear();
  }
}

module.exports = InMemoryRepository;
