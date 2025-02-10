/* tslint:disable:no-console */
import { Request } from 'express';
import moment from 'moment';
import i18n from '../../locale/en.json';
import { FEATURE_FLAGS } from '../data/constants';
import { Events } from '../data/events';
import { States } from '../data/states';
import { paths } from '../paths';
import { SecurityHeaders } from '../service/authentication-service';
import LaunchDarklyService from '../service/launchDarkly-service';
import UpdateAppealService from '../service/update-appeal-service';
import { appealHasRemissionOption, paymentForAppealHasBeenMade } from './remission-utils';
import {
  getAppellantApplications,
  getApplicant,
  getFtpaApplicantType,
  getLatestUpdateRemissionDecionsEventHistory,
  getLatestUpdateTribunalDecisionHistory,
  isFtpaFeatureEnabled,
  isNonStandardDirectionEnabled,
  isReadonlyApplicationEnabled,
  isUpdateTribunalDecideWithRule31,
  isUpdateTribunalDecideWithRule32
} from './utils';

/**
 * Construct an event object used in the sections, pulls the content of the event from the translations file.
 * @param event the event containing the date and id.
 * @param req the request containing the session to update the timeExtensionsMap
 */
function constructEventObject(event: HistoryEvent, req: Request) {

  let eventContent = i18n.pages.overviewPage.timeline[event.id];
  if (isUploadEvidenceEventByLegalRep(req, event)) {
    eventContent = i18n.pages.overviewPage.timeline[event.id]['providedByLr'];
  } else if (Events.RESIDENT_JUDGE_FTPA_DECISION.id === event.id
        || Events.LEADERSHIP_JUDGE_FTPA_DECISION.id === event.id
        || Events.DECIDE_FTPA_APPLICATION.id === event.id) {
    const ftpaApplicantType = getFtpaApplicantType(req.session.appeal);
    eventContent = i18n.pages.overviewPage.timeline['decideFtpa'][ftpaApplicantType];
  }

  if (Events.MARK_APPEAL_AS_REMITTED.id === event.id) {
    const sourceOfRemittal = req.session.appeal.sourceOfRemittal;
    eventContent = i18n.pages.overviewPage.timeline[event.id][sourceOfRemittal];
  }

  let eventObject = eventContent
        ? {
          date: moment(event.createdDate).format('DD MMMM YYYY'),
          dateObject: new Date(event.createdDate),
          text: eventContent.text || null,
          links: eventContent.links
        } : null;

  if (event.id === Events.RECORD_OUT_OF_TIME_DECISION.id) {
    eventObject.text = i18n.pages.overviewPage.timeline[event.id].type[req.session.appeal.outOfTimeDecisionType];
  }
  if (event.id === Events.REQUEST_RESPONSE_REVIEW.id && i18n.pages.overviewPage.timeline[event.id].status[req.session.appeal.appealReviewOutcome]) {
    eventObject.links[0].text = i18n.pages.overviewPage.timeline[event.id].status[req.session.appeal.appealReviewOutcome].text;
    eventObject.links[0].href = i18n.pages.overviewPage.timeline[event.id].status[req.session.appeal.appealReviewOutcome].href;
  }
  if (event.id === Events.SEND_DECISION_AND_REASONS.id) {
    if (req.session.appeal.updatedAppealDecision) {
      eventObject.links[0].href = i18n.pages.overviewPage.timeline[event.id].updatedLinks;
    } else {
      eventObject.links[0].href = i18n.pages.overviewPage.timeline[event.id].originalLinks;
    }
  }
  return eventObject;
}

/**
 * Constructs a section object, finds the events specified within the history and an optional case state
 * @param eventsToLookFor and array of type CcdEvent used to find events within the history
 * @param events the history events
 * @param states optional use if a section must be constructed within a specific state only
 * @param req the request containing the session to update the timeExtensionsMap
 */
function constructSection(eventsToLookFor: string[], events: HistoryEvent[], states: string[] | null, req: Request) {
  const filteredEvents = states
        ? events.filter(event => eventsToLookFor.includes(event.id) && states.includes(event.state.id))
        : events.filter(event => eventsToLookFor.includes(event.id));

  return filteredEvents
        .map(event => constructEventObject(event, req));
}

