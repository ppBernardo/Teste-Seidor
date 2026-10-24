const InMemoryRepository = require('../../../src/repositories/InMemoryRepository');

describe('InMemoryRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new InMemoryRepository();
  });

  describe('create', () => {
    it('gera um id único e devolve o registro criado', () => {
      const criado = repository.create({ nome: 'Ana' });

      expect(criado.id).toEqual(expect.any(String));
      expect(criado.nome).toBe('Ana');
      expect(repository.findById(criado.id)).toEqual(criado);
    });

    it('gera ids diferentes para registros diferentes', () => {
      const a = repository.create({ nome: 'A' });
      const b = repository.create({ nome: 'B' });

      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findById', () => {
    it('devolve null quando o id não existe', () => {
      expect(repository.findById('inexistente')).toBeNull();
    });

    it('devolve uma cópia, protegendo o estado interno de mutações', () => {
      const { id } = repository.create({ nome: 'Ana' });

      const encontrado = repository.findById(id);
      encontrado.nome = 'Alterado por fora';

      expect(repository.findById(id).nome).toBe('Ana');
    });
  });

  describe('findAll', () => {
    it('devolve todos os registros quando não há filtro', () => {
      repository.create({ nome: 'A' });
      repository.create({ nome: 'B' });

      expect(repository.findAll()).toHaveLength(2);
    });

    it('aplica o predicado de filtro', () => {
      repository.create({ nome: 'A', ativo: true });
      repository.create({ nome: 'B', ativo: false });

      const ativos = repository.findAll((registro) => registro.ativo);

      expect(ativos).toHaveLength(1);
      expect(ativos[0].nome).toBe('A');
    });

    it('devolve lista vazia quando não há registros', () => {
      expect(repository.findAll()).toEqual([]);
    });
  });

  describe('update', () => {
    it('mescla os dados enviados com o registro existente', () => {
      const { id } = repository.create({ nome: 'Ana', idade: 30 });

      const atualizado = repository.update(id, { idade: 31 });

      expect(atualizado).toEqual({ id, nome: 'Ana', idade: 31 });
      expect(repository.findById(id)).toEqual(atualizado);
    });

    it('não permite sobrescrever o id', () => {
      const { id } = repository.create({ nome: 'Ana' });

      const atualizado = repository.update(id, { id: 'outro-id' });

      expect(atualizado.id).toBe(id);
      expect(repository.findById('outro-id')).toBeNull();
    });

    it('devolve null quando o id não existe', () => {
      expect(repository.update('inexistente', { nome: 'X' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('remove o registro e devolve true', () => {
      const { id } = repository.create({ nome: 'Ana' });

      expect(repository.delete(id)).toBe(true);
      expect(repository.findById(id)).toBeNull();
    });

    it('devolve false quando o id não existe', () => {
      expect(repository.delete('inexistente')).toBe(false);
    });
  });

  describe('clear', () => {
    it('remove todos os registros', () => {
      repository.create({ nome: 'A' });
      repository.create({ nome: 'B' });

      repository.clear();

      expect(repository.findAll()).toEqual([]);
    });
  });
});
