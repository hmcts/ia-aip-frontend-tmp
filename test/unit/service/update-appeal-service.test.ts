import { Request } from 'express';
import { FEATURE_FLAGS } from '../../../app/data/constants';
import { Events } from '../../../app/data/events';
import { AuthenticationService } from '../../../app/service/authentication-service';
import { CcdService } from '../../../app/service/ccd-service';
import { DocumentManagementService } from '../../../app/service/document-management-service';
import IdamService from '../../../app/service/idam-service';
import LaunchDarklyService from '../../../app/service/launchDarkly-service';
import S2SService from '../../../app/service/s2s-service';
import UpdateAppealService from '../../../app/service/update-appeal-service';
import { expect, sinon, validateUuid } from '../../utils/testUtils';

describe('update-appeal-service', () => {
  let sandbox: sinon.SinonSandbox;
  let ccdServiceMock: sinon.SinonMock;
  let req: Partial<Request>;
  let ccdService: Partial<CcdService>;
  let idamService: Partial<IdamService>;
  let s2sService: Partial<S2SService>;
  let authenticationService: AuthenticationService;
  let updateAppealService: UpdateAppealService;
  let expectedCaseData: Partial<CaseData>;
  let documentManagementService: DocumentManagementService;

  const userId = 'userId';
  const userToken = 'userToken';
  const serviceToken = 'serviceToken';
  const caseId = 'caseId';
  const appealReferenceNumber = 'PA/1234/2022';
  const ccdReferenceNumberForDisplay = '1111 2222 3333 4444';

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    idamService = new IdamService();
    s2sService = new S2SService();
    authenticationService = new AuthenticationService(idamService as IdamService, s2sService as S2SService);
    ccdService = new CcdService();

    ccdServiceMock = sandbox.mock(ccdService);

    sandbox.stub(idamService, 'getUserToken').returns(userToken);
    sandbox.stub(s2sService, 'getServiceToken').resolves(serviceToken);
    sandbox.stub(LaunchDarklyService.prototype, 'getVariation')
      .withArgs(req as Request, FEATURE_FLAGS.CARD_PAYMENTS, false).resolves(false)
      .withArgs(req as Request, FEATURE_FLAGS.PCQ, false).resolves(false)
      .withArgs(req as Request, FEATURE_FLAGS.HEARING_REQUIREMENTS, false).resolves(false)
      .withArgs(req as Request, FEATURE_FLAGS.HEARING_BUNDLE, false).resolves(false)
      .withArgs(req as Request, FEATURE_FLAGS.OUT_OF_COUNTRY, false).resolves(false)
      .withArgs(req as Request, FEATURE_FLAGS.UPLOAD_ADDENDUM_EVIDENCE, false).resolves(false)
      .withArgs(req as Request, FEATURE_FLAGS.MAKE_APPLICATION, false).resolves(false)
      .withArgs(req as Request, FEATURE_FLAGS.FTPA, false).resolves(false)
      .withArgs(req as Request, FEATURE_FLAGS.USE_CCD_DOCUMENT_AM, false).resolves(false);
    documentManagementService = new DocumentManagementService(authenticationService);

    updateAppealService = new UpdateAppealService(ccdService as CcdService, authenticationService, null, documentManagementService);
    req = {
      idam: {
        userDetails: {
          uid: userId,
          name: 'name',
          given_name: 'given',
          family_name: 'family'
        }
      },
      session: {
        appeal: {}
      }
    } as Partial<Request>;

    expectedCaseData = {
      'appealType': 'protection',
      'appellantInUk': 'undefined',
      'hasSponsor': 'No',
      'sponsorGivenNames': 'ABC XYZ',
      'sponsorFamilyName': 'ABC XYZ',
      'sponsorNameForDisplay': 'ABC XYZ',
      'sponsorAuthorisation': 'ABC XYZ',
      'outsideUkWhenApplicationMade': 'No',
      'gwfReferenceNumber': '',
      'dateClientLeaveUk': '2022-02-19',
      'journeyType': 'aip',
      'homeOfficeReferenceNumber': 'A1234567',
      'appealReferenceNumber': 'PA/1234/2022',
      'ccdReferenceNumberForDisplay': '1111 2222 3333 4444',
      'homeOfficeDecisionDate': '2019-01-02',
      'appellantFamilyName': 'Pedro',
      'appellantGivenNames': 'Jimenez',
      'appellantDateOfBirth': '1990-03-21',
      'appellantNationalities': [{ 'id': '0f583a62-e98a-4a76-abe2-130ad5547726', 'value': { 'code': 'AF' } }],
      'appellantHasFixedAddress': 'Yes',
      'appellantAddress': {
        'County': '',
        'Country': 'United Kingdom',
        'PostCode': 'W1W 7RT',
        'PostTown': 'LONDON',
        'AddressLine1': '123 An Address',
        'AddressLine2': ''
      },
      'submissionOutOfTime': 'Yes',
      'recordedOutOfTimeDecision': 'No',
      'applicationOutOfTimeExplanation': 'An Explanation on why this appeal was late',
      'applicationOutOfTimeDocument': {
        'document_url': 'http://dm-store:4506/documents/9f788e06-cc7d-4bf9-8d73-418b5fdcf891',
        'document_filename': '1580296112615-evidence-file.jpeg',
        'document_binary_url': 'http://dm-store:4506/documents/9f788e06-cc7d-4bf9-8d73-418b5fdcf891/binary'
      },
      'subscriptions': [{
        'id': '7166f13d-1f99-4323-9459-b22a8325db9d',
        'value': {
          'subscriber': 'appellant',
          'email': 'email@example.net',
          'wantsSms': 'Yes',
          'mobileNumber': '07123456789',
          'wantsEmail': 'Yes'
        }
      }],
      'reasonsForAppealDecision': 'I\'ve decided to appeal because ...',
      'reasonsForAppealDateUploaded': '2020-01-02',
      'reasonsForAppealDocuments': [{
        'id': 'f29cde8d-e407-4ed1-8137-0eb2f9b3cc42',
        'value': {
          document: {
            'document_url': 'http://dm-store:4506/documents/f29cde8d-e407-4ed1-8137-0eb2f9b3cc42',
            'document_filename': '1580296112615-supporting-evidence-file.jpeg',
            'document_binary_url': 'http://dm-store:4506/documents/f29cde8d-e407-4ed1-8137-0eb2f9b3cc42/binary'
          }
        }
      }
      ],
      'respondentDocuments': [
        {
          'id': '1',
          'value': {
            'tag': 'respondentEvidence',
            'document': {
              'document_url': 'http://dm-store:4506/documents/086bdfd6-b0cc-4405-8332-cf1288f38aa2',
              'document_filename': 'Screenshot.png',
              'document_binary_url': 'http://dm-store:4506/documents/086bdfd6-b0cc-4405-8332-cf1288f38aa2/binary'
            },
            'description': 'Screenshot of evidence',
            'dateUploaded': '2020-02-21'
          }
        }
      ],
      'timeExtensions': [
        {
          id: '2',
          value: {
            decisionReason: 'Time extension has been granted',
            decision: 'granted',
            requestDate: '2020-01-01',
            reason: 'first reason',
            status: 'completed',
            evidence: [],
            state: 'awaitingReasonsForAppeal'
          }
        },
        {
          id: '1',
          value: {
            requestDate: '2020-01-02',
            reason: 'some reason',
            status: 'inProgress',
            state: 'awaitingReasonsForAppeal',
            evidence: [{
              value: {
                'document_url': 'http://dm-store:4506/documents/086bdfd6-b0cc-4405-8332-cf1288f38aa2',
                'document_filename': 'expected_time_extension_evidence.png',
                'document_binary_url': 'http://dm-store:4506/documents/086bdfd6-b0cc-4405-8332-cf1288f38aa2/binary'
              }
            }]
          }
        }
      ],
      isInterpreterServicesNeeded: 'false',
      isHearingRoomNeeded: 'true',
      isHearingLoopNeeded: 'true',
      hearingCentre: 'birmingham',
      feeUpdateTribunalAction: 'refund',
      feeUpdateReason: 'feeRemissionChanged',
      manageFeeRefundedAmount: '1000',
      manageFeeRequestedAmount: '1500',
      paidAmount: '2000',
      newFeeAmount: '2000',
      previousFeeAmountGbp: '2000'
    };

  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return the CcdService instance', () => {
    expect(updateAppealService.getCcdService()).eq(ccdService);
  });

  it('should return the AuthenticationService instance', () => {
    expect(updateAppealService.getAuthenticationService()).eq(authenticationService);
  });

  describe('loadAppeal', () => {
    it('set case details', async () => {
      ccdServiceMock.expects('loadOrCreateCase')
        .withArgs(userId, { userToken, serviceToken })
        .resolves({
          id: caseId,
          state: 'awaitingReasonsForAppeal',
          case_data: expectedCaseData
        });
      await updateAppealService.loadAppeal(req as Request);
      expect(req.session.appeal.ccdCaseId).eq(caseId);
      expect(req.session.appeal.appealReferenceNumber).eq(appealReferenceNumber);
      expect(req.session.appeal.ccdReferenceNumber).eq(ccdReferenceNumberForDisplay);
      expect(req.session.appeal.application.appealType).eq('protection');
      expect(req.session.appeal.application.homeOfficeRefNumber).eq('A1234567');
      expect(req.session.appeal.application.personalDetails.familyName).eq('Pedro');
      expect(req.session.appeal.application.personalDetails.givenNames).eq('Jimenez');
      expect(req.session.appeal.application.dateLetterSent.year).eq('2019');
      expect(req.session.appeal.application.dateLetterSent.month).eq('1');
      expect(req.session.appeal.application.dateLetterSent.day).eq('2');
      expect(req.session.appeal.application.personalDetails.dob.year).eq('1990');
      expect(req.session.appeal.application.personalDetails.dob.month).eq('3');
      expect(req.session.appeal.application.personalDetails.dob.day).eq('21');
      expect(req.session.appeal.application.personalDetails.nationality).eq('AF');
      expect(req.session.appeal.application.personalDetails.address.line1).eq('123 An Address');
      expect(req.session.appeal.application.personalDetails.address.city).eq('LONDON');
      expect(req.session.appeal.application.personalDetails.address.postcode).eq('W1W 7RT');
      expect(req.session.appeal.application.isAppealLate).eq(true);
      expect(req.session.appeal.application.lateAppeal.evidence.name).eq('1580296112615-evidence-file.jpeg');
      validateUuid(req.session.appeal.application.lateAppeal.evidence.fileId);
      expect(req.session.appeal.application.contactDetails.email).eq('email@example.net');
      expect(req.session.appeal.application.contactDetails.phone).eq('07123456789');
      expect(req.session.appeal.application.contactDetails.wantsEmail).eq(true);
      expect(req.session.appeal.application.contactDetails.wantsSms).eq(true);
      expect(req.session.appeal.reasonsForAppeal.applicationReason).eq('I\'ve decided to appeal because ...');
      expect(req.session.appeal.reasonsForAppeal.uploadDate).eq('2020-01-02');
      expect(req.session.appeal.reasonsForAppeal.evidences).to.exist;
      expect(req.session.appeal.documentMap).to.exist;
      expect(req.session.appeal.askForMoreTime).to.deep.eq({ inFlight: false });
      expect(req.session.appeal.cmaRequirements.accessNeeds.isInterpreterServicesNeeded).to.eq(false);
      expect(req.session.appeal.cmaRequirements.accessNeeds.isHearingLoopNeeded).to.eq(false);
      expect(req.session.appeal.cmaRequirements.accessNeeds.isHearingRoomNeeded).to.eq(false);
      expect(req.session.appeal.hearingCentre).eq('birmingham');
      expect(req.session.appeal.application.hasSponsor).eq('No');
      expect(req.session.appeal.application.sponsorGivenNames).eq('ABC XYZ');
      expect(req.session.appeal.application.sponsorFamilyName).eq('ABC XYZ');
      expect(req.session.appeal.application.sponsorNameForDisplay).eq('ABC XYZ');
      expect(req.session.appeal.application.sponsorAuthorisation).eq('ABC XYZ');
      expect(req.session.appeal.application.feeUpdateTribunalAction).eq('refund');
      expect(req.session.appeal.application.feeUpdateReason).eq('feeRemissionChanged');
      expect(req.session.appeal.application.manageFeeRefundedAmount).eq('1000');
      expect(req.session.appeal.application.manageFeeRequestedAmount).eq('1500');
      expect(req.session.appeal.application.paidAmount).eq('2000');
      expect(req.session.appeal.newFeeAmount).eq('2000');
      expect(req.session.appeal.previousFeeAmountGbp).eq('2000');
    });

    it('load time extensions when no time extensions', async () => {
      expectedCaseData.timeExtensions = undefined;

      ccdServiceMock.expects('loadOrCreateCase')
        .withArgs(userId, { userToken, serviceToken })
        .resolves({
          id: caseId,
          state: 'awaitingReasonsForAppeal',
          case_data: expectedCaseData
        });
      await updateAppealService.loadAppeal(req as Request);

      expect(req.session.appeal.askForMoreTime).to.be.eql(
        { inFlight: false });
    });

    it('load CQ from directions object', async () => {

      const directionsClarifyingQuestions: ClarifyingQuestion<Collection<SupportingDocument>>[] = [
        {
          id: '947398d5-bd81-4e7f-b3ed-1be73be5ba56',
          value: {
            dateSent: '2020-04-23',
            dueDate: '2020-05-07',
            question: 'Give us some more information about:\n- What are their ages?\n  - What are their names?',
            directionId: 'directionId'
          }
        }
      ];

      const appealClarifyingQuestions: ClarifyingQuestion<Evidence>[] = [
        {
          id: '947398d5-bd81-4e7f-b3ed-1be73be5ba56',
          value: {
            dateSent: '2020-04-23',
            dueDate: '2020-05-07',
            question: 'Give us some more information about:\n- What are their ages?\n  - What are their names?',
            directionId: 'directionId'
          }
        },
        {
          value: {
            dateSent: '2020-04-23',
            dueDate: '2020-05-07',
            question: 'Do you want to tell us anything else about your case?',
            directionId: 'directionId'
          }
        }
      ];
      expectedCaseData.directions = [
        {
          id: '3',
          value: {
            tag: 'requestClarifyingQuestions',
            dateDue: '2020-05-07',
            parties: 'appellant',
            dateSent: '2020-04-23',
            explanation: 'You need to answer some questions about your appeal.',
            previousDates: [],
            uniqueId: 'directionId',
            clarifyingQuestions: directionsClarifyingQuestions
          }
        }
      ];

      ccdServiceMock.expects('loadOrCreateCase')
        .withArgs(userId, { userToken, serviceToken })
        .resolves({
          id: caseId,
          state: 'awaitingClarifyingQuestionsAnswers',
          case_data: expectedCaseData
        });
      await updateAppealService.loadAppeal(req as Request);
      expect(req.session.appeal.draftClarifyingQuestionsAnswers).to.deep.equal(appealClarifyingQuestions);
    });

    it('load draftClarifyingQuestion', async () => {
      const draftClarifyingQuestion: ClarifyingQuestion<Collection<SupportingDocument>> = {
        id: 'id',
        value: {
          dateSent: '2020-04-23',
          dueDate: '2020-05-07',
          question: 'the questions',
          answer: 'draft answer',
          dateResponded: '2020-05-01',
          directionId: 'directionId'
        }
      };

      const appealClarifyingQuestions: ClarifyingQuestion<Evidence>[] = [
        {
          id: 'id',
          value: {
            dateSent: '2020-04-23',
            dueDate: '2020-05-07',
            question: 'the questions',
            answer: 'draft answer',
            dateResponded: '2020-05-01',
            supportingEvidence: [],
            directionId: 'directionId'
          }
        }
      ];
      expectedCaseData.draftClarifyingQuestionsAnswers = [{ ...draftClarifyingQuestion }];
      expectedCaseData.directions = [
        {
          id: '3',
          value: {
            tag: 'requestClarifyingQuestions',
            dateDue: '2020-05-07',
            parties: 'appellant',
            dateSent: '2020-04-23',
            explanation: 'You need to answer some questions about your appeal.',
            previousDates: [],
            uniqueId: 'directionId',
            clarifyingQuestions: [
              {
                id: '947398d5-bd81-4e7f-b3ed-1be73be5ba56',
                value: {
                  question: 'Give us some more information about:\n- What are their ages?\n  - What are their names?'
                }
              },
              {
                id: 'ddc8a194-30b3-40d9-883e-d034a7451170',
                value: {
                  question: 'Tell us more about your health issues\n- How long have you suffered from this problem?\n- How does it affect your daily life?'
                }
              }
            ]
          }
        }
      ];

      ccdServiceMock.expects('loadOrCreateCase')
        .withArgs(userId, { userToken, serviceToken })
        .resolves({
          id: caseId,
          state: 'awaitingClarifyingQuestionsAnswers',
          case_data: expectedCaseData
        });
      await updateAppealService.loadAppeal(req as Request);
      expect(req.session.appeal.draftClarifyingQuestionsAnswers).to.deep.equal(appealClarifyingQuestions);
    });

    it('load clarifyingQuestion', async () => {
      expectedCaseData.draftClarifyingQuestionsAnswers = null;
      expectedCaseData.directions = [
        {
          id: '3',
          value: {
            tag: 'requestClarifyingQuestions',
            dateDue: '2020-05-07',
            parties: 'appellant',
            dateSent: '2020-04-23',
            explanation: 'You need to answer some questions about your appeal.',
            clarifyingQuestions: [
              {
                value: {
                  question: 'the questions'
                }
              }
            ],
            previousDates: [],
            uniqueId: 'directionId'
          }
        }
      ];

      ccdServiceMock.expects('loadOrCreateCase')
        .withArgs(userId, { userToken, serviceToken })
        .resolves({
          id: caseId,
          state: 'awaitingClarifyingQuestionsAnswers',
          case_data: expectedCaseData
        });

      await updateAppealService.loadAppeal(req as Request);

      const appealClarifyingQuestions: ClarifyingQuestion<Evidence>[] = [
        {
          value: {
            dateSent: '2020-04-23',
            dueDate: '2020-05-07',
            question: 'the questions',
            directionId: 'directionId'
          }
        },
        {
          value: {
            dateSent: '2020-04-23',
            dueDate: '2020-05-07',
            question: 'Do you want to tell us anything else about your case?',
            directionId: 'directionId'
          }
        }
      ];
      expect(req.session.appeal.draftClarifyingQuestionsAnswers).to.deep.equal(appealClarifyingQuestions);
    });

    it('load cmaRequirements', async () => {

      expectedCaseData = {
        ...expectedCaseData,
        datesToAvoid: [{
          value: {
            dateToAvoid: '2020-06-23',
            dateToAvoidReason: 'I have an important appointment on this day'
          }
        }, {
          value: { dateToAvoid: '2020-06-24', dateToAvoidReason: 'I need this day off' }
        }],
        datesToAvoidYesNo: 'Yes',
        inCameraCourt: 'Yes',
        inCameraCourtDescription: 'The reason why I would need a private appointment',
        interpreterLanguage: [{ value: { language: 'Afar', languageDialect: 'A dialect' } }],
        isHearingLoopNeeded: 'Yes',
        isHearingRoomNeeded: 'Yes',
        isInterpreterServicesNeeded: 'Yes',
        multimediaEvidence: 'Yes',
        multimediaEvidenceDescription: 'I do not own the equipment',
        pastExperiences: 'Yes',
        pastExperiencesDescription: 'Past experiences description',
        physicalOrMentalHealthIssues: 'Yes',
        physicalOrMentalHealthIssuesDescription: 'Reason for mental health conditions',
        singleSexCourt: 'Yes',
        singleSexCourtType: 'All female',
        singleSexCourtTypeDescription: 'The reason why I will need an all-female',
        additionalRequests: 'Yes',
        additionalRequestsDescription: 'Anything else description'
      };

      ccdServiceMock.expects('loadOrCreateCase')
        .withArgs(userId, { userToken, serviceToken })
        .resolves({
          id: caseId,
          state: 'awaitingCmaRequirements',
          case_data: expectedCaseData
        });
      await updateAppealService.loadAppeal(req as Request);

      const expectedCmaRequirements = {
        'accessNeeds': {
          'interpreterLanguage': [
            {
              'value': {
                'language': 'Afar',
                'languageDialect': 'A dialect'
              }
            }
          ],
          'isHearingLoopNeeded': true,
          'isHearingRoomNeeded': true,
          'isInterpreterServicesNeeded': true
        },
        'otherNeeds': {
          'anythingElse': true,
          'anythingElseReason': 'Anything else description',
          'bringOwnMultimediaEquipment': false,
          'bringOwnMultimediaEquipmentReason': 'I do not own the equipment',
          'healthConditions': true,
          'healthConditionsReason': 'Reason for mental health conditions',
          'multimediaEvidence': true,
          'pastExperiences': true,
          'pastExperiencesReason': 'Past experiences description',
          'privateAppointment': true,
          'privateAppointmentReason': 'The reason why I would need a private appointment',
          'singleSexAppointment': true,
          'singleSexAppointmentReason': 'The reason why I will need an all-female',
          'singleSexTypeAppointment': 'All female'
        },
        'datesToAvoid': {
          'isDateCannotAttend': true,
          'dates': [
            {
              'date': {
                'day': '23',
                'month': '6',
                'year': '2020'
              },
              'reason': 'I have an important appointment on this day'
            },
            {
              'date': {
                'day': '24',
                'month': '6',
                'year': '2020'
              },
              'reason': 'I need this day off'
            }
          ]
        }
      };
      expect(req.session.appeal.cmaRequirements).to.be.eql(expectedCmaRequirements);
    });

  });

  describe('convert to ccd case', () => {
    let emptyApplication;
    let witness1: WitnessName;
    let witness2: WitnessName;
    beforeEach(() => {
      emptyApplication = {
        application: {
          homeOfficeRefNumber: null,
          appealType: null,
          contactDetails: {
            email: null,
            phone: null
          },
          outsideUkWhenApplicationMade: null,
          gwfReferenceNumber: null,
          dateClientLeaveUk: {
            year: null,
            month: null,
            day: null
          },
          dateLetterSent: {
            year: null,
            month: null,
            day: null
          },
          decisionLetterReceivedDate: {
            year: null,
            month: null,
            day: null
          },
          isAppealLate: false,
          lateAppeal: null,
          personalDetails: {
            givenNames: null,
            familyName: null,
            dob: {
              year: null,
              month: null,
              day: null
            },
            nationality: null
          }
        } as Partial<AppealApplication>,
        askForMoreTime: {
          reason: null
        },
        hearingRequirements: {} as Partial<HearingRequirements>
      } as Partial<Appeal>;

      witness1 = { witnessPartyId: '1', witnessGivenNames: 'witness', witnessFamilyName: '1' };
      witness2 = { witnessPartyId: '2', witnessGivenNames: 'witness', witnessFamilyName: '2' };
    });

    it('converts empty application', () => {
      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

      expect(caseData).contains({
        journeyType: 'aip'
      });
    });

    it('converts home office reference number', () => {
      emptyApplication.application.homeOfficeRefNumber = 'ref';
      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

      expect(caseData).contains({
        journeyType: 'aip',
        homeOfficeReferenceNumber: 'ref'
      });
    });

    describe('converts home office letter date', () => {
      it('full date', () => {
        emptyApplication.application.dateLetterSent = { year: '2019', month: '12', day: '11' };
        emptyApplication.application.isAppealLate = true;
        const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

        expect(caseData).contains({
          journeyType: 'aip',
          homeOfficeDecisionDate: '2019-12-11',
          submissionOutOfTime: 'Yes',
          applicationOutOfTimeDocument: null
        });
      });

      it('day and month leading 0', () => {
        emptyApplication.application.dateLetterSent = { year: '2019', month: '02', day: '01' };
        emptyApplication.application.isAppealLate = true;
        const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

        expect(caseData).contains({
          journeyType: 'aip',
          homeOfficeDecisionDate: '2019-02-01',
          submissionOutOfTime: 'Yes',
          applicationOutOfTimeDocument: null
        });
      });

      it('day and month no leading 0', () => {
        emptyApplication.application.dateLetterSent = { year: '2019', month: '2', day: '3' };
        emptyApplication.application.isAppealLate = true;
        const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);
        expect(caseData).contains({
          journeyType: 'aip',
          homeOfficeDecisionDate: '2019-02-03',
          submissionOutOfTime: 'Yes',
          applicationOutOfTimeDocument: null
        });
      });
    });

    it('converts given names', () => {
      emptyApplication.application.personalDetails.givenNames = 'givenNames';
      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

      expect(caseData).contains({
        journeyType: 'aip',
        appellantGivenNames: 'givenNames'
      });
    });

    it('converts family name', () => {
      emptyApplication.application.personalDetails.familyName = 'familyName';
      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

      expect(caseData).contains({
        journeyType: 'aip',
        appellantFamilyName: 'familyName'
      });
    });

    describe('converts date of birth', () => {
      it('full date', () => {
        emptyApplication.application.personalDetails = {
          dob: { year: '2019', month: '12', day: '11' }
        };
        const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

        expect(caseData).contains({
          journeyType: 'aip',
          appellantDateOfBirth: '2019-12-11'
        });
      });

      it('day and month leading 0', () => {
        emptyApplication.application.personalDetails = {
          dob: { year: '2019', month: '02', day: '01' }
        };
        const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

        expect(caseData).contains({
          journeyType: 'aip',
          appellantDateOfBirth: '2019-02-01'
        });
      });

      it('day and month no leading 0', () => {
        emptyApplication.application.personalDetails = {
          dob: { year: '2019', month: '2', day: '3' }
        };
        const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

        expect(caseData).contains({
          journeyType: 'aip',
          appellantDateOfBirth: '2019-02-03'
        });
      });
    });
    it('converts appealType', () => {
      emptyApplication.application.appealType = 'appealType';
      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

      expect(caseData).contains({
        journeyType: 'aip',
        appealType: 'appealType'
      });
    });
    describe('converts contact details', () => {
      it('converts contactDetails for both email and phone', () => {
        emptyApplication.application.contactDetails.wantsEmail = true;
        emptyApplication.application.contactDetails.email = 'abc@example.net';
        emptyApplication.application.contactDetails.wantsSms = true;
        emptyApplication.application.contactDetails.phone = '07123456789';
        const caseData = updateAppealService.convertToCcdCaseData(emptyApplication, true, true);

        expect(caseData).eql(
          {
            appellantEmailAddress: 'abc@example.net',
            appellantPhoneNumber: '07123456789',
            appellantInUk: 'undefined',
            gwfReferenceNumber: null,
            isHearingLoopNeeded: null,
            isHearingRoomNeeded: null,
            isLateRemissionRequest: 'No',
            asylumSupportRefNumber: null,
            decisionHearingFeeOption: null,
            feeSupportPersisted: 'No',
            helpWithFeesOption: null,
            helpWithFeesRefNumber: null,
            localAuthorityLetters: null,
            paAppealTypeAipPaymentOption: null,
            pcqId: null,
            refundConfirmationApplied: 'No',
            refundRequested: 'No',
            remissionDecision: null,
            remissionOption: null,
            rpDcAppealHearingOption: null,
            lateAsylumSupportRefNumber: null,
            lateHelpWithFeesOption: null,
            lateHelpWithFeesRefNumber: null,
            lateLocalAuthorityLetters: null,
            lateRemissionOption: null,
            journeyType: 'aip',
            subscriptions: [
              {
                value: {
                  subscriber: 'appellant',
                  wantsEmail: 'Yes',
                  email: 'abc@example.net',
                  wantsSms: 'Yes',
                  mobileNumber: '07123456789'
                }
              }
            ]
          }
        );
      });

      it('converts contactDetails only email', () => {
        emptyApplication.application.contactDetails.wantsEmail = true;
        emptyApplication.application.contactDetails.email = 'abc@example.net';
        const caseData = updateAppealService.convertToCcdCaseData(emptyApplication, true, true);

        expect(caseData).eql(
          {
            journeyType: 'aip',
            appellantInUk: 'undefined',
            gwfReferenceNumber: null,
            isHearingLoopNeeded: null,
            isHearingRoomNeeded: null,
            isLateRemissionRequest: 'No',
            asylumSupportRefNumber: null,
            decisionHearingFeeOption: null,
            feeSupportPersisted: 'No',
            helpWithFeesOption: null,
            helpWithFeesRefNumber: null,
            localAuthorityLetters: null,
            paAppealTypeAipPaymentOption: null,
            pcqId: null,
            refundConfirmationApplied: 'No',
            refundRequested: 'No',
            remissionDecision: null,
            remissionOption: null,
            rpDcAppealHearingOption: null,
            lateAsylumSupportRefNumber: null,
            lateHelpWithFeesOption: null,
            lateHelpWithFeesRefNumber: null,
            lateLocalAuthorityLetters: null,
            lateRemissionOption: null,
            appellantEmailAddress: 'abc@example.net',
            subscriptions: [
              {
                value: {
                  subscriber: 'appellant',
                  wantsEmail: 'Yes',
                  email: 'abc@example.net',
                  wantsSms: 'No',
                  mobileNumber: null
                }
              }
            ]
          }
        );
      });

      it('converts contactDetails only phone', () => {
        emptyApplication.application.contactDetails.wantsSms = true;
        emptyApplication.application.contactDetails.phone = '07123456789';
        const caseData = updateAppealService.convertToCcdCaseData(emptyApplication, true, true);

        expect(caseData).eql(
          {
            journeyType: 'aip',
            appellantInUk: 'undefined',
            appellantPhoneNumber: '07123456789',
            gwfReferenceNumber: null,
            isHearingLoopNeeded: null,
            isHearingRoomNeeded: null,
            isLateRemissionRequest: 'No',
            asylumSupportRefNumber: null,
            decisionHearingFeeOption: null,
            feeSupportPersisted: 'No',
            helpWithFeesOption: null,
            helpWithFeesRefNumber: null,
            localAuthorityLetters: null,
            paAppealTypeAipPaymentOption: null,
            pcqId: null,
            refundConfirmationApplied: 'No',
            refundRequested: 'No',
            remissionDecision: null,
            remissionOption: null,
            rpDcAppealHearingOption: null,
            lateAsylumSupportRefNumber: null,
            lateHelpWithFeesOption: null,
            lateHelpWithFeesRefNumber: null,
            lateLocalAuthorityLetters: null,
            lateRemissionOption: null,
            subscriptions: [
              {
                value: {
                  subscriber: 'appellant',
                  wantsEmail: 'No',
                  email: null,
                  wantsSms: 'Yes',
                  mobileNumber: '07123456789'
                }
              }
            ]
          }
        );
      });
    });

    it('converts empty application', () => {
      emptyApplication.draftClarifyingQuestionsAnswers = [
        {
          id: '947398d5-bd81-4e7f-b3ed-1be73be5ba56',
          value: {
            dateSent: '2020-04-23',
            dueDate: '2020-05-07',
            question: 'Give us some more information about:\n- What are their ages?\n  - What are their names?',
            directionId: 'directionId'
          }
        },
        {
          value: {
            dateSent: '2020-04-23',
            dueDate: '2020-05-07',
            question: 'Do you want to tell us anything else about your case?',
            directionId: 'directionId'
          }
        }
      ];

      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

      expect(caseData).to.deep.eq(
        {
          'journeyType': 'aip',
          'appellantInUk': 'undefined',
          'gwfReferenceNumber': null,
          'remissionOption': null,
          'asylumSupportRefNumber': null,
          'helpWithFeesOption': null,
          'helpWithFeesRefNumber': null,
          'localAuthorityLetters': null,
          'feeSupportPersisted': 'No',
          'isHearingRoomNeeded': null,
          'isHearingLoopNeeded': null,
          'draftClarifyingQuestionsAnswers': [
            {
              'id': '947398d5-bd81-4e7f-b3ed-1be73be5ba56',
              'value': {
                'dateSent': '2020-04-23',
                'dueDate': '2020-05-07',
                'question': 'Give us some more information about:\n- What are their ages?\n  - What are their names?',
                'directionId': 'directionId'
              }
            },
            {
              'value': {
                'dateSent': '2020-04-23',
                'dueDate': '2020-05-07',
                'question': 'Do you want to tell us anything else about your case?',
                'directionId': 'directionId'
              }
            }
          ]
        }
      );
    });

    it('mapToCCDCaseSponsorAddress', () => {
      emptyApplication.application.contactDetails.wantsEmail = true;
      emptyApplication.application.contactDetails.email = 'abc@example.net';
      emptyApplication.application.sponsorAddress = {
        line1: '60 GREAT PORTLAND STREET',
        line2: '',
        city: 'LONDON',
        county: 'Greater London',
        postcode: 'W1W 7RT'
      };
      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication, true, true);

      expect(caseData).to.deep.eq(
        {
          'journeyType': 'aip',
          'appellantInUk': 'undefined',
          'gwfReferenceNumber': null,
          'remissionOption': null,
          'asylumSupportRefNumber': null,
          'helpWithFeesOption': null,
          'helpWithFeesRefNumber': null,
          'localAuthorityLetters': null,
          'feeSupportPersisted': 'No',
          'refundRequested': 'No',
          'isLateRemissionRequest': 'No',
          'remissionDecision': null,
          'lateRemissionOption': null,
          'lateAsylumSupportRefNumber': null,
          'lateHelpWithFeesOption': null,
          'lateHelpWithFeesRefNumber': null,
          'lateLocalAuthorityLetters': null,
          'refundConfirmationApplied': 'No',
          'appellantEmailAddress': 'abc@example.net',
          'subscriptions': [
            {
              'value': {
                'subscriber': 'appellant',
                'wantsEmail': 'Yes',
                'email': 'abc@example.net',
                'wantsSms': 'No',
                'mobileNumber': null
              }
            }
          ],
          'sponsorAddress': {
            'AddressLine1': '60 GREAT PORTLAND STREET',
            'AddressLine2': '',
            'PostTown': 'LONDON',
            'County': 'Greater London',
            'PostCode': 'W1W 7RT',
            'Country': 'United Kingdom'
          },
          'isHearingRoomNeeded': null,
          'isHearingLoopNeeded': null,
          'rpDcAppealHearingOption': null,
          'decisionHearingFeeOption': null,
          'paAppealTypeAipPaymentOption': null,
          'pcqId': null
        }
      );
    });

    it('converts time extension when no previous time extensions or current time extensions', () => {
      emptyApplication.askForMoreTime = {};

      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication, true);

      expect(caseData).contains(
        {
          journeyType: 'aip'
        }
      );
    });

    it('converts time extension and previous timeExtensions', () => {
      emptyApplication.askForMoreTime.requestDate = '2020-01-02';
      emptyApplication.askForMoreTime.reason = 'more time reason';
      emptyApplication.askForMoreTime.status = 'inProgress';
      emptyApplication.askForMoreTime.state = 'awaitingReasonsForAppeal';
      emptyApplication.askForMoreTime.reviewTimeExtensionRequired = 'Yes';
      emptyApplication.askForMoreTime.evidence = [
        {
          id: 'id',
          fileId: 'fileId',
          name: 'name'
        }
      ];

      emptyApplication.timeExtensions = [{
        evidence: [],
        decision: 'granted',
        decisionReason: 'Request has been granted',
        reason: 'ask for more time reason',
        status: 'granted',
        state: 'awaitingReasonsForAppeal',
        requestDate: '2020-04-21'
      }];

      emptyApplication.documentMap = [{ id: 'fileId', url: 'someurl' }] as DocumentMap[];

      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication, true, true);

      expect(caseData).to.deep.eq(
        {
          'journeyType': 'aip',
          'appellantInUk': 'undefined',
          'gwfReferenceNumber': null,
          'isHearingLoopNeeded': null,
          'isHearingRoomNeeded': null,
          'isLateRemissionRequest': 'No',
          'asylumSupportRefNumber': null,
          'decisionHearingFeeOption': null,
          'feeSupportPersisted': 'No',
          'helpWithFeesOption': null,
          'helpWithFeesRefNumber': null,
          'localAuthorityLetters': null,
          'paAppealTypeAipPaymentOption': null,
          'pcqId': null,
          'refundConfirmationApplied': 'No',
          'refundRequested': 'No',
          'remissionDecision': null,
          'remissionOption': null,
          'lateAsylumSupportRefNumber': null,
          'lateHelpWithFeesOption': null,
          'lateHelpWithFeesRefNumber': null,
          'lateLocalAuthorityLetters': null,
          'lateRemissionOption': null,
          'reviewTimeExtensionRequired': 'Yes',
          'rpDcAppealHearingOption': null,
          'submitTimeExtensionReason': 'more time reason',
          'submitTimeExtensionEvidence': [
            {
              'value': {
                'document_binary_url': 'someurl/binary',
                'document_filename': 'name',
                'document_url': 'someurl'

              }
            }
          ]
        }
      );
    });

    it('converts time extension to makeAnApplicationEvidence', () => {
      emptyApplication.documentMap = [{ id: 'fileId', url: 'someurl' }] as DocumentMap[];
      emptyApplication.makeAnApplicationEvidence = [
        {
          id: 'id',
          fileId: 'fileId',
          name: 'name'
        }
      ];

      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication, true, true);
      expect(caseData).to.deep.eq({
        'journeyType': 'aip',
        'appellantInUk': 'undefined',
        'gwfReferenceNumber': null,
        'isHearingLoopNeeded': null,
        'isHearingRoomNeeded': null,
        'asylumSupportRefNumber': null,
        'decisionHearingFeeOption': null,
        'feeSupportPersisted': 'No',
        'helpWithFeesOption': null,
        'helpWithFeesRefNumber': null,
        'paAppealTypeAipPaymentOption': null,
        'pcqId': null,
        'isLateRemissionRequest': 'No',
        'localAuthorityLetters': null,
        'refundRequested': 'No',
        'remissionDecision': null,
        'remissionOption': null,
        'rpDcAppealHearingOption': null,
        'lateAsylumSupportRefNumber': null,
        'lateHelpWithFeesOption': null,
        'lateHelpWithFeesRefNumber': null,
        'lateLocalAuthorityLetters': null,
        'lateRemissionOption': null,
        'makeAnApplicationEvidence': [
          {
            'id': 'id',
            'value': {
              'document_binary_url': 'someurl/binary',
              'document_filename': 'name',
              'document_url': 'someurl'
            }
          }
        ],
        'refundConfirmationApplied': 'No'
      });
    });
    it('converts uploadTheNoticeOfDecisionDocs', () => {
      emptyApplication.documentMap = [{ id: 'fileId', url: 'someurl' }] as DocumentMap[];
      emptyApplication.application.homeOfficeLetter = [
        {
          'id': 'id',
          'fileId': 'fileId',
          'name': 'name',
          'description': 'description',
          'dateUploaded': '2021-06-01'
        }
      ];

      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication, true, true);
      expect(caseData).to.deep.eq({
        'journeyType': 'aip',
        'appellantInUk': 'undefined',
        'gwfReferenceNumber': null,
        'isHearingLoopNeeded': null,
        'isHearingRoomNeeded': null,
        'isLateRemissionRequest': 'No',
        'asylumSupportRefNumber': null,
        'decisionHearingFeeOption': null,
        'feeSupportPersisted': 'No',
        'helpWithFeesOption': null,
        'helpWithFeesRefNumber': null,
        'localAuthorityLetters': null,
        'paAppealTypeAipPaymentOption': null,
        'pcqId': null,
        'refundConfirmationApplied': 'No',
        'refundRequested': 'No',
        'remissionDecision': null,
        'remissionOption': null,
        'rpDcAppealHearingOption': null,
        'lateAsylumSupportRefNumber': null,
        'lateHelpWithFeesOption': null,
        'lateHelpWithFeesRefNumber': null,
        'lateLocalAuthorityLetters': null,
        'lateRemissionOption': null,
        'uploadTheNoticeOfDecisionDocs': [
          {
            'id': 'fileId',
            'value': {
              'dateUploaded': '2021-06-01',
              'description': 'description',
              'document': {
                'document_binary_url': 'someurl/binary',
                'document_filename': 'name',
                'document_url': 'someurl'
              },
              'tag': 'additionalEvidence'
            }
          }
        ]
      });
    });

    it('convert the witnessNames to witnessDetails', () => {

      emptyApplication.hearingRequirements.witnessNames = [witness1, witness2];
      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

      expect(caseData.witnessDetails).to.be.length(emptyApplication.hearingRequirements.witnessNames.length);
    });

    it('convert the appellant interpreter information', () => {

      emptyApplication.hearingRequirements.isInterpreterServicesNeeded = true;
      emptyApplication.hearingRequirements.appellantInterpreterLanguageCategory = ['spokenLanguageInterpreter', 'signLanguageInterpreter'];
      emptyApplication.hearingRequirements.appellantInterpreterSpokenLanguage = { languageRefData: { value: { label: 'Maghreb', code: 'ara-mag' } } };
      emptyApplication.hearingRequirements.appellantInterpreterSignLanguage = { languageManualEntry: ['Yes'], languageManualEntryDescription: 'input sign language manually' };
      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

      expect(caseData.isInterpreterServicesNeeded).to.be.equals('Yes');
      expect(caseData.appellantInterpreterLanguageCategory).to.deep.eq(emptyApplication.hearingRequirements.appellantInterpreterLanguageCategory);
      expect(caseData.appellantInterpreterSpokenLanguage).to.deep.eq(emptyApplication.hearingRequirements.appellantInterpreterSpokenLanguage);
      expect(caseData.appellantInterpreterSignLanguage).to.deep.eq(emptyApplication.hearingRequirements.appellantInterpreterSignLanguage);
    });

    it('convert the witness interpreter information', () => {

      emptyApplication.hearingRequirements.isInterpreterServicesNeeded = true;
      emptyApplication.hearingRequirements.isAnyWitnessInterpreterRequired = true;
      emptyApplication.hearingRequirements.witnessNames = [witness1, witness2];
      emptyApplication.hearingRequirements.witnessListElement2 = {
        'value': [{ 'code': 'witness 2', 'label': 'witness 2' }],
        'list_items': [{ 'code': 'witness 2', 'label': 'witness 2' }]
      };
      emptyApplication.hearingRequirements.witness2InterpreterLanguageCategory = ['spokenLanguageInterpreter', 'signLanguageInterpreter'];
      emptyApplication.hearingRequirements.witness2InterpreterSpokenLanguage = { languageRefData: { value: { label: 'Maghreb', code: 'ara-mag' } } };
      emptyApplication.hearingRequirements.witness2InterpreterSignLanguage = { languageManualEntry: ['Yes'], languageManualEntryDescription: 'input sign language manually' };
      const caseData = updateAppealService.convertToCcdCaseData(emptyApplication);

      expect(caseData.isInterpreterServicesNeeded).to.be.equals('Yes');
      expect(caseData.isAnyWitnessInterpreterRequired).to.be.equals('Yes');
      expect(caseData.witness1.witnessPartyId).to.deep.eq(emptyApplication.hearingRequirements.witnessNames[0].witnessPartyId);
      expect(caseData.witness2.witnessPartyId).to.deep.eq(emptyApplication.hearingRequirements.witnessNames[1].witnessPartyId);
      expect(caseData.witnessListElement2).to.deep.eq(emptyApplication.hearingRequirements.witnessListElement2);
      expect(caseData.witness2InterpreterSpokenLanguage).to.deep.eq(emptyApplication.hearingRequirements.witness2InterpreterSpokenLanguage);
      expect(caseData.witness2InterpreterSignLanguage).to.deep.eq(emptyApplication.hearingRequirements.witness2InterpreterSignLanguage);
    });
  });

  describe('mapCcdCaseToAppeal', () => {
    describe('legalRepresentativeDocuments @legal', () => {
      const caseData: Partial<CaseData> = {
        'tribunalDocuments': [
          {
            'id': '1',
            'value': {
              'tag': 'endAppeal',
              'document': {
                'document_url': 'http://dm-store:8080/documents/59c0a265-1fd8-4698-9b75-d7438870d6e6',
                'document_filename': 'PA 50002 2021-perez-NoticeOfEndedAppeal.PDF',
                'document_binary_url': 'http://dm-store:8080/documents/59c0a265-1fd8-4698-9b75-d7438870d6e6/binary'
              },
              'suppliedBy': '',
              'description': '',
              'dateUploaded': '2021-06-01'
            }
          }
        ],
        'legalRepresentativeDocuments': [
          {
            'id': '1',
            'value': {
              'tag': 'appealSubmission',
              'document': {
                'document_url': 'http://dm-store:8080/documents/d8b3ef28-f67f-4859-86e2-1d34dde208bb',
                'document_filename': 'PA 50002 2021-perez-appeal-form.PDF',
                'document_binary_url': 'http://dm-store:8080/documents/d8b3ef28-f67f-4859-86e2-1d34dde208bb/binary'
              },
              'suppliedBy': '',
              'description': '',
              'dateUploaded': '2021-05-26'
            }
          }
        ]
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map docs to appeal evidences', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.tribunalDocuments).to.be.length(1);
        expect(mappedAppeal.legalRepresentativeDocuments).to.be.length(1);
      });
    });

    describe('hearingDocuments @legal', () => {
      const caseData: Partial<CaseData> = {
        'hearingDocuments': [
          {
            'id': '1',
            'value': {
              'tag': 'endAppeal',
              'document': {
                'document_url': 'http://dm-store:8080/documents/59c0a265-1fd8-4698-9b75-d7438870d6e6',
                'document_filename': 'PA 50001 2022-User-hearing-bundle.PDF',
                'document_binary_url': 'http://dm-store:8080/documents/59c0a265-1fd8-4698-9b75-d7438870d6e6/binary'
              },
              'suppliedBy': '',
              'description': '',
              'dateUploaded': '2021-06-01'
            }
          }
        ]
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map docs to hearing documents', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.hearingDocuments).to.be.length(1);
      });
    });

    describe('additionalEvidenceDocuments', () => {
      const caseData: Partial<CaseData> = {
        'additionalEvidenceDocuments': [
          {
            'id': '1',
            'value': {
              'tag': 'endAppeal',
              'document': {
                'document_url': 'http://dm-store:8080/documents/59c0a265-1fd8-4698-9b75-d7438870d6e6',
                'document_filename': 'PA 50002 2021-perez-NoticeOfEndedAppeal.PDF',
                'document_binary_url': 'http://dm-store:8080/documents/59c0a265-1fd8-4698-9b75-d7438870d6e6/binary'
              },
              'suppliedBy': '',
              'description': '',
              'dateUploaded': '2021-06-01'
            }
          }
        ]
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map docs to hearing documents', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.additionalEvidenceDocuments).to.be.length(1);
      });
    });

    describe('addendumEvidenceDocuments', () => {
      const caseData: Partial<CaseData> = {
        'addendumEvidenceDocuments': [
          {
            'id': '1',
            'value': {
              'tag': 'endAppeal',
              'document': {
                'document_url': 'http://dm-store:8080/documents/59c0a265-1fd8-4698-9b75-d7438870d6e6',
                'document_filename': 'PA 50002 2021-perez-NoticeOfEndedAppeal.PDF',
                'document_binary_url': 'http://dm-store:8080/documents/59c0a265-1fd8-4698-9b75-d7438870d6e6/binary'
              },
              'suppliedBy': '',
              'description': '',
              'dateUploaded': '2021-06-01'
            }
          }
        ]
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map docs correctly to appeal', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.addendumEvidenceDocuments).to.be.length(1);
      });
    });

    describe('mapHearingOtherNeedsFromCCDCase should map multimediaEvidence correctly to appeal', () => {
      it('when taken case over from legalrep, not bringing own equipment', () => {
        const caseData: Partial<CaseData> = {
          'remoteVideoCall': 'No',
          'multimediaEvidence': 'Yes',
          'multimediaEvidenceDescription': 'description'
        };
        const appeal: Partial<CcdCaseDetails> = {
          case_data: caseData as CaseData
        };

        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.hearingRequirements.otherNeeds.multimediaEvidence).eq(true);
        expect(mappedAppeal.hearingRequirements.otherNeeds.bringOwnMultimediaEquipment).eq(false);
        expect(mappedAppeal.hearingRequirements.otherNeeds.bringOwnMultimediaEquipmentReason).eq('description');
      });

      it('when taken case over from legalrep, bringing own equipment', () => {
        const caseData: Partial<CaseData> = {
          'remoteVideoCall': 'No',
          'multimediaEvidence': 'Yes'
        };
        const appeal: Partial<CcdCaseDetails> = {
          case_data: caseData as CaseData
        };

        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.hearingRequirements.otherNeeds.multimediaEvidence).eq(true);
        expect(mappedAppeal.hearingRequirements.otherNeeds.bringOwnMultimediaEquipment).to.be.eq(true);
        expect(mappedAppeal.hearingRequirements.otherNeeds.bringOwnMultimediaEquipmentReason).is.undefined;
      });
    });

    describe('ftpaR35AppellantDocument', () => {
      const caseData: Partial<CaseData> = {
        'ftpaR35AppellantDocument':
        {
          'document_url': 'http://dm-store:8080/documents/d8b3ef28-f67f-4859-86e2-1d34dde208bb',
          'document_filename': 'FTPA_R35_DOCUMENT.PDF',
          'document_binary_url': 'http://dm-store:8080/documents/d8b3ef28-f67f-4859-86e2-1d34dde208bb/binary'
        }
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map reheard rule 35 decision document', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.ftpaR35AppellantDocument.name).eq('FTPA_R35_DOCUMENT.PDF');
      });
    });

    describe('isWitnessesAttending, isAppellantAttendingTheHearing, isAppellantGivingOralEvidence, isEvidenceFromOutsideUkInCountry', () => {
      const testData = [
        {
          value: 'Yes',
          expectation: true
        },
        {
          value: 'No',
          expectation: false
        }
      ];

      testData.forEach(({ value, expectation }) => {
        it(`mapped value should be ${expectation}`, () => {
          const caseData: Partial<CaseData> = {
            'isWitnessesAttending': value as 'Yes' | 'No',
            'isAppellantAttendingTheHearing': value as 'Yes' | 'No',
            'isAppellantGivingOralEvidence': value as 'Yes' | 'No',
            'isEvidenceFromOutsideUkInCountry': value as 'Yes' | 'No'
          };

          const appeal: Partial<CcdCaseDetails> = {
            case_data: caseData as CaseData
          };
          const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
          expect(mappedAppeal.hearingRequirements.witnessesOnHearing).to.be.eq(expectation);
          expect(mappedAppeal.hearingRequirements.isAppellantAttendingTheHearing).to.be.eq(expectation);
          expect(mappedAppeal.hearingRequirements.isAppellantGivingOralEvidence).to.be.eq(expectation);
          expect(mappedAppeal.hearingRequirements.witnessesOutsideUK).to.be.eq(expectation);
        });
      });
    });

    describe('ftpaR35RespondentDocument', () => {
      const caseData: Partial<CaseData> = {
        'ftpaR35RespondentDocument':
        {
          'document_url': 'http://dm-store:8080/documents/d8b3ef28-f67f-4859-86e2-1d34dde208bb',
          'document_filename': 'FTPA_R35_DOCUMENT.PDF',
          'document_binary_url': 'http://dm-store:8080/documents/d8b3ef28-f67f-4859-86e2-1d34dde208bb/binary'
        }
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map reheard rule 35 decision document (respondent)', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.ftpaR35RespondentDocument.name).eq('FTPA_R35_DOCUMENT.PDF');
      });
    });

    describe('ftpaApplicationAppellantDocument', () => {
      const caseData: Partial<CaseData> = {
        'ftpaApplicationAppellantDocument':
        {
          'document_url': 'http://dm-store:8080/documents/d8b3ef28-f67f-4859-86e2-1d34dde208bb',
          'document_filename': 'FTPA_APPELLANT_DECISION_DOCUMENT.PDF',
          'document_binary_url': 'http://dm-store:8080/documents/d8b3ef28-f67f-4859-86e2-1d34dde208bb/binary'
        }
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map Decide FTPA decision document (appellant)', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.ftpaApplicationAppellantDocument.name).eq('FTPA_APPELLANT_DECISION_DOCUMENT.PDF');
      });
    });

    describe('rule32NoticeDocument', () => {
      const caseData: Partial<CaseData> = {
        'rule32NoticeDocument':
        {
          'document_url': 'http://dm-store:8080/documents/7bdf4dd6-0796-42d5-8a58-a6ae2e912e5d',
          'document_filename': 'rule32.pdf',
          'document_binary_url': 'http://dm-store:8080/documents/7bdf4dd6-0796-42d5-8a58-a6ae2e912e5d/binary'
        }
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map rule 32 notice document', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.rule32NoticeDocs.name).eq('rule32.pdf');
      });
    });

    describe('previousRemissionDetails', () => {
      const caseData: Partial<CaseData> = {
        previousRemissionDetails:
        [{
          id: '1',
          value: {
            feeAmount: '2000',
            amountRemitted: '1000',
            amountLeftToPay: '1000',
            feeRemissionType: 'type1',
            remissionDecision: 'decission1',
            asylumSupportReference: 'refNumber1',
            remissionDecisionReason: 'decission',
            helpWithFeesReferenceNumber: 'refNumber2',
            helpWithFeesOption: 'helpOption',
            localAuthorityLetters: [
              {
                id: 'fa35dcae-ae4c-462d-9cce-6878326875b0',
                value: {
                  tag: 'additionalEvidence',
                  document: {
                    document_url: 'http://dm-store:4506/documents/02f4b97c-0dfa-49b1-9262-a6cbd399a7c4',
                    document_filename: '1135444116_9abd250e95f14a43b5c42d9f72547779-280823-1412-88.pdf',
                    document_binary_url: 'http://dm-store:4506/documents/02f4b97c-0dfa-49b1-9262-a6cbd399a7c4/binary'
                  },
                  dateUploaded: ''
                }
              }
            ]
          } as RemissionDetailsData
        }] as RemissionDetailsCollection[]
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map previousRemissionDetails', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
        expect(mappedAppeal.application.previousRemissionDetails[0].id).to.be.equals('1');
        expect(mappedAppeal.application.previousRemissionDetails[0].feeAmount).to.be.equals('2000');
        expect(mappedAppeal.application.previousRemissionDetails[0].amountRemitted).to.be.equals('1000');
        expect(mappedAppeal.application.previousRemissionDetails[0].amountLeftToPay).to.be.equals('1000');
        expect(mappedAppeal.application.previousRemissionDetails[0].feeRemissionType).to.be.equals('type1');
        expect(mappedAppeal.application.previousRemissionDetails[0].remissionDecision).to.be.equals('decission1');
        expect(mappedAppeal.application.previousRemissionDetails[0].asylumSupportReference).to.be.equals('refNumber1');
        expect(mappedAppeal.application.previousRemissionDetails[0].remissionDecisionReason).to.be.equals('decission');
        expect(mappedAppeal.application.previousRemissionDetails[0].helpWithFeesReferenceNumber).to.be.equals('refNumber2');
        expect(mappedAppeal.application.previousRemissionDetails[0].helpWithFeesOption).to.be.equals('helpOption');
        expect(mappedAppeal.application.previousRemissionDetails[0].localAuthorityLetters[0].id).to.be.equals('fa35dcae-ae4c-462d-9cce-6878326875b0');
        expect(mappedAppeal.application.previousRemissionDetails[0].localAuthorityLetters[0].name).to.be.equals('1135444116_9abd250e95f14a43b5c42d9f72547779-280823-1412-88.pdf');
        expect(mappedAppeal.application.previousRemissionDetails[0].localAuthorityLetters[0].tag).to.be.equals('additionalEvidence');

      });
    });

    describe('ftpaApplicationRespondentDocument', () => {
      const caseData: Partial<CaseData> = {
        'ftpaApplicationRespondentDocument':
        {
          'document_url': 'http://dm-store:8080/documents/d8b3ef28-f67f-4859-86e2-1d34dde208bb',
          'document_filename': 'FTPA_RESPONDENT_DECISION_DOCUMENT.PDF',
          'document_binary_url': 'http://dm-store:8080/documents/d8b3ef28-f67f-4859-86e2-1d34dde208bb/binary'
        }
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map Decide FTPA decision document (respondent)', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(mappedAppeal.ftpaApplicationRespondentDocument.name).eq('FTPA_RESPONDENT_DECISION_DOCUMENT.PDF');
      });
    });

    describe('correctedDecisionAndReasons', () => {
      const caseData: Partial<CaseData> = {
        'correctedDecisionAndReasons': [
          {
            'id': '2',
            'value': {
              'coverLetterDocument': {
                'document_filename': 'PA 50012 2022-bond20-Decision-and-reasons-Cover-letter-AMENDED.PDF',
                'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001',
                'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001/binary'
              },
              'dateCoverLetterDocumentUploaded': '2022-01-30',
              'updatedDecisionDate': '2022-01-30'
            }
          },
          {
            'id': '1',
            'value': {
              'coverLetterDocument': {
                'document_filename': 'PA 50012 2022-bond20-Decision-and-reasons-Cover-letter-AMENDED.PDF',
                'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001',
                'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001/binary'
              },
              'dateCoverLetterDocumentUploaded': '2022-01-26',
              'documentAndReasonsDocument': {
                'document_filename': 'PA 50012 2022-bond20-Decision-and-reasons-AMENDED.PDF',
                'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001',
                'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001/binary'
              },
              'dateDocumentAndReasonsDocumentUploaded': '2022-01-26',
              'summariseChanges': 'Document summarised example',
              'updatedDecisionDate': '2022-01-26'
            }
          }
        ]
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map correctedDecisionAndReasons collection', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
        expect(mappedAppeal.updatedDecisionAndReasons).to.be.length(2);
      });
    });

    describe('remittalDocuments', () => {
      const caseData: Partial<CaseData> = {
        'remittalDocuments': [
          {
            id: '1',
            value: {
              decisionDocument: {
                document: {
                  'document_filename': 'CA-2023-000001-Decision-to-remit.pdf',
                  'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001',
                  'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001/binary'
                },
                dateUploaded: '2024-04-09'
              },
              'otherRemittalDocs': [
                {
                  id: '11',
                  value: {
                    document: {
                      'document_filename': 'upload_test_add_doc.pdf',
                      'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000002',
                      'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000002/binary'
                    },
                    description: 'Test description 1',
                    dateUploaded: '2024-04-09'
                  }
                }
              ]
            }
          },
          {
            id: '2',
            value: {
              decisionDocument: {
                document: {
                  'document_filename': 'CA-2023-000002-Decision-to-remit.pdf',
                  'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000003',
                  'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000003/binary'
                },
                dateUploaded: '2024-04-10'
              },
              'otherRemittalDocs': [
                {
                  id: '21',
                  value: {
                    document: {
                      'document_filename': 'upload_test_add_doc.pdf',
                      'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000004',
                      'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000004/binary'
                    },
                    description: 'Test description 2',
                    dateUploaded: '2024-04-10'
                  }
                }
              ]
            }
          }
        ]
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map remittalDocuments collection', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
        expect(mappedAppeal.remittalDocuments).to.be.length(2);
      });
    });

    describe('map appellant or witness details from caseData for interpreter information', () => {
      let witness1: WitnessDetails = { witnessPartyId: '1', witnessName: 'witness', witnessFamilyName: '1' };
      let witness2: WitnessDetails = { witnessPartyId: '2', witnessName: 'witness', witnessFamilyName: '2' };

      function getMappedAppeal(caseData: Partial<CaseData>): any {
        const appeal: Partial<CcdCaseDetails> = {
          case_data: caseData as CaseData
        };
        return updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
      }

      it('map the witnessDetails to witnessNames', () => {

        const caseData: Partial<CaseData> = {
          witnessDetails: [
            { id: '1', value: witness1 },
            { id: '2', value: witness2 }
          ]
        };
        const mappedAppeal = getMappedAppeal(caseData);

        expect(mappedAppeal.hearingRequirements.witnessNames).to.be.length(caseData.witnessDetails.length);
      });

      it('map the appellant interpreter information', () => {

        const caseData: Partial<CaseData> = {
          appellantInterpreterLanguageCategory: ['spokenLanguageInterpreter', 'signLanguageInterpreter'],
          appellantInterpreterSpokenLanguage: { languageRefData: { value: { label: 'Maghreb', code: 'ara-mag' } } },
          appellantInterpreterSignLanguage: { languageManualEntry: ['Yes'], languageManualEntryDescription: 'input sign language manually' }
        };

        const mappedAppeal = getMappedAppeal(caseData);

        expect(mappedAppeal.hearingRequirements.appellantInterpreterLanguageCategory).to.deep.eq(caseData.appellantInterpreterLanguageCategory);
        expect(mappedAppeal.hearingRequirements.appellantInterpreterSpokenLanguage).to.deep.eq(caseData.appellantInterpreterSpokenLanguage);
        expect(mappedAppeal.hearingRequirements.appellantInterpreterSignLanguage).to.deep.eq(caseData.appellantInterpreterSignLanguage);
      });

      it('map the witness interpreter information', () => {

        const caseData: Partial<CaseData> = {
          isAnyWitnessInterpreterRequired: 'Yes',
          witness1: witness1,
          witness2: witness2,
          witnessListElement2: { 'value': [{ 'code': 'witness 2', 'label': 'witness 2' }], 'list_items': [{ 'code': 'witness 2', 'label': 'witness 2' }] },
          witness2InterpreterLanguageCategory: ['spokenLanguageInterpreter', 'signLanguageInterpreter'],
          witness2InterpreterSpokenLanguage: { languageRefData: { value: { label: 'Maghreb', code: 'ara-mag' } } },
          witness2InterpreterSignLanguage: { languageManualEntry: ['Yes'], languageManualEntryDescription: 'input sign language manually' }
        };

        const mappedAppeal = getMappedAppeal(caseData);

        expect(mappedAppeal.hearingRequirements.isAnyWitnessInterpreterRequired).to.have.eq(true);
        expect(mappedAppeal.hearingRequirements.witness1).to.deep.eq(caseData.witness1);
        expect(mappedAppeal.hearingRequirements.witness2).to.deep.eq(caseData.witness2);
        expect(mappedAppeal.hearingRequirements.witnessListElement2).to.deep.eq(caseData.witnessListElement2);
        expect(mappedAppeal.hearingRequirements.witness2InterpreterSpokenLanguage).to.deep.eq(caseData.witness2InterpreterSpokenLanguage);
        expect(mappedAppeal.hearingRequirements.witness2InterpreterSignLanguage).to.deep.eq(caseData.witness2InterpreterSignLanguage);
      });
    });
  });

  describe('map the refundConfirmationApplied from Yes value', () => {
    const testData = [
      {
        value: 'Yes',
        expectation: true
      },
      {
        value: 'No',
        expectation: false
      },
      {
        value: null,
        expectation: undefined
      }
    ];

    testData.forEach(({ value, expectation }) => {
      it(`mapped value should be ${expectation}`, () => {
        const caseData: Partial<CaseData> = {
          'refundConfirmationApplied': value
        };

        const appeal: Partial<CcdCaseDetails> = {
          case_data: caseData as CaseData
        };
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
        expect(mappedAppeal.application.refundConfirmationApplied).to.be.eq(expectation);
      });
    });
  });

  describe('remissionRejectedDatePlus14days and amountLeftToPay mappings', () => {
    const caseData: Partial<CaseData> = {
      'remissionRejectedDatePlus14days': '2022-01-26',
      'amountLeftToPay': '4000'
    };

    const appeal: Partial<CcdCaseDetails> = {
      case_data: caseData as CaseData
    };

    it('should map remissionRejectedDatePlus14days and amountLeftToPay', () => {
      const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

      expect(mappedAppeal.application.amountLeftToPay).eq('4000');
      expect(mappedAppeal.application.remissionRejectedDatePlus14days).eq('2022-01-26');
    });
  });

  describe('mapAdditionalEvidenceDocumentsToDocumentsCaseData', () => {
    it('should map additional evidence documents to documents case data', () => {
      const evidences: AdditionalEvidenceDocument[] = [
        { fileId: '1', name: 'doc1.pdf', description: 'Document 1' },
        { fileId: '2', name: 'doc2.pdf' } // No description provided
      ];

      const documentMap: DocumentMap[] = [
        { id: '1', url: 'http://example.com/doc1' },
        { id: '2', url: 'http://example.com/doc2' }
      ];

      // @ts-ignore
      const expected: Collection<Document>[] = [
        {
          id: '1',
          value: {
            description: 'Document 1',
            document: {
              document_filename: 'doc1.pdf',
              document_url: 'http://example.com/doc1',
              document_binary_url: 'http://example.com/doc1/binary'
            }
          }
        },
        {
          id: '2',
          value: {
            description: 'additionalEvidenceDocument',
            document: {
              document_filename: 'doc2.pdf',
              document_url: 'http://example.com/doc2',
              document_binary_url: 'http://example.com/doc2/binary'
            }
          }
        }
      ];

      const result = updateAppealService.mapAdditionalEvidenceDocumentsToDocumentsCaseData(evidences, documentMap);

      expect(result).to.be.length(2);
    });
  });

  describe('submitEvent', () => {
    let expectedCaseData: Partial<CaseData>;
    let ccdService2: Partial<CcdService>;
    let idamService2: IdamService;
    let s2sService2: Partial<S2SService>;
    let updateAppealServiceBis: UpdateAppealService;
    const headers = {
      userToken,
      serviceToken
    };

    beforeEach(() => {
      req = {
        idam: {
          userDetails: {
            uid: userId
          }
        },
        session: {
          appeal: {
            appealStatus: 'appealStarted',
            application: {
              appellantInUk: 'undefined',
              homeOfficeRefNumber: 'newRef',
              outsideUkWhenApplicationMade: 'No',
              hasSponsor: 'No',
              sponsorGivenNames: 'ABC XYZ',
              sponsorFamilyName: 'ABC XYZ',
              sponsorNameForDisplay: 'ABC XYZ',
              sponsorAuthorisation: 'ABC XYZ',
              gwfReferenceNumber: '',
              appealType: 'appealType',
              dateLetterSent: {
                year: '2019',
                month: '12',
                day: '11'
              },
              dateClientLeaveUk: {
                year: '2019',
                month: '12',
                day: '15'
              },
              decisionLetterReceivedDate: {
                year: '2019',
                month: '12',
                day: '11'
              },
              isAppealLate: true,
              lateAppeal: {
                reason: 'a reason',
                evidence: {
                  name: 'somefile.png',
                  fileId: '00000000-0000-0000-0000-000000000000',
                  dateUploaded: '2020-01-01',
                  'description': 'Some evidence 1',
                  'tag': 'additionalEvidence'
                }
              },
              personalDetails: {
                givenNames: 'givenNames',
                familyName: 'familyName',
                dob: {
                  year: '1980',
                  month: '1',
                  day: '2'
                },
                nationality: 'nationality',
                address: {
                  line1: '60 Beautiful Street',
                  line2: 'Flat 2',
                  city: 'London',
                  postcode: 'W1W 7RT',
                  county: 'London'
                }
              },
              contactDetails: {
                email: 'email@example.net',
                wantsEmail: true,
                phone: '07123456789',
                wantsSms: false
              },
              addressLookup: {},
              remissionOption: 'test',
              asylumSupportRefNumber: 'test',
              feeSupportPersisted: true,
              helpWithFeesOption: 'test',
              helpWithFeesRefNumber: 'HWF-123',
              localAuthorityLetters: [{
                name: 'somefile.png',
                fileId: '00000000-0000-0000-0000-000000000000',
                dateUploaded: '2020-01-01',
                'description': 'Some evidence 1',
                'tag': 'additionalEvidence'
              }],
              lateRemissionOption: 'test',
              lateAsylumSupportRefNumber: 'test',
              lateHelpWithFeesOption: 'test',
              lateHelpWithFeesRefNumber: 'HWF-123',
              lateLocalAuthorityLetters: [{
                name: 'somefile.png',
                fileId: '00000000-0000-0000-0000-000000000000',
                dateUploaded: '2020-01-01',
                'description': 'Some evidence 1',
                'tag': 'additionalEvidence'
              }],
              remissionDecision: 'approved',
              deportationOrderOptions: 'Yes'
            } as AppealApplication,
            reasonsForAppeal: {
              applicationReason: 'I\'ve decided to appeal because ...',
              uploadDate: '2020-01-02',
              evidences: [
                {
                  fileId: '00000000-0000-0000-0000-000000000001',
                  name: 'File1.png',
                  dateUploaded: '2020-01-01',
                  description: 'Some evidence 1'
                },
                {
                  fileId: '00000000-0000-0000-0000-000000000002',
                  name: 'File2.png',
                  dateUploaded: '2020-02-02',
                  description: 'Some evidence 2'
                }
              ] as Evidence[]
            },
            documentMap: [
              {
                id: '00000000-0000-0000-0000-000000000000',
                url: 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000000'
              },
              {
                id: '00000000-0000-0000-0000-000000000001',
                url: 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001'
              },
              {
                id: '00000000-0000-0000-0000-000000000002',
                url: 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000002'
              }
            ],
            askForMoreTime: {
              reason: 'ask for more time reason',
              evidence: []
            }
          } as Appeal,
          ccdCaseId: caseId
        } as Partial<Express.Session>
      } as Partial<Request>;

      ccdService2 = {
        updateAppeal: sandbox.stub()
      };
      idamService2 = {
        getUserToken: sandbox.stub().returns(userToken)
      };
      s2sService2 = {
        getServiceToken: sandbox.stub().resolves(serviceToken)
      };
      documentManagementService = new DocumentManagementService(authenticationService);
      updateAppealServiceBis = new UpdateAppealService(ccdService2 as CcdService, authenticationService, null, documentManagementService);
      expectedCaseData = {
        'journeyType': 'aip',
        'homeOfficeReferenceNumber': 'newRef',
        'appellantInUk': 'undefined',
        'outsideUkWhenApplicationMade': 'No',
        'gwfReferenceNumber': '',
        'homeOfficeDecisionDate': '2019-12-11',
        'submissionOutOfTime': 'Yes',
        'recordedOutOfTimeDecision': 'No',
        'applicationOutOfTimeExplanation': 'a reason',
        'applicationOutOfTimeDocument': {
          'document_filename': 'somefile.png',
          'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000000',
          'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000000/binary'
        },
        'appellantGivenNames': 'givenNames',
        'appellantFamilyName': 'familyName',
        'appellantDateOfBirth': '1980-01-02',
        'dateClientLeaveUk': '2019-12-15',
        'decisionLetterReceivedDate': '2019-12-11',
        'appellantNationalities': [
          {
            'value': {
              'code': 'nationality'
            }
          }
        ],
        'appellantAddress': {
          'AddressLine1': '60 Beautiful Street',
          'AddressLine2': 'Flat 2',
          'PostTown': 'London',
          'County': 'London',
          'PostCode': 'W1W 7RT',
          'Country': 'United Kingdom'
        },
        'appellantHasFixedAddress': 'Yes',
        'appealType': 'appealType',
        'remissionOption': 'test',
        'asylumSupportRefNumber': 'test',
        'helpWithFeesOption': 'test',
        'helpWithFeesRefNumber': 'HWF-123',
        'localAuthorityLetters': [
          {
            'id': '00000000-0000-0000-0000-000000000000',
            'value': {
              'dateUploaded': '2020-01-01',
              'description': 'Some evidence 1',
              'tag': 'additionalEvidence',
              'document': {
                'document_filename': 'somefile.png',
                'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000000',
                'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000000/binary'
              }
            }
          }
        ],
        'feeSupportPersisted': 'Yes',
        'appellantEmailAddress': 'email@example.net',
        'subscriptions': [
          {
            'value': {
              'subscriber': 'appellant',
              'wantsEmail': 'Yes',
              'email': 'email@example.net',
              'wantsSms': 'No',
              'mobileNumber': null
            }
          }
        ],
        'hasSponsor': 'No',
        'sponsorGivenNames': 'ABC XYZ',
        'sponsorFamilyName': 'ABC XYZ',
        'sponsorNameForDisplay': 'ABC XYZ',
        'sponsorAuthorisation': 'ABC XYZ',
        'deportationOrderOptions': 'Yes',
        'reasonsForAppealDecision': 'I\'ve decided to appeal because ...',
        'reasonsForAppealDocuments': [
          {
            'value': {
              'dateUploaded': '2020-01-01',
              'description': 'Some evidence 1',
              'tag': 'additionalEvidence',
              'document': {
                'document_filename': 'File1.png',
                'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001',
                'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000001/binary'
              }
            }
          },
          {
            'value': {
              'dateUploaded': '2020-02-02',
              'description': 'Some evidence 2',
              'tag': 'additionalEvidence',
              'document': {
                'document_filename': 'File2.png',
                'document_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000002',
                'document_binary_url': 'http://dm-store:4506/documents/00000000-0000-0000-0000-000000000002/binary'
              }
            }
          }
        ],
        'reasonsForAppealDateUploaded': '2020-01-02',
        'submitTimeExtensionReason': 'ask for more time reason',
        'submitTimeExtensionEvidence': []
      };
    });

    it('updates case with ccd', async () => {
      await updateAppealServiceBis.submitEvent(Events.EDIT_APPEAL, req as Request);
      expect(ccdService2.updateAppeal).to.have.been.called.calledWith(
        Events.EDIT_APPEAL,
        userId,
        {
          id: caseId,
          state: 'appealStarted',
          case_data: expectedCaseData
        },
        headers);
    });

    it('submits case with ccd', async () => {
      await updateAppealServiceBis.submitEvent(Events.SUBMIT_APPEAL, req as Request);
      expect(ccdService2.updateAppeal).to.have.been.called.calledWith(
        Events.SUBMIT_APPEAL,
        userId,
        {
          id: caseId,
          state: 'appealStarted',
          case_data: expectedCaseData
        },
        headers);
    });

    it('submits ReasonsForAppeal with ccd', async () => {
      await updateAppealServiceBis.submitEvent(Events.SUBMIT_REASONS_FOR_APPEAL, req as Request);
      expect(ccdService2.updateAppeal).to.have.been.called.calledWith(
        Events.SUBMIT_REASONS_FOR_APPEAL,
        userId,
        {
          id: caseId,
          state: 'appealStarted',
          case_data: expectedCaseData
        },
        headers);
    });

    it('submits cmaRequirements with ccd', async () => {

      req.session.appeal.appealStatus = 'awaitingCmaRequirements';
      req.session.appeal.cmaRequirements = {
        accessNeeds: {
          isInterpreterServicesNeeded: true,
          interpreterLanguage: {
            language: 'Afar',
            languageDialect: 'A dialect'
          },
          isHearingRoomNeeded: true,
          isHearingLoopNeeded: true
        },
        otherNeeds: {
          multimediaEvidence: true,
          bringOwnMultimediaEquipment: false,
          bringOwnMultimediaEquipmentReason: 'I do not own the equipment',
          singleSexAppointment: true,
          singleSexTypeAppointment: 'All female',
          singleSexAppointmentReason: 'The reason why I will need an all-female',
          privateAppointment: true,
          privateAppointmentReason: 'The reason why I would need a private appointment',
          healthConditions: true,
          healthConditionsReason: 'Reason for mental health conditions',
          pastExperiences: true,
          pastExperiencesReason: 'Past experiences description',
          anythingElse: true,
          anythingElseReason: 'Anything else description'
        },
        datesToAvoid: {
          isDateCannotAttend: true,
          dates: [
            {
              date: {
                day: '23',
                month: '06',
                year: '2020'
              },
              reason: 'I have an important appointment on this day'
            },
            {
              date: {
                day: '24',
                month: '06',
                year: '2020'
              },
              reason: 'I need this day off'
            }
          ]
        }

      } as CmaRequirements;
      await updateAppealServiceBis.submitEvent(Events.SUBMIT_CMA_REQUIREMENTS, req as Request);

      expectedCaseData = {
        ...expectedCaseData,
        datesToAvoid: [{
          value: {
            dateToAvoid: '2020-06-23',
            dateToAvoidReason: 'I have an important appointment on this day'
          }
        }, {
          value: { dateToAvoid: '2020-06-24', dateToAvoidReason: 'I need this day off' }
        }],
        datesToAvoidYesNo: 'Yes',
        inCameraCourt: 'Yes',
        inCameraCourtDescription: 'The reason why I would need a private appointment',
        interpreterLanguage: [{ value: { language: 'Afar', languageDialect: 'A dialect' } }],
        isHearingLoopNeeded: 'Yes',
        isHearingRoomNeeded: 'Yes',
        isInterpreterServicesNeeded: 'Yes',
        multimediaEvidence: 'Yes',
        multimediaEvidenceDescription: 'I do not own the equipment',
        pastExperiences: 'Yes',
        pastExperiencesDescription: 'Past experiences description',
        physicalOrMentalHealthIssues: 'Yes',
        physicalOrMentalHealthIssuesDescription: 'Reason for mental health conditions',
        singleSexCourt: 'Yes',
        singleSexCourtType: 'All female',
        singleSexCourtTypeDescription: 'The reason why I will need an all-female',
        additionalRequests: 'Yes',
        additionalRequestsDescription: 'Anything else description'
      };
      expect(ccdService2.updateAppeal).to.have.been.called.calledWith(
        Events.SUBMIT_CMA_REQUIREMENTS,
        userId,
        {
          id: caseId,
          state: 'awaitingCmaRequirements',
          case_data: expectedCaseData
        },
        headers);
    });

    it('submits hearingRequirements with ccd', async () => {

      expectedCaseData = {
        ...expectedCaseData,
        datesToAvoid: [{
          value: {
            dateToAvoid: '2020-06-23',
            dateToAvoidReason: 'I have an important appointment on this day'
          }
        }, {
          value: { dateToAvoid: '2020-06-24', dateToAvoidReason: 'I need this day off' }
        }],
        datesToAvoidYesNo: 'Yes',
        inCameraCourt: 'Yes',
        inCameraCourtDescription: 'The reason why I would need a private appointment',
        interpreterLanguage: [{ value: { language: 'Afar', languageDialect: 'A dialect' } }],
        isHearingLoopNeeded: 'Yes',
        isHearingRoomNeeded: 'Yes',
        remoteVideoCall: 'Yes',
        remoteVideoCallDescription: 'Join Hearing by video call',
        isInterpreterServicesNeeded: 'Yes',
        multimediaEvidence: 'Yes',
        bringOwnMultimediaEquipment: 'No',
        multimediaEvidenceDescription: 'I do not own the equipment',
        pastExperiences: 'Yes',
        pastExperiencesDescription: 'Past experiences description',
        physicalOrMentalHealthIssues: 'Yes',
        physicalOrMentalHealthIssuesDescription: 'Reason for mental health conditions',
        singleSexCourt: 'Yes',
        singleSexCourtType: 'All female',
        singleSexCourtTypeDescription: 'The reason why I will need an all-female',
        additionalRequests: 'Yes',
        additionalRequestsDescription: 'Anything else description'
      };

      ccdServiceMock.expects('loadOrCreateCase')
        .withArgs(userId, { userToken, serviceToken })
        .resolves({
          id: caseId,
          state: 'submitHearingRequirements',
          case_data: expectedCaseData
        });
      await updateAppealService.loadAppeal(req as Request);

      const expectedHearingRequirements = {
        'datesToAvoid': {
          'dates': [
            {
              'date': {
                'day': '23',
                'month': '6',
                'year': '2020'
              },
              'reason': 'I have an important appointment on this day'
            },
            {
              'date': {
                'day': '24',
                'month': '6',
                'year': '2020'
              },
              'reason': 'I need this day off'
            }
          ],
          'isDateCannotAttend': true
        },
        'interpreterLanguages': [
          {
            'language': 'Afar',
            'languageDialect': 'A dialect'
          }
        ],
        'isHearingLoopNeeded': true,
        'isHearingRoomNeeded': true,
        'isInterpreterServicesNeeded': true,
        'otherNeeds': {
          'anythingElse': true,
          'anythingElseReason': 'Anything else description',
          'bringOwnMultimediaEquipment': false,
          'bringOwnMultimediaEquipmentReason': 'I do not own the equipment',
          'healthConditions': true,
          'healthConditionsReason': 'Reason for mental health conditions',
          'multimediaEvidence': true,
          'pastExperiences': true,
          'pastExperiencesReason': 'Past experiences description',
          'privateAppointment': true,
          'privateAppointmentReason': 'The reason why I would need a private appointment',
          'singleSexAppointment': true,
          'singleSexAppointmentReason': 'The reason why I will need an all-female',
          'singleSexTypeAppointment': 'All female',
          'remoteVideoCall': true,
          'remoteVideoCallDescription': 'Join Hearing by video call'
        }
      };
      expect(req.session.appeal.hearingRequirements).to.be.eql(expectedHearingRequirements);
    });

    it('submits hearingRequirements with otherNeeds', async () => {

      req.session.appeal.appealStatus = 'submitHearingRequirements';
      req.session.appeal.hearingRequirements = {

        otherNeeds: {
          multimediaEvidence: true,
          bringOwnMultimediaEquipment: false,
          bringOwnMultimediaEquipmentReason: 'I do not own the equipment',
          singleSexAppointment: true,
          singleSexTypeAppointment: 'All female',
          singleSexAppointmentReason: 'The reason why I will need an all-female',
          privateAppointment: true,
          privateAppointmentReason: 'The reason why I would need a private hearing',
          healthConditions: true,
          healthConditionsReason: 'Reason for mental health conditions',
          pastExperiences: true,
          pastExperiencesReason: 'Past experiences description',
          anythingElse: true,
          anythingElseReason: 'Anything else description',
          remoteVideoCall: true,
          remoteVideoCallDescription: 'Why you are not able to join ?'
        }

      } as HearingRequirements;
      let caseData = updateAppealServiceBis.convertToCcdCaseData(req.session.appeal);
      expect(caseData.inCameraCourt).to.be.equals('Yes');
      expect(caseData.multimediaEvidence).to.be.equals('Yes');
      expect(caseData.pastExperiences).to.be.equals('Yes');
      expect(caseData.physicalOrMentalHealthIssues).to.be.equals('Yes');
      expect(caseData.singleSexCourt).to.be.equals('Yes');
      expect(caseData.additionalRequests).to.be.equals('Yes');
      expect(caseData.remoteVideoCall).to.be.equals('Yes');
    });

    describe('finalDecisionAndReasonsDocuments @legal', () => {
      const caseData: Partial<CaseData> = {
        'finalDecisionAndReasonsDocuments': [
          {
            'id': '2',
            'value': {
              'tag': 'finalDecisionAndReasonsPdf',
              'document': {
                'document_url': 'http://dm-store:8080/documents/ba51fff4-b3c8-485b-b847-6c0962aceaaf',
                'document_filename': 'PA 50012 2022-bond20-Decision-and-reasons-FINAL.pdf',
                'document_binary_url': 'http://dm-store:8080/documents/ba51fff4-b3c8-485b-b847-6c0962aceaaf/binary'
              },
              'suppliedBy': '',
              'description': '',
              'dateUploaded': '2022-01-26'
            }
          },
          {
            'id': '1',
            'value': {
              'tag': 'decisionAndReasonsCoverLetter',
              'document': {
                'document_url': 'http://dm-store:8080/documents/446787de-4b31-43b2-ab40-6d08f1a2934d',
                'document_filename': 'PA 50012 2022-bond20-Decision-and-reasons-Cover-letter.PDF',
                'document_binary_url': 'http://dm-store:8080/documents/446787de-4b31-43b2-ab40-6d08f1a2934d/binary'
              },
              'suppliedBy': '',
              'description': '',
              'dateUploaded': '2022-01-26'
            }
          }
        ]
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map docs to decision and Reasons documents', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
        expect(mappedAppeal.finalDecisionAndReasonsDocuments).to.be.length(2);
      });
    });

    describe('reheardHearingDocuments', () => {
      const caseData: Partial<CaseData> = {
        'reheardHearingDocumentsCollection': [
          {
            'id': '2',
            'value': {
              'reheardHearingDocs': [
                {
                  'id': '3',
                  'value': {
                    'tag': 'hearingBundle',
                    'document': {
                      'document_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/b74d55c7-2640-436a-a0d2-57d078fad6db',
                      'document_filename': 'PA 62793 2024-González-remitted-hearing-bundle.pdf',
                      'document_binary_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/b74d55c7-2640-436a-a0d2-57d078fad6db/binary'
                    },
                    'description': '',
                    'dateUploaded': '2024-06-18'
                  }
                },
                {
                  'id': '2',
                  'value': {
                    'tag': 'caseSummary',
                    'document': {
                      'document_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/c0e08c6e-82b5-439d-bcd3-4b3fae39cc4d',
                      'document_filename': 'mockFile.pdf',
                      'document_binary_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/c0e08c6e-82b5-439d-bcd3-4b3fae39cc4d/binary'
                    },
                    'description': 'case summary reheard 2',
                    'dateUploaded': '2024-06-18'
                  }
                },
                {
                  'id': '1',
                  'value': {
                    'tag': 'reheardHearingNotice',
                    'document': {
                      'document_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/0ae399f0-060e-4eaf-9d66-3d5f8594582a',
                      'document_filename': 'PA 62793 2024-Gonzlez-hearing-notice.PDF',
                      'document_binary_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/0ae399f0-060e-4eaf-9d66-3d5f8594582a/binary'
                    },
                    'suppliedBy': '',
                    'description': '',
                    'dateUploaded': '2024-06-18'
                  }
                }
              ]
            }
          },
          {
            'id': '1',
            'value': {
              'reheardHearingDocs': [
                {
                  'id': '3',
                  'value': {
                    'tag': 'hearingBundle',
                    'document': {
                      'document_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/9ec402f6-2685-4c07-b2cb-9804c4b446c0',
                      'document_filename': 'PA 62793 2024-González-remitted-hearing-bundle.pdf',
                      'document_binary_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/9ec402f6-2685-4c07-b2cb-9804c4b446c0/binary'
                    },
                    'description': '',
                    'dateUploaded': '2024-06-18'
                  }
                },
                {
                  'id': '2',
                  'value': {
                    'tag': 'caseSummary',
                    'document': {
                      'document_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/e6f5a697-474f-45d3-b47e-3f36295fafe9',
                      'document_filename': 'set-aside-makeapplication-decideftpaapplication-updatetribunaldecision-aat 1.pdf',
                      'document_binary_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/e6f5a697-474f-45d3-b47e-3f36295fafe9/binary'
                    },
                    'description': 'test',
                    'dateUploaded': '2024-06-11'
                  }
                },
                {
                  'id': '1',
                  'value': {
                    'tag': 'reheardHearingNotice',
                    'document': {
                      'document_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/130e0a7b-54e7-4f88-8355-bfe2d0fd452a',
                      'document_filename': 'PA 62793 2024-Gonzlez-hearing-notice.PDF',
                      'document_binary_url': 'http://dm-store-aat.service.core-compute-aat.internal/documents/130e0a7b-54e7-4f88-8355-bfe2d0fd452a/binary'
                    },
                    'suppliedBy': '',
                    'description': '',
                    'dateUploaded': '2024-06-11'
                  }
                }
              ]
            }
          }
        ]
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };
      it('should map docs to reheard hearing bundle documents', () => {
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
        expect(mappedAppeal.reheardHearingDocumentsCollection).to.be.length(2);
      });
    });

    describe('isHearingRoomNeeded', () => {
      const testData = [
        {
          value: 'Yes',
          expectation: true
        },
        {
          value: 'No',
          expectation: false
        }
      ];

      testData.forEach(({ value, expectation }) => {
        it(`mapped value should be ${expectation}`, () => {
          const caseData: Partial<CaseData> = {
            'isHearingRoomNeeded': value as 'Yes' | 'No'
          };

          const appeal: Partial<CcdCaseDetails> = {
            case_data: caseData as CaseData
          };
          const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
          expect(mappedAppeal.hearingRequirements.isHearingRoomNeeded).to.be.eq(expectation);
        });
      });
    });

    describe('isHearingLoopNeeded', () => {
      const testData = [
        {
          value: 'Yes',
          expectation: true
        },
        {
          value: 'No',
          expectation: false
        }
      ];

      testData.forEach(({ value, expectation }) => {
        it(`mapped value should be ${expectation}`, () => {
          const caseData: Partial<CaseData> = {
            'isHearingLoopNeeded': value as 'Yes' | 'No'
          };

          const appeal: Partial<CcdCaseDetails> = {
            case_data: caseData as CaseData
          };
          const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
          expect(mappedAppeal.hearingRequirements.isHearingLoopNeeded).to.be.eq(expectation);
        });
      });
    });

    describe('isDecisionAllowed', () => {
      it(`isDecisionAllowed value should be mapped`, () => {
        const caseData: Partial<CaseData> = {
          'isDecisionAllowed': 'Allowed'
        };

        const appeal: Partial<CcdCaseDetails> = {
          case_data: caseData as CaseData
        };
        const mappedAppeal = updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);
        expect(mappedAppeal.isDecisionAllowed).to.be.eq('Allowed');
      });

    });

    describe('mapToCCDDatesToAvoid', () => {
      const caseData: Partial<CaseData> = {
        'datesToAvoidYesNo': 'Yes',
        datesToAvoid: [{
          value: {
            dateToAvoid: '2024-10-30',
            dateToAvoidReason: 'Medical appointment'
          }
        }, {
          value: { dateToAvoid: '2024-11-05',
            dateToAvoidReason: 'Family event' }
        }]
      };

      const appeal: Partial<CcdCaseDetails> = {
        case_data: caseData as CaseData
      };

      it('should map dates to avoid correctly when dates are provided', () => {
        updateAppealService.mapCcdCaseToAppeal(appeal as CcdCaseDetails);

        expect(caseData.datesToAvoidYesNo).eq('Yes');
        expect(caseData.datesToAvoid).to.be.eql([
          {
            value: {
              dateToAvoid: '2024-10-30',
              dateToAvoidReason: 'Medical appointment'
            }
          },
          {
            value: {
              dateToAvoid: '2024-11-05',
              dateToAvoidReason: 'Family event'
            }
          }
        ]);
      });
    });

  });
});