function getApplicationEvents(req: Request): any[] {
  const applicationEvents = isReadonlyApplicationEnabled(req)
        ? req.session.appeal.makeAnApplications
        : getAppellantApplications(req.session.appeal.makeAnApplications);
  const makeDirectionsFlatMap = applicationEvents ? applicationEvents.flatMap(application => {
    const makeAnApplicationContent = i18n.pages.overviewPage.timeline.makeAnApplication[getApplicant(application.value)];
    const request = {
      id: application.id,
      date: moment(application.value.date).format('DD MMMM YYYY'),
      dateObject: new Date(application.value.date),
      text: makeAnApplicationContent.text,
      links: [{
        ...makeAnApplicationContent.links[0],
        href: `${makeAnApplicationContent.links[0].href}/${application.id}`
      }]
    };
    if (application.value.decision !== 'Pending') {
      const decideAnApplicationContent = i18n.pages.overviewPage.timeline.decideAnApplication[getApplicant(application.value)];
      const decision = {
        id: application.id,
        date: moment(application.value.decisionDate).format('DD MMMM YYYY'),
        dateObject: new Date(application.value.decisionDate),
        text: decideAnApplicationContent[application.value.decision],
        links: [{
          ...decideAnApplicationContent.links[0],
          href: `${decideAnApplicationContent.links[0].href}/${application.id}`
        }]
      };
      return [decision, request];
    }
    return [request];
  }) : [];
  return makeDirectionsFlatMap;
}

function getSubmitClarifyingQuestionsEvents(history: HistoryEvent[], directions: Direction[]): any[] {
  const submitCQHistory = history.filter(event => event.id === Events.SUBMIT_CLARIFYING_QUESTION_ANSWERS.id);
  const directionsFiltered = directions.filter(direction => direction.tag === 'requestClarifyingQuestions');
  if (directionsFiltered.length > submitCQHistory.length) directionsFiltered.shift();

  if (!submitCQHistory && !directionsFiltered) return [];
  return submitCQHistory.map(event => {
    return {
      date: moment(event.createdDate).format('DD MMMM YYYY'),
      dateObject: new Date(event.createdDate),
      text: i18n.pages.overviewPage.timeline[event.id].text || null,
      links: [{
        ...i18n.pages.overviewPage.timeline[event.id].links[0],
        href: i18n.pages.overviewPage.timeline[event.id].links[0].href.replace(':id', directionsFiltered.shift().uniqueId)
      }]
    };
  });
}

function getDirectionHistory(req: Request): any[] {
  if (isNonStandardDirectionEnabled(req)) {
    return (req.session.appeal.directions || [])
      .filter(direction => (
        direction.directionType === 'sendDirection' &&
        (direction.parties === 'appellant' || direction.parties === 'respondent' || direction.parties === 'appellantAndRespondent')
      ))
      .flatMap(direction => {
        if (direction.parties === 'appellantAndRespondent') {
          return ['respondent', 'appellant'].map(party => ({
            date: moment(direction.dateSent).format('DD MMMM YYYY'),
            dateObject: new Date(direction.dateSent),
            text: i18n.pages.overviewPage.timeline.sendDirection[party].text || null,
            links: [
              {
                ...i18n.pages.overviewPage.timeline.sendDirection[party].links[0],
                href: paths.common.directionHistoryViewer.replace(':id', `${direction.uniqueId}-${party}`)
              }
            ]
          }));
        }
        return [{
          date: moment(direction.dateSent).format('DD MMMM YYYY'),
          dateObject: new Date(direction.dateSent),
          text: i18n.pages.overviewPage.timeline.sendDirection[direction.parties].text || null,
          links: [
            {
              ...i18n.pages.overviewPage.timeline.sendDirection[direction.parties].links[0],
              href: paths.common.directionHistoryViewer.replace(':id', direction.uniqueId)
            }
          ]
        }];
      });
  } else {
    return [];
  }
}

