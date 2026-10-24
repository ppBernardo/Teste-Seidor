/**
 * Erros de aplicação conhecidos. Cada um carrega o status HTTP adequado,
 * permitindo que o middleware de erro traduza a exceção em resposta sem
 * precisar conhecer regras de negócio.
 */
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

/** Dados de entrada inválidos (campo ausente, formato incorreto etc). */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

/** Recurso solicitado não existe. */
class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

/** A operação é válida sintaticamente, mas viola uma regra de negócio. */
class BusinessRuleError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

module.exports = { AppError, ValidationError, NotFoundError, BusinessRuleError };
