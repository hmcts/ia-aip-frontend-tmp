import express, { NextFunction, Request, Response } from 'express';
import {
  getWitnessesOutsideUkQuestion, postWitnessesOutsideUkQuestion,
  setupWitnessesOutsideUkQuestionController
} from '../../../../app/controllers/hearing-requirements/hearing-outside-uk';
import { paths } from '../../../../app/paths';
import { expect, sinon } from '../../../utils/testUtils';

describe('Hearing Requirements - Witness Needs - Witnesses outside UK question controller', () => {
  let sandbox: sinon.SinonSandbox;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    req = {
      body: {},
      params: {},
      session: {
        appeal: {
          hearingRequirements: {
            witnessesOutsideUK: {}
          }
        } as Partial<Appeal>
      }
    } as Partial<Request>;
    res = {
      render: sandbox.stub(),
      redirect: sandbox.spy()
    } as Partial<Response>;
    next = sandbox.stub() as NextFunction;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('setupWitnessesOutsideUkQuestionController', () => {
    it('should setup routes', () => {
      const routerGetStub: sinon.SinonStub = sandbox.stub(express.Router as never, 'get');
      const routerPostStub: sinon.SinonStub = sandbox.stub(express.Router as never, 'post');
      const middleware: Middleware[] = [];

      setupWitnessesOutsideUkQuestionController(middleware);
      expect(routerGetStub).to.have.been.calledWith(paths.submitHearingRequirements.witnessOutsideUK);
      expect(routerPostStub).to.have.been.calledWith(paths.submitHearingRequirements.witnessOutsideUK);
    });
  });

  describe('getWitnessesOutsideUkQuestion', () => {
    it('should render question page', () => {

      getWitnessesOutsideUkQuestion(req as Request, res as Response, next);

      const expectedArgs = {
        formAction: '/hearing-outside-uk',
        pageTitle: 'Will you or any witnesses take part in the hearing from outside the UK?',
        previousPage: { attributes: { onclick: 'history.go(-1); return false;' } },
        question: {
          options: [ { text: 'Yes', value: 'yes' }, { text: 'No', value: 'no' } ],
          title: 'Will you or any witnesses take part in the hearing from outside the UK?'
        },
        saveAndContinue: true

      };
      expect(res.render).to.have.been.calledWith('templates/radio-question-page.njk',
        expectedArgs
      );
    });

    it('should catch error and call next with error', () => {
      const error = new Error('an error');
      res.render = sandbox.stub().throws(error);

      getWitnessesOutsideUkQuestion(req as Request, res as Response, next);
      expect(next).to.have.been.calledOnce.calledWith(error);
    });
  });

  describe('postWitnessesOutsideUkQuestion', () => {
    it('should fail validation and render template with errors', async () => {
      await postWitnessesOutsideUkQuestion()(req as Request, res as Response, next);

      const expectedError = {
        answer: {
          href: '#answer',
          key: 'answer',
          text: 'Select Yes if you or any witnesses will take part in the hearing from outside the UK'
        }
      };

      const expectedArgs = {
        error: expectedError,
        errorList: Object.values(expectedError),
        formAction: '/hearing-outside-uk',
        pageTitle: 'Will you or any witnesses take part in the hearing from outside the UK?',
        previousPage: { attributes: { onclick: 'history.go(-1); return false;' } },
        question: {
          options: [ { text: 'Yes', value: 'yes' }, { text: 'No', value: 'no' } ],
          title: 'Will you or any witnesses take part in the hearing from outside the UK?'
        },
        saveAndContinue: true
      };
      expect(res.render).to.have.been.calledWith('templates/radio-question-page.njk', expectedArgs);
    });

    it('should validate and redirect to task list page if answer yes', async () => {
      req.body['answer'] = 'yes';
      await postWitnessesOutsideUkQuestion()(req as Request, res as Response, next);

      expect(res.redirect).to.have.been.calledWith(paths.submitHearingRequirements.taskList);
    });

    it('should validate if appellant answers no and redirect to task list page', async () => {
      req.body['answer'] = 'no';
      await postWitnessesOutsideUkQuestion()(req as Request, res as Response, next);

      expect(res.redirect).to.have.been.calledWith(paths.submitHearingRequirements.taskList);
    });

    it('should catch error and call next with error', async () => {
      const error = new Error('an error');
      res.render = sandbox.stub().throws(error);

      await postWitnessesOutsideUkQuestion()(req as Request, res as Response, next);
      expect(next).to.have.been.calledOnce.calledWith(error);
    });
  });
});
