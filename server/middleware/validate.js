import AppError from '../errors/AppError.js';

export function validate(schemas) {
  return function validationMiddleware(req, _res, next) {
    try {
      req.validated = req.validated || {};
      for (const [location, schema] of Object.entries(schemas)) {
        const result = schema.safeParse(req[location]);
        if (!result.success) {
          const details = result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }));
          throw new AppError(400, '요청 값이 올바르지 않습니다.', {
            code: 'VALIDATION_ERROR',
            details,
          });
        }
        req.validated[location] = result.data;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
