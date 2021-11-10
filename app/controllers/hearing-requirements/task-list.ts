import { NextFunction, Request, Response, Router } from 'express';
import { paths } from '../../paths';
import LaunchDarklyService from '../../service/launchDarkly-service';
import { buildSectionObject, submitHearingRequirementsStatus } from '../../utils/tasks-utils';

function getSubmitHearingRequirementsStatus(status: ApplicationStatus) {
  const witnesses = buildSectionObject('witnesses', [ 'witnesses' ], status);
  const accessNeeds = buildSectionObject('accessNeeds', [ 'accessNeeds' ], status);
  const otherNeeds = buildSectionObject('otherNeeds', [ 'otherNeeds' ], status);
  const datesToAvoid = buildSectionObject('datesToAvoid', [ 'datesToAvoid' ], status);
  const checkAndSend = buildSectionObject('checkAndSend', [ 'checkAndSend' ], status);

  return [
    witnesses,
    accessNeeds,
    otherNeeds,
    datesToAvoid,
    checkAndSend
  ];
}

async function getTaskList(req: Request, res: Response, next: NextFunction) {
  try {
    const status: ApplicationStatus = submitHearingRequirementsStatus(req.session.appeal);
    const statusOverview = getSubmitHearingRequirementsStatus(status);
    const hearingRequirementsFlag = await LaunchDarklyService.getInstance().getVariation(req, 'aip-hearing-requirements-feature', false);
    // redirect to overview page , when the feature flag is disabled
    if (!hearingRequirementsFlag) {
      return res.redirect(paths.common.overview);
    }
    return res.render('hearing-requirements/task-list.njk', {
      previousPage: paths.common.overview,
      data: statusOverview
    });
  } catch (e) {
    next(e);
  }
}

function setupSubmitHearingRequirementsTaskListController(middleware: Middleware[]) {
  const router = Router();
  router.get(paths.submitHearingRequirements.taskList, middleware, getTaskList);
  return router;
}

export {
  getTaskList,
  setupSubmitHearingRequirementsTaskListController
};