function getListCaseEvent(req: Request): any[] {
  let hearingNotices: Evidence[] = [];
  let hearingNoticeTags: string[] = ['hearingNotice', 'hearingNoticeRelisted',
    'reheardHearingNotice', 'reheardHearingNoticeRelisted'];
  if (req.session.appeal.hearingDocuments) {
    hearingNotices = req.session.appeal.hearingDocuments.filter((doc: Evidence) => hearingNoticeTags.includes(doc.tag));
  }
  if (req.session.appeal.reheardHearingDocumentsCollection) {
    req.session.appeal.reheardHearingDocumentsCollection.forEach((collection: ReheardHearingDocs<Evidence>) => {
      if (collection.value) {
        let filteredCollection: Evidence[] = collection.value.reheardHearingDocs
                    .filter(doc => hearingNoticeTags.includes(doc.tag));
        hearingNotices.push(...filteredCollection);
      }
    });
  }
  hearingNotices.sort((a, b) => {
    if (a.dateTimeUploaded && b.dateTimeUploaded) {
      return moment(b.dateTimeUploaded).diff(moment(a.dateTimeUploaded));
    } else {
      return moment(b.dateUploaded).diff(moment(a.dateUploaded));
    }
  });

  return hearingNotices
        .map(hearingNotice => {
          const textForTimeline: string = hearingNotice.tag.includes('Relisted')
              ? i18n.pages.overviewPage.timeline.listCase.textForEditListCase
              : i18n.pages.overviewPage.timeline.listCase.text;
          return {
            date: moment(hearingNotice.dateUploaded).format('DD MMMM YYYY'),
            dateObject: new Date(hearingNotice.dateUploaded),
            text: textForTimeline || null,
            links: [{
              ...i18n.pages.overviewPage.timeline.listCase.links[0],
              href: paths.common.hearingNoticeViewer.replace(':id', hearingNotice.fileId)
            }]
          };
        });
}

function getAsyncStitchingEvent(req: Request): any[] {
  let hearingBundles: Evidence[] = [];
  let hearingBundleTags: string[] = ['hearingBundle', 'updatedHearingBundle'];
  if (req.session.appeal.hearingDocuments) {
    hearingBundles = req.session.appeal.hearingDocuments.filter((doc: Evidence) => hearingBundleTags.includes(doc.tag));
  }
  if (req.session.appeal.reheardHearingDocumentsCollection) {
    req.session.appeal.reheardHearingDocumentsCollection.forEach((collection: ReheardHearingDocs<Evidence>) => {
      if (collection.value) {
        let filteredCollection: Evidence[] = collection.value.reheardHearingDocs
          .filter(doc => hearingBundleTags.includes(doc.tag));
        hearingBundles.push(...filteredCollection);
      }
    });
  }

  return hearingBundles
    .map(hearingBundle => {
      const textForTimeline: string = hearingBundle.tag === 'updatedHearingBundle'
        ? i18n.pages.overviewPage.timeline.asyncStitchingComplete.textForUpdateBundle
        : i18n.pages.overviewPage.timeline.asyncStitchingComplete.text;
      return {
        date: moment(hearingBundle.dateUploaded).format('DD MMMM YYYY'),
        dateTimeObject: new Date(hearingBundle.dateTimeUploaded),
        dateObject: new Date(hearingBundle.dateUploaded),
        text: textForTimeline,
        links: [{
          ...i18n.pages.overviewPage.timeline.asyncStitchingComplete.links[0],
          href: paths.common.hearingBundleViewer
        }]
      };
    })
    .sort((a: any, b: any) => b.dateObject - a.dateObject)
    .sort((a: any, b: any) => b.dateTimeObject - a.dateTimeObject);
}

