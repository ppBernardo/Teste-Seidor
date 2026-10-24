const InMemoryRepository = require('../../../src/repositories/InMemoryRepository');
const AutomovelService = require('../../../src/services/AutomovelService');
const {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
} = require('../../../src/errors/AppError');

describe('AutomovelService', () => {
  let automovelRepository;
  let utilizacaoRepository;
  let service;

  const dadosValidos = { placa: 'ABC1D23', cor: 'Preto', marca: 'Toyota' };

  beforeEach(() => {
    automovelRepository = new InMemoryRepository();
    utilizacaoRepository = new InMemoryRepository();
    service = new AutomovelService({ automovelRepository, utilizacaoRepository });
  });

  describe('cadastrar', () => {
    it('cadastra um automóvel e devolve o registro com id', () => {
      const automovel = service.cadastrar(dadosValidos);

      expect(automovel).toEqual({ id: expect.any(String), ...dadosValidos });
    });

    it('normaliza a placa para maiúsculas e remove espaços nas pontas', () => {
      const automovel = service.cadastrar({ ...dadosValidos, placa: '  abc1d23 ' });

      expect(automovel.placa).toBe('ABC1D23');
    });

    it.each(['placa', 'cor', 'marca'])('rejeita quando o campo "%s" está ausente', (campo) => {
      const dados = { ...dadosValidos };
      delete dados[campo];

      expect(() => service.cadastrar(dados)).toThrow(ValidationError);
      expect(() => service.cadastrar(dados)).toThrow(`"${campo}"`);
    });

    it('rejeita campos preenchidos apenas com espaços', () => {
      expect(() => service.cadastrar({ ...dadosValidos, cor: '   ' })).toThrow(ValidationError);
    });

    it('rejeita campos que não são texto', () => {
      expect(() => service.cadastrar({ ...dadosValidos, marca: 123 })).toThrow(ValidationError);
    });

    it('rejeita placa duplicada, ignorando maiúsculas/minúsculas', () => {
      service.cadastrar(dadosValidos);

      expect(() => service.cadastrar({ ...dadosValidos, placa: 'abc1d23' })).toThrow(
        BusinessRuleError
      );
    });
  });

  describe('buscarPorId', () => {
    it('devolve o automóvel quando existe', () => {
      const criado = service.cadastrar(dadosValidos);

      expect(service.buscarPorId(criado.id)).toEqual(criado);
    });

    it('lança NotFoundError quando não existe', () => {
      expect(() => service.buscarPorId('inexistente')).toThrow(NotFoundError);
    });
  });

  describe('listar', () => {
    beforeEach(() => {
      service.cadastrar({ placa: 'AAA1111', cor: 'Preto', marca: 'Toyota' });
      service.cadastrar({ placa: 'BBB2222', cor: 'Branco', marca: 'Toyota' });
      service.cadastrar({ placa: 'CCC3333', cor: 'Preto', marca: 'Honda' });
    });

    it('devolve todos os automóveis quando não há filtro', () => {
      expect(service.listar()).toHaveLength(3);
    });

    it('filtra por cor', () => {
      const resultado = service.listar({ cor: 'Preto' });

      expect(resultado.map((a) => a.placa)).toEqual(['AAA1111', 'CCC3333']);
    });

    it('filtra por marca', () => {
      const resultado = service.listar({ marca: 'Toyota' });

      expect(resultado.map((a) => a.placa)).toEqual(['AAA1111', 'BBB2222']);
    });

    it('filtra por cor e marca ao mesmo tempo', () => {
      const resultado = service.listar({ cor: 'Preto', marca: 'Toyota' });

      expect(resultado.map((a) => a.placa)).toEqual(['AAA1111']);
    });

    it('ignora maiúsculas/minúsculas nos filtros', () => {
      expect(service.listar({ cor: 'preto', marca: 'HONDA' }).map((a) => a.placa)).toEqual([
        'CCC3333',
      ]);
    });

    it('devolve lista vazia quando nenhum automóvel atende ao filtro', () => {
      expect(service.listar({ cor: 'Roxo' })).toEqual([]);
    });
  });

  describe('atualizar', () => {
    it('atualiza apenas os campos enviados', () => {
      const criado = service.cadastrar(dadosValidos);

      const atualizado = service.atualizar(criado.id, { cor: 'Azul' });

      expect(atualizado).toEqual({ ...criado, cor: 'Azul' });
    });

    it('normaliza a placa ao atualizar', () => {
      const criado = service.cadastrar(dadosValidos);

      expect(service.atualizar(criado.id, { placa: 'xyz9z99' }).placa).toBe('XYZ9Z99');
    });

    it('permite manter a própria placa ao atualizar', () => {
      const criado = service.cadastrar(dadosValidos);

      expect(() => service.atualizar(criado.id, { placa: 'abc1d23', cor: 'Azul' })).not.toThrow();
    });

    it('rejeita placa já usada por outro automóvel', () => {
      service.cadastrar(dadosValidos);
      const outro = service.cadastrar({ placa: 'XYZ9Z99', cor: 'Azul', marca: 'Fiat' });

      expect(() => service.atualizar(outro.id, { placa: 'ABC1D23' })).toThrow(BusinessRuleError);
    });

    it('lança NotFoundError quando o automóvel não existe', () => {
      expect(() => service.atualizar('inexistente', { cor: 'Azul' })).toThrow(NotFoundError);
    });

    it('rejeita atualização sem nenhum campo válido', () => {
      const criado = service.cadastrar(dadosValidos);

      expect(() => service.atualizar(criado.id, {})).toThrow(ValidationError);
      expect(() => service.atualizar(criado.id, { campoDesconhecido: 'x' })).toThrow(
        ValidationError
      );
    });

    it('rejeita campo enviado com valor vazio', () => {
      const criado = service.cadastrar(dadosValidos);

      expect(() => service.atualizar(criado.id, { cor: '' })).toThrow(ValidationError);
    });
  });

  describe('excluir', () => {
    it('remove o automóvel', () => {
      const criado = service.cadastrar(dadosValidos);

      service.excluir(criado.id);

      expect(() => service.buscarPorId(criado.id)).toThrow(NotFoundError);
    });

    it('lança NotFoundError quando o automóvel não existe', () => {
      expect(() => service.excluir('inexistente')).toThrow(NotFoundError);
    });

    it('impede a exclusão de um automóvel com utilização em andamento', () => {
      const criado = service.cadastrar(dadosValidos);
      utilizacaoRepository.create({ automovelId: criado.id, motoristaId: 'm1', dataTermino: null });

      expect(() => service.excluir(criado.id)).toThrow(BusinessRuleError);
      expect(service.buscarPorId(criado.id)).toEqual(criado);
    });

    it('permite a exclusão quando todas as utilizações foram finalizadas', () => {
      const criado = service.cadastrar(dadosValidos);
      utilizacaoRepository.create({
        automovelId: criado.id,
        motoristaId: 'm1',
        dataTermino: '2026-01-01T12:00:00.000Z',
      });

      expect(() => service.excluir(criado.id)).not.toThrow();
    });
  });
});
