import express, { NextFunction, Request, Response } from 'express';
import {
  getCheckAndSend,
  postCheckAndSend,
  setupCheckAndSendController
} from '../../../../app/controllers/reasons-for-appeal/check-and-send';
import { paths } from '../../../../app/paths';
import { Events } from '../../../../app/service/ccd-service';
import UpdateAppealService from '../../../../app/service/update-appeal-service';
import { addSummaryRow, Delimiter } from '../../../../app/utils/summary-list';
import i18n from '../../../../locale/en.json';
import { expect, sinon } from '../../../utils/testUtils';

describe('Reasons For Appeal - Check and send Controller', () => {
  let sandbox: sinon.SinonSandbox;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let updateAppealService: Partial<UpdateAppealService>;
  let next: NextFunction;
  let routerGetStub: sinon.SinonStub;
  let routerPostStub: sinon.SinonStub;

  const editParameter = '?edit';

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    req = {
      session: {
        appeal: {
          application: {},
          reasonsForAppeal: {
            applicationReason: 'a reason'
          }
        } as Partial<Appeal>
      } as Partial<Express.Session>
    } as Partial<Request>;

    res = {
      redirect: sandbox.spy(),
      render: sandbox.stub(),
      send: sandbox.stub()
    } as Partial<Response>;

    routerGetStub = sandbox.stub(express.Router as never, 'get');
    routerPostStub = sandbox.stub(express.Router as never, 'post');
    next = sandbox.stub() as NextFunction;
    updateAppealService = { submitEvent: sandbox.stub() } as Partial<UpdateAppealService>;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('setupCheckAndSendController', () => {
    it('should setup the routes', () => {
      setupCheckAndSendController(updateAppealService as UpdateAppealService);
      expect(routerGetStub).to.have.been.calledWith(paths.reasonsForAppeal.checkAndSend);
      expect(routerPostStub).to.have.been.calledWith(paths.reasonsForAppeal.checkAndSend);
    });
  });

  describe('getCheckAndSend', () => {
    it('should render reasons-for-appeal/check-and-send-page.njk with supporting evidences', () => {
      const summaryRows = [
        addSummaryRow(i18n.common.cya.questionRowTitle, [ i18n.pages.reasonForAppeal.heading ], null),
        addSummaryRow(i18n.common.cya.answerRowTitle, [ req.session.appeal.reasonsForAppeal.applicationReason ], paths.reasonsForAppeal.decision + editParameter),
        addSummaryRow(i18n.common.cya.supportingEvidenceRowTitle, [ 'File1.png', 'File2.png' ], paths.reasonsForAppeal.supportingEvidenceUpload + editParameter, Delimiter.BREAK_LINE)
      ];
      req.session.appeal.reasonsForAppeal.evidences = {
        '1-File1.png': {
          'id': '1-File1.png',
          'url': '#',
          'name': 'File1.png'
        },
        '2-File2.png': {
          'id': '2-File2.png',
          'url': '#',
          'name': 'File2.png'
        }
      };

      getCheckAndSend(req as Request, res as Response, next);
      expect(res.render).to.have.been.calledWith('reasons-for-appeal/check-and-send-page.njk', {
        summaryRows,
        previousPage: paths.reasonsForAppeal.supportingEvidenceUpload
      });
    });

    it('should render reasons-for-appeal/check-and-send-page.njk without supporting evidences', () => {
      const summaryRows = [
        addSummaryRow(i18n.common.cya.questionRowTitle, [ i18n.pages.reasonForAppeal.heading ], null),
        addSummaryRow(i18n.common.cya.answerRowTitle, [ req.session.appeal.reasonsForAppeal.applicationReason ], paths.reasonsForAppeal.decision + editParameter)
      ];

      getCheckAndSend(req as Request, res as Response, next);
      expect(res.render).to.have.been.calledWith('reasons-for-appeal/check-and-send-page.njk', {
        summaryRows,
        previousPage: paths.reasonsForAppeal.supportingEvidence
      });
    });

    it('should call next with error render if something happens', () => {
      const error = new Error('the error');
      res.render = sandbox.stub().throws(error);
      getCheckAndSend(req as Request, res as Response, next);
      expect(next).to.have.been.calledOnce.calledWith(error);
    });
  });

  describe('postCheckAndSend', () => {
    it('should redirect to confirmation page when click save and continue', async () => {
      req.body = {};
      await postCheckAndSend(updateAppealService as UpdateAppealService)(req as Request, res as Response, next);
      expect(updateAppealService.submitEvent).to.have.been.calledOnceWith(Events.SUBMIT_REASONS_FOR_APPEAL, req);
      expect(res.redirect).to.have.been.calledWith(paths.reasonsForAppeal.confirmation);
    });

    it('should redirect to timeline page when click save for later', async () => {
      req.body = { saveForLater: 'saveForLater' };
      await postCheckAndSend(updateAppealService as UpdateAppealService)(req as Request, res as Response, next);
      expect(updateAppealService.submitEvent).to.not.have.been.called;
      expect(res.redirect).to.have.been.calledWith(paths.overview);
    });

    it('should call next with error render if something happens', async () => {
      req.body = {};
      const error = new Error('the error');
      res.redirect = sandbox.stub().throws(error);
      await postCheckAndSend(updateAppealService as UpdateAppealService)(req as Request, res as Response, next);
      expect(next).to.have.been.calledOnce.calledWith(error);
    });
  });
});