function getUpdateTribunalDecisionHistory(req: Request, ftpaSetAsideFeatureEnabled: boolean): any[] {
  let latestUpdateTribunalDecisionHistory = getLatestUpdateTribunalDecisionHistory(req, ftpaSetAsideFeatureEnabled);

  if (isUpdateTribunalDecideWithRule31(req, ftpaSetAsideFeatureEnabled)) {
    let timelineText = '';
    let originalTribunalDecision;
    let newTribunalDecision = req.session.appeal.updatedAppealDecision && req.session.appeal.updatedAppealDecision.toLowerCase() || null;
    if (req.session.appeal.typesOfUpdateTribunalDecision && req.session.appeal.typesOfUpdateTribunalDecision.value) {
      if (req.session.appeal.typesOfUpdateTribunalDecision.value.label.includes('Yes')) {
        originalTribunalDecision = (newTribunalDecision === 'allowed') ? 'dismissed' : 'allowed';
      }
    }

    if (originalTribunalDecision === 'allowed' && newTribunalDecision === 'dismissed') {
      timelineText = i18n.pages.overviewPage.timeline.updateTribunalDecision.underRule31.fromAllowedToDismissedText;
    } else if (originalTribunalDecision === 'dismissed' && newTribunalDecision === 'allowed') {
      timelineText = i18n.pages.overviewPage.timeline.updateTribunalDecision.underRule31.fromDismissedToAllowedText;
    } else {
      return [];
    }

    return [{
      date: moment(latestUpdateTribunalDecisionHistory.createdDate).format('DD MMMM YYYY'),
      dateObject: new Date(latestUpdateTribunalDecisionHistory.createdDate),
      text: timelineText || null
    }];
  } else if (isUpdateTribunalDecideWithRule32(req, ftpaSetAsideFeatureEnabled)) {

    return [{
      date: moment(latestUpdateTribunalDecisionHistory.createdDate).format('DD MMMM YYYY'),
      dateObject: new Date(latestUpdateTribunalDecisionHistory.createdDate),
      text: i18n.pages.overviewPage.timeline.updateTribunalDecision.underRule32.documentOfReasonsForTheDecision.text || null,
      links: [{
        ...i18n.pages.overviewPage.timeline.updateTribunalDecision.underRule32.documentOfReasonsForTheDecision.links[0],
        href: i18n.pages.overviewPage.timeline.updateTribunalDecision.underRule32.documentOfReasonsForTheDecision.links[0].href
      }]
    }];
  } else {
    return [];
  }
}

function getUpdateTribunalDecisionDocumentHistory(req: Request, ftpaSetAsideFeatureEnabled: boolean): any[] {
  if (isUpdateTribunalDecideWithRule31(req, ftpaSetAsideFeatureEnabled) && req.session.appeal.updateTribunalDecisionAndReasonsFinalCheck === 'Yes') {

    let latestUpdateTribunalDecisionHistory = getLatestUpdateTribunalDecisionHistory(req, ftpaSetAsideFeatureEnabled);

    return [{
      date: moment(latestUpdateTribunalDecisionHistory.createdDate).format('DD MMMM YYYY'),
      dateObject: new Date(latestUpdateTribunalDecisionHistory.createdDate),
      text: i18n.pages.overviewPage.timeline.updateTribunalDecision.underRule31.newDecisionAndReasonsDocument.text || null,
      links: [{
        ...i18n.pages.overviewPage.timeline.updateTribunalDecision.underRule31.newDecisionAndReasonsDocument.links[0]
      }]
    }];
  } else {
    return [];
  }
}

