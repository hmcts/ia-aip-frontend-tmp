import { NextFunction, Request, Response } from 'express';
import * as _ from 'lodash';
import { paths } from '../paths';
import { AuthenticationService } from '../service/authentication-service';
import { CcdService } from '../service/ccd-service';
import IdamService from '../service/idam-service';
import S2SService from '../service/s2s-service';
import UpdateAppealService from '../service/update-appeal-service';
import Logger from '../utils/logger';

const authenticationService: AuthenticationService = new AuthenticationService(new IdamService(), S2SService.getInstance());
const updateAppealService: UpdateAppealService = new UpdateAppealService(new CcdService(), authenticationService, S2SService.getInstance());

async function initSession(req: Request, _res: Response, next: NextFunction) {
  try {
    await updateAppealService.loadAppeal(req);
    next();
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.debug('initSession Error' + e.toString());
    next(e);
  }
}

function checkSession(args: any = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tokenCookieName = args.tokenCookieName || '__auth-token';
    // tslint:disable-next-line:no-console
    console.debug('checkSession tokenCookieName: ' + tokenCookieName);
    // tslint:disable-next-line:no-console
    console.debug('request: ' + req);
    // tslint:disable-next-line:no-console
    console.debug('request session: ' + JSON.stringify(req.session));
    // tslint:disable-next-line:no-console
    console.debug('request session appeal: ' + JSON.stringify(req.session.appeal));
    // tslint:disable-next-line:no-console
    console.debug('request session appeal application: ' + req.session.appeal.application);
    if (req.cookies && req.cookies[tokenCookieName] && !_.has(req, 'session.appeal.application')) {
      // tslint:disable-next-line:no-console
      console.debug('checkSession clearCookie');
      res.clearCookie(tokenCookieName, '/');
      res.redirect(paths.common.login);
    } else {
      next();
    }
  };
}

/**
 * Used to ignore values from printing cleaning up noise
 */
function replacer(key, value) {
  switch (key) {
    case 'history':
    case 'data':
      return '**OMITTED**';
    default:
      return value;
  }
}

function logSession(req: Request, _res: Response, next: NextFunction) {
  try {
    const logger: Logger = req.app.locals.logger;
    logger.request(JSON.stringify(req.session, replacer, 2), 'logSession');
    next();
  } catch (e) {
    next(e);
  }
}

export {
  checkSession,
  initSession,
  logSession
};
