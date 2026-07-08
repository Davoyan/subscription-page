import { Request, Response, NextFunction } from 'express';

import { IGNORED_HEADERS } from '@common/constants';

export function headerFilterMiddleware(req: Request, _res: Response, next: NextFunction) {
    for (const key of Object.keys(req.headers)) {
        if (IGNORED_HEADERS.has(key.toLowerCase())) {
            delete req.headers[key];
        }
    }
    next();
}
