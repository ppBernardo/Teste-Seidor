const InMemoryRepository = require('../../../src/repositories/InMemoryRepository');
const UtilizacaoService = require('../../../src/services/UtilizacaoService');
const {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
} = require('../../../src/errors/AppError');

describe('UtilizacaoService', () => {
  let utilizacaoRepository;
  let motoristaRepository;
  let automovelRepository;
  let service;

  let motorista;
  let outroMotorista;
  let automovel;
  let outroAutomovel;

  const AGORA = new Date('2026-10-23T10:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(AGORA);

    utilizacaoRepository = new InMemoryRepository();
    motoristaRepository = new InMemoryRepository();
    automovelRepository = new InMemoryRepository();
    service = new UtilizacaoService({
      utilizacaoRepository,
      motoristaRepository,
      automovelRepository,
    });

    motorista = motoristaRepository.create({ nome: 'Maria Silva' });
    outroMotorista = motoristaRepository.create({ nome: 'João Souza' });
    automovel = automovelRepository.create({ placa: 'ABC1D23', cor: 'Preto', marca: 'Toyota' });
    outroAutomovel = automovelRepository.create({ placa: 'XYZ9Z99', cor: 'Branco', marca: 'Honda' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function iniciarPadrao(sobrescrever = {}) {
    return service.iniciar({
      motoristaId: motorista.id,
      automovelId: automovel.id,
      motivo: 'Visita a cliente',
      ...sobrescrever,
    });
  }

  describe('iniciar', () => {
    it('cria a utilização com os dados do motorista e do automóvel', () => {
      const utilizacao = iniciarPadrao({ dataInicio: '2026-10-23T08:00:00.000Z' });

      expect(utilizacao).toEqual({
        id: expect.any(String),
        dataInicio: '2026-10-23T08:00:00.000Z',
        dataTermino: null,
        motivo: 'Visita a cliente',
        motorista: { id: motorista.id, nome: 'Maria Silva' },
        automovel: { id: automovel.id, placa: 'ABC1D23', cor: 'Preto', marca: 'Toyota' },
      });
    });

    it('usa o momento atual como data de início quando não informada', () => {
      const utilizacao = iniciarPadrao();

      expect(utilizacao.dataInicio).toBe(AGORA.toISOString());
    });

    it.each(['motoristaId', 'automovelId', 'motivo'])(
      'rejeita quando o campo "%s" está ausente',
      (campo) => {
        expect(() => iniciarPadrao({ [campo]: undefined })).toThrow(ValidationError);
      }
    );

    it('rejeita motivo vazio', () => {
      expect(() => iniciarPadrao({ motivo: '   ' })).toThrow(ValidationError);
    });

    it('rejeita data de início inválida', () => {
      expect(() => iniciarPadrao({ dataInicio: 'ontem' })).toThrow(ValidationError);
    });

    it('lança NotFoundError quando o motorista não existe', () => {
      expect(() => iniciarPadrao({ motoristaId: 'inexistente' })).toThrow(NotFoundError);
    });

    it('lança NotFoundError quando o automóvel não existe', () => {
      expect(() => iniciarPadrao({ automovelId: 'inexistente' })).toThrow(NotFoundError);
    });

    describe('regra: um automóvel só pode ser utilizado por um motorista por vez', () => {
      it('impede que outro motorista utilize um automóvel em uso', () => {
        iniciarPadrao();

        expect(() => iniciarPadrao({ motoristaId: outroMotorista.id })).toThrow(
          BusinessRuleError
        );
        expect(() => iniciarPadrao({ motoristaId: outroMotorista.id })).toThrow(
          /automóvel de placa ABC1D23/
        );
      });

      it('permite utilizar o automóvel novamente após a utilização anterior ser finalizada', () => {
        const primeira = iniciarPadrao();
        service.finalizar(primeira.id);

        expect(() => iniciarPadrao({ motoristaId: outroMotorista.id })).not.toThrow();
      });
    });

    describe('regra: um motorista não pode utilizar dois automóveis ao mesmo tempo', () => {
      it('impede que o motorista inicie outra utilização enquanto a atual não for finalizada', () => {
        iniciarPadrao();

        expect(() => iniciarPadrao({ automovelId: outroAutomovel.id })).toThrow(
          BusinessRuleError
        );
        expect(() => iniciarPadrao({ automovelId: outroAutomovel.id })).toThrow(
          /motorista Maria Silva/
        );
      });

      it('permite que o motorista utilize outro automóvel após finalizar a utilização atual', () => {
        const primeira = iniciarPadrao();
        service.finalizar(primeira.id);

        expect(() => iniciarPadrao({ automovelId: outroAutomovel.id })).not.toThrow();
      });
    });

    it('não registra nada quando uma regra de negócio é violada', () => {
      iniciarPadrao();

      expect(() => iniciarPadrao({ motoristaId: outroMotorista.id })).toThrow();

      expect(service.listar()).toHaveLength(1);
    });
  });

  describe('finalizar', () => {
    it('grava a data de término informada', () => {
      const utilizacao = iniciarPadrao({ dataInicio: '2026-10-23T08:00:00.000Z' });

      const finalizada = service.finalizar(utilizacao.id, {
        dataTermino: '2026-10-23T09:30:00.000Z',
      });

      expect(finalizada.dataTermino).toBe('2026-10-23T09:30:00.000Z');
      expect(service.buscarPorId(utilizacao.id).dataTermino).toBe('2026-10-23T09:30:00.000Z');
    });

    it('usa o momento atual como data de término quando não informada', () => {
      const utilizacao = iniciarPadrao({ dataInicio: '2026-10-23T08:00:00.000Z' });

      expect(service.finalizar(utilizacao.id).dataTermino).toBe(AGORA.toISOString());
    });

    it('lança NotFoundError quando a utilização não existe', () => {
      expect(() => service.finalizar('inexistente')).toThrow(NotFoundError);
    });

    it('impede finalizar uma utilização já finalizada', () => {
      const utilizacao = iniciarPadrao();
      service.finalizar(utilizacao.id);

      expect(() => service.finalizar(utilizacao.id)).toThrow(BusinessRuleError);
    });

    it('rejeita data de término anterior à data de início', () => {
      const utilizacao = iniciarPadrao({ dataInicio: '2026-10-23T08:00:00.000Z' });

      expect(() =>
        service.finalizar(utilizacao.id, { dataTermino: '2026-10-23T07:59:59.000Z' })
      ).toThrow(ValidationError);
    });

    it('rejeita data de término inválida', () => {
      const utilizacao = iniciarPadrao();

      expect(() => service.finalizar(utilizacao.id, { dataTermino: 'amanhã' })).toThrow(
        ValidationError
      );
    });
  });

  describe('listar', () => {
    it('devolve lista vazia quando não há utilizações', () => {
      expect(service.listar()).toEqual([]);
    });

    it('devolve cada utilização com o nome do motorista e as informações do automóvel', () => {
      const primeira = iniciarPadrao({ dataInicio: '2026-10-23T08:00:00.000Z' });
      service.finalizar(primeira.id, { dataTermino: '2026-10-23T09:00:00.000Z' });
      iniciarPadrao({
        motoristaId: outroMotorista.id,
        automovelId: outroAutomovel.id,
        motivo: 'Entrega',
      });

      const lista = service.listar();

      expect(lista).toHaveLength(2);
      expect(lista[0]).toMatchObject({
        dataTermino: '2026-10-23T09:00:00.000Z',
        motivo: 'Visita a cliente',
        motorista: { nome: 'Maria Silva' },
        automovel: { placa: 'ABC1D23', cor: 'Preto', marca: 'Toyota' },
      });
      expect(lista[1]).toMatchObject({
        dataTermino: null,
        motivo: 'Entrega',
        motorista: { nome: 'João Souza' },
        automovel: { placa: 'XYZ9Z99', cor: 'Branco', marca: 'Honda' },
      });
    });

    it('devolve null no automóvel quando o cadastro foi removido após a finalização', () => {
      const utilizacao = iniciarPadrao();
      service.finalizar(utilizacao.id);
      automovelRepository.delete(automovel.id);

      expect(service.listar()[0].automovel).toBeNull();
      expect(service.listar()[0].motorista).toEqual({ id: motorista.id, nome: 'Maria Silva' });
    });
  });

  describe('buscarPorId', () => {
    it('devolve a utilização com detalhes', () => {
      const utilizacao = iniciarPadrao();

      expect(service.buscarPorId(utilizacao.id)).toEqual(utilizacao);
    });

    it('lança NotFoundError quando não existe', () => {
      expect(() => service.buscarPorId('inexistente')).toThrow(NotFoundError);
    });
  });
});
