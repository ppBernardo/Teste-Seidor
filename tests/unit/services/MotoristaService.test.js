const InMemoryRepository = require('../../../src/repositories/InMemoryRepository');
const MotoristaService = require('../../../src/services/MotoristaService');
const {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
} = require('../../../src/errors/AppError');

describe('MotoristaService', () => {
  let motoristaRepository;
  let utilizacaoRepository;
  let service;

  beforeEach(() => {
    motoristaRepository = new InMemoryRepository();
    utilizacaoRepository = new InMemoryRepository();
    service = new MotoristaService({ motoristaRepository, utilizacaoRepository });
  });

  describe('cadastrar', () => {
    it('cadastra um motorista e devolve o registro com id', () => {
      const motorista = service.cadastrar({ nome: 'Maria Silva' });

      expect(motorista).toEqual({ id: expect.any(String), nome: 'Maria Silva' });
    });

    it('remove espaços nas pontas do nome', () => {
      expect(service.cadastrar({ nome: '  João  ' }).nome).toBe('João');
    });

    it.each([
      ['ausente', {}],
      ['vazio', { nome: '' }],
      ['apenas espaços', { nome: '   ' }],
      ['não é texto', { nome: 42 }],
    ])('rejeita quando o nome está %s', (_descricao, dados) => {
      expect(() => service.cadastrar(dados)).toThrow(ValidationError);
    });
  });

  describe('buscarPorId', () => {
    it('devolve o motorista quando existe', () => {
      const criado = service.cadastrar({ nome: 'Maria' });

      expect(service.buscarPorId(criado.id)).toEqual(criado);
    });

    it('lança NotFoundError quando não existe', () => {
      expect(() => service.buscarPorId('inexistente')).toThrow(NotFoundError);
    });
  });

  describe('listar', () => {
    beforeEach(() => {
      service.cadastrar({ nome: 'Maria Silva' });
      service.cadastrar({ nome: 'João Souza' });
      service.cadastrar({ nome: 'Mariana Costa' });
    });

    it('devolve todos os motoristas quando não há filtro', () => {
      expect(service.listar()).toHaveLength(3);
    });

    it('filtra por trecho do nome, ignorando maiúsculas/minúsculas', () => {
      const resultado = service.listar({ nome: 'mari' });

      expect(resultado.map((m) => m.nome)).toEqual(['Maria Silva', 'Mariana Costa']);
    });

    it('filtra pelo nome completo', () => {
      expect(service.listar({ nome: 'João Souza' }).map((m) => m.nome)).toEqual(['João Souza']);
    });

    it('devolve lista vazia quando nenhum nome confere', () => {
      expect(service.listar({ nome: 'Zé' })).toEqual([]);
    });
  });

  describe('atualizar', () => {
    it('atualiza o nome', () => {
      const criado = service.cadastrar({ nome: 'Maria' });

      expect(service.atualizar(criado.id, { nome: 'Maria Souza' })).toEqual({
        id: criado.id,
        nome: 'Maria Souza',
      });
    });

    it('lança NotFoundError quando o motorista não existe', () => {
      expect(() => service.atualizar('inexistente', { nome: 'X' })).toThrow(NotFoundError);
    });

    it('rejeita atualização sem campos válidos', () => {
      const criado = service.cadastrar({ nome: 'Maria' });

      expect(() => service.atualizar(criado.id, {})).toThrow(ValidationError);
      expect(() => service.atualizar(criado.id, { nome: '' })).toThrow(ValidationError);
    });
  });

  describe('excluir', () => {
    it('remove o motorista', () => {
      const criado = service.cadastrar({ nome: 'Maria' });

      service.excluir(criado.id);

      expect(() => service.buscarPorId(criado.id)).toThrow(NotFoundError);
    });

    it('lança NotFoundError quando o motorista não existe', () => {
      expect(() => service.excluir('inexistente')).toThrow(NotFoundError);
    });

    it('impede a exclusão de um motorista com utilização em andamento', () => {
      const criado = service.cadastrar({ nome: 'Maria' });
      utilizacaoRepository.create({ motoristaId: criado.id, automovelId: 'a1', dataTermino: null });

      expect(() => service.excluir(criado.id)).toThrow(BusinessRuleError);
      expect(service.buscarPorId(criado.id)).toEqual(criado);
    });

    it('permite a exclusão quando todas as utilizações foram finalizadas', () => {
      const criado = service.cadastrar({ nome: 'Maria' });
      utilizacaoRepository.create({
        motoristaId: criado.id,
        automovelId: 'a1',
        dataTermino: '2026-01-01T12:00:00.000Z',
      });

      expect(() => service.excluir(criado.id)).not.toThrow();
    });
  });
});