async function getAppealApplicationHistory(req: Request, updateAppealService: UpdateAppealService) {
  const authenticationService = updateAppealService.getAuthenticationService();
  const headers: SecurityHeaders = await authenticationService.getSecurityHeaders(req);
  const { application } = req.session.appeal;
  const ccdService = updateAppealService.getCcdService();
  req.session.appeal.history = await ccdService.getCaseHistory(req.idam.userDetails.uid, req.session.appeal.ccdCaseId, headers);

  const uploadAddendumEvidenceFeatureEnabled: boolean = await LaunchDarklyService.getInstance().getVariation(req, FEATURE_FLAGS.UPLOAD_ADDENDUM_EVIDENCE, false);
  const hearingBundleFeatureEnabled: boolean = await LaunchDarklyService.getInstance().getVariation(req, FEATURE_FLAGS.HEARING_BUNDLE, false);
  const ftpaFeatureEnabled: boolean = await isFtpaFeatureEnabled(req);
  const ftpaSetAsideFeatureEnabled: boolean = await LaunchDarklyService.getInstance().getVariation(req, FEATURE_FLAGS.DLRM_SETASIDE_FEATURE_FLAG, false);
  const refundFeatureEnabled = await LaunchDarklyService.getInstance().getVariation(req, FEATURE_FLAGS.DLRM_REFUND_FEATURE_FLAG, false);
  const eventsAndStates = getEventsAndStates(uploadAddendumEvidenceFeatureEnabled, hearingBundleFeatureEnabled, ftpaFeatureEnabled, ftpaSetAsideFeatureEnabled, refundFeatureEnabled);

  const appealDecisionSection = constructSection(eventsAndStates.appealDecisionSectionEvents, req.session.appeal.history, null, req);
  let appealHearingRequirementsSection = constructSection(
        eventsAndStates.appealHearingRequirementsSectionEvents,
        filterEventsForHearingRequirementsSection(req),
        null, req
    );
  const listCaseEvent = getListCaseEvent(req);
  appealHearingRequirementsSection = appealHearingRequirementsSection.concat(listCaseEvent)
        .sort((a: any, b: any) => b.dateObject - a.dateObject);
  const asyncStitchingEvent = getAsyncStitchingEvent(req);
  appealHearingRequirementsSection = appealHearingRequirementsSection.concat(asyncStitchingEvent)
    .sort((a: any, b: any) => b.dateObject - a.dateObject);

  const appealArgumentSection = constructSection(
        eventsAndStates.appealArgumentSectionEvents,
        req.session.appeal.history.filter(event => !isUploadEvidenceEventByLegalRep(req, event)),
        eventsAndStates.appealArgumentSectionStates, req
    );
  const appealDetailsSection = constructSection(eventsAndStates.appealDetailsSectionEvents, req.session.appeal.history, null, req);

  const applicationEvents = getApplicationEvents(req);
  const submitCQHistory = getSubmitClarifyingQuestionsEvents(req.session.appeal.history, req.session.appeal.directions || []);
  const { paymentStatus, paAppealTypeAipPaymentOption = null, paymentDate } = req.session.appeal;
  const directionsHistory = getDirectionHistory(req);
  let paymentEvent = [];
  let appealRemissionSection: any[];
  let appealRemissionDecisionSection: any[];
  let manageAFeeUpdate: any[];
  let argumentSection: any[];
  const manageAFeeUpdateEvents = req.session.appeal.history.filter(event => Events.MANAGE_A_FEE_UPDATE.id.includes(event.id));

  if (paymentStatus === 'Paid' && refundFeatureEnabled && appealHasRemissionOption(application) && application.isLateRemissionRequest) {
    const remissionEvent = getApplicationHistoryRemissionEvent(paymentDate);
    appealRemissionSection = appealArgumentSection.concat(applicationEvents, remissionEvent, submitCQHistory, directionsHistory)
      .sort((a: any, b: any) => b.dateObject - a.dateObject);
  } else if (paymentStatus === 'Paid' && refundFeatureEnabled && !application.isLateRemissionRequest && manageAFeeUpdateEvents.length > 0) {
    manageAFeeUpdate = getApplicationHistoryManageAFeeUpdate(manageAFeeUpdateEvents);
  } else if (paymentStatus === 'Paid' && paymentForAppealHasBeenMade(req)) {
    paymentEvent = getApplicationHistoryPaymentEvent(paymentDate);
  }

  argumentSection = appealArgumentSection.concat(applicationEvents, paymentEvent, submitCQHistory, directionsHistory)
    .sort((a: any, b: any) => b.dateObject - a.dateObject);

  appealRemissionDecisionSection = getApplicationHistoryAppealRemissionSection(req, manageAFeeUpdate, refundFeatureEnabled, appealRemissionSection, application, applicationEvents, submitCQHistory, directionsHistory);

  const updatedTribunalDecisionHistory = getUpdateTribunalDecisionHistory(req, ftpaSetAsideFeatureEnabled);
  const updatedTribunalDecisionDocumentHistory = getUpdateTribunalDecisionDocumentHistory(req, ftpaSetAsideFeatureEnabled);
  const combinedAppealDecisionSection = appealDecisionSection.concat(updatedTribunalDecisionHistory, updatedTribunalDecisionDocumentHistory)
        .sort((a: any, b: any) => b.dateObject - a.dateObject);

  return {
    ...(combinedAppealDecisionSection && combinedAppealDecisionSection.length > 0) &&
        { appealDecisionSection: combinedAppealDecisionSection },
    ...(appealHearingRequirementsSection && appealHearingRequirementsSection.length > 0) &&
        { appealHearingRequirementsSection: appealHearingRequirementsSection },
    appealArgumentSection: argumentSection,
    appealDetailsSection: appealDetailsSection,
    ...(appealRemissionSection && appealRemissionSection.length > 0) &&
    { appealRemissionSection: appealRemissionSection },
    ...(appealRemissionDecisionSection && appealRemissionDecisionSection.length > 0) &&
    { appealRemissionDecisionSection: appealRemissionDecisionSection }
  };
}

