import { OSPlacesClient } from '@hmcts/os-places-client';
import * as express from 'express';
import requestPromise from 'request-promise-native';
import { setupIndexController } from './controllers';
import { setupAsylumSupportController } from './controllers/appeal-application/asylum-support';
import { setupCheckAndSendController } from './controllers/appeal-application/check-and-send';
import { setConfirmationController } from './controllers/appeal-application/confirmation-page';
import { setupContactDetailsController } from './controllers/appeal-application/contact-details';
import { setupDecisionTypeController } from './controllers/appeal-application/decision-type';
import { setupFeeSupportController } from './controllers/appeal-application/fee-support';
import { setupFeeWaiverController } from './controllers/appeal-application/fee-waiver';
import { setupHelpWithFeesController } from './controllers/appeal-application/help-with-fees';
import {
  setupHelpWithFeesReferenceNumberController
} from './controllers/appeal-application/help-with-fees-reference-number';
import { setupHomeOfficeDetailsController } from './controllers/appeal-application/home-office-details';
import { setupOutOfCountryController } from './controllers/appeal-application/out-of-country';
import { setupOutOfTimeController } from './controllers/appeal-application/out-of-time';
import { setupPersonalDetailsController } from './controllers/appeal-application/personal-details';
import { setupStepToHelpWithFeesController } from './controllers/appeal-application/steps-to-help-with-fees';
import { setupTaskListController } from './controllers/appeal-application/task-list';
import { setupTypeOfAppealController } from './controllers/appeal-application/type-of-appeal';
import { setupApplicationOverviewController } from './controllers/application-overview';
import { setupAskForMoreTimeController } from './controllers/ask-for-more-time/ask-for-more-time';
import { setupChangeRepresentationControllers } from './controllers/changing-representation';
import { setupCQAnythingElseAnswerController } from './controllers/clarifying-questions/anything-else-answer';
import { setupCQAnythingElseQuestionController } from './controllers/clarifying-questions/anything-else-question';
import { setupClarifyingQuestionsCheckSendController } from './controllers/clarifying-questions/check-and-send';
import { setupClarifyingQuestionsConfirmationPage } from './controllers/clarifying-questions/confirmation-page';
import { setupClarifyingQuestionPageController } from './controllers/clarifying-questions/question-page';
import { setupClarifyingQuestionsListController } from './controllers/clarifying-questions/questions-list';
import {
  setupClarifyingQuestionsSupportingEvidenceUploadController
} from './controllers/clarifying-questions/supporting-evidence';
import {
  setupSupportingEvidenceQuestionController
} from './controllers/clarifying-questions/supporting-evidence-question-page';
import { setupAccessNeedsController } from './controllers/cma-requirements/access-needs/access-needs';
import { setupCmaRequirementsCYAController } from './controllers/cma-requirements/check-and-send/check-and-send';
import { setupCmaRequirementsConfirmationPage } from './controllers/cma-requirements/confirmation-page';
import {
  setupDatesToAvoidAddAnotherDateController
} from './controllers/cma-requirements/dates-to-avoid/add-another-date';
import { setupDatesToAvoidEnterADateController } from './controllers/cma-requirements/dates-to-avoid/enter-a-date';
import { setupDatesToAvoidQuestionController } from './controllers/cma-requirements/dates-to-avoid/question';
import { setupDatesToAvoidReasonController } from './controllers/cma-requirements/dates-to-avoid/reason';
import { setupAnythingElseQuestionController } from './controllers/cma-requirements/other-needs/anything-else-question';
import { setupAnythingElseReasonController } from './controllers/cma-requirements/other-needs/anything-else-reason';
import {
  setupBringMultimediaEquipmentQuestionController
} from './controllers/cma-requirements/other-needs/bring-equipment-question';
import {
  setupMultimediaEquipmentReasonController
} from './controllers/cma-requirements/other-needs/bring-equipment-reason';
import {
  setupHealthConditionsQuestionController
} from './controllers/cma-requirements/other-needs/health-conditions-question';
import {
  setupHealthConditionsReasonController
} from './controllers/cma-requirements/other-needs/health-conditions-reason';
import {
  setupMultimediaEvidenceQuestionController
} from './controllers/cma-requirements/other-needs/multimedia-evidence-question';
import {
  setupPastExperiencesQuestionController
} from './controllers/cma-requirements/other-needs/past-experiences-question';
import {
  setupPastExperiencesReasonController
} from './controllers/cma-requirements/other-needs/past-experiences-reason';
import {
  setupPrivateAppointmentQuestionController
} from './controllers/cma-requirements/other-needs/private-appointment-question';
import {
  setupPrivateAppointmentReasonController
} from './controllers/cma-requirements/other-needs/private-appointment-reason';
import {
  setupSingleSexAppointmentAllFemaleReasonController
} from './controllers/cma-requirements/other-needs/single-sex-appointment-all-female-reason';
import {
  setupSingleSexAppointmentAllMaleReasonController
} from './controllers/cma-requirements/other-needs/single-sex-appointment-all-male-reason';
import {
  setupSingleSexAppointmentQuestionController
} from './controllers/cma-requirements/other-needs/single-sex-appointment-question';
import {
  setupSingleSexTypeAppointmentQuestionController
} from './controllers/cma-requirements/other-needs/single-sex-type-appointment-question';
import { setupCMARequirementsStartPageController } from './controllers/cma-requirements/other-needs/start-page';
import { setupCmaRequirementsTaskListController } from './controllers/cma-requirements/task-list';
import { setupcmaGuidancePageController } from './controllers/cma-requirements/what-to-expect';
import { setupDetailViewersController } from './controllers/detail-viewers';
import { setupEligibilityController } from './controllers/eligibility';
import { setupNotFoundController } from './controllers/file-not-found';
import { setupFooterController } from './controllers/footer';
import { setupForbiddenController } from './controllers/forbidden';
import { setupFtpaApplicationController } from './controllers/ftpa/ftpa-application';
import { setupGuidancePagesController } from './controllers/guidance-page';
import { setupHealthController } from './controllers/health';
import { setupHearingAccessNeedsController } from './controllers/hearing-requirements/access-needs';
import { setupHearingRequirementsCYAController } from './controllers/hearing-requirements/check-and-send';
import { setupHearingRequirementsConfirmationPage } from './controllers/hearing-requirements/confirmation-page';
import {
  setupHearingDatesToAvoidAddAnotherDateController
} from './controllers/hearing-requirements/dates-to-avoid/add-another-date';
import {
  setupHearingDatesToAvoidEnterADateController
} from './controllers/hearing-requirements/dates-to-avoid/enter-a-date';
import { setupHearingDatesToAvoidQuestionController } from './controllers/hearing-requirements/dates-to-avoid/question';
import { setupHearingDatesToAvoidReasonController } from './controllers/hearing-requirements/dates-to-avoid/reason';
import { setupWitnessesOutsideUkQuestionController } from './controllers/hearing-requirements/hearing-outside-uk';
import { setupWitnessNamesController } from './controllers/hearing-requirements/hearing-witness-names';
import { setupWitnessesOnHearingQuestionController } from './controllers/hearing-requirements/hearing-witnesses';
import {
  setupHearingBundleFeatureToggleController,
  setupHearingRequirementsFeatureToggleController
} from './controllers/hearing-requirements/hearings-feature-toggle';
import {
  setupHearingAnythingElseQuestionController
} from './controllers/hearing-requirements/other-needs/anything-else-question';
import {
  setupHearingAnythingElseReasonController
} from './controllers/hearing-requirements/other-needs/anything-else-reason';
import {
  setupHearingMultimediaEquipmentQuestionController
} from './controllers/hearing-requirements/other-needs/bring-equipment-question';
import {
  setupHearingMultimediaEquipmentReasonController
} from './controllers/hearing-requirements/other-needs/bring-equipment-reason';
import {
  setupHearingHealthConditionsQuestionController
} from './controllers/hearing-requirements/other-needs/health-conditions-question';
import {
  setupHearingHealthConditionsReasonController
} from './controllers/hearing-requirements/other-needs/health-conditions-reason';
import {
  setupJoinByVideoCallAppointmentQuestionController
} from './controllers/hearing-requirements/other-needs/joinby-video-call-question';
import {
  setupJoinByVideoCallAppointmentReasonController
} from './controllers/hearing-requirements/other-needs/joinby-video-call-reason';
import {
  setupHearingMultimediaEvidenceQuestionController
} from './controllers/hearing-requirements/other-needs/multimedia-evidence-question';
import {
  setupHearingPastExperiencesQuestionController
} from './controllers/hearing-requirements/other-needs/past-experiences-question';
import {
  setupHearingPastExperiencesReasonController
} from './controllers/hearing-requirements/other-needs/past-experiences-reason';
import {
  setupPrivateHearingQuestionController
} from './controllers/hearing-requirements/other-needs/private-hearing-question';
import {
  setupPrivateHearingReasonController
} from './controllers/hearing-requirements/other-needs/private-hearing-reason';
import {
  setupSingleSexHearingAllFemaleReasonController
} from './controllers/hearing-requirements/other-needs/single-sex-hearing-all-female-reason';
import {
  setupSingleSexHearingAllMaleReasonController
} from './controllers/hearing-requirements/other-needs/single-sex-hearing-all-male-reason';
import {
  setupHearingSingleSexAppointmentQuestionController
} from './controllers/hearing-requirements/other-needs/single-sex-hearing-question';
import {
  setupSingleSexTypeHearingQuestionController
} from './controllers/hearing-requirements/other-needs/single-sex-type-hearing-question';
import { setupHearingRequirementsStartPageController } from './controllers/hearing-requirements/other-needs/start-page';
import { setupSubmitHearingRequirementsTaskListController } from './controllers/hearing-requirements/task-list';
import { setupYourHearingNeedsController } from './controllers/hearing-requirements/your-hearing-needs';
import { setupIdamController } from './controllers/idam';
import { setupMakeApplicationControllers } from './controllers/make-application/setup-application-controllers';
import { setupOutOfCountryFeatureToggleController } from './controllers/out-of-country/ooc-feature-toggle';
import {
  setupCheckAndSendController as setupReasonsForAppealCheckAndSendController
} from './controllers/reasons-for-appeal/check-and-send';
import { setupReasonsForAppealController } from './controllers/reasons-for-appeal/reason-for-appeal';
import { setupSessionController } from './controllers/session';
import { setupStartRepresentingMyselfControllers } from './controllers/start-represent-yourself';
import { setupStartController } from './controllers/startController';
import { setupProvideMoreEvidenceController } from './controllers/upload-evidence/provide-more-evidence-controller';
import { PageSetup } from './interfaces/PageSetup';
import { hearingRequirementsMiddleware } from './middleware/hearing-requirements-middleware';
import { isJourneyAllowedMiddleware, isTimeExtensionsInProgress } from './middleware/journeyAllowed-middleware';
import { logSession } from './middleware/session-middleware';
import { AuthenticationService } from './service/authentication-service';
import { CcdService } from './service/ccd-service';
import CcdSystemService from './service/ccd-system-service';
import { DocumentManagementService } from './service/document-management-service';
import IdamService from './service/idam-service';
import PaymentService from './service/payments-service';
import PcqService from './service/pcq-service';
import RefDataService from './service/ref-data-service';
import S2SService from './service/s2s-service';
import { SystemAuthenticationService } from './service/system-authentication-service';
import UpdateAppealService from './service/update-appeal-service';
import { setupSecrets } from './setupSecrets';

