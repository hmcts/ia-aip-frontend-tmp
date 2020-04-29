import { NextFunction, Request, Response } from 'express';
import { paths } from '../paths';
import { hasInflightTimeExtension } from '../utils/utils';

const isJourneyAllowedMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const pathsCopy = { ...paths[req.session.appeal.appealStatus] } || {};
  const currentPath: string = req.path;
  const isJourneyAllowed: boolean = Object.values(pathsCopy).includes(currentPath) ||
    Object.values(paths.common).includes(currentPath) ||
    currentPath.startsWith(paths.common.detailsViewers.document);
  if (isJourneyAllowed) {
    return next();
  }
  return res.redirect(paths.common.forbidden);
};

const isTimeExtensionsInProgress = (req: Request, res: Response, next: NextFunction) => {
  if (!hasInflightTimeExtension(req.session.appeal)) {
    return next();
  }
  return res.redirect(paths.common.forbidden);
};

export {
  isJourneyAllowedMiddleware,
  isTimeExtensionsInProgress
};
