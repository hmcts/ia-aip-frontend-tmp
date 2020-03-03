import config from 'config';
import { Request, Response } from 'express';
import * as _ from 'lodash';
import { paths } from '../paths';

const appPort = config.get('node.port');

export function getUrl(protocol: string, host: string, path: string): string {
  const portString = (host === 'localhost') ? ':' + appPort : '';
  return protocol + '://' + host + portString + path;
}

export function getIdamRedirectUrl(req: Request): string {
  return getUrl('https', req.hostname, '/redirectUrl');
}

/**
 * Helps to workout where to redirect the user if it is an edit also resets the isEdit flag each time.
 * @param req the request
 * @param res the response
 * @param redirectUrl the page to be redirected if action is not an edit
 */
export function getConditionalRedirectUrl(req: Request, res: Response, redirectUrl: string) {

  if (_.has(req.session, 'appeal.application.isEdit')
    && req.session.appeal.application.isEdit === true) {
    req.session.appeal.application.isEdit = false;
    return res.redirect(paths.checkAndSend);
  }
  if (_.has(req.session, 'appeal.reasonsForAppeal.isEdit')
    && req.session.appeal.reasonsForAppeal.isEdit === true) {
    req.session.appeal.reasonsForAppeal.isEdit = false;
    return res.redirect(paths.reasonsForAppeal.checkAndSend);
  }
  return res.redirect(redirectUrl);
}