import './controllers/appeal-application/home-office-details-upload-decision-letter';
import './controllers/appeal-application/pay-now';
import './controllers/appeal-application/upload-local-authority-letter';

const config = setupSecrets();
const sessionLoggerEnabled: boolean = config.get('session.useLogger');

const authenticationService: AuthenticationService = new AuthenticationService(new IdamService(), S2SService.getInstance());

const refDataService: RefDataService = new RefDataService(authenticationService);

const documentManagementService: DocumentManagementService = new DocumentManagementService(authenticationService);
const updateAppealService: UpdateAppealService = new UpdateAppealService(new CcdService(), authenticationService, S2SService.getInstance(), documentManagementService);
const paymentService: PaymentService = new PaymentService(authenticationService, updateAppealService);
const osPlacesClient: OSPlacesClient = new OSPlacesClient(config.get('addressLookup.token'), requestPromise, config.get('addressLookup.url'));
const pcqService: PcqService = new PcqService();

const router = express.Router();

const indexController = setupIndexController();
const startController = setupStartController();
const healthController = setupHealthController();
const notFoundController = setupNotFoundController();
const idamController = setupIdamController();
const startRepresentingMyselfPublicControllers = setupStartRepresentingMyselfControllers(new CcdSystemService(new SystemAuthenticationService(), S2SService.getInstance()));