function getApplicationHistoryRemissionEvent(paymentDate: string) {
  return [{
    date: moment(paymentDate).format('DD MMMM YYYY'),
    dateObject: new Date(paymentDate),
    text: i18n.pages.overviewPage.timeline.refundAppeal.text || null,
    links: i18n.pages.overviewPage.timeline.refundAppeal.links
  }];
}

function getApplicationHistoryManageAFeeUpdate(manageAFeeUpdateEvents) {
  return [{
    date: moment(manageAFeeUpdateEvents[0].createdDate).format('DD MMMM YYYY'),
    dateObject: new Date(manageAFeeUpdateEvents[0].createdDate),
    text: i18n.pages.overviewPage.timeline.manageFeeUpdate.text || null,
    links: i18n.pages.overviewPage.timeline.manageFeeUpdate.links
  }];
}

function getApplicationHistoryPaymentEvent(paymentDate) {
  return [{
    date: moment(paymentDate).format('DD MMMM YYYY'),
    dateObject: new Date(paymentDate),
    text: i18n.pages.overviewPage.timeline.paymentAppeal.text || null,
    links: i18n.pages.overviewPage.timeline.paymentAppeal.links
  }];
}

function getApplicationHistoryAppealRemissionSection(req, manageAFeeUpdate, refundFeatureEnabled, appealRemissionSection, application, applicationEvents, submitCQHistory, directionsHistory) {
  if (manageAFeeUpdate) {
    return manageAFeeUpdate;
  } else if (refundFeatureEnabled && application.remissionDecision) {
    const latestUpdateRemissionDecisionHistory = getLatestUpdateRemissionDecionsEventHistory(req, refundFeatureEnabled);
    const decisionRemissionEvent = [{
      date: moment(latestUpdateRemissionDecisionHistory.createdDate).format('DD MMMM YYYY'),
      dateObject: new Date(latestUpdateRemissionDecisionHistory.createdDate),
      text: i18n.pages.overviewPage.timeline.feeRemissionDecision.text || null,
      links: i18n.pages.overviewPage.timeline.feeRemissionDecision.links
    }];
    if (appealRemissionSection) {
      return decisionRemissionEvent.concat(appealRemissionSection);
    } else {
      return decisionRemissionEvent.concat(applicationEvents, submitCQHistory, directionsHistory);
    }
  }
}

