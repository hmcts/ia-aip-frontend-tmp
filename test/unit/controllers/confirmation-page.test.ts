import { NextFunction, Request, Response } from 'express';
import {
  daysToWaitUntilContact,
  getConfirmationPage,
  setConfirmationController
} from '../../../app/controllers/confirmation-page';
import { paths } from '../../../app/paths';
import Logger from '../../../app/utils/logger';
import { expect, sinon } from '../../utils/testUtils';

const express = require('express');

describe('Confirmation Page Controller', () => {
  let sandbox: sinon.SinonSandbox;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  const logger: Logger = new Logger();

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    req = {
      session: {
        appeal: {
          application: {
            contactDetails: {}
          }
        }
      } as Partial<Appeal>,
      cookies: {},
      idam: {
        userDetails: {}
      },
      app: {
        locals: {
          logger
        }
      } as any
    } as Partial<Request>;

    res = {
      render: sandbox.stub(),
      send: sandbox.stub(),
      redirect: sinon.spy()
    } as Partial<Response>;

    next = sandbox.stub() as NextFunction;
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should setup the routes', () => {
    const routerGetStub: sinon.SinonStub = sandbox.stub(express.Router, 'get');

    setConfirmationController();
    expect(routerGetStub).to.have.been.calledWith(paths.confirmation);
  });

  it('getConfirmationPage should render confirmation.njk', () => {
    // @ts-ignore
    req.session.appeal.application = {
      homeOfficeRefNumber: 'A1234567',
      dateLetterSent: {
        day: 1,
        month: 7,
        year: 2019
      },
      appealType: 'Protection',
      isAppealLate: true,
      personalDetails: {
        givenNames: 'Pedro',
        familyName: 'Jimenez',
        dob: {
          day: 10,
          month: 10,
          year: 1980
        },
        nationality: 'Panamanian',
        stateless: false,
        address: {
          line1: '60 Beautiful Street',
          line2: 'Flat 2',
          city: 'London',
          postcode: 'W1W 7RT',
          county: 'London'
        }
      },
      contactDetails: {
        email: 'pedro.jimenez@example.net',
        wantsEmail: true,
        phone: '07123456789',
        wantsSms: false
      }
    };

    getConfirmationPage(req as Request, res as Response, next);
    expect(res.render).to.have.been.calledOnce.calledWith('confirmation-page.njk', {
      date: daysToWaitUntilContact,
      days: 14,
      late: true
    });
  });

  it('getConfirmationPage should catch an exception and call next()', () => {
    const error = new Error('the error');
    res.render = sandbox.stub().throws(error);
    getConfirmationPage(req as Request, res as Response, next);
    expect(next).to.have.been.calledOnce.calledWith(error);
  });
});
