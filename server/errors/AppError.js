export default class AppError extends Error {
  constructor(status, message, { code = 'REQUEST_ERROR', details } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
