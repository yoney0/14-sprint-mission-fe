import AppError from '../errors/AppError.js';

export default function notFound(req, _res, next) {
  next(new AppError(404, `요청한 API를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`, {
    code: 'ROUTE_NOT_FOUND',
  }));
}
