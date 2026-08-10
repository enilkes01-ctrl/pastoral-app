import { Request, Response, NextFunction } from 'express';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Envuelve rutas async: si la promesa rechaza (ej. la base de datos no responde),
// el error se pasa a Express en vez de tumbar el proceso completo.
export function asyncHandler(fn: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
