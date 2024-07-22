import { Request } from 'express';
import { FEATURE_FLAGS } from '../../../app/data/constants';
import { paths } from '../../../app/paths';
import LaunchDarklyService from '../../../app/service/launchDarkly-service';
import {
  getAppealApplicationNextStep,
  getAppealStatus,
  getMoveAppealOfflineDate,
  getMoveAppealOfflineReason,
  isEventLatestInHistoryList,
  remissionDecisionEventIsTheLatest,
  requestFeeRemissionEventIsTheLatest
} from '../../../app/utils/application-state-utils';
import Logger from '../../../app/utils/logger';
import i18n from '../../../locale/en.json';
import { expect, sinon } from '../../utils/testUtils';

describe('application-state-utils', () => {
  let sandbox: sinon.SinonSandbox;
  let req: Partial<Request>;
  const logger: Logger = new Logger();

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    req = {
      body: {},
      cookies: {},
      session: {
        appeal: {
          hearing: {
            'hearingCentre': 'taylorHouse',
            'time': '90',
            'date': '2020-08-11T10:00:01.000'
          },
          application: {},
          caseBuilding: {},
          reasonsForAppeal: {},
          directions: [
            {
              'id': 3,
              'tag': 'requestCmaRequirements',
              'dateDue': '2020-05-21',
              'dateSent': '2020-05-02'
            },
            {
              'id': 2,
              'tag': 'requestReasonsForAppeal',
              'dateDue': '2020-05-01',
              'dateSent': '2020-04-21'
            },
            {
              'id': 1,
              'tag': 'respondentEvidence',
              'dateDue': '2020-04-28',
              'dateSent': '2020-04-14'
            },
            {
              'id': 4,
              'tag': 'legalRepresentativeHearingRequirements',
              'dateDue': '2020-07-28',
              'dateSent': '2020-07-14'
            }
          ],
          history: [
            {
              'id': 'submitAppeal',
              'createdDate': '2020-02-08T16:00:00.000'
            },
            {
              'id': 'pendingPayment',
              'createdDate': '2020-02-08T16:00:00.000'
            },
            {
              'id': 'submitReasonsForAppeal',
              'createdDate': '2020-02-18T16:00:00.000'
            },
            {
              'id': 'submitCmaRequirements',
              'createdDate': '2020-02-23T16:00:00.000'
            },
            {
              'id': 'draftHearingRequirements',
              'createdDate': '2022-01-11T16:00:00.000'
            }
          ]
        }
      },
      idam: {
        userDetails: {
          uid: 'appellant',
          forename: 'forename',
          surname: 'surname'
        }
      },
      app: {
        locals: {
          logger
        }
      } as any
    } as unknown as Partial<Request>;

  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getAppealApplicationNextStep', () => {
    it('should return default when application status is unknown', async () => {
      req.session.appeal.appealStatus = 'unknown';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql(
        {
          deadline: 'TBC',
          descriptionParagraphs: [
            'Nothing to do next'
          ]
        }
      );
    });

    it('should return \'Do This next section\' when application status is appealStarted', async () => {
      req.session.appeal.appealStatus = 'appealStarted';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.deep.equal({
        cta: {
          url: '/about-appeal'
        },
        deadline: null,
        descriptionParagraphs: [
          'You need to answer a few questions about yourself and your appeal to get started.',
          'You will need to have your Home Office decision letter with you to answer some questions.'
        ],
        info: null,
        allowedAskForMoreTime: false
      });
    });

    it('should return \'Do This next section\' when application status is appealStartedPartial', async () => {
      req.session.appeal.appealStatus = 'appealStarted';
      req.session.appeal.application.homeOfficeRefNumber = '12345678';

      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.deep.equal({
        descriptionParagraphs: [
          i18n.pages.overviewPage.doThisNext.appealStarted.finishQuestions,
          i18n.pages.overviewPage.doThisNext.appealStarted.needHomeOfficeDecision
        ],
        info: null,
        cta: {
          url: paths.appealStarted.taskList
        },
        deadline: null,
        allowedAskForMoreTime: false
      });
    });

    it('when application status is appealSubmitted should get correct \'Do This next section\'', async () => {
      req.session.appeal.appealStatus = 'appealSubmitted';
      const dlrmFeeRemissionFlag = await LaunchDarklyService.getInstance().getVariation(req, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false);
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        cta: null,
        'deadline': dlrmFeeRemissionFlag ? '22 February 2020' : '13 February 2020',
        descriptionParagraphs: dlrmFeeRemissionFlag
          ? ['Your appeal details have been sent to the Tribunal.',
            'There is a fee for this appeal. You told the Tribunal that you believe you do not have to pay some or all of the fee.',
            'The Tribunal will check the information you sent and let you know if you need to pay a fee.',
            'This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it might take longer than that.']
          : [
            'Your appeal details have been sent to the Tribunal.',
            'A Tribunal Caseworker will contact you to tell you what happens next. This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it might take longer than that.'
          ],
        info: {
          title: 'Helpful Information',
          url: '<a class=\'govuk-link\' href=\'{{ paths.common.tribunalCaseworker }}\'>What is a Tribunal Caseworker?</a>'
        },
        allowedAskForMoreTime: false
      });
    });

    it('when application status is appealSubmitted with fee and setAside is enabled should get correct \'Do This' +
      ' next section\'', async () => {
      sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
        .withArgs(req as Request, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false).resolves(true);
      const { appeal } = req.session;
      appeal.appealStatus = 'appealSubmitted';
      appeal.application.remissionOption = 'asylumSupportFromHo';
      appeal.history = [
        {
          'id': 'requestFeeRemission',
          'createdDate': '2020-02-22T15:36:26.099'
        },
        {
          'id': 'submitAppeal',
          'createdDate': '2020-02-22T15:36:26.099'
        }
      ] as HistoryEvent[];
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        cta: null,
        deadline: '07 March 2020',
        descriptionParagraphs: [
          'Your appeal details have been sent to the Tribunal.',
          'There is a fee for this appeal. You told the Tribunal that you believe you do not have to pay some or all of the fee.',
          'The Tribunal will check the information you sent and let you know if you need to pay a fee.',
          'This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it might take longer than that.'
        ],
        allowedAskForMoreTime: false
      });
    });

    it('when application status is appealSubmitted with fee and flag is enabled should get correct \'Do This' +
      ' next section\'', async () => {
      sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
        .withArgs(req as Request, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false).resolves(true);
      const { appeal } = req.session;
      appeal.appealStatus = 'appealSubmitted';
      appeal.application.remissionOption = 'feeWaiverFromHo';
      appeal.history = [
        {
          'id': 'requestFeeRemission',
          'createdDate': '2020-02-22T15:36:26.099'
        },
        {
          'id': 'submitAppeal',
          'createdDate': '2020-02-22T15:36:26.099'
        }
      ] as HistoryEvent[];
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        cta: null,
        deadline: '07 March 2020',
        descriptionParagraphs: [
          'Your appeal details have been sent to the Tribunal.',
          'There is a fee for this appeal. You told the Tribunal that you believe you do not have to pay some or all of the fee.',
          'The Tribunal will check the information you sent and let you know if you need to pay a fee.',
          'This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it might take longer than that.'
        ],
        allowedAskForMoreTime: false
      });
    });

    it('get correct \'Do This next section\' when application status is pendingPayment', async () => {
      req.session.appeal.appealStatus = 'pendingPayment';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        descriptionParagraphs: [
          i18n.pages.overviewPage.doThisNext.pendingPayment.detailsSent,
          i18n.pages.overviewPage.doThisNext.pendingPayment.dueDate,
          i18n.pages.overviewPage.doThisNext.pendingPayment.dueDate1
        ],
        cta: {
          link: {
            text: i18n.pages.overviewPage.doThisNext.pendingPayment.payForYourAppeal,
            url: paths.common.payLater
          }
        },
        allowedAskForMoreTime: false,
        deadline: '22 February 2020'
      });
    });

    it('get correct \'Do This next section\' when application status is pendingPayment and dlrm fee support is' +
      ' on', async () => {
      sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
        .withArgs(req as Request, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false).resolves(true);
      req.session.appeal.appealStatus = 'pendingPayment';
      req.session.appeal.application.remissionOption = 'asylumSupportFromHo';
      req.session.appeal.appealOutOfCountry = 'Yes';

      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        cta: null,
        deadline: '07 March 2020',
        descriptionParagraphs: [
          'Your appeal details have been sent to the Tribunal.',
          'There is a fee for this appeal. You told the Tribunal that you believe you do not have to pay some or all of the fee.',
          'The Tribunal will check the information you sent and let you know if you need to pay a fee.',
          'This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it might take longer than that.'
        ],
        allowedAskForMoreTime: false
      });
    });

    it('when application status is listing should get correct \'Do This next section\'', async () => {
      req.session.appeal.appealStatus = 'listing';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        cta: null,
        deadline: '25 January 2022',
        descriptionParagraphs: [
          'A Tribunal Caseworker is looking at your answers and will contact you with the details of your hearing and to tell you what to do next.',
          'This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it may take longer than that.'
        ],
        info: {
          title: 'Helpful Information',
          url: '<a class=\'govuk-link\' href=\'{{ paths.common.whatToExpectAtHearing }}\'>What to expect at a hearing</a>'
        },
        allowedAskForMoreTime: false
      });
    });

    it('when application status is listing and appellant just took over the case should get correct \'Do This next section\'', async () => {
      req.session.appeal.appealStatus = 'listing';
      req.session.appeal.history = req.session.appeal.history.filter(event => event.id !== 'draftHearingRequirements');
      let event = {
        'id': 'draftHearingRequirements',
        'createdDate': '2022-01-11T16:00:00.000',
        'state': {
          'id': 'listing'
        },
        'user': {
          'id': 'legal-rep'
        }
      } as HistoryEvent;
      req.session.appeal.history.push(event);

      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        cta: null,
        deadline: '25 January 2022',
        descriptionParagraphs: [
          'Your hearing needs were sent to the Tribunal.',
          'A Tribunal Caseworker is looking at the answers and will contact you with the details of your hearing and tell you what to do next.',
          'This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it may take longer than that.'
        ],
        info: {
          title: 'Helpful Information',
          url: '<a class=\'govuk-link\' href=\'{{ paths.common.whatToExpectAtHearing }}\'>What to expect at a hearing</a>'
        },
        allowedAskForMoreTime: false
      });
    });

    it('when application status is lateAppealSubmitted should get correct \'Do This next section\'', async () => {
      req.session.appeal.appealStatus = 'lateAppealSubmitted';
      req.session.appeal.application.isAppealLate = true;
      const result = await getAppealApplicationNextStep(req as Request);
      const dlrmFeeRemissionFlag = await LaunchDarklyService.getInstance().getVariation(req, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false);

      expect(result).to.eql({
        'allowedAskForMoreTime': false,
        'cta': null,
        'deadline': dlrmFeeRemissionFlag ? '22 February 2020' : '13 February 2020',
        descriptionParagraphs: dlrmFeeRemissionFlag
          ? ['Your late appeal details have been sent to the Tribunal.',
            'There is a fee for this appeal. You told the Tribunal that you believe you do not have to pay some or all of the fee.',
            'The Tribunal will check the information you sent and let you know if you need to pay a fee.',
            'This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it might take longer than that.']
          : [
            'Your late appeal details have been sent to the Tribunal.',
            'A Tribunal Caseworker will contact you to tell you what happens next. This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it might take longer than that.'
          ],
        'info': {
          'title': 'Helpful Information',
          'url': '<a class=\'govuk-link\' href=\'{{ paths.common.tribunalCaseworker }}\'>What is a Tribunal Caseworker?</a>'
        }
      });
    });

    it('when application status is lateAppealSubmitted with fee and setAside is enabled should get correct \'Do This' +
      ' next section\'', async () => {
      sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
        .withArgs(req as Request, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false).resolves(true);

      req.session.appeal.application.isAppealLate = true;
      req.session.appeal.appealStatus = 'lateAppealSubmitted';
      req.session.appeal.application.remissionOption = 'feeWaiverFromHo';
      req.session.appeal.history = [
        {
          'id': 'requestFeeRemission',
          'createdDate': '2020-02-22T15:36:26.099'
        },
        {
          'id': 'submitAppeal',
          'createdDate': '2020-02-22T15:36:26.099'
        }
      ] as HistoryEvent[];
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        cta: null,
        deadline: '07 March 2020',
        descriptionParagraphs: [
          'Your appeal details have been sent to the Tribunal.',
          'There is a fee for this appeal. You told the Tribunal that you believe you do not have to pay some or all of the fee.',
          'The Tribunal will check the information you sent and let you know if you need to pay a fee.',
          'This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it might take longer than that.'
        ],
        allowedAskForMoreTime: false
      });
    });

    it('when application status is awaitingRespondentEvidence should get correct \'Do This next section\'', async () => {
      const dlrmFeeRemissionFlag = await LaunchDarklyService.getInstance().getVariation(req, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false);
      req.session.appeal.appealStatus = 'awaitingRespondentEvidence';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        'allowedAskForMoreTime': false,
        'cta': null,
        'deadline': dlrmFeeRemissionFlag ? '22 February 2020' : '13 February 2020',
        'descriptionParagraphs': [
          i18n.pages.overviewPage.doThisNext.awaitingRespondentEvidence.detailsSent,
          i18n.pages.overviewPage.doThisNext.awaitingRespondentEvidence.dueDate
        ],
        'info': {
          title: i18n.pages.overviewPage.doThisNext.awaitingRespondentEvidence.info.title,
          url: i18n.pages.overviewPage.doThisNext.awaitingRespondentEvidence.info.url
        }
      });
    });

    it('when application status is lateAppealRejected should get correct \'Do This next section\'', async () => {
      req.session.appeal.appealStatus = 'appealStarted';
      req.session.appeal.outOfTimeDecisionType = 'rejected';
      req.session.appeal.application.isAppealLate = true;

      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        'allowedAskForMoreTime': false,
        'cta': {
          url: null,
          respondByText: null
        },
        'deadline': 'TBC',
        'descriptionParagraphs': [
          'Your appeal cannot continue. Read the <a href=\'{{ paths.common.outOfTimeDecisionViewer }}\'>reasons for this decision</a>.',
          'If you do not contact the Tribunal within 14 days of the decision, a Tribunal Caseworker will end the appeal.'
        ]
      });
    });

    describe('awaitingReasonsForAppeal', () => {
      beforeEach(() => {
        req.session.appeal.appealStatus = 'awaitingReasonsForAppeal';
        req.session.appeal.directions = [
          {
            'id': '2',
            'tag': 'requestReasonsForAppeal',
            'parties': 'appellant',
            'dateDue': '2020-09-01',
            'dateSent': '2020-04-21',
            'explanation': 'direction explanation',
            uniqueId: 'directionId'
          },
          {
            'id': '1',
            'tag': 'respondentEvidence',
            'parties': 'respondent',
            'dateDue': '2020-04-28',
            'dateSent': '2020-04-14',
            'explanation': 'direction explanation',
            uniqueId: 'directionId'
          }
        ];
      });

      it('should return \'Do This next section\' when application status is awaitingReasonsForAppeal and no pending time extension', async () => {
        const result = await getAppealApplicationNextStep(req as Request);

        expect(result).to.eql(
          {
            allowedAskForMoreTime: true,
            cta: {
              respondBy: 'You need to respond by <span class=\'govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span>.',
              url: '/case-building/home-office-decision-wrong'
            },
            deadline: '01 September 2020',
            descriptionParagraphs: [
              'Tell us why you think the Home Office decision to refuse your claim is wrong.'
            ],
            info: {
              title: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.info.title,
              url: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.info.url
            },
            usefulDocuments: {
              title: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.usefulDocuments.title,
              url: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.usefulDocuments.url
            }
          }
        );
      });

      it('should return \'Do This next section\' when application status is awaitingReasonsForAppeal and a pending time extension', async () => {
        const timeExtensionApplication: Collection<Partial<Application<Evidence>>> = {
          value: {
            decision: 'Pending',
            applicant: 'Appellant',
            type: 'Time extension'
          }
        };
        req.session.appeal.makeAnApplications = [timeExtensionApplication as Collection<Application<Evidence>>];
        const result = await getAppealApplicationNextStep(req as Request);

        expect(result).to.eql(
          {
            allowedAskForMoreTime: true,
            cta: {
              respondBy: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.respondByTextAskForMoreTime,
              url: '/case-building/home-office-decision-wrong'
            },
            deadline: '01 September 2020',
            descriptionParagraphs: [
              i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.descriptionAskForMoreTime
            ],
            info: {
              title: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.info.title,
              url: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.info.url
            },
            usefulDocuments: {
              title: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.usefulDocuments.title,
              url: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.usefulDocuments.url
            }
          }
        );
      });

      it('should return \'Do This next section\' when application status is awaitingReasonsForAppeal and a granted time extension', async () => {
        const timeExtensionApplication: Collection<Partial<Application<Evidence>>> = {
          value: {
            decision: 'Granted',
            applicant: 'Appellant'
          }
        };
        req.session.appeal.makeAnApplications = [timeExtensionApplication as Collection<Application<Evidence>>];
        const result = await getAppealApplicationNextStep(req as Request);

        expect(result).to.eql(
          {
            allowedAskForMoreTime: true,
            cta: {
              respondBy: i18n.pages.overviewPage.doThisNext.nowRespondBy,
              url: '/case-building/home-office-decision-wrong'
            },
            deadline: '01 September 2020',
            descriptionParagraphs: [
              i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.description
            ],
            info: {
              title: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.info.title,
              url: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.info.url
            },
            usefulDocuments: {
              title: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.usefulDocuments.title,
              url: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.usefulDocuments.url
            }
          }
        );
      });

      it('should return \'Do This next section\' when application status is awaitingReasonsForAppeal and a refused time extension', async () => {
        const timeExtensionApplication: Collection<Partial<Application<Evidence>>> = {
          value: {
            decision: 'Refused',
            applicant: 'Appellant'
          }
        };
        req.session.appeal.makeAnApplications = [timeExtensionApplication as Collection<Application<Evidence>>];
        const result = await getAppealApplicationNextStep(req as Request);

        expect(result).to.eql(
          {
            allowedAskForMoreTime: true,
            cta: {
              respondBy: i18n.pages.overviewPage.doThisNext.stillRespondBy,
              url: '/case-building/home-office-decision-wrong'
            },
            deadline: '01 September 2020',
            descriptionParagraphs: [
              i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.description
            ],
            info: {
              title: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.info.title,
              url: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.info.url
            },
            usefulDocuments: {
              title: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.usefulDocuments.title,
              url: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.new.usefulDocuments.url
            }
          }
        );
      });

    });

    describe('awaitingReasonsForAppeal', () => {
      beforeEach(() => {
        req.session.appeal.directions = [
          {
            id: '2',
            tag: 'requestReasonsForAppeal',
            parties: 'appellant',
            dateDue: '2020-04-21',
            dateSent: '2020-03-24',
            explanation: 'direction explanation',
            uniqueId: 'directionId'
          },
          {
            id: '1',
            tag: 'respondentEvidence',
            parties: 'respondent',
            dateDue: '2020-04-07',
            dateSent: '2020-03-24',
            explanation: 'direction explanation',
            uniqueId: 'directionId'
          }
        ];
        req.session.appeal.makeAnApplications = null;
      });

      it('should return \'Do This next section\' when application status is awaitingReasonsForAppealPartial', async () => {
        req.session.appeal.appealStatus = 'awaitingReasonsForAppeal';
        req.session.appeal.reasonsForAppeal.applicationReason = 'A text description of why I decided to appeal';
        const result = await getAppealApplicationNextStep(req as Request);

        expect(result).to.eql(
          {
            cta: {
              respondBy: 'You need to respond by <span class=\'govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span>.',
              url: '/case-building/home-office-decision-wrong'
            },
            deadline: '21 April 2020',
            descriptionParagraphs: [
              'You need to finish telling us why you think the Home Office decision to refuse your claim is wrong.'
            ],
            info: {
              title: 'Helpful Information',
              url: '<a href=\'{{ paths.common.homeOfficeDocuments }}\'>Understanding your Home Office documents</a>'
            },
            usefulDocuments: {
              title: 'Useful documents',
              url: '<a href=\'{{ paths.common.homeOfficeDocumentsViewer }}\'>Home Office documents about your case</a>'
            },
            allowedAskForMoreTime: true
          }
        );
      });

      it('should return \'Do This next section\' when application status is awaitingReasonsForAppealPartial and pending time extension', async () => {
        const timeExtensionApplication: Collection<Partial<Application<Evidence>>> = {
          value: {
            decision: 'Pending',
            applicant: 'Appellant',
            type: 'Time extension'
          }
        };
        req.session.appeal.makeAnApplications = [timeExtensionApplication as Collection<Application<Evidence>>];
        req.session.appeal.appealStatus = 'awaitingReasonsForAppeal';
        req.session.appeal.reasonsForAppeal.applicationReason = 'A text description of why I decided to appeal';
        const result = await getAppealApplicationNextStep(req as Request);

        expect(result).to.eql(
          {
            cta: {
              respondBy: i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.partial.respondByTextAskForMoreTime,
              url: '/case-building/home-office-decision-wrong'
            },
            deadline: '21 April 2020',
            descriptionParagraphs: [
              i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.partial.descriptionAskForMoreTime
            ],
            info: {
              title: 'Helpful Information',
              url: '<a href=\'{{ paths.common.homeOfficeDocuments }}\'>Understanding your Home Office documents</a>'
            },
            usefulDocuments: {
              title: 'Useful documents',
              url: '<a href=\'{{ paths.common.homeOfficeDocumentsViewer }}\'>Home Office documents about your case</a>'
            },
            allowedAskForMoreTime: true
          }
        );
      });

      it('should return \'Do This next section\' when application status is awaitingReasonsForAppealPartial and granted time extension', async () => {
        const timeExtensionApplication: Collection<Partial<Application<Evidence>>> = {
          value: {
            decision: 'Granted',
            applicant: 'Appellant'
          }
        };
        req.session.appeal.makeAnApplications = [timeExtensionApplication as Collection<Application<Evidence>>];
        req.session.appeal.appealStatus = 'awaitingReasonsForAppeal';
        req.session.appeal.reasonsForAppeal.applicationReason = 'A text description of why I decided to appeal';
        const result = await getAppealApplicationNextStep(req as Request);

        expect(result).to.eql(
          {
            cta: {
              respondBy: i18n.pages.overviewPage.doThisNext.nowRespondBy,
              url: '/case-building/home-office-decision-wrong'
            },
            deadline: '21 April 2020',
            descriptionParagraphs: [
              i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.partial.description
            ],
            info: {
              title: 'Helpful Information',
              url: '<a href=\'{{ paths.common.homeOfficeDocuments }}\'>Understanding your Home Office documents</a>'
            },
            usefulDocuments: {
              title: 'Useful documents',
              url: '<a href=\'{{ paths.common.homeOfficeDocumentsViewer }}\'>Home Office documents about your case</a>'
            },
            allowedAskForMoreTime: true
          }
        );
      });

      it('should return \'Do This next section\' when application status is awaitingReasonsForAppealPartial and refused time extension', async () => {
        const timeExtensionApplication: Collection<Partial<Application<Evidence>>> = {
          value: {
            decision: 'Refused',
            applicant: 'Appellant'
          }
        };
        req.session.appeal.makeAnApplications = [timeExtensionApplication as Collection<Application<Evidence>>];
        req.session.appeal.appealStatus = 'awaitingReasonsForAppeal';
        req.session.appeal.reasonsForAppeal.applicationReason = 'A text description of why I decided to appeal';
        const result = await getAppealApplicationNextStep(req as Request);

        expect(result).to.eql(
          {
            cta: {
              respondBy: i18n.pages.overviewPage.doThisNext.stillRespondBy,
              url: '/case-building/home-office-decision-wrong'
            },
            deadline: '21 April 2020',
            descriptionParagraphs: [
              i18n.pages.overviewPage.doThisNext.awaitingReasonsForAppeal.partial.description
            ],
            info: {
              title: 'Helpful Information',
              url: '<a href=\'{{ paths.common.homeOfficeDocuments }}\'>Understanding your Home Office documents</a>'
            },
            usefulDocuments: {
              title: 'Useful documents',
              url: '<a href=\'{{ paths.common.homeOfficeDocumentsViewer }}\'>Home Office documents about your case</a>'
            },
            allowedAskForMoreTime: true
          }
        );
      });
    });

    it('when application status is reasonsForAppealSubmitted should get correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'reasonsForAppealSubmitted';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        cta: null,
        deadline: '03 March 2020',
        descriptionParagraphs: [
          'You have told us why you think the Home Office decision is wrong.',
          'A Tribunal Caseworker will contact you to tell you what happens next. This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it may take longer than that.'
        ],
        allowedAskForMoreTime: false
      });
    });

    it('should return \'Do This next section\' when application status is respondentReview', async () => {
      req.session.appeal.appealStatus = 'respondentReview';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        descriptionParagraphs: [
          i18n.pages.overviewPage.doThisNext.respondentReview.detailsSent,
          i18n.pages.overviewPage.doThisNext.respondentReview.dueDate
        ],
        info: i18n.pages.overviewPage.doThisNext.respondentReview.info,
        deadline: null
      });
    });

    it('should return \'Do This next section\' when application status is decisionWithdrawn', async () => {
      req.session.appeal.appealStatus = 'decisionWithdrawn';
      const result = await getAppealApplicationNextStep(req as Request);

      const expected = {
        descriptionParagraphs: [
          i18n.pages.overviewPage.doThisNext.decisionWithdrawn.detailsSent,
          i18n.pages.overviewPage.doThisNext.decisionWithdrawn.dueDate
        ],
        info: i18n.pages.overviewPage.doThisNext.decisionWithdrawn.info,
        deadline: null,
        cta: {},
        hearingCentreEmail: 'IA_HEARING_CENTRE_TAYLOR_HOUSE_EMAIL'
      };

      expect(result).to.eql(expected);
    });

    it('should return \'Do This next section\' when application status is decisionMaintained', async () => {
      req.session.appeal.appealStatus = 'decisionMaintained';
      const result = await getAppealApplicationNextStep(req as Request);

      const expected = {
        descriptionParagraphs: [
          i18n.pages.overviewPage.doThisNext.decisionMaintained.description,
          i18n.pages.overviewPage.doThisNext.decisionMaintained.description2,
          i18n.pages.overviewPage.doThisNext.decisionMaintained.dueDate
        ],
        info: i18n.pages.overviewPage.doThisNext.decisionMaintained.info,
        deadline: null,
        cta: {},
        hearingCentreEmail: 'IA_HEARING_CENTRE_TAYLOR_HOUSE_EMAIL'
      };

      expect(result).to.eql(expected);
    });

    it('when application status is awaitingClarifyingQuestionsAnswers should get correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'awaitingClarifyingQuestionsAnswers';
      const result = await getAppealApplicationNextStep(req as Request);

      const expected = {
        'allowedAskForMoreTime': true,
        'cta': {
          'respondBy': 'You need to respond by <span class=\'govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span>.',
          'url': '/questions-about-appeal'
        },
        'deadline': null,
        'descriptionParagraphs': [
          'You need to answer some questions about your appeal.'
        ],
        'info': null
      };

      expect(result).to.eql(expected);
    });

    it('when application status is clarifyingQuestionsAnswersSubmitted should get correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'clarifyingQuestionsAnswersSubmitted';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql({
        'allowedAskForMoreTime': false,
        'cta': null,
        'deadline': null,
        'descriptionParagraphs': [
          'A Tribunal Caseworker is looking at your answers and will contact you to tell you what to do next.',
          'This should be by <b>{{ applicationNextStep.deadline }}</b> but it might take longer than that.'
        ]
      });
    });

    it('when application status is awaitingCmaRequirements should get correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'awaitingCmaRequirements';
      const result = await getAppealApplicationNextStep(req as Request);

      const expected = {
        allowedAskForMoreTime: true,
        cta: {
          respondBy: 'You need to respond by <span class=\'govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span>.',
          url: '/appointment-needs'
        },
        deadline: '21 May 2020',
        descriptionParagraphs: [
          'You need to attend a case management appointment.',
          'First, tell us if you will need anything at the appointment, like an interpreter or step-free access.'
        ],
        info: {
          title: 'Helpful Information',
          url: '<a href=\'{{ paths.common.whatToExpectAtCMA }}\'>What to expect at a case management appointment</a>'
        }
      };

      expect(result).to.eql(expected);
    });

    it('when application status is cmaRequirementsSubmitted should get correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'cmaRequirementsSubmitted';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql(
        {
          'allowedAskForMoreTime': false,
          'cta': null,
          'deadline': '08 March 2020',
          'descriptionParagraphs': [
            'A Tribunal Caseworker is looking at your answers and will contact you with details of your case management appointment and tell you what to do next.',
            'This should be by <span class="govuk-!-font-weight-bold">{{ applicationNextStep.deadline }}</span> but may be longer than that.'
          ],
          'info': {
            'title': 'Helpful Information',
            'url': '<a href=\'{{ paths.common.whatToExpectAtCMA }}\'>What to expect at a case management appointment</a>'
          }
        }
      );
    });

    it('when application status is cmaAdjustmentsAgreed should get correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'cmaAdjustmentsAgreed';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql(
        {
          'allowedAskForMoreTime': false,
          'cta': null,
          'deadline': '08 March 2020',
          'descriptionParagraphs': [
            'A Tribunal Caseworker is looking at your answers and will contact you with details of your case management appointment and tell you what to do next.',
            'This should be by <span class="govuk-!-font-weight-bold">{{ applicationNextStep.deadline }}</span> but may be longer than that.'
          ],
          'info': {
            'title': 'Helpful Information',
            'url': '<a href=\'{{ paths.common.whatToExpectAtCMA }}\'>What to expect at a case management appointment</a>'
          }
        }
      );
    });

    it('when application status is awaitingCmaRequirements should get correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'cmaListed';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.deep.include(
        {
          'allowedAskForMoreTime': false,
          'date': '11 August 2020',
          'deadline': 'TBC',
          descriptionParagraphs: [
            'The Tribunal has set a date for your case management appointment. Here are the details:',
            '<span class="govuk-!-font-weight-bold">Date:</span> {{ applicationNextStep.date }}',
            '<span class="govuk-!-font-weight-bold">Time:</span> {{ applicationNextStep.time }}',
            '<span class="govuk-!-font-weight-bold">Hearing Centre:</span> {{ applicationNextStep.hearingCentre }}',
            'You should read your Notice of Case Management Appointment carefully. It has important information about your appointment.'
          ],
          'hearingCentre': 'Taylor House',
          'info': {
            'title': 'Helpful Information',
            'url': '<a href=\'{{ paths.common.whatToExpectAtCMA }}\'>What to expect at a case management appointment</a>'
          },
          'time': '10:00 am',
          'usefulDocuments': {
            'title': 'Useful documents',
            'url': '<a href=\'{{ paths.common.whatToExpectAtCMA }}\'>Notice of Case Management Appointment.pdf</a>'
          }
        }
      );
    });
    it('when application status is submitHearingRequirements should get correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'submitHearingRequirements';
      const result = await getAppealApplicationNextStep(req as Request);

      const expected = {
        allowedAskForMoreTime: true,
        cta: {
          respondBy: 'You need to respond by <span class=\'govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span>.',
          url: '/hearing-needs'
        },
        deadline: '28 July 2020',
        descriptionParagraphs: [
          'Your appeal is going to hearing.',
          'Tell us if there is anything you will need at the hearing, like an <p>interpreter or step-free access.'
        ],
        info: {
          title: 'Helpful Information',
          url: '<a href=\'{{ paths.common.whatToExpectAtHearing }}\'>What to expect at a hearing</a>'
        }
      };

      expect(result).to.eql(expected);
    });

    it('should return \'Do This next section\' when application status is submitHearingRequirements and a pending time extension', async () => {
      const timeExtensionApplication: Collection<Partial<Application<Evidence>>> = {
        value: {
          decision: 'Pending',
          applicant: 'Appellant',
          type: 'Time extension'
        }
      };
      req.session.appeal.appealStatus = 'submitHearingRequirements';
      req.session.appeal.makeAnApplications = [timeExtensionApplication as Collection<Application<Evidence>>];
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.eql(
        {
          allowedAskForMoreTime: true,
          cta: {
            respondBy: 'It’s important to respond by the deadline but, if you can’t answer fully, you will be able to provide more information about your appeal later.',
            url: '/hearing-needs'
          },
          deadline: '28 July 2020',
          descriptionParagraphs: [
            'You need to respond by by <span class=\"govuk-!-font-weight-bold\">{{ applicationNextStep.deadline }}</span>.'
          ],
          info: {
            title: 'Helpful Information',
            url: '<a href=\'{{ paths.common.whatToExpectAtHearing }}\'>What to expect at a hearing</a>'
          }
        }
      );
    });

    it('when application status is cmaListed should get correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'cmaListed';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.deep.include(
        {
          'allowedAskForMoreTime': false,
          'date': '11 August 2020',
          'deadline': 'TBC',
          descriptionParagraphs: [
            'The Tribunal has set a date for your case management appointment. Here are the details:',
            '<span class="govuk-!-font-weight-bold">Date:</span> {{ applicationNextStep.date }}',
            '<span class="govuk-!-font-weight-bold">Time:</span> {{ applicationNextStep.time }}',
            '<span class="govuk-!-font-weight-bold">Hearing Centre:</span> {{ applicationNextStep.hearingCentre }}',
            'You should read your Notice of Case Management Appointment carefully. It has important information about your appointment.'
          ],
          'hearingCentre': 'Taylor House',
          'info': {
            'title': 'Helpful Information',
            'url': '<a href=\'{{ paths.common.whatToExpectAtCMA }}\'>What to expect at a case management appointment</a>'
          },
          'time': '10:00 am',
          'usefulDocuments': {
            'title': 'Useful documents',
            'url': '<a href=\'{{ paths.common.whatToExpectAtCMA }}\'>Notice of Case Management Appointment.pdf</a>'
          }
        }
      );
    });

    it('when application status is appealTakenOffline should get correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'appealTakenOffline';
      req.session.appeal.removeAppealFromOnlineReason = 'Reason to move an appeal offline';
      req.session.appeal.removeAppealFromOnlineDate = '2021-06-30';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.deep.include(
        {
          descriptionParagraphs: [],
          'info': {
            'title': 'What happens next',
            'url': 'Your appeal will continue offline. The Tribunal will contact you soon to tell you what will happen next.'
          }
        }
      );
    });

    it('when application status is preHearing should get the correct Do this next section.', async () => {
      req.session.appeal.appealStatus = 'preHearing';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.deep.include(
        {
          descriptionParagraphs: [
            'The hearing bundle is ready to view. This is a record of  all the information and evidence about this appeal. You should read it carefully.',
            '<a class=\"govuk-link\" href=\"{{ paths.common.hearingBundleViewer }}\">View the hearing bundle</a>',
            '<h3 class=\"govuk-heading-s govuk-!-margin-bottom-0\">Your hearing details</h3>',
            '<span class=\'govuk-body govuk-!-font-weight-bold\'>Date:</span> {{ hearingDetails.date }}<br /><span class=\'govuk-body govuk-!-font-weight-bold\'>Time:</span> {{ hearingDetails.time }}<br /><span class=\'govuk-body govuk-!-font-weight-bold\'>Location:</span> {{ hearingDetails.hearingCentre }}'
          ],
          'info': {
            'title': 'Helpful Information',
            'url': '<a class=\'govuk-link\' href=\'{{ paths.common.understandingHearingBundle }}\'>Understanding the hearing bundle</a><br /><a class=\'govuk-link\' href=\'{{ paths.common.whatToExpectAtHearing }}\'>What to expect at a hearing</a>'
          }
        }
      );
    });

    it('when application status is ended should get the correct Do this next section. @ended', async () => {
      req.session.appeal.appealStatus = 'ended';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.deep.include(
        {
          'allowedAskForMoreTime': false,
          'deadline': 'TBC',
          descriptionParagraphs: [
            'Review your <a href=\"{{ paths.common.noticeEndedAppealViewer }}\">Notice of Ended Appeal</a>. This includes details of who ended the appeal and why.',
            'If a Tribunal Caseworker ended the appeal and you disagree with this decision, you have 14 days to <a href="{{ paths.makeApplication.judgesReview }}">ask for a judge to review the decision</a>.'
          ],
          cta: {
            url: null,
            ctaTitle: 'Your appeal has now ended'
          },
          hearingCentreEmail: 'IA_HEARING_CENTRE_TAYLOR_HOUSE_EMAIL'
        }
      );
    });

    it('when EJP application status is ended should get the correct Do this next section. @ended', async () => {
      req.session.appeal.appealStatus = 'ended';
      req.session.appeal.utAppealReferenceNumber = 'refNumber';
      const result = await getAppealApplicationNextStep(req as Request);

      expect(result).to.deep.include(
        {
          descriptionParagraphs: [
            'Your appeal has been moved to the Upper Tribunal, which is a higher tribunal than the First-tier tribunal.',
            'This is because you also have an expedited section 82A appeal in the Upper Tribunal, with the following appeal reference:',
            '{{ applicationNextStep.utAppealReferenceNumber }}',
            'An Upper Tribunal judge will decide both appeals at the same time.'
          ],
          info: {
            title: 'Helpful Information',
            url: '<a class=\"govuk-link\" href=\"https://www.gov.uk/courts-tribunals/upper-tribunal-immigration-and-asylum-chamber\" target=\"_blank\">Find out more about the Upper Tribunal, including contact details</a>. (Opens in a new window)'
          },
          usefulDocuments: {
            title: 'What happens next',
            url: '\nThe upper tribunal may contact you about this appeal.<br /><br />If you still have to respond to a question about your appeal from the First-tier Tribunal, you should tell the Upper Tribunal. The Upper Tribunal will decide what will happen next.'
          },
          utAppealReferenceNumber: 'refNumber'
        }
      );
    });
  });

  it('when application status is prepareForHearing should get correct Do this next section.', async () => {
    req.session.appeal.appealStatus = 'prepareForHearing';
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation').withArgs(req as Request, 'aip-hearing-bundle-feature', false).resolves(true);
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = getPreHearingAndFinalBundling();

    expect(result).to.eql(expected);
  });

  it('when application status is finalBundling should get correct Do this next section.', async () => {
    req.session.appeal.appealStatus = 'finalBundling';
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation').withArgs(req as Request, 'aip-hearing-bundle-feature', false).resolves(true);
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = getPreHearingAndFinalBundling();

    expect(result).to.eql(expected);
  });

  it('when application status is finalBundling and appellant just took over case should get correct Do this next section.', async () => {
    req.session.appeal.appealStatus = 'finalBundling';
    req.session.appeal.history = req.session.appeal.history.filter(event => event.id !== 'createCaseSummary');
    let event = {
      'id': 'createCaseSummary',
      'createdDate': '2022-01-11T16:00:00.000',
      'state': {
        'id': 'finalBundling'
      },
      'user': {
        'id': 'legal-rep'
      }
    } as HistoryEvent;
    req.session.appeal.history.push(event);
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation').withArgs(req as Request, 'aip-hearing-bundle-feature', false).resolves(true);
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = getPreHearingAndFinalBundling();
    expected['descriptionParagraphs'][0] = 'The hearing bundle is ready to view. This is a record of all the information and evidence about this appeal. You should read it carefully.';

    expect(result).to.eql(expected);
  });

  function getPreHearingAndFinalBundling() {
    return {
      'allowedAskForMoreTime': false,
      'cta': {},
      'date': '11 August 2020',
      'deadline': 'TBC',
      'descriptionParagraphs': [
        'The Tribunal has set a date for your hearing. Here are the details:',
        '<span class=\"govuk-!-font-weight-bold\">Date:</span> {{ applicationNextStep.date }}',
        '<span class=\"govuk-!-font-weight-bold\">Time:</span> {{ applicationNextStep.time }}',
        '<span class=\"govuk-!-font-weight-bold\">Location:</span> {{ applicationNextStep.hearingCentre }} ',
        'You can now access your <a href=\'{{ paths.common.hearingNoticeViewer }}\'>Notice of Hearing</a>.  It includes important<br>details about the hearing and you should read it carefully.'
      ],
      'info': {
        'title': 'Helpful Information',
        'url': '<a href=\'{{ paths.common.whatToExpectAtHearing }}\'>What to expect at a hearing</a>'
      },
      'hearingCentre': 'Taylor House',
      'time': '10:00 am'
    };
  }

  it('when application status is decided should get correct Do this next section - FTPA disabled', async () => {
    req.session.appeal.appealStatus = 'decided';
    req.session.appeal.isDecisionAllowed = 'allowed';
    req.session.appeal.finalDecisionAndReasonsDocuments = [
      {
        fileId: '976fa409-4aab-40a4-a3f9-0c918f7293c8',
        name: 'PA 50012 2022-bond20-Decision-and-reasons-FINAL.pdf',
        id: '2',
        tag: 'finalDecisionAndReasonsPdf',
        dateUploaded: '2022-01-26'
      }
    ];
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-hearing-bundle-feature', false).resolves(true)
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(false);

    const result = await getAppealApplicationNextStep(req as Request);
    const expected = {
      'allowedAskForMoreTime': false,
      'cta': {},
      'deadline': '09 February 2022',
      'decision': 'allowed',
      'descriptionParagraphs': [
        'A judge has <b> {{ applicationNextStep.decision }} </b> your appeal. <br>',
        '<p>The Decision and Reasons document includes the reasons the judge made this decision. You should read it carefully.</p><br> <a href={{ paths.common.decisionAndReasonsViewer }}>Read the Decision and Reasons document</a> <br> <p> If you disagree with this decision, you have until <span class=\"govuk-!-font-weight-bold\">{{ applicationNextStep.deadline }}</span> to appeal to the Upper Tribunal. </p>'
      ],
      'info': {
        'title': 'Helpful Information',
        'url': '<a class=\"govuk-link\" href=\"https://www.gov.uk/upper-tribunal-immigration-asylum\">How to appeal to the Upper Tribunal (Opens in a new window)</a>'
      }
    };

    expect(result).to.eql(expected);
  });

  it('when application status is decided should get correct Do this next section - FTPA enabled.', async () => {
    req.session.appeal.appealStatus = 'decided';
    req.session.appeal.isDecisionAllowed = 'allowed';
    req.session.appeal.finalDecisionAndReasonsDocuments = [
      {
        fileId: '976fa409-4aab-40a4-a3f9-0c918f7293c8',
        name: 'PA 50012 2022-bond20-Decision-and-reasons-FINAL.pdf',
        id: '2',
        tag: 'finalDecisionAndReasonsPdf',
        dateUploaded: '2022-01-26'
      }
    ];
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-hearing-bundle-feature', false).resolves(true)
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'allowedAskForMoreTime': false,
      'cta': {},
      'deadline': '09 February 2022',
      'decision': 'allowed',
      'descriptionParagraphs': [
        'A judge has <b> {{ applicationNextStep.decision }} </b> your appeal. <br>',
        '<p>The Decision and Reasons document includes the reasons the judge made this decision. You should read it carefully.</p><br> <a href={{ paths.common.decisionAndReasonsViewer }}>Read the Decision and Reasons document</a>'
      ],
      'info': {
        'title': 'Appeal Information',
        'text': 'If you disagree with this decision, you have until <span class=\"govuk-!-font-weight-bold\">{{ applicationNextStep.deadline }}</span> to apply for permission to appeal to the Upper Tribunal.',
        'url': '<a href="{{ paths.ftpa.ftpaApplication }}">Apply for permission to appeal to the Upper Tribunal</a>'
      }
    };

    expect(result).to.eql(expected);
  });

  it('when application status is decided  with rule 31 after triggering updateTribunalDecision event - DLRM set aside enabled.', async () => {
    req.session.appeal.appealStatus = 'decided';
    req.session.appeal.isDecisionAllowed = 'allowed';
    req.session.appeal.updatedAppealDecision = 'dismissed';
    req.session.appeal.updateTribunalDecisionList = 'underRule31';
    req.session.appeal.history = [
      {
        'id': 'updateTribunalDecision',
        'createdDate': '2024-03-04T15:36:26.099'
      }
    ] as HistoryEvent[];
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'dlrm-setaside-feature-flag', false).resolves(true);
    const expected = {
      'descriptionParagraphs': [
        'A judge has <b> {{ applicationNextStep.decision }} </b> your appeal. <br>',
        `<p>The Decision and Reasons document includes the reasons the judge made this decision. You should read it carefully.</p><br> <a href={{ paths.common.updatedDecisionAndReasonsViewer }}>Read the Decision and Reasons document</a>`
      ]
    };
    const result = await getAppealApplicationNextStep(req as Request);

    expect(result.decision).to.eql(req.session.appeal.updatedAppealDecision);
    expect(result.descriptionParagraphs).to.eql(expected.descriptionParagraphs);
    expect(result.deadline).to.eql('18 March 2024');
  });

  it('when application status is decided with rule 32 after triggering updateTribunalDecision event - DLRM set aside enabled.', async () => {
    req.session.appeal.appealStatus = 'decided';
    req.session.appeal.updateTribunalDecisionList = 'underRule32';
    req.session.appeal.history = [
      {
        'id': 'updateTribunalDecision',
        'createdDate': '2024-03-07T15:36:26.099'
      }
    ] as HistoryEvent[];
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'dlrm-setaside-feature-flag', false).resolves(true);
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'allowedAskForMoreTime': false,
      'cta': {},
      'deadline': null,
      'decision': undefined,
      'descriptionParagraphs': [
        'A judge has reviewed your appeal decision and decided that your appeal should be heard again. <br>',
        '<a href={{ paths.common.decisionAndReasonsViewerWithRule32 }}>Read the reasons for this decision</a> <br>'
      ],
      'info': {
        'title': 'What happens next',
        'text': 'There will be a new hearing for this appeal. The Tribunal will contact you soon to ask if there is anything you will need at the hearing.'
      }
    };

    expect(result).to.eql(expected);
  });

  it('when application status is appealSubmitted and appeal is late, status should be lateAppealSubmitted.', () => {
    req.session.appeal.appealStatus = 'appealSubmitted';
    req.session.appeal.application.isAppealLate = true;

    const result = getAppealStatus(req as Request);

    expect(result).to.eql('lateAppealSubmitted');
  });

  it('when application status is appealSubmitted and appeal is not late, status should be appealSubmitted.', () => {
    req.session.appeal.appealStatus = 'appealSubmitted';
    req.session.appeal.application.isAppealLate = false;

    const result = getAppealStatus(req as Request);

    expect(result).to.eql('appealSubmitted');
  });

  it('when application status is ftpaSubmitted after respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaSubmitted';
    req.session.appeal.ftpaRespondentApplicationDate = '2022-01-01';
    req.session.appeal.history = [
      {
        id: 'applyForFTPARespondent',
        event: {
          eventName: 'applyForFTPARespondent',
          description: 'description'
        },
        user: {
          id: 'userId',
          lastName: 'test',
          firstName: 'test'
        },
        createdDate: 'createDate',
        caseTypeVersion: 5,
        state: {
          id: 'ftpaSubmitted',
          name: 'ftpaSubmitted'
        },
        data: {}
      }
    ];
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'descriptionParagraphs': [`The Home Office has applied for permission to appeal to the Upper Tribunal. The Tribunal will contact you when the judge has decided the application.`]
    };

    expect(result).to.eql(expected);
  });

  it('when application status is ftpaSubmitted after appellant ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaSubmitted';
    req.session.appeal.ftpaAppellantApplicationDate = '2022-01-01';
    req.session.appeal.history = [
      {
        id: 'applyForFTPAAppellant',
        event: {
          eventName: 'applyForFTPAAppellant',
          description: 'description'
        },
        user: {
          id: 'userId',
          lastName: 'test',
          firstName: 'test'
        },
        createdDate: 'createDate',
        caseTypeVersion: 5,
        state: {
          id: 'ftpaSubmitted',
          name: 'ftpaSubmitted'
        },
        data: {}
      }
    ];
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'descriptionParagraphs': [
        'A judge will decide your application for permission to appeal to the Upper Tribunal.',
        'The Tribunal will contact you when the judge has made a decision.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is granted for respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentDecisionOutcomeType = 'granted';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'descriptionParagraphs': [
        'The Home Office application for permission to appeal to the Upper Tribunal has been granted.',
        'The Upper Tribunal will decide if the Tribunal\'s decision was wrong. The Upper Tribunal will contact you to tell you what will happen next.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is refused for respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentDecisionOutcomeType = 'refused';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'descriptionParagraphs': [
        'The HOme Office application for permission to appeal to the Upper Tribunal has been refused.',
        'If the Home Office still think the Tribunal\'s decision was wrong, they can send an application for permission to appeal directly to the Upper Tribunal. You will be notified if this happens.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is partially granted for respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentDecisionOutcomeType = 'partiallyGranted';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'descriptionParagraphs': [
        'The Home Office application for permission to appeal to the Upper Tribunal has been partially granted.',
        'The Upper Tribunal will decide if the Tribunal\'s decision was wrong. The Upper Tribunal will contact you to tell you what will happen next.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when respondent ftpa application is partially granted by resident judge, should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentRjDecisionOutcomeType = 'partiallyGranted';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'descriptionParagraphs': [
        'The Home Office application for permission to appeal to the Upper Tribunal has been partially granted.',
        'The Upper Tribunal will decide if the Tribunal\'s decision was wrong. The Upper Tribunal will contact you to tell you what will happen next.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is not admitted for respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentDecisionOutcomeType = 'notAdmitted';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'descriptionParagraphs': [
        'The Home Office application for permission to appeal to the Upper Tribunal has been not admitted. This means the Tribunal did not consider the request because it was late or the Home Office did not have the right to appeal.',
        'If the Home Office still think the Tribunal\'s decision was wrong, they can send an application for permission to appeal directly to the Upper Tribunal. You will be notified if this happens.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is decided as reheardRule35 for respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true)
      .withArgs(req as Request, FEATURE_FLAGS.DLRM_SETASIDE_FEATURE_FLAG, false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentDecisionOutcomeType = 'reheardRule35';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has reviewed the Home Office application for permission to appeal to the Upper Tribunal and decided that this appeal should be heard again by the First-tier Tribunal.',
        'The Decision and Reasons document includes the reasons the judge made this decision. You should read it carefully.',
        '<a href={{ paths.common.ftpaDecisionViewer }}>Read the decision and reasons document</a>',
        '<b>What happens next</b>',
        'There will be a new hearing for this appeal. The Tribunal will contact you soon to ask if there is anything you will need at the hearing.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is decided as remadeRule31 for respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true)
      .withArgs(req as Request, FEATURE_FLAGS.DLRM_SETASIDE_FEATURE_FLAG, false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentDecisionOutcomeType = 'remadeRule31';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has reviewed the Home Office application for permission to appeal to the Upper Tribunal and decided to review your appeal decision.<br>',
        '<a href={{ paths.common.ftpaDecisionViewer }}>See the reasons for this decision</a>',
        '<b>What happens next</b>',
        'The Tribunal will contact you when the review of your appeal decision is complete.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is decided as remadeRule32 for respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true)
      .withArgs(req as Request, FEATURE_FLAGS.DLRM_SETASIDE_FEATURE_FLAG, false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentDecisionOutcomeType = 'remadeRule32';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has reviewed the Home Office application for permission to appeal to the Upper Tribunal and decided to review your appeal decision.<br>',
        '<a href={{ paths.common.ftpaDecisionViewer }}>See the reasons for this decision</a>',
        '<b>What happens next</b>',
        'The Tribunal will contact you when the review of your appeal decision is complete.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is decided as reheardRule35 for respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true)
      .withArgs(req as Request, FEATURE_FLAGS.DLRM_SETASIDE_FEATURE_FLAG, false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentDecisionOutcomeType = 'reheardRule35';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has reviewed the Home Office application for permission to appeal to the Upper Tribunal and decided that this appeal should be heard again by the First-tier Tribunal.',
        'The Decision and Reasons document includes the reasons the judge made this decision. You should read it carefully.',
        '<a href={{ paths.common.ftpaDecisionViewer }}>Read the decision and reasons document</a>',
        '<b>What happens next</b>',
        'There will be a new hearing for this appeal. The Tribunal will contact you soon to ask if there is anything you will need at the hearing.'
      ]
    };
    expect(result).to.eql(expected);
  });

  it('when application is decided as remadeRule31 for respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true)
      .withArgs(req as Request, FEATURE_FLAGS.DLRM_SETASIDE_FEATURE_FLAG, false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentDecisionOutcomeType = 'remadeRule31';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has reviewed the Home Office application for permission to appeal to the Upper Tribunal and decided to review your appeal decision.<br>',
        '<a href={{ paths.common.ftpaDecisionViewer }}>See the reasons for this decision</a>',
        '<b>What happens next</b>',
        'The Tribunal will contact you when the review of your appeal decision is complete.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is decided as remadeRule32 for respondent ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true)
      .withArgs(req as Request, FEATURE_FLAGS.DLRM_SETASIDE_FEATURE_FLAG, false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'respondent';
    req.session.appeal.ftpaRespondentDecisionOutcomeType = 'remadeRule32';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has reviewed the Home Office application for permission to appeal to the Upper Tribunal and decided to review your appeal decision.<br>',
        '<a href={{ paths.common.ftpaDecisionViewer }}>See the reasons for this decision</a>',
        '<b>What happens next</b>',
        'The Tribunal will contact you when the review of your appeal decision is complete.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is granted for appellant ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'appellant';
    req.session.appeal.ftpaAppellantDecisionOutcomeType = 'granted';
    req.session.appeal.ftpaAppellantDecisionDate = '2023-04-24';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'ftpaDeadline': '08 May 2023',
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has <b> granted </b> your application for permission to appeal to the Upper Tribunal.',
        'The Decision and Reasons document includes the reasons the judge made this decision. You should read it carefully.',
        '<a href={{ paths.common.ftpaDecisionViewer }}>Read the Decision and Reasons document</a>',
        '<b>What happens next</b>',
        'The Upper Tribunal will decide if the Tribunal\'s decision was wrong. The Upper Tribunal will contact you soon to tell you what will happen next.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is refused for appellant ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'appellant';
    req.session.appeal.ftpaAppellantDecisionOutcomeType = 'refused';
    req.session.appeal.ftpaAppellantDecisionDate = '2023-04-24';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'ftpaDeadline': '08 May 2023',
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has <b> refused </b> your application for permission to appeal to the Upper Tribunal.<br>',
        'The Decision and Reasons document includes the reasons the judge made this decision. You should read it carefully.',
        '<a href={{ paths.common.ftpaDecisionViewer }}>Read the Decision and Reasons document</a>',
        '<b>What happens next</b>',
        'If you still think the Tribunal\'s decision was wrong, you can send an application for permission to appeal directly to the Upper Tribunal.',
        '<a class=\"govuk-link\" href=\"https://www.gov.uk/upper-tribunal-immigration-asylum\">Find out how to apply for permission to appeal to the Upper Tribunal</a>',
        'You must send your application by {{ applicationNextStep.ftpaDeadline }}'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is partially granted for appellant ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'appellant';
    req.session.appeal.ftpaAppellantDecisionOutcomeType = 'partiallyGranted';
    req.session.appeal.ftpaAppellantDecisionDate = '2023-04-24';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'ftpaDeadline': '08 May 2023',
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has <b> partially granted </b> your application for permission to appeal to the Upper Tribunal.',
        'The Decision and Reasons document includes the reasons the judge made this decision. You should read it carefully.',
        '<a href={{ paths.common.ftpaDecisionViewer }}>Read the Decision and Reasons document</a>',
        '<b>What happens next</b>',
        'The Upper Tribunal will decide if the Tribunal\'s decision was wrong. The Upper Tribunal will contact you soon to tell you what will happen next.',
        'If you think your application should have been fully granted, you can send an application for permission to appeal directly to the Upper Tribunal.',
        '<a class=\"govuk-link\" href=\"https://www.gov.uk/upper-tribunal-immigration-asylum\">Find out how to apply</a>',
        'You must send your application by {{ applicationNextStep.ftpaDeadline }}'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application is not admitted for appellant ftpa application should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'appellant';
    req.session.appeal.ftpaAppellantDecisionOutcomeType = 'notAdmitted';
    req.session.appeal.ftpaAppellantDecisionDate = '2023-04-24';
    req.session.appeal.appealOutOfCountry = 'Yes';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'ftpaDeadline': '22 May 2023',
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has <b> not admitted </b> your application for permission to appeal to the Upper Tribunal.',
        'The Decision and Reasons document includes the reasons the judge made this decision. You should read it carefully.',
        '<a href={{ paths.common.ftpaDecisionViewer }}>Read the Decision and Reasons document</a>',
        '<b>What happens next</b>',
        'If you still think the Tribunal\'s decision was wrong, you can send an application for permission to appeal directly to the Upper Tribunal.',
        '<a class=\"govuk-link\" href=\"https://www.gov.uk/upper-tribunal-immigration-asylum\">Find out how to apply for permission to appeal to the Upper Tribunal</a>',
        'You must send your application by {{ applicationNextStep.ftpaDeadline }}'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when appellant ftpa application is not admitted by resident judge, should get correct Do this next section.', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, 'aip-ftpa-feature', false).resolves(true);
    req.session.appeal.appealStatus = 'ftpaDecided';
    req.session.appeal.ftpaApplicantType = 'appellant';
    req.session.appeal.ftpaAppellantRjDecisionOutcomeType = 'notAdmitted';
    req.session.appeal.ftpaAppellantDecisionDate = '2023-04-24';
    req.session.appeal.appealOutOfCountry = 'Yes';
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'ftpaDeadline': '22 May 2023',
      'deadline': 'TBC',
      'cta': {},
      'descriptionParagraphs': [
        'A judge has <b> not admitted </b> your application for permission to appeal to the Upper Tribunal.',
        'The Decision and Reasons document includes the reasons the judge made this decision. You should read it carefully.',
        '<a href={{ paths.common.ftpaDecisionViewer }}>Read the Decision and Reasons document</a>',
        '<b>What happens next</b>',
        'If you still think the Tribunal\'s decision was wrong, you can send an application for permission to appeal directly to the Upper Tribunal.',
        '<a class=\"govuk-link\" href=\"https://www.gov.uk/upper-tribunal-immigration-asylum\">Find out how to apply for permission to appeal to the Upper Tribunal</a>',
        'You must send your application by {{ applicationNextStep.ftpaDeadline }}'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('when application status is appealTakenOffline and removeAppealFromOnlineReason and date can be read.', () => {
    req.session.appeal.removeAppealFromOnlineReason = 'Reason to move an appeal offline';
    req.session.appeal.removeAppealFromOnlineDate = '2021-06-30';
    req.session.appeal.application.isAppealLate = false;

    const result = getMoveAppealOfflineReason(req as Request);
    const offlineDate = getMoveAppealOfflineDate(req as Request);

    expect(result).to.eql('Reason to move an appeal offline');
    expect(offlineDate).to.eql('2021-06-30');
  });

  it('when application has not ended and outOfTimeDecisionType is rejected and appeal is late status, should be lateAppealRejected.', () => {
    req.session.appeal.appealStatus = 'appealStarted';
    req.session.appeal.outOfTimeDecisionType = 'rejected';
    req.session.appeal.application.isAppealLate = true;

    const result = getAppealStatus(req as Request);

    expect(result).to.eql('lateAppealRejected');
  });

  it('when application has ended and outOfTimeDecisionType is rejected and appeal is late status, should be ended.', () => {
    req.session.appeal.appealStatus = 'ended';
    req.session.appeal.outOfTimeDecisionType = 'rejected';
    req.session.appeal.application.isAppealLate = true;

    const result = getAppealStatus(req as Request);

    expect(result).to.eql('ended');
  });

  it('when application hasn\'t ended and isAppealLate.', () => {
    req.session.appeal.appealStatus = 'notEnded';
    req.session.appeal.application.isAppealLate = true;
    req.session.appeal.outOfTimeDecisionType = 'rejected';
    const result = getAppealStatus(req as Request);

    expect(result).to.eql('lateAppealRejected');
  });

  it('when application hasn\'t ended and appealStatus === appealSubmitted.', () => {
    req.session.appeal.appealStatus = 'appealSubmitted';
    req.session.appeal.application.isAppealLate = true;
    req.session.appeal.outOfTimeDecisionType = 'approved';
    const result = getAppealStatus(req as Request);

    expect(result).to.eql('lateAppealSubmitted');
  });

  it('when application hasn\'t ended and appealStatus !== appealSubmitted.', () => {
    req.session.appeal.appealStatus = 'aappealSubmitted';
    req.session.appeal.application.isAppealLate = true;
    req.session.appeal.outOfTimeDecisionType = 'approved';
    const result = getAppealStatus(req as Request);

    expect(result).to.eql('aappealSubmitted');
  });

  it('when application is in final bundling state after decision without hearing, should return correct do this next.', async () => {
    req.session.appeal.appealStatus = 'finalBundling';
    const event = {
      'id': 'decisionWithoutHearing',
      'createdDate': '2022-01-11T16:00:00.000'
    } as HistoryEvent;
    req.session.appeal.history.push(event);
    const result = await getAppealApplicationNextStep(req as Request);

    const expected = {
      'deadline': 'TBC',
      'descriptionParagraphs': [
        'You chose to have your appeal to be decided without a hearing.',
        'A judge will decide your appeal based on the information and evidence provided by you and the Home Office.',
        'The Tribunal will contact you when a decision has been made.'
      ]
    };

    expect(result).to.eql(expected);
  });

  it('check isEventLatestInHistoryList work as expected', async () => {
    const { appeal } = req.session;
    const testData = [
      {
        history: undefined,
        expectedResponse: false,
        evenId: null,
        description: 'False'
      },
      {
        history: [],
        expectedResponse: false,
        evenId: null,
        description: 'False'
      },
      {
        history: [],
        expectedResponse: false,
        evenId: null,
        description: 'False'
      },
      {
        history: [
          {
            'id': 'submit',
            'createdDate': '2022-01-11T16:00:00.000'
          },
          {
            'id': 'decisionWithoutHearing',
            'createdDate': '2022-01-11T16:00:00.000'
          }
        ] as HistoryEvent[],
        expectedResponse: false,
        evenId: 'decisionWithoutHearing',
        description: 'False'
      },
      {
        history: [
          {
            'id': 'decisionWithoutHearing',
            'createdDate': '2022-01-11T16:00:00.000'
          }
        ] as HistoryEvent[],
        expectedResponse: true,
        evenId: 'decisionWithoutHearing',
        description: 'True'
      }
    ];

    testData.forEach(({ history, expectedResponse, evenId, description }) => {
      it(`should be ${description}`, () => {
        appeal.history = history;
        expect(isEventLatestInHistoryList(req as Request, evenId)).to.be.deep.equal(expectedResponse);
      });
    });
  });

  it('check remissionDecisionEventIsTheLatest work as expected', async () => {
    const { appeal } = req.session;
    appeal.application.remissionDecision = 'approved';
    appeal.history = [
      {
        'id': 'recordRemissionDecision',
        'createdDate': '2020-02-22T15:36:26.099'
      },
      {
        'id': 'submitAppeal',
        'createdDate': '2020-02-22T15:36:26.099'
      }
    ] as HistoryEvent[];

    expect(remissionDecisionEventIsTheLatest(req as Request)).to.be.deep.equal(true);
  });

  it('check requestFeeRemissionEventIsTheLatest work as expected', async () => {
    const { appeal } = req.session;
    appeal.application.remissionOption = 'feeWaiverFromHo';
    appeal.history = [
      {
        'id': 'requestFeeRemission',
        'createdDate': '2020-02-22T15:36:26.099'
      },
      {
        'id': 'submitAppeal',
        'createdDate': '2020-02-22T15:36:26.099'
      }
    ] as HistoryEvent[];

    expect(requestFeeRemissionEventIsTheLatest(req as Request)).to.be.deep.equal(true);
  });

  it('when application status is appealSubmitted with decision Approved for fee refund and flag is enabled should get correct \'Do This' +
    ' next section\'', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false).resolves(true);
    const { appeal } = req.session;
    appeal.appealStatus = 'appealSubmitted';
    appeal.application.remissionDecision = 'approved';
    appeal.history = [
      {
        'id': 'recordRemissionDecision',
        'createdDate': '2020-02-22T15:36:26.099'
      },
      {
        'id': 'submitAppeal',
        'createdDate': '2020-02-22T15:36:26.099'
      }
    ] as HistoryEvent[];
    const result = await getAppealApplicationNextStep(req as Request);

    expect(result).to.eql({
      cta: null,
      deadline: '07 March 2020',
      descriptionParagraphs: [
        'Your appeal details have been sent to the Tribunal.',
        'A Legal Officer will contact you to tell you what happens next. This should be by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.deadline }}</span> but it might take longer than that.',
        '<b>Helpful information</b>',
        '<a href={{ paths.common.tribunalCaseworker }}>What is a Tribunal Caseworker?</a>'
      ],
      allowedAskForMoreTime: false
    });
  });

  it('when application status is appealSubmitted with decision partially approved for fee refund and flag is enabled should get correct \'Do This' +
    ' next section\'', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false).resolves(true);

    req.session.appeal.appealStatus = 'appealSubmitted';
    req.session.appeal.application.remissionDecision = 'partiallyApproved';
    req.session.appeal.application.amountLeftToPay = '4000';
    req.session.appeal.application.remissionRejectedDatePlus14days = '2022-03-12';
    req.session.appeal.history = [
      {
        'id': 'recordRemissionDecision',
        'createdDate': '2020-02-22T15:36:26.099'
      },
      {
        'id': 'submitAppeal',
        'createdDate': '2020-02-22T15:36:26.099'
      }
    ] as HistoryEvent[];
    const result = await getAppealApplicationNextStep(req as Request);

    expect(result).to.eql({
      cta: {},
      deadline: '07 March 2020',
      feeLeftToPay: '40',
      remissionRejectedDatePlus14days: '2022-03-12',
      descriptionParagraphs: [
        'The fee for this appeal is £{{ applicationNextStep.feeLeftToPay }}.',
        'If you do not pay the fee by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.remissionRejectedDatePlus14days }}</span> the Tribunal will end the appeal.',
        '<b>How to pay the fee</b>',
        '1. Call the Tribunal on 0300 123 1711, then select option 4<br />2. Provide your 16-digit online case reference number: 1234-1234-1234-1234<br />3. Make the payment with a debit or credit card'
      ],
      allowedAskForMoreTime: false
    });
  });

  it('when application status is appealSubmitted with decision rejected for fee refund and flag is enabled should get correct \'Do This' +
    ' next section\'', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false).resolves(true);

    req.session.appeal.appealStatus = 'appealSubmitted';
    req.session.appeal.application.remissionDecision = 'rejected';
    req.session.appeal.feeWithHearing = '140';
    req.session.appeal.application.decisionHearingFeeOption = 'decisionWithHearing';
    req.session.appeal.application.remissionRejectedDatePlus14days = '2022-03-12';
    req.session.appeal.history = [
      {
        'id': 'recordRemissionDecision',
        'createdDate': '2020-02-22T15:36:26.099'
      },
      {
        'id': 'submitAppeal',
        'createdDate': '2020-02-22T15:36:26.099'
      }
    ] as HistoryEvent[];
    const result = await getAppealApplicationNextStep(req as Request);

    expect(result).to.eql({
      cta: {},
      deadline: '07 March 2020',
      feeForAppeal: '140',
      remissionRejectedDatePlus14days: '2022-03-12',
      descriptionParagraphs: [
        'The fee for this appeal is £{{ applicationNextStep.feeForAppeal }}.',
        'If you do not pay the fee by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.remissionRejectedDatePlus14days }}</span> the Tribunal will end the appeal.',
        '<a href={{ paths.common.payLater }}>Pay for the appeal</a>'
      ],
      allowedAskForMoreTime: false
    });
  });

  it('when application status is pendingPayment with decision rejected for fee refund and flag is enabled should get correct \'Do This' +
    ' next section\'', async () => {
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, FEATURE_FLAGS.DLRM_FEE_REMISSION_FEATURE_FLAG, false).resolves(true);

    req.session.appeal.appealStatus = 'pendingPayment';
    req.session.appeal.application.remissionDecision = 'rejected';
    req.session.appeal.feeWithHearing = '140';
    req.session.appeal.application.decisionHearingFeeOption = 'decisionWithHearing';
    req.session.appeal.application.remissionRejectedDatePlus14days = '2022-03-12';
    req.session.appeal.history = [
      {
        'id': 'recordRemissionDecision',
        'createdDate': '2020-02-22T15:36:26.099'
      },
      {
        'id': 'submitAppeal',
        'createdDate': '2020-02-22T15:36:26.099'
      }
    ] as HistoryEvent[];
    const result = await getAppealApplicationNextStep(req as Request);

    expect(result).to.eql({
      cta: {},
      deadline: '07 March 2020',
      feeForAppeal: '140',
      remissionRejectedDatePlus14days: '2022-03-12',
      descriptionParagraphs: [
        'The fee for this appeal is £{{ applicationNextStep.feeForAppeal }}.',
        'If you do not pay the fee by <span class=\'govuk-body govuk-!-font-weight-bold\'>{{ applicationNextStep.remissionRejectedDatePlus14days }}</span> the Tribunal will end the appeal.',
        '<a href={{ paths.common.payLater }}>Pay for the appeal</a>'
      ],
      allowedAskForMoreTime: false
    });
  });
});
