import config from 'config';
import { NextFunction, Request, Response, Router } from 'express';
import moment from 'moment';

const daysToWaitAfterSubmission = config.get('daysToWait.afterSubmission');

import { paths } from '../../paths';
import { dayMonthYearFormat } from '../../utils/date-formats';

export const daysToWaitUntilContact = (days: number) => {
  const date = moment().add(days,'days').format(dayMonthYearFormat);
  return date;
};
function getConfirmationPage(req: Request, res: Response, next: NextFunction) {
  try {
    const { application } = req.session.appeal;
    const isLate = () => application.isAppealLate ;

    res.render('confirmation-page.njk', {
      date: daysToWaitUntilContact(daysToWaitAfterSubmission),
      late: isLate()
    });
  } catch (e) {
    next(e);
  }
}

function setConfirmationController(): Router {
  const router = Router();
  router.get(paths.confirmation, getConfirmationPage);
  return router;
}

export {
  setConfirmationController,
  getConfirmationPage
};
