import { Request } from 'express';
import { FEATURE_FLAGS } from '../../../app/data/constants';
import { Events } from '../../../app/data/events';
import { States } from '../../../app/data/states';
import { paths } from '../../../app/paths';
import LaunchDarklyService from '../../../app/service/launchDarkly-service';
import UpdateAppealService from '../../../app/service/update-appeal-service';
import Logger from '../../../app/utils/logger';
import {
  constructSection,
  filterEventsForHearingRequirementsSection,
  getAppealApplicationHistory,
  getApplicationEvents,
  getAsyncStitchingEvent,
  getDirectionHistory,
  getEventsAndStates,
  getListCaseEvent,
  getSubmitClarifyingQuestionsEvents,
  getUpdateTribunalDecisionDocumentHistory,
  getUpdateTribunalDecisionHistory
} from '../../../app/utils/timeline-utils';
import i18n from '../../../locale/en.json';
import { expect, sinon } from '../../utils/testUtils';
import { expectedEventsWithTimeExtensionsData } from '../mockData/events/expectation/expected-events-with-time-extensions';

describe('timeline-utils', () => {
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
          application: {},
          caseBuilding: {},
          reasonsForAppeal: {},
          nonStandardDirectionEnabled: true,
          readonlyApplicationEnabled: true
        }
      },
      idam: {
        userDetails: {
          forename: 'forename',
          surname: 'surname',
          uid: 'appellant'
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
    LaunchDarklyService.close();
  });

  describe('constructSection', () => {

    it('Should construct the remittals section', () => {
      const { appeal } = req.session;
      const remittalSection = [Events.MARK_APPEAL_AS_REMITTED.id];
      const testData = [
        {
          sourceOfRemittal: 'Upper Tribunal',
          description: 'Upper Tribunal scenario'
        },
        {
          sourceOfRemittal: 'Court of Appeal',
          description: 'Court of Appeal scenario'
        }
      ];

      const history = [
        {
          'id': 'markAppealAsRemitted',
          'createdDate': '2020-04-14T14:53:26.099'
        }
      ] as HistoryEvent[];

      testData.forEach(({
                          sourceOfRemittal,
                          description
                        }) => {
        it(`should be ${description}`, () => {
          appeal.sourceOfRemittal = sourceOfRemittal;
          const result = constructSection(remittalSection, history, null, req as Request);
          expect(result).to.deep.eq(
            [{
              'date': '14 April 2020',
              'dateObject': new Date('2020-04-14T14:53:26.099'),
              'text': `The ${sourceOfRemittal} decided the appeal will be heard again by the First-tier Tribunal.`,
              'links': [{
                'title': 'Useful documents',
                'text': `${sourceOfRemittal} documents`,
                'href': '{{ paths.common.remittalDocumentsViewer }}'
              }]
            }]
          );
        });
      });
    });

    it('Should construct the appeal details section', () => {
      req.session.appeal.timeExtensionEventsMap = [];
      const appealDetailsSection = [Events.SUBMIT_APPEAL.id];

      const result = constructSection(appealDetailsSection, expectedEventsWithTimeExtensionsData, null, req as Request);
      expect(result).to.deep.eq(
        [{
          'date': '14 April 2020',
          'dateObject': new Date('2020-04-14T14:53:26.099'),
          'text': 'You sent your appeal details to the Tribunal.',
          'links': [{
            'title': 'What you sent',
            'text': 'Your appeal details',
            'href': '{{ paths.common.appealDetailsViewer }}'
          }, {
            'title': 'Helpful information',
            'text': 'What is a Tribunal Caseworker?',
            'href': '{{ paths.common.tribunalCaseworker }}'
          }]
        }]
      );
    });

    it('Should construct the appeal hearing requirements section when appellant takes over', () => {
      req.session.appeal.timeExtensionEventsMap = [];
      const appealHearingRequirementsSectionEvents = [
        Events.UPLOAD_ADDITIONAL_EVIDENCE.id,
        Events.UPLOAD_ADDENDUM_EVIDENCE_LEGAL_REP.id
      ];
      const history = [
        {
          'id': 'uploadAdditionalEvidence',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        },
        {
          'id': 'uploadAddendumEvidenceLegalRep',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        }
      ] as HistoryEvent[];
      req.session.appeal.history = history;
      const result = constructSection(appealHearingRequirementsSectionEvents, req.session.appeal.history, null, req as Request);

      expect(result).to.deep.eq(
        [{
          'date': '14 April 2020',
          'dateObject': new Date('2020-04-14T14:53:26.099'),
          'text': 'More evidence was provided.',
          'links': [{
            'title': 'What was provided',
            'text': 'Your evidence',
            'href': '{{ paths.common.lrEvidence }}'
          }]
        }, {
          'date': '14 April 2020',
          'dateObject': new Date('2020-04-14T14:53:26.099'),
          'text': 'More evidence was provided.',
          'links': [{
            'title': 'What was provided',
            'text': 'Your evidence',
            'href': '{{ paths.common.yourAddendumEvidence }}'
          }]
        }]
      );
    });

    it('Should construct the appeal hearing requirements section when case is adjourned with record ajournment details event', () => {
      req.session.appeal.timeExtensionEventsMap = [];
      req.session.appeal.appealStatus = States.ADJOURNED.id;
      req.idam.userDetails.uid = 'user-id';
      const appealHearingRequirementsSectionEvents = [
        Events.UPLOAD_ADDITIONAL_EVIDENCE.id,
        Events.UPLOAD_ADDENDUM_EVIDENCE_LEGAL_REP.id,
        Events.RECORD_ADJOURNMENT_DETAILS.id
      ];
      const history = [
        {
          'id': 'uploadAdditionalEvidence',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        },
        {
          'id': 'uploadAdditionalEvidence',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'user-id'
          }
        },
        {
          'id': 'listCase',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        },
        {
          'id': 'uploadAddendumEvidenceLegalRep',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        },
        {
          'id': 'uploadAddendumEvidenceLegalRep',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'user-id'
          }
        },
        {
          'id': 'recordAdjournmentDetails',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        }
      ] as HistoryEvent[];
      req.session.appeal.history = history;
      const result = constructSection(
          appealHearingRequirementsSectionEvents, filterEventsForHearingRequirementsSection(req as Request), null, req as Request);

      expect(result).to.deep.eq(
        [{
          'date': '14 April 2020',
          'dateObject': new Date('2020-04-14T14:53:26.099'),
          'text': 'More evidence was provided.',
          'links': [{
            'title': 'What was provided',
            'text': 'Your evidence',
            'href': '{{ paths.common.lrEvidence }}'
          }]
        }, {
          'date': '14 April 2020',
          'dateObject': new Date('2020-04-14T14:53:26.099'),
          'text': 'More evidence was provided.',
          'links': [{
            'title': 'What was provided',
            'text': 'Your evidence',
            'href': '{{ paths.common.yourAddendumEvidence }}'
          }]
        }, {
          'date': '14 April 2020',
          'dateObject': new Date('2020-04-14T14:53:26.099'),
          'text': 'Your hearing was adjourned.',
          'links': [{
            'title': 'Useful documents',
            'text': 'Notice of Adjourned Hearing',
            'href': '{{ paths.common.hearingAdjournmentNoticeViewer }}'
          }]
        }]
      );
    });

    it('Should construct the appeal hearing requirements section when case is not adjourned with record ajournment details event', () => {
      req.session.appeal.timeExtensionEventsMap = [];
      req.session.appeal.appealStatus = States.PRE_HEARING.id;
      req.idam.userDetails.uid = 'user-id';
      const appealHearingRequirementsSectionEvents = [
        Events.UPLOAD_ADDITIONAL_EVIDENCE.id,
        Events.UPLOAD_ADDENDUM_EVIDENCE_LEGAL_REP.id,
        Events.RECORD_ADJOURNMENT_DETAILS.id
      ];
      const history = [
        {
          'id': 'uploadAdditionalEvidence',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        },
        {
          'id': 'uploadAdditionalEvidence',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'user-id'
          }
        },
        {
          'id': 'listCase',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        },
        {
          'id': 'uploadAddendumEvidenceLegalRep',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        },
        {
          'id': 'uploadAddendumEvidenceLegalRep',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'user-id'
          }
        },
        {
          'id': 'recordAdjournmentDetails',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        }
      ] as HistoryEvent[];
      req.session.appeal.history = history;
      const result = constructSection(
          appealHearingRequirementsSectionEvents, filterEventsForHearingRequirementsSection(req as Request), null, req as Request);

      expect(result).to.deep.eq(
        [{
          'date': '14 April 2020',
          'dateObject': new Date('2020-04-14T14:53:26.099'),
          'text': 'More evidence was provided.',
          'links': [{
            'title': 'What was provided',
            'text': 'Your evidence',
            'href': '{{ paths.common.lrEvidence }}'
          }]
        }, {
          'date': '14 April 2020',
          'dateObject': new Date('2020-04-14T14:53:26.099'),
          'text': 'More evidence was provided.',
          'links': [{
            'title': 'What was provided',
            'text': 'Your evidence',
            'href': '{{ paths.common.yourAddendumEvidence }}'
          }]
        }]
      );
    });

    it('Should construct the appeal decision section with updated decision', () => {
      req.session.appeal.timeExtensionEventsMap = [];
      req.session.appeal.updatedAppealDecision = 'Allowed';
      const appealDecisionSection = [Events.SEND_DECISION_AND_REASONS.id];
      req.session.appeal.history = [
        {
          'id': 'sendDecisionAndReasons',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'judge'
          }
        }
      ] as HistoryEvent[];
      const result = constructSection(appealDecisionSection, req.session.appeal.history, null, req as Request);
      expect(result).to.deep.eq(
        [{
          'date': '14 April 2020',
          'dateObject': new Date('2020-04-14T14:53:26.099'),
          'text': 'The Decision and Reasons documents is ready to view.',
          'links': [{
            'title': 'Useful documents',
            'text': 'Decision and Reasons',
            'href': '{{ paths.common.updatedDecisionAndReasonsViewer }}'
          }]
        }]
      );
    });

    it('Should construct the appeal decision section without updated decision', () => {
      req.session.appeal.timeExtensionEventsMap = [];
      const appealDecisionSection = [Events.SEND_DECISION_AND_REASONS.id];
      req.session.appeal.history = [
        {
          'id': 'sendDecisionAndReasons',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'judge'
          }
        }
      ] as HistoryEvent[];
      const result = constructSection(appealDecisionSection, req.session.appeal.history, null, req as Request);
      expect(result).to.deep.eq(
        [{
          'date': '14 April 2020',
          'dateObject': new Date('2020-04-14T14:53:26.099'),
          'text': 'The Decision and Reasons documents is ready to view.',
          'links': [{
            'title': 'Useful documents',
            'text': 'Decision and Reasons',
            'href': '{{ paths.common.decisionAndReasonsViewer }}'
          }]
        }]
      );
    });
  });

  describe('getApplicationEvents', () => {
    it('should get application events and decision for appellant', () => {
      req.session.appeal.makeAnApplications = [
        {
          id: '1',
          value: {
            applicant: 'Appellant',
            applicantRole: 'citizen',
            date: '2021-07-15',
            decision: 'Pending',
            details: 'my details',
            state: 'awaitingReasonsForAppeal',
            type: 'Time extension',
            evidence: []
          }
        },
        {
          id: '2',
          value: {
            applicant: 'Legal representative',
            applicantRole: 'caseworker-ia-legalrep-solicitor',
            date: '2021-07-10',
            decision: 'Granted',
            decisionDate: '2021-07-12',
            decisionMaker: 'Tribunal Caseworker',
            decisionReason: 'reason why',
            details: 'my details',
            state: 'awaitingReasonsForAppeal',
            type: 'Time extension',
            evidence: []
          }
        }
      ];
      const applicationEvents = getApplicationEvents(req as Request);

      expect(applicationEvents).to.deep.eq(
        [{
          'date': '15 July 2021',
          'dateObject': new Date('2021-07-15T00:00:00.00Z'),
          'text': 'You sent the Tribunal a request.',
          'id': '1',
          'links': [{
            'title': 'What you sent',
            'text': 'Your request',
            'href': '{{ paths.common.makeAnApplicationViewer }}/1'
          }]
        },
        {
          'id': '2',
          'date': '12 July 2021',
          'dateObject': new Date('2021-07-12T00:00:00.00Z'),
          'text': 'Your request was granted.',
          'links': [{
            'title': 'What the Tribunal said',
            'text': 'Reason for decision',
            'href': '{{ paths.common.makeAnApplicationViewer }}/2'
          }]
        },
        {
          'date': '10 July 2021',
          'dateObject': new Date('2021-07-10T00:00:00.00Z'),
          'text': 'You sent the Tribunal a request.',
          'id': '2',
          'links': [{
            'title': 'What you sent',
            'text': 'Your request',
            'href': '{{ paths.common.makeAnApplicationViewer }}/2'
          }]
        }]
      );
    });

    it('should get application events and decision for respondent', () => {
      req.session.appeal.makeAnApplications = [
        {
          id: '4',
          value: {
            applicant: 'Respondent',
            applicantRole: 'caseworker-ia-homeofficeapc',
            date: '2021-07-20',
            decision: 'Refused',
            decisionDate: '2021-07-25',
            decisionMaker: 'Tribunal Caseworker',
            decisionReason: 'reason why',
            details: 'my details',
            state: 'awaitingReasonsForAppeal',
            type: 'Time extension',
            evidence: []
          }
        }
      ];
      const applicationEvents = getApplicationEvents(req as Request);

      expect(applicationEvents).to.deep.eq(
        [{
          'id': '4',
          'date': '25 July 2021',
          'dateObject': new Date('2021-07-25T00:00:00.00Z'),
          'text': 'The Home Office request was refused.',
          'links': [{
            'title': 'What the Tribunal said',
            'text': 'Reason for decision',
            'href': '{{ paths.common.makeAnApplicationViewer }}/4'
          }]
        },
        {
          'date': '20 July 2021',
          'dateObject': new Date('2021-07-20T00:00:00.00Z'),
          'text': 'The Home Office sent the Tribunal a request.',
          'id': '4',
          'links': [{
            'title': 'What the Home Office sent',
            'text': 'The Home Office request',
            'href': '{{ paths.common.makeAnApplicationViewer }}/4'
          }]
        }]
      );
    });

    it('should get application events content for Appellant application', () => {
      req.session.appeal.makeAnApplications = [
        {
          id: '2',
          value: {
            applicant: 'Appellant',
            applicantRole: 'citizen',
            date: '2021-07-15',
            decision: 'Pending',
            details: 'my details',
            state: 'awaitingReasonsForAppeal',
            type: 'Time extension',
            evidence: []
          }
        }
      ];
      const applicationEvents = getApplicationEvents(req as Request);

      expect(applicationEvents).to.deep.eq(
        [{
          'date': '15 July 2021',
          'dateObject': new Date('2021-07-15T00:00:00.00Z'),
          'text': 'You sent the Tribunal a request.',
          'id': '2',
          'links': [{
            'title': 'What you sent',
            'text': 'Your request',
            'href': '{{ paths.common.makeAnApplicationViewer }}/2'
          }]
        }]
      );
    });

    it('should get application events content for Legal Rep application', () => {
      req.session.appeal.makeAnApplications = [
        {
          id: '1',
          value: {
            applicant: 'Legal representative',
            applicantRole: 'caseworker-ia-legalrep-solicitor',
            date: '2021-07-15',
            decision: 'Pending',
            details: 'my details',
            state: 'awaitingReasonsForAppeal',
            type: 'Time extension',
            evidence: []
          }
        }
      ];
      const applicationEvents = getApplicationEvents(req as Request);

      expect(applicationEvents).to.deep.eq(
        [{
          'date': '15 July 2021',
          'dateObject': new Date('2021-07-15T00:00:00.00Z'),
          'text': 'You sent the Tribunal a request.',
          'id': '1',
          'links': [{
            'title': 'What you sent',
            'text': 'Your request',
            'href': '{{ paths.common.makeAnApplicationViewer }}/1'
          }]
        }]
      );
    });

    it('should get application events content for Respondent application', () => {
      req.session.appeal.makeAnApplications = [
        {
          id: '3',
          value: {
            applicant: 'Respondent',
            applicantRole: 'caseworker-ia-homeofficeapc',
            date: '2021-07-20',
            decision: 'Pending',
            details: 'my details',
            state: 'awaitingReasonsForAppeal',
            type: 'Time extension',
            evidence: []
          }
        }
      ];

      const applicationEvents = getApplicationEvents(req as Request);

      expect(applicationEvents).to.deep.eq(
        [{
          'date': '20 July 2021',
          'dateObject': new Date('2021-07-20T00:00:00.00Z'),
          'text': 'The Home Office sent the Tribunal a request.',
          'id': '3',
          'links': [{
            'title': 'What the Home Office sent',
            'text': 'The Home Office request',
            'href': '{{ paths.common.makeAnApplicationViewer }}/3'
          }]
        }]
      );
    });
  });

  describe('getSubmitClarifyingQuestionsEvents', () => {
    const history: Partial<HistoryEvent>[] = [
      {
        id: 'submitClarifyingQuestionAnswers',
        createdDate: '2021-08-25T12:23:08.397683',
        state: {
          id: 'clarifyingQuestionsAnswersSubmitted',
          name: ''
        },
        event: {
          eventName: 'Submit clarifying answers',
          description: ''
        }
      }
    ];
    const directions = [
      {
        id: '0',
        tag: 'requestClarifyingQuestions',
        dateDue: '2021-09-22',
        dateSent: '2021-08-25',
        uniqueId: 'directionId'
      }
    ];
    it('should get Submit CQ events', () => {
      const events = getSubmitClarifyingQuestionsEvents(history as HistoryEvent[], directions as Direction[]);

      expect(events.length).to.be.eql(1);
      expect(events[0]).to.contain.keys('date', 'dateObject', 'text', 'links');
    });

    it('should discard a direction if CQ not yet answered', () => {
      directions.push({
        id: '1',
        tag: 'requestClarifyingQuestions',
        dateDue: '2021-09-22',
        dateSent: '2021-08-25',
        uniqueId: 'directionId'
      });
      const events = getSubmitClarifyingQuestionsEvents(history as HistoryEvent[], directions as Direction[]);

      expect(events.length).to.be.eql(1);
      expect(events[0]).to.contain.keys('date', 'dateObject', 'text', 'links');
    });

    it('should return empty events array', () => {
      const events = getSubmitClarifyingQuestionsEvents([], []);

      expect(events.length).to.be.eql(0);
    });
  });

  describe('getDirectionHistory', () => {
    it('should get direction history', () => {
      req.session.appeal.directions = [
        {
          id: '1',
          parties: 'appellant',
          tag: '',
          dateDue: '2023-12-11',
          dateSent: '2023-05-11',
          explanation: 'explanation 1',
          uniqueId: '123456789',
          directionType: 'sendDirection'
        },
        {
          id: '2',
          parties: 'respondent',
          tag: '',
          dateDue: '2023-12-11',
          dateSent: '2023-05-11',
          explanation: 'explanation 2',
          uniqueId: '987654321',
          directionType: 'sendDirection'
        },
        {
          id: '3',
          parties: 'appellantAndRespondent',
          tag: '',
          dateDue: '2023-12-11',
          dateSent: '2023-05-11',
          explanation: 'explanation 3',
          uniqueId: '159159159',
          directionType: 'sendDirection'
        }
      ];
      const directionsHistory = getDirectionHistory(req as Request);

      expect(directionsHistory.length).to.be.eql(4);
      directionsHistory.forEach(direction => {
        expect(direction).to.contain.keys('date', 'dateObject', 'text', 'links');
      });
    });

    it('should filter history with non sendDirection type and appellant/respondent parties', () => {
      req.session.appeal.directions = [
        {
          id: '1',
          parties: 'appellant',
          tag: '',
          dateDue: '2023-12-11',
          dateSent: '2023-05-11',
          explanation: 'explanation 1',
          uniqueId: '123456789',
          directionType: 'sendDirection'
        },
        {
          id: '2',
          parties: 'respondent',
          tag: '',
          dateDue: '2023-12-11',
          dateSent: '2023-05-11',
          explanation: 'explanation 2',
          uniqueId: '987654321',
          directionType: 'sendDirection'
        },
        {
          id: '3',
          parties: 'appellant',
          tag: 'respondentEvidence',
          dateDue: '2023-12-11',
          dateSent: '2023-05-11',
          explanation: 'explanation 3',
          uniqueId: '159159159',
          directionType: 'requestRespondentEvidence'
        },
        {
          id: '4',
          parties: 'appellant',
          tag: '',
          dateDue: '2023-12-11',
          dateSent: '2023-05-11',
          explanation: 'explanation 4',
          uniqueId: '135135135',
          directionType: 'sendDirection'
        },
        {
          id: '4',
          parties: 'appellantAndRespondent',
          tag: '',
          dateDue: '2023-12-11',
          dateSent: '2023-05-11',
          explanation: 'explanation 5',
          uniqueId: '135135155',
          directionType: 'sendDirection'
        }
      ];
      const directionsHistory = getDirectionHistory(req as Request);
      expect(directionsHistory.length).to.be.eql(5);
      directionsHistory.forEach(direction => {
        expect(direction).to.contain.keys('date', 'dateObject', 'text', 'links');
      });
    });

    it('should return empty direction history', () => {
      req.session.appeal.directions = [];
      const directionsHistory = getDirectionHistory(req as Request);
      expect(directionsHistory.length).to.be.eql(0);
    });
  });

  describe('getUpdateTribunalDecisionHistory', () => {
    const history = [
      {
        'id': 'updateTribunalDecision',
        'createdDate': '2024-03-01T14:53:26.099'
      }
    ] as HistoryEvent[];

    beforeEach(() => {
      req.session.appeal.history = history;
      req.session.appeal.appealStatus = 'decided';
      req.session.appeal.updateTribunalDecisionList = 'underRule31';
    });

    it('should show the updated tribunal decision history from the allowed status to dismissed status', () => {

      req.session.appeal.typesOfUpdateTribunalDecision = {
        value: { code: 'dismissed', label: 'Yes, change decision to Dismissed' }
      };
      req.session.appeal.updatedAppealDecision = 'dismissed';

      const updatedTribunalDecisionHistory = getUpdateTribunalDecisionHistory(req as Request, true);

      expect(updatedTribunalDecisionHistory.length).to.be.eql(1);
      updatedTribunalDecisionHistory.forEach(history => {
        expect(history).to.contain.keys('date', 'dateObject', 'text');
      });

      expect(updatedTribunalDecisionHistory).to.deep.eq(
        [{
          'date': '01 March 2024',
          'dateObject': new Date('2024-03-01T14:53:26.099'),
          'text': 'The Tribunal changed the appeal decision from allowed to dismissed.'
        }]
      );
    });

    it('should show the updated tribunal decision history from dismissed status to allowed status', () => {

      req.session.appeal.typesOfUpdateTribunalDecision = {
        value: { code: 'allowed', label: 'Yes, change decision to Allowed' }
      };
      req.session.appeal.updatedAppealDecision = 'allowed';

      const updatedTribunalDecisionHistory = getUpdateTribunalDecisionHistory(req as Request, true);

      expect(updatedTribunalDecisionHistory.length).to.be.eql(1);
      updatedTribunalDecisionHistory.forEach(history => {
        expect(history).to.contain.keys('date', 'dateObject', 'text');
      });

      expect(updatedTribunalDecisionHistory).to.deep.eq(
        [{
          'date': '01 March 2024',
          'dateObject': new Date('2024-03-01T14:53:26.099'),
          'text': 'The Tribunal changed the appeal decision from dismissed to allowed.'
        }]
      );
    });

    it('no updated tribunal decision history will be shown if the status are same', () => {

      req.session.appeal.isDecisionAllowed = 'allowed';
      req.session.appeal.updatedAppealDecision = 'allowed';

      const updatedTribunalDecisionHistory = getUpdateTribunalDecisionHistory(req as Request, true);

      expect(updatedTribunalDecisionHistory.length).to.be.eql(0);
    });

    it('should show the updated tribunal decision history with rule 32', () => {

      req.session.appeal.updateTribunalDecisionList = 'underRule32';

      const updatedTribunalDecisionHistory = getUpdateTribunalDecisionHistory(req as Request, true);

      expect(updatedTribunalDecisionHistory.length).to.be.eql(1);
      updatedTribunalDecisionHistory.forEach(history => {
        expect(history).to.contain.keys('date', 'dateObject', 'text', 'links');
      });

      expect(updatedTribunalDecisionHistory).to.deep.eq(
        [{
          'date': '01 March 2024',
          'dateObject': new Date('2024-03-01T14:53:26.099'),
          'text': 'The Tribunal decided that your appeal will be heard again.',
          'links': [
            {
              'href': '{{ paths.common.decisionAndReasonsViewerWithRule32 }}',
              'text': 'Reasons for the decision',
              'title': 'Useful documents'
            }
          ]
        }]
      );
    });

    it('no updated tribunal decision history will be shown if history is null', () => {

      req.session.appeal.history = null;
      const updatedTribunalDecisionHistory = getUpdateTribunalDecisionHistory(req as Request, true);

      expect(updatedTribunalDecisionHistory.length).to.be.eql(0);
    });

    it('no updated tribunal decision history will be shown if DLRM set aside flag is off', () => {

      const updatedTribunalDecisionHistory = getUpdateTribunalDecisionHistory(req as Request, false);

      expect(updatedTribunalDecisionHistory.length).to.be.eql(0);
    });
  });

  describe('getUpdateTribunalDecisionDocumentHistory', () => {
    const history = [
      {
        'id': 'updateTribunalDecision',
        'createdDate': '2024-03-04T15:36:26.099'
      }
    ] as HistoryEvent[];

    beforeEach(() => {
      req.session.appeal.history = history;
      req.session.appeal.appealStatus = 'decided';
      req.session.appeal.updateTribunalDecisionList = 'underRule31';
      req.session.appeal.updateTribunalDecisionAndReasonsFinalCheck = 'Yes';
    });

    it('should show the document history of updated tribunal decision', () => {

      const updatedTribunalDecisionHistory = getUpdateTribunalDecisionDocumentHistory(req as Request, true);

      expect(updatedTribunalDecisionHistory.length).to.be.eql(1);
      updatedTribunalDecisionHistory.forEach(history => {
        expect(history).to.contain.keys('date', 'dateObject', 'text', 'links');
      });

      expect(updatedTribunalDecisionHistory).to.deep.eq(
        [{
          'date': '04 March 2024',
          'dateObject': new Date('2024-03-04T15:36:26.099'),
          'text': 'The Tribunal created a new Decision and Reasons document for your appeal',
          'links': [
            {
              'href': '{{ paths.common.updatedDecisionAndReasonsViewer }}',
              'text': 'See the new Decisions and Reasons',
              'title': 'Useful documents'
            }
          ]
        }]
      );
    });

    it('should not show the document history of updated tribunal decision if updateTribunalDecisionAndReasonsFinalCheck is null', () => {

      req.session.appeal.updateTribunalDecisionAndReasonsFinalCheck = null;
      const updatedTribunalDecisionHistory = getUpdateTribunalDecisionDocumentHistory(req as Request, true);

      expect(updatedTribunalDecisionHistory.length).to.be.eql(0);
    });

    it('should not show the document history of updated tribunal decision if DLRM set aside flag is off', () => {

      const updatedTribunalDecisionHistory = getUpdateTribunalDecisionDocumentHistory(req as Request, false);

      expect(updatedTribunalDecisionHistory.length).to.be.eql(0);
    });
  });

  describe('getEventsAndStates', () => {
    it('should return relevant events and states when uploadAddendumEvidence feature enabled', () => {
      const eventsAndStates = getEventsAndStates(true, true, false, false);
      expect(eventsAndStates.appealArgumentSectionEvents.length).to.be.eqls(17);
      expect(eventsAndStates.appealArgumentSectionStates.length).to.be.eqls(14);
    });

    it('should return relevant events and states when uploadAddendumEvidence feature disabled', () => {
      const eventsAndStates = getEventsAndStates(false, true, false, false);
      expect(eventsAndStates.appealArgumentSectionEvents.length).to.be.eqls(13);
      expect(eventsAndStates.appealArgumentSectionStates.length).to.be.eqls(11);
    });

    it('should return relevant events when hearingBundle feature enabled', () => {
      const eventsAndStates = getEventsAndStates(false, true, false, false);
      expect(eventsAndStates.appealHearingRequirementsSectionEvents.length).to.be.eqls(5);
    });

    it('should return relevant events when hearingBundle and uploadAddendumEvidence features enabled', () => {
      const eventsAndStates = getEventsAndStates(true, true, false, false);
      expect(eventsAndStates.appealHearingRequirementsSectionEvents.length).to.be.eqls(6);
    });

    it('should return relevant events when hearingBundle feature disabled', () => {
      const eventsAndStates = getEventsAndStates(true, false, false, false);
      expect(eventsAndStates.appealHearingRequirementsSectionEvents.length).to.be.eqls(4);
    });

    it('should return relevant events when ftpa feature disabled', () => {
      const eventsAndStates = getEventsAndStates(false, false, false, false);
      expect(eventsAndStates.appealDecisionSectionEvents.length).to.be.eqls(2);
    });

    it('should return relevant events when ftpa feature enabled', () => {
      const eventsAndStates = getEventsAndStates(false, false, true, false);
      expect(eventsAndStates.appealDecisionSectionEvents.length).to.be.eqls(6);
    });

    it('should return relevant events when ftpa set aside feature enabled', () => {
      const eventsAndStates = getEventsAndStates(false, false, false, true);
      expect(eventsAndStates.appealDecisionSectionEvents.length).to.be.eqls(3);
    });
  });

  describe('getAsyncStitchingEvent', () => {
    it('should return an empty array when there are no hearing documents', () => {
      const result = getAsyncStitchingEvent(req as Request);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return filtered hearing notices from hearingDocuments', () => {
      req.session.appeal.hearingDocuments = [
        { tag: 'hearingBundle', fileId: 'some-id-0123', dateUploaded: '2024-01-05' },
        { tag: 'updatedHearingBundle', fileId: 'some-id-2345', dateUploaded: '2024-01-01' },
        { tag: 'other', fileId: 'some-id-1234', dateUploaded: '2024-01-02' }
      ];

      const result = getAsyncStitchingEvent(req as Request);
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.include({ date: '05 January 2024' });
      expect(result[1]).to.include({ date: '01 January 2024' });
    });

    it('should return filtered hearing notices from reheardHearingDocumentsCollection', () => {
      req.session.appeal.reheardHearingDocumentsCollection = [
        {
          value: {
            reheardHearingDocs: [
              { tag: 'hearingBundle', fileId: 'some-id-2345', dateUploaded: '2024-03-03' },
              { tag: 'updatedHearingBundle', fileId: 'some-id-4567', dateUploaded: '2024-03-10' },
              { tag: 'other', fileId: 'some-id-3456', dateUploaded: '2024-04-04' }
            ]
          }
        }
      ];

      const result = getAsyncStitchingEvent(req as Request);
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.include({ date: '10 March 2024' });
      expect(result[1]).to.include({ date: '03 March 2024' });
    });

    it('should handle both hearingDocuments and reheardHearingDocumentsCollection', () => {
      req.session.appeal.hearingDocuments = [
        { tag: 'hearingBundle', fileId: 'some-id-4567', dateUploaded: '2024-01-01' },
        { tag: 'updatedHearingBundle', fileId: 'some-id-2345', dateUploaded: '2024-01-03' }
      ];
      req.session.appeal.reheardHearingDocumentsCollection = [
        {
          value: {
            reheardHearingDocs: [
              { tag: 'hearingBundle', fileId: 'some-id-5678', dateUploaded: '2024-03-03' },
              { tag: 'updatedHearingBundle', fileId: 'some-id-4567', dateUploaded: '2024-03-10' }
            ]
          }
        }
      ];

      const result = getAsyncStitchingEvent(req as Request);
      expect(result).to.have.lengthOf(4);
      expect(result[0]).to.include({ date: '10 March 2024' });
      expect(result[1]).to.include({ date: '03 March 2024' });
      expect(result[2]).to.include({ date: '03 January 2024' });
      expect(result[3]).to.include({ date: '01 January 2024' });
    });
  });

  describe('getListCaseEvent', () => {
    it('should return an empty array when there are no hearing documents', () => {
      const result = getListCaseEvent(req as Request);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return filtered hearing notices from hearingDocuments', () => {
      req.session.appeal.hearingDocuments = [
        { tag: 'hearingNotice', fileId: 'some-id-0123', dateUploaded: '2024-01-05' },
        { tag: 'hearingNoticeRelisted', fileId: 'some-id-2345', dateUploaded: '2024-01-01' },
        { tag: 'other', fileId: 'some-id-1234', dateUploaded: '2024-01-02' }
      ];

      const result = getListCaseEvent(req as Request);
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.include({ date: '05 January 2024' });
      expect(result[1]).to.include({ date: '01 January 2024' });
    });

    it('should return filtered hearing notices from reheardHearingDocumentsCollection', () => {
      req.session.appeal.reheardHearingDocumentsCollection = [
        {
          value: {
            reheardHearingDocs: [
              { tag: 'reheardHearingNotice', fileId: 'some-id-2345', dateUploaded: '2024-03-03' },
              { tag: 'reheardHearingNoticeRelisted', fileId: 'some-id-4567', dateUploaded: '2024-03-10' },
              { tag: 'other', fileId: 'some-id-3456', dateUploaded: '2024-04-04' }
            ]
          }
        }
      ];

      const result = getListCaseEvent(req as Request);
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.include({ date: '10 March 2024' });
      expect(result[1]).to.include({ date: '03 March 2024' });
    });

    it('should handle both hearingDocuments and reheardHearingDocumentsCollection', () => {
      req.session.appeal.hearingDocuments = [
        { tag: 'hearingNotice', fileId: 'some-id-4567', dateUploaded: '2024-01-01' },
        { tag: 'hearingNoticeRelisted', fileId: 'some-id-2345', dateUploaded: '2024-01-03' }
      ];
      req.session.appeal.reheardHearingDocumentsCollection = [
        {
          value: {
            reheardHearingDocs: [
              { tag: 'reheardHearingNotice', fileId: 'some-id-5678', dateUploaded: '2024-03-03' },
              { tag: 'reheardHearingNoticeRelisted', fileId: 'some-id-4567', dateUploaded: '2024-03-10' }
            ]
          }
        }
      ];

      const result = getListCaseEvent(req as Request);
      expect(result).to.have.lengthOf(4);
      expect(result[0]).to.include({ date: '10 March 2024' });
      expect(result[1]).to.include({ date: '03 March 2024' });
      expect(result[2]).to.include({ date: '03 January 2024' });
      expect(result[3]).to.include({ date: '01 January 2024' });
    });

    it('should handle both hearingDocuments and reheardHearingDocumentsCollection by time', () => {
      req.session.appeal.hearingDocuments = [
        { tag: 'hearingNotice', fileId: 'some-id-4567', dateUploaded: '2024-01-01', dateTimeUploaded: '2024-01-01T17:00:00.000000' },
        { tag: 'hearingNoticeRelisted', fileId: 'some-id-2345', dateUploaded: '2024-01-01', dateTimeUploaded: '2024-01-01T12:00:00.000000' }
      ];
      req.session.appeal.reheardHearingDocumentsCollection = [
        {
          value: {
            reheardHearingDocs: [
              { tag: 'reheardHearingNotice', fileId: 'some-id-5678', dateUploaded: '2024-01-01', dateTimeUploaded: '2024-01-01T15:00:00.000000' },
              { tag: 'reheardHearingNoticeRelisted', fileId: 'some-id-7891', dateUploaded: '2024-01-01', dateTimeUploaded: '2024-01-01T17:00:52.000000' }
            ]
          }
        }
      ];

      const result = getListCaseEvent(req as Request);
      expect(result).to.have.lengthOf(4);
      expect(result[0].links[0].href).to.equal(paths.common.hearingNoticeViewer
        .replace(':id', 'some-id-7891'));
      expect(result[1].links[0].href).to.equal(paths.common.hearingNoticeViewer
        .replace(':id', 'some-id-4567'));
      expect(result[2].links[0].href).to.equal(paths.common.hearingNoticeViewer
        .replace(':id', 'some-id-5678'));
      expect(result[3].links[0].href).to.equal(paths.common.hearingNoticeViewer
        .replace(':id', 'some-id-2345'));
    });
  });

  describe('getAppealApplicationHistory', () => {
    it('should return the correct sections when paymentStatus is "Paid" and refundFeatureEnabled is true', async () => {

      const history = [
        {
          'id': 'uploadAdditionalEvidence',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        },
        {
          'id': 'uploadAddendumEvidenceLegalRep',
          'createdDate': '2020-04-14T14:53:26.099',
          'user': {
            'id': 'legal-rep'
          }
        }
      ] as HistoryEvent[];

      req.session.appeal.paymentStatus = 'Paid';
      req.session.appeal.paymentDate = '2024-04-03T08:00:30.233+0000';
      req.session.appeal.application.remissionOption = 'feeWaiverFromHo';
      req.session.appeal.application.isLateRemissionRequest = true;

      const fakeUpdateAppealService = {
        getAuthenticationService: sinon.stub().returns({
          getSecurityHeaders: sinon.stub().resolves({ /* fake security headers */ })
        }),
        getCcdService: sinon.stub().returns({
          getCaseHistory: sinon.stub().resolves(history)
        })
      };
      sandbox.stub(LaunchDarklyService.prototype, 'getVariation').withArgs(req as Request, FEATURE_FLAGS.DLRM_REFUND_FEATURE_FLAG, false).resolves(true);

      const expectedResult = [
        {
          'date': '03 April 2024',
          'dateObject': new Date('2024-04-03T08:00:30.233Z'),
          'text': 'You asked the Tribunal for a fee remission.',
          'links': [
            {
              'title': 'What you sent',
              'text': 'Your appeal details',
              'href': '{{ paths.common.appealDetailsViewer }}'
            }
          ]
        }
      ];

      const result = await getAppealApplicationHistory(req as Request, fakeUpdateAppealService as unknown as UpdateAppealService);
      expect(result.appealRemissionSection).to.deep.eq(expectedResult);
    });

    it('should return the correct sections when fee remission is decided', async () => {

      const history = [
        {
          'id': 'recordRemissionDecision',
          'createdDate': '2024-03-07'
        }
      ] as HistoryEvent[];

      req.session.appeal.paymentStatus = 'Paid';
      req.session.appeal.paymentDate = '2024-04-03T08:00:30.233+0000';
      req.session.appeal.application.remissionOption = 'feeWaiverFromHo';
      req.session.appeal.application.remissionDecision = 'approved';
      req.session.appeal.application.isLateRemissionRequest = true;

      const fakeUpdateAppealService = {
        getAuthenticationService: sinon.stub().returns({
          getSecurityHeaders: sinon.stub().resolves({ /* fake security headers */ })
        }),
        getCcdService: sinon.stub().returns({
          getCaseHistory: sinon.stub().resolves(history)
        })
      };
      sandbox.stub(LaunchDarklyService.prototype, 'getVariation').withArgs(req as Request, FEATURE_FLAGS.DLRM_REFUND_FEATURE_FLAG, false).resolves(true);

      const expectedResult = [
        {
          'date': '07 March 2024',
          'dateObject': new Date('2024-03-07'),
          'text': 'Your request for fee support was decided.',
          'links': [
            {
              'title': 'What the Tribunal said',
              'text': 'Your appeal details',
              'href': '{{ paths.common.appealDetailsViewer }}'
            }
          ]
        },
        {
          'date': '03 April 2024',
          'dateObject': new Date('2024-04-03T08:00:30.233Z'),
          'text': 'You asked the Tribunal for a fee remission.',
          'links': [
            {
              'title': 'What you sent',
              'text': 'Your appeal details',
              'href': '{{ paths.common.appealDetailsViewer }}'
            }
          ]
        }
      ];

      const result = await getAppealApplicationHistory(req as Request, fakeUpdateAppealService as unknown as UpdateAppealService);
      expect(result.appealRemissionDecisionSection).to.deep.eq(expectedResult);
    });

    it('should return the correct sections when manageAFeeUpdate event is in history with remission', async () => {
      const date1 = new Date('2024-04-14');
      const history = [
        {
          'id': 'manageFeeUpdate',
          'createdDate': date1
        },
        {
          'id': 'recordRemissionDecision',
          'createdDate': '2024-04-13T14:53:26.099'
        }
      ] as HistoryEvent[];

      req.session.appeal.paymentStatus = 'Paid';
      req.session.appeal.paymentDate = '2024-04-03T08:00:30.233+0000';
      req.session.appeal.application.remissionOption = 'feeWaiverFromHo';
      req.session.appeal.application.remissionDecision = 'approved';

      const fakeUpdateAppealService = {
        getAuthenticationService: sinon.stub().returns({
          getSecurityHeaders: sinon.stub().resolves({ /* fake security headers */ })
        }),
        getCcdService: sinon.stub().returns({
          getCaseHistory: sinon.stub().resolves(history)
        })
      };
      sandbox.stub(LaunchDarklyService.prototype, 'getVariation').withArgs(req as Request, FEATURE_FLAGS.DLRM_REFUND_FEATURE_FLAG, false).resolves(true);

      const expectedResult = [
        {
          'date': '14 April 2024',
          'dateObject': date1,
          'text': 'The fee for this appeal has changed.',
          'links': [
            {
              'title': 'What\'s changed',
              'text': 'Your appeal details',
              'href': '{{ paths.common.appealDetailsViewer }}'
            }
          ]
        }
      ];

      const result = await getAppealApplicationHistory(req as Request, fakeUpdateAppealService as unknown as UpdateAppealService);
      expect(result.appealRemissionDecisionSection).to.deep.eq(expectedResult);
    });

    it('should return the correct sections when manageAFeeUpdate event is in history without remission', async () => {
      const date1 = new Date('2024-04-14');
      const history = [
        {
          'id': 'manageFeeUpdate',
          'createdDate': date1
        }
      ];

      req.session.appeal.paymentStatus = 'Paid';
      req.session.appeal.paymentDate = '2024-04-03T08:00:30.233+0000';

      const fakeUpdateAppealService = {
        getAuthenticationService: sinon.stub().returns({
          getSecurityHeaders: sinon.stub().resolves({ /* fake security headers */ })
        }),
        getCcdService: sinon.stub().returns({
          getCaseHistory: sinon.stub().resolves(history)
        })
      };
      sandbox.stub(LaunchDarklyService.prototype, 'getVariation').withArgs(req as Request, FEATURE_FLAGS.DLRM_REFUND_FEATURE_FLAG, false).resolves(true);

      const expectedResult = [
        {
          'date': '14 April 2024',
          'dateObject': date1,
          'text': 'The fee for this appeal has changed.',
          'links': [
            {
              'title': 'What\'s changed',
              'text': 'Your appeal details',
              'href': '{{ paths.common.appealDetailsViewer }}'
            }
          ]
        }
      ];

      const result = await getAppealApplicationHistory(req as Request, fakeUpdateAppealService as unknown as UpdateAppealService);
      expect(result.appealRemissionDecisionSection).to.deep.eq(expectedResult);
    });
  });
});
