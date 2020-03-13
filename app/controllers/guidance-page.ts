import { NextFunction, Request, Response, Router } from 'express';
import { paths } from '../paths';
import { getGuidancePageText } from '../utils/guidance-page-utils';

function getCaseworkerPage(req: Request, res: Response, next: NextFunction) {
  const text = getGuidancePageText('caseworker');
  try {
    return res.render('guidance-pages/guidance-page.njk', {
      showContactUs: true,
      previousPage: {
        attributes: { onclick: 'history.go(-1); return false;' }
      },
      page: text
    });
  } catch (e) {
    next(e);
  }
}

function getMoreHelpPage(req: Request, res: Response, next: NextFunction) {
  const text = getGuidancePageText('helpWithAppeal');
  try {
    return res.render('guidance-pages/guidance-page.njk', {
      showContactUs: true,
      previousPage: {
        attributes: { onclick: 'history.go(-1); return false;' }
      },
      page: text
    });
  } catch (e) {
    next(e);
  }
}

function getHomeOfficeDocumentsPage(req: Request, res: Response, next: NextFunction) {
  const text = getGuidancePageText('homeOfficeDocuments');
  try {
    return res.render('guidance-pages/guidance-page.njk', {
      showContactUs: false,
      previousPage: {
        attributes: { onclick: 'history.go(-1); return false;' }
      },
      page: text
    });
  } catch (e) {
    next(e);
  }
}

function getEvidenceToSupportAppealPage(req: Request, res: Response, next: NextFunction) {
  const text = getGuidancePageText('evidenceToSupportAppeal');
  try {
    return res.render('guidance-pages/guidance-page.njk', {
      showContactUs: true,
      previousPage: {
        attributes: { onclick: 'history.go(-1); return false;' }
      },
      page: text
    });
  } catch (e) {
    next(e);
  }
}

function setupGuidancePagesController(): Router {
  const router = Router();
  router.get(paths.guidancePages.tribunalCaseworker, getCaseworkerPage);
  router.get(paths.guidancePages.moreHelp, getMoreHelpPage);
  router.get(paths.guidancePages.tribunalCaseworker, getCaseworkerPage);
  router.get(paths.guidancePages.moreHelp, getMoreHelpPage);
  router.get(paths.guidancePages.homeOfficeDocuments, getHomeOfficeDocumentsPage);
  router.get(paths.guidancePages.evidenceToSupportAppeal, getEvidenceToSupportAppealPage);

  return router;
}

export {
  setupGuidancePagesController,
  getEvidenceToSupportAppealPage,
  getHomeOfficeDocumentsPage,
  getMoreHelpPage,
  getCaseworkerPage
};