function getEventsAndStates(uploadAddendumEvidenceFeatureEnabled: boolean,
                            hearingBundleFeatureEnabled: boolean,
                            ftpaFeatureEnabled: boolean,
                            ftpaSetAsideFeatureEnabled: boolean,
                            refundFeatureEnabled: boolean = false) {
  const appealHearingRequirementsSectionEvents = [
    Events.SUBMIT_AIP_HEARING_REQUIREMENTS.id,
    Events.STITCHING_BUNDLE_COMPLETE.id,
    Events.UPLOAD_ADDITIONAL_EVIDENCE.id
  ];
  const appealArgumentSectionEvents = [
    Events.UPLOAD_ADDITIONAL_EVIDENCE.id,
    Events.SUBMIT_REASONS_FOR_APPEAL.id,
    Events.BUILD_CASE.id,
    Events.REQUEST_RESPONDENT_REVIEW.id,
    Events.REQUEST_RESPONDENT_REVIEW.id,
    Events.REQUEST_RESPONSE_REVIEW.id,
    Events.SUBMIT_CMA_REQUIREMENTS.id,
    Events.LIST_CMA.id,
    Events.REQUEST_HEARING_REQUIREMENTS_FEATURE.id,
    Events.END_APPEAL.id,
    Events.END_APPEAL_AUTOMATICALLY.id,
    Events.RECORD_OUT_OF_TIME_DECISION.id,
    Events.MARK_AS_READY_FOR_UT_TRANSFER.id
  ];
  const appealDecisionSectionEvents = [Events.SEND_DECISION_AND_REASONS.id, Events.MARK_APPEAL_AS_REMITTED.id];

  if (ftpaFeatureEnabled) {
    appealDecisionSectionEvents.push(
            Events.APPLY_FOR_FTPA_APPELLANT.id,
            Events.APPLY_FOR_FTPA_RESPONDENT.id,
            Events.LEADERSHIP_JUDGE_FTPA_DECISION.id,
            Events.RESIDENT_JUDGE_FTPA_DECISION.id
        );
  }

  if (ftpaSetAsideFeatureEnabled) {
    appealDecisionSectionEvents.push(
            Events.DECIDE_FTPA_APPLICATION.id
        );
  }

  const appealDetailsSectionEvents = [Events.SUBMIT_APPEAL.id, Events.PAY_AND_SUBMIT_APPEAL.id];
  const appealArgumentSectionStates = [
    States.APPEAL_SUBMITTED.id,
    States.CLARIFYING_QUESTIONS_SUBMITTED.id,
    States.REASONS_FOR_APPEAL_SUBMITTED.id,
    States.CASE_UNDER_REVIEW.id,
    States.AWAITING_REASONS_FOR_APPEAL.id,
    States.RESPONDENT_REVIEW.id,
    States.AWAITING_CLARIFYING_QUESTIONS.id,
    States.CMA_REQUIREMENTS_SUBMITTED.id,
    States.CMA_LISTED.id,
    States.SUBMIT_HEARING_REQUIREMENTS.id,
    States.ENDED.id
  ];

  if (hearingBundleFeatureEnabled) {
    appealHearingRequirementsSectionEvents.push(
            Events.LIST_CASE.id,
            Events.RECORD_ADJOURNMENT_DETAILS.id
        );
  }

  if (uploadAddendumEvidenceFeatureEnabled) {
    appealArgumentSectionEvents.push(
            Events.UPLOAD_ADDENDUM_EVIDENCE_LEGAL_REP.id,
            Events.UPLOAD_ADDENDUM_EVIDENCE_HOME_OFFICE.id,
            Events.UPLOAD_ADDENDUM_EVIDENCE.id,
            Events.UPLOAD_ADDENDUM_EVIDENCE_ADMIN_OFFICER.id
        );

    appealHearingRequirementsSectionEvents.push(Events.UPLOAD_ADDENDUM_EVIDENCE_LEGAL_REP.id);

    appealArgumentSectionStates.push(States.PRE_HEARING.id, States.DECISION.id, States.DECIDED.id);
  }

  return {
    appealArgumentSectionEvents,
    appealHearingRequirementsSectionEvents,
    appealDecisionSectionEvents,
    appealDetailsSectionEvents,
    appealArgumentSectionStates
  };
}

function isUploadEvidenceEventByLegalRep(req: Request, event: HistoryEvent) {
  return [
    Events.UPLOAD_ADDITIONAL_EVIDENCE.id,
    Events.UPLOAD_ADDENDUM_EVIDENCE_LEGAL_REP.id
  ].includes(event.id) && event.user.id !== req.idam.userDetails.uid;
}

function isRecordAdjournmentEventAndCaseAdjourned(req: Request, event: HistoryEvent) {
  const caseAdjourned = req.session.appeal.appealStatus === States.ADJOURNED.id;

  return (event.id === Events.RECORD_ADJOURNMENT_DETAILS.id) && caseAdjourned;
}

function filterEventsForHearingRequirementsSection(req: Request) {
  const targetEvents = [
    Events.UPLOAD_ADDITIONAL_EVIDENCE.id,
    Events.UPLOAD_ADDENDUM_EVIDENCE_LEGAL_REP.id,
    Events.RECORD_ADJOURNMENT_DETAILS.id,
    Events.STITCHING_BUNDLE_COMPLETE.id,
    Events.LIST_CASE.id
  ];

  return req.session.appeal.history.filter(event =>
        isUploadEvidenceEventByLegalRep(req, event)
        || isRecordAdjournmentEventAndCaseAdjourned(req, event)
        || !targetEvents.includes(event.id));
}

export {
    getAppealApplicationHistory,
    getSubmitClarifyingQuestionsEvents,
    getApplicationEvents,
    getDirectionHistory,
    getUpdateTribunalDecisionHistory,
    getUpdateTribunalDecisionDocumentHistory,
    constructSection,
    getEventsAndStates,
    getAsyncStitchingEvent,
    filterEventsForHearingRequirementsSection,
    getListCaseEvent
};