const middleware = [isJourneyAllowedMiddleware];

const applicationOverview = setupApplicationOverviewController(updateAppealService);
const taskListController = setupTaskListController(middleware);
const homeOfficeDetailsController = setupHomeOfficeDetailsController(middleware, updateAppealService);
const typeOfAppealController = setupTypeOfAppealController(middleware, updateAppealService);
const decisionTypeController = setupDecisionTypeController(middleware, updateAppealService);
const feeSupportController = setupFeeSupportController(middleware, updateAppealService);
const asylumSupportController = setupAsylumSupportController(middleware, updateAppealService);
const feeWaiverController = setupFeeWaiverController(middleware, updateAppealService);
const helpWithFeesController = setupHelpWithFeesController(middleware, updateAppealService);
const helpWithFeesReferenceNumberController = setupHelpWithFeesReferenceNumberController(middleware, updateAppealService);
const stepsToHelpWithFeesController = setupStepToHelpWithFeesController(middleware, updateAppealService);
const personalDetailsController = setupPersonalDetailsController(middleware, { updateAppealService, osPlacesClient });
const contactDetailsController = setupContactDetailsController(middleware, updateAppealService);
const checkAndSendController = setupCheckAndSendController(middleware, updateAppealService, paymentService);
const confirmationController = setConfirmationController(middleware);
const outOfTimeController = setupOutOfTimeController(middleware, { updateAppealService, documentManagementService });
const reasonsForAppealController = setupReasonsForAppealController(middleware, {
  updateAppealService,
  documentManagementService
});
const reasonsForAppealCYAController = setupReasonsForAppealCheckAndSendController(middleware, updateAppealService);
const detailViewersController = setupDetailViewersController(documentManagementService);
const eligibilityController = setupEligibilityController();
const GuidancePages = setupGuidancePagesController();
const footerController = setupFooterController();
const sessionController = setupSessionController();
const forbiddenController = setupForbiddenController();
const askForMoreTime = setupAskForMoreTimeController([isTimeExtensionsInProgress], {
  updateAppealService,
  documentManagementService
});
const clarifyingQuestionsListController = setupClarifyingQuestionsListController(middleware);
const clarifyingQuestionPageController = setupClarifyingQuestionPageController(middleware, updateAppealService);
const clarifyingQuestionsSupportingEvidenceController = setupSupportingEvidenceQuestionController(middleware, {
  updateAppealService,
  documentManagementService
});
const clarifyingQuestionsSupportingEvidenceUploadController = setupClarifyingQuestionsSupportingEvidenceUploadController(middleware, {
  updateAppealService,
  documentManagementService
});
const clarifyingQuestionsAnythingElseQuestionController = setupCQAnythingElseQuestionController(middleware, updateAppealService, documentManagementService);
const clarifyingQuestionsAnythingElseAnswerController = setupCQAnythingElseAnswerController(middleware, updateAppealService);
const clarifyingQuestionsCYAController = setupClarifyingQuestionsCheckSendController(middleware, updateAppealService);
const clarifyingQuestionsConfirmationPageController = setupClarifyingQuestionsConfirmationPage(middleware);
const cmaRequirementsTaskListController = setupCmaRequirementsTaskListController(middleware);
const cmaRequirementsStartPageController = setupCMARequirementsStartPageController(middleware);
const cmaRequirementsMultimediaEvidenceQuestionController = setupMultimediaEvidenceQuestionController(middleware, updateAppealService);
const cmaRequirementsBringEquipmentQuestionController = setupBringMultimediaEquipmentQuestionController(middleware, updateAppealService);
const cmaRequirementsBringEquipmentReasonController = setupMultimediaEquipmentReasonController(middleware, updateAppealService);
const cmaRequirementsSingleSexAppointmentQuestionController = setupSingleSexAppointmentQuestionController(middleware, updateAppealService);
const cmaRequirementsSingleSexTypeAppointmentQuestionController = setupSingleSexTypeAppointmentQuestionController(middleware, updateAppealService);
const cmaRequirementsSingleSexAllMaleReasonAppointmentController = setupSingleSexAppointmentAllMaleReasonController(middleware, updateAppealService);
const cmaRequirementsSingleSexAllFemaleReasonAppointmentController = setupSingleSexAppointmentAllFemaleReasonController(middleware, updateAppealService);
const cmaRequirementsPrivateAppointmentQuestionController = setupPrivateAppointmentQuestionController(middleware, updateAppealService);
const cmaRequirementsPrivateReasonController = setupPrivateAppointmentReasonController(middleware, updateAppealService);
const cmaRequirementsHealthConditionsQuestionController = setupHealthConditionsQuestionController(middleware, updateAppealService);
const cmaRequirementsHealthConditionsReasonController = setupHealthConditionsReasonController(middleware, updateAppealService);
const cmaRequirementsPastExperiencesQuestionController = setupPastExperiencesQuestionController(middleware, updateAppealService);
const cmaRequirementsPastExperiencesReasonController = setupPastExperiencesReasonController(middleware, updateAppealService);
const cmaRequirementsAnythingElseQuestionController = setupAnythingElseQuestionController(middleware, updateAppealService);
const cmaRequirementsAnythingElseReasonController = setupAnythingElseReasonController(middleware, updateAppealService);
const cmaRequirementsAccessNeedsController = setupAccessNeedsController(middleware, updateAppealService);
const cmaRequirementsDatesToAvoidQuestionController = setupDatesToAvoidQuestionController(middleware, updateAppealService);
const cmaRequirementsDatesToAvoidEnterADateController = setupDatesToAvoidEnterADateController(middleware, updateAppealService);
const cmaRequirementsDatesToAvoidReasonController = setupDatesToAvoidReasonController(middleware, updateAppealService);
const cmaRequirementsDatesToAvoidAddAnotherDateController = setupDatesToAvoidAddAnotherDateController(middleware);
const cmaRequirementsCYAController = setupCmaRequirementsCYAController(middleware, updateAppealService);
const cmaRequirementsConfirmationController = setupCmaRequirementsConfirmationPage(middleware);
const provideMoreEvidence = setupProvideMoreEvidenceController(middleware, updateAppealService, documentManagementService);
const submitHearingRequirementsTaskListController = setupSubmitHearingRequirementsTaskListController([hearingRequirementsMiddleware]);
const submitHearingRequirementsFeatureToggleController = setupHearingRequirementsFeatureToggleController([hearingRequirementsMiddleware]);
const submitHearingRequirementsAccessNeedsController = setupHearingAccessNeedsController([hearingRequirementsMiddleware], updateAppealService, refDataService);
const witnessesOnHearingQuestionController = setupWitnessesOnHearingQuestionController(middleware, updateAppealService);
const witnessesOutsideUkQuestionController = setupWitnessesOutsideUkQuestionController(middleware, updateAppealService);
const witnessNamesController = setupWitnessNamesController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsStartPageController = setupHearingRequirementsStartPageController(middleware);
const hearingRequirementsOtherNeedsAnythingElseQuestionController = setupHearingAnythingElseQuestionController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsHealthConditionsQuestionController = setupHearingHealthConditionsQuestionController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsJoinByVideoCallAppointmentQuestionController = setupJoinByVideoCallAppointmentQuestionController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsJoinByVideoCallReasonController = setupJoinByVideoCallAppointmentReasonController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsBringEquipmentQuestionController = setupHearingMultimediaEquipmentQuestionController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsBringEquipmentReasonController = setupHearingMultimediaEquipmentReasonController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsMultimediaEvidenceQuestionController = setupHearingMultimediaEvidenceQuestionController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsPastExperiencesQuestionController = setupHearingPastExperiencesQuestionController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsPrivateHearingQuestionController = setupPrivateHearingQuestionController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsSingleSexHearingQuestionController = setupHearingSingleSexAppointmentQuestionController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsSingleSexTypeQuestionController = setupSingleSexTypeHearingQuestionController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsSingleSexHearingAllFemaleReasonController = setupSingleSexHearingAllFemaleReasonController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsSingleSexHearingAllMaleReasonController = setupSingleSexHearingAllMaleReasonController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsHealthConditionsReasonController = setupHearingHealthConditionsReasonController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsPastExperiencesReasonController = setupHearingPastExperiencesReasonController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsPrivateHearingReasonController = setupPrivateHearingReasonController(middleware, updateAppealService);
const hearingRequirementsOtherNeedsAnythingElseReasonController = setupHearingAnythingElseReasonController(middleware, updateAppealService);
const hearingDatesToAvoidQuestionController = setupHearingDatesToAvoidQuestionController(middleware, updateAppealService);
const hearingDatesToAvoidEnterADateController = setupHearingDatesToAvoidEnterADateController(middleware, updateAppealService);
const hearingDatesToAvoidReasonsController = setupHearingDatesToAvoidReasonController(middleware, updateAppealService);
const hearingDatesToAvoidAddAnotherDateController = setupHearingDatesToAvoidAddAnotherDateController(middleware);
const hearingRequirementsCYAController = setupHearingRequirementsCYAController(middleware, updateAppealService);
const yourHearingNeedsController = setupYourHearingNeedsController(middleware, updateAppealService);
const hearingRequirementConfirmationController = setupHearingRequirementsConfirmationPage(middleware);
const outOfCountryController = setupOutOfCountryController(middleware, updateAppealService);
const makeApplicationControllers = setupMakeApplicationControllers(middleware, updateAppealService, documentManagementService);
const changeRepresentationControllers = setupChangeRepresentationControllers(middleware);
const ftpaApplicationControlers = setupFtpaApplicationController(middleware, updateAppealService, documentManagementService);

