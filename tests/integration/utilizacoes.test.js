const request = require('supertest');
const { criarApp } = require('../../src/app');

describe('Rotas /utilizacoes', () => {
  let app;
  let motorista;
  let outroMotorista;
  let automovel;
  let outroAutomovel;

  beforeEach(async () => {
    app = criarApp();
    motorista = (await request(app).post('/motoristas').send({ nome: 'Maria Silva' })).body;
    outroMotorista = (await request(app).post('/motoristas').send({ nome: 'João Souza' })).body;
    automovel = (
      await request(app).post('/automoveis').send({ placa: 'ABC1D23', cor: 'Preto', marca: 'Toyota' })
    ).body;
    outroAutomovel = (
      await request(app).post('/automoveis').send({ placa: 'XYZ9Z99', cor: 'Branco', marca: 'Honda' })
    ).body;
  });

  function iniciar(sobrescrever = {}) {
    return request(app)
      .post('/utilizacoes')
      .send({
        motoristaId: motorista.id,
        automovelId: automovel.id,
        motivo: 'Visita a cliente',
        ...sobrescrever,
      });
  }

  describe('POST /utilizacoes', () => {
    it('inicia uma utilização e devolve 201 com os dados do motorista e do automóvel', async () => {
      const res = await iniciar({ dataInicio: '2026-10-23T08:00:00.000Z' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        dataInicio: '2026-10-23T08:00:00.000Z',
        dataTermino: null,
        motivo: 'Visita a cliente',
        motorista: { id: motorista.id, nome: 'Maria Silva' },
        automovel: { id: automovel.id, placa: 'ABC1D23', cor: 'Preto', marca: 'Toyota' },
      });
    });

    it('devolve 400 quando o motivo não é informado', async () => {
      const res = await iniciar({ motivo: undefined });

      expect(res.status).toBe(400);
      expect(res.body.erro).toContain('"motivo"');
    });

    it('devolve 404 quando o motorista não existe', async () => {
      const res = await iniciar({ motoristaId: 'inexistente' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ erro: 'Motorista não encontrado.' });
    });

    it('devolve 409 quando o automóvel já está em uso por outro motorista', async () => {
      await iniciar();

      const res = await iniciar({ motoristaId: outroMotorista.id });

      expect(res.status).toBe(409);
      expect(res.body.erro).toMatch(/placa ABC1D23/);
    });

    it('devolve 409 quando o motorista já está utilizando outro automóvel', async () => {
      await iniciar();

      const res = await iniciar({ automovelId: outroAutomovel.id });

      expect(res.status).toBe(409);
      expect(res.body.erro).toMatch(/Maria Silva/);
    });
  });

  describe('PATCH /utilizacoes/:id/finalizar', () => {
    it('finaliza a utilização gravando a data de término', async () => {
      const { body: criada } = await iniciar({ dataInicio: '2026-10-23T08:00:00.000Z' });

      const res = await request(app)
        .patch(`/utilizacoes/${criada.id}/finalizar`)
        .send({ dataTermino: '2026-10-23T09:30:00.000Z' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...criada, dataTermino: '2026-10-23T09:30:00.000Z' });
    });

    it('usa a data atual quando a data de término não é informada', async () => {
      const { body: criada } = await iniciar();

      const res = await request(app).patch(`/utilizacoes/${criada.id}/finalizar`);

      expect(res.status).toBe(200);
      expect(new Date(res.body.dataTermino).getTime()).not.toBeNaN();
    });

    it('devolve 404 quando a utilização não existe', async () => {
      const res = await request(app).patch('/utilizacoes/inexistente/finalizar');

      expect(res.status).toBe(404);
    });

    it('devolve 409 ao finalizar uma utilização já finalizada', async () => {
      const { body: criada } = await iniciar();
      await request(app).patch(`/utilizacoes/${criada.id}/finalizar`);

      const res = await request(app).patch(`/utilizacoes/${criada.id}/finalizar`);

      expect(res.status).toBe(409);
    });

    it('devolve 400 quando a data de término é anterior à de início', async () => {
      const { body: criada } = await iniciar({ dataInicio: '2026-10-23T08:00:00.000Z' });

      const res = await request(app)
        .patch(`/utilizacoes/${criada.id}/finalizar`)
        .send({ dataTermino: '2026-10-23T07:00:00.000Z' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /utilizacoes', () => {
    it('lista as utilizações com o nome do motorista e as informações do automóvel', async () => {
      const { body: primeira } = await iniciar({ dataInicio: '2026-10-23T08:00:00.000Z' });
      await request(app)
        .patch(`/utilizacoes/${primeira.id}/finalizar`)
        .send({ dataTermino: '2026-10-23T09:00:00.000Z' });
      await iniciar({
        motoristaId: outroMotorista.id,
        automovelId: outroAutomovel.id,
        motivo: 'Entrega',
      });

      const res = await request(app).get('/utilizacoes');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        dataInicio: '2026-10-23T08:00:00.000Z',
        dataTermino: '2026-10-23T09:00:00.000Z',
        motivo: 'Visita a cliente',
        motorista: { nome: 'Maria Silva' },
        automovel: { placa: 'ABC1D23', cor: 'Preto', marca: 'Toyota' },
      });
      expect(res.body[1]).toMatchObject({
        dataTermino: null,
        motivo: 'Entrega',
        motorista: { nome: 'João Souza' },
        automovel: { placa: 'XYZ9Z99', cor: 'Branco', marca: 'Honda' },
      });
    });

    it('devolve lista vazia quando não há utilizações', async () => {
      const res = await request(app).get('/utilizacoes');

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /utilizacoes/:id', () => {
    it('devolve a utilização pelo id', async () => {
      const { body: criada } = await iniciar();

      const res = await request(app).get(`/utilizacoes/${criada.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(criada);
    });

    it('devolve 404 quando não existe', async () => {
      const res = await request(app).get('/utilizacoes/inexistente');

      expect(res.status).toBe(404);
    });
  });

  describe('integração com os cadastros', () => {
    it('impede excluir um automóvel em uso', async () => {
      await iniciar();

      const res = await request(app).delete(`/automoveis/${automovel.id}`);

      expect(res.status).toBe(409);
      expect((await request(app).get(`/automoveis/${automovel.id}`)).status).toBe(200);
    });

    it('impede excluir um motorista com utilização em andamento', async () => {
      await iniciar();

      const res = await request(app).delete(`/motoristas/${motorista.id}`);

      expect(res.status).toBe(409);
    });
  });

  it('fluxo completo: iniciar, finalizar e reutilizar o automóvel com outro motorista', async () => {
    const { body: primeira } = await iniciar();

    expect((await iniciar({ motoristaId: outroMotorista.id })).status).toBe(409);

    const finalizada = await request(app).patch(`/utilizacoes/${primeira.id}/finalizar`);
    expect(finalizada.status).toBe(200);
    expect(finalizada.body.dataTermino).not.toBeNull();

    const segunda = await iniciar({ motoristaId: outroMotorista.id, motivo: 'Entrega' });
    expect(segunda.status).toBe(201);
    expect(segunda.body.motorista.nome).toBe('João Souza');

    const lista = await request(app).get('/utilizacoes');
    expect(lista.body.map((u) => u.motorista.nome)).toEqual(['Maria Silva', 'João Souza']);
  });
});