const hearingBundleFeatureToggleController = setupHearingBundleFeatureToggleController(middleware);
const outOfCountryFeatureToggleController = setupOutOfCountryFeatureToggleController(middleware);

const whatToExpectAtCmaNextController = setupcmaGuidancePageController(middleware);

// not protected by idam
router.use(indexController);
router.use(healthController);
router.use(startController);
router.use(eligibilityController);
router.use(GuidancePages);
router.use(footerController);
router.use(sessionController);
router.use(notFoundController);
router.use(startRepresentingMyselfPublicControllers);

// protected by idam
router.use(idamController);
router.use(askForMoreTime);
// router.use(initSession);
if (process.env.NODE_ENV === 'development' && sessionLoggerEnabled) {
  router.use(logSession);
}

const privatePages = PageSetup.GetImplementations();
for (let x = 0; x < privatePages.length; x++) {
  const page = new privatePages[x]();
  router.use(page.initialise(middleware, updateAppealService, documentManagementService));
}

router.use(taskListController);
router.use(homeOfficeDetailsController);
router.use(personalDetailsController);
router.use(typeOfAppealController);
router.use(decisionTypeController);
router.use(feeSupportController);
router.use(asylumSupportController);
router.use(feeWaiverController);
router.use(helpWithFeesController);
router.use(helpWithFeesReferenceNumberController);
router.use(stepsToHelpWithFeesController);
router.use(contactDetailsController);
router.use(confirmationController);
router.use(checkAndSendController);
router.use(outOfTimeController);
router.use(applicationOverview);

router.use(reasonsForAppealController);
router.use(reasonsForAppealCYAController);
router.use(clarifyingQuestionsListController);
router.use(clarifyingQuestionPageController);
router.use(clarifyingQuestionsSupportingEvidenceController);
router.use(clarifyingQuestionsSupportingEvidenceUploadController);
router.use(clarifyingQuestionsAnythingElseQuestionController);
router.use(clarifyingQuestionsAnythingElseAnswerController);
router.use(clarifyingQuestionsCYAController);
router.use(clarifyingQuestionsConfirmationPageController);
router.use(submitHearingRequirementsTaskListController);
router.use(submitHearingRequirementsFeatureToggleController);
router.use(witnessesOnHearingQuestionController);
router.use(witnessesOutsideUkQuestionController);
router.use(witnessNamesController);
router.use(submitHearingRequirementsAccessNeedsController);
router.use(hearingRequirementsOtherNeedsStartPageController);
router.use(hearingRequirementsOtherNeedsAnythingElseQuestionController);
router.use(hearingRequirementsOtherNeedsHealthConditionsQuestionController);
router.use(hearingRequirementsOtherNeedsJoinByVideoCallAppointmentQuestionController);
router.use(hearingRequirementsOtherNeedsJoinByVideoCallReasonController);
router.use(hearingRequirementsOtherNeedsBringEquipmentQuestionController);
router.use(hearingRequirementsOtherNeedsBringEquipmentReasonController);
router.use(hearingRequirementsOtherNeedsMultimediaEvidenceQuestionController);
router.use(hearingRequirementsOtherNeedsPastExperiencesQuestionController);
router.use(hearingRequirementsOtherNeedsPrivateHearingQuestionController);
router.use(hearingRequirementsOtherNeedsSingleSexHearingQuestionController);
router.use(hearingRequirementsOtherNeedsSingleSexTypeQuestionController);
router.use(hearingRequirementsOtherNeedsSingleSexHearingAllFemaleReasonController);
router.use(hearingRequirementsOtherNeedsSingleSexHearingAllMaleReasonController);
router.use(hearingRequirementsOtherNeedsHealthConditionsReasonController);
router.use(hearingRequirementsOtherNeedsPastExperiencesReasonController);
router.use(hearingRequirementsOtherNeedsPrivateHearingReasonController);
router.use(hearingRequirementsOtherNeedsAnythingElseReasonController);
router.use(hearingRequirementsCYAController);
router.use(yourHearingNeedsController);
router.use(hearingRequirementConfirmationController);
router.use(hearingDatesToAvoidQuestionController);
router.use(hearingDatesToAvoidEnterADateController);
router.use(hearingDatesToAvoidReasonsController);
router.use(hearingDatesToAvoidAddAnotherDateController);
router.use(cmaRequirementsTaskListController);
router.use(cmaRequirementsStartPageController);
router.use(cmaRequirementsAccessNeedsController);
router.use(cmaRequirementsMultimediaEvidenceQuestionController);
router.use(cmaRequirementsBringEquipmentQuestionController);
router.use(cmaRequirementsBringEquipmentReasonController);
router.use(cmaRequirementsSingleSexAppointmentQuestionController);
router.use(cmaRequirementsSingleSexTypeAppointmentQuestionController);
router.use(cmaRequirementsSingleSexAllMaleReasonAppointmentController);
router.use(cmaRequirementsSingleSexAllFemaleReasonAppointmentController);
router.use(cmaRequirementsPrivateAppointmentQuestionController);
router.use(cmaRequirementsPrivateReasonController);
router.use(cmaRequirementsHealthConditionsQuestionController);
router.use(cmaRequirementsHealthConditionsReasonController);
router.use(cmaRequirementsPastExperiencesQuestionController);
router.use(cmaRequirementsPastExperiencesReasonController);
router.use(cmaRequirementsAnythingElseQuestionController);
router.use(cmaRequirementsAnythingElseReasonController);
router.use(cmaRequirementsDatesToAvoidQuestionController);
router.use(cmaRequirementsDatesToAvoidEnterADateController);
router.use(cmaRequirementsDatesToAvoidReasonController);
router.use(cmaRequirementsDatesToAvoidAddAnotherDateController);
router.use(cmaRequirementsCYAController);
router.use(cmaRequirementsConfirmationController);
router.use(whatToExpectAtCmaNextController);
router.use(provideMoreEvidence);
router.use(outOfCountryController);
router.use(makeApplicationControllers);
router.use(changeRepresentationControllers);
router.use(ftpaApplicationControlers);

router.use(hearingBundleFeatureToggleController);
router.use(outOfCountryFeatureToggleController);

router.use(detailViewersController);
router.use(forbiddenController);

export { router };
