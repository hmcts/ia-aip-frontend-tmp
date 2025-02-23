interface SupportingDocument {
  document_url: string;
  document_filename: string;
  document_binary_url: string;
}

interface DocumentWithMetaData {
  suppliedBy?: string;
  uploadedBy?: string;
  description?: string;
  dateUploaded?: string;
  dateTimeUploaded?: string;
  tag?: string;
  document: SupportingDocument;
}

interface Document {
  description?: string;
  document: SupportingDocument;
}

interface CcdCaseDetails {
  id: string;
  state: string;
  case_data: CaseData;
  created_date?: string;
  last_modified?: string;
}

interface PinInPost {
  pinUsed: 'Yes' | 'No';
}

interface CaseData {
  appellantInUk: string;
  appellantOutOfCountryAddress: string;
  gwfReferenceNumber: string;
  dateClientLeaveUk: string;
  outsideUkWhenApplicationMade: string;
  journeyType: string;
  appealType: string;
  homeOfficeReferenceNumber: string;
  appealReferenceNumber: string;
  ccdReferenceNumberForDisplay: string;
  removeAppealFromOnlineReason: string;
  removeAppealFromOnlineDate: string;
  homeOfficeDecisionDate: string;
  decisionLetterReceivedDate: string;
  appellantGivenNames: string;
  appellantFamilyName: string;
  appellantDateOfBirth: string;
  appellantNationalities: Nationality[];
  appellantStateless: string;
  appellantAddress: CCDAddress;
  appellantHasFixedAddress: 'Yes' | 'No';
  appellantEmailAddress: string;
  appellantPhoneNumber: string;
  subscriptions: SubscriptionCollection[];
  submissionOutOfTime: 'Yes' | 'No';
  applicationOutOfTimeExplanation: string;
  applicationOutOfTimeDocument: SupportingDocument;
  reasonsForAppealDecision: string;
  reasonsForAppealDateUploaded?: string;
  reasonsForAppealDocuments: Collection<DocumentWithMetaData>[];
  respondentDocuments: Collection<RespondentEvidenceDocument>[];
  timeExtensions: Collection<CcdTimeExtension>[];
  reviewTimeExtensionRequired?: 'Yes' | 'No';
  directions: Collection<CcdDirection>[];
  draftClarifyingQuestionsAnswers: ClarifyingQuestion<Collection<SupportingDocument>>[];
  submitTimeExtensionReason?: string;
  submitTimeExtensionEvidence?: TimeExtensionEvidenceCollection[];
  clarifyingQuestionsAnswers: ClarifyingQuestion<Collection<SupportingDocument>>[];
  reheardHearingDocumentsCollection?: ReheardHearingDocs<Collection<DocumentWithMetaData>>[];
  isInterpreterServicesNeeded?: string;
  isAnyWitnessInterpreterRequired?: string;
  appellantInterpreterLanguageCategory?: string[];
  appellantInterpreterSpokenLanguage?: InterpreterLanguageRefData;
  appellantInterpreterSignLanguage?: InterpreterLanguageRefData;
  interpreterLanguage?: Collection<AdditionalLanguage>[];
  isHearingRoomNeeded?: string;
  isHearingLoopNeeded?: string;
  multimediaEvidence: 'Yes' | 'No';
  multimediaEvidenceDescription: string;
  bringOwnMultimediaEquipment: 'Yes' | 'No';
  singleSexCourt: 'Yes' | 'No';
  singleSexCourtType: 'All male' | 'All female';
  singleSexCourtTypeDescription: string;
  inCameraCourt: 'Yes' | 'No';
  inCameraCourtDescription: string;
  physicalOrMentalHealthIssues: 'Yes' | 'No';
  physicalOrMentalHealthIssuesDescription: string;
  pastExperiences: 'Yes' | 'No';
  pastExperiencesDescription: string;
  additionalRequests: 'Yes' | 'No';
  additionalRequestsDescription: string;
  datesToAvoidYesNo: 'Yes' | 'No';
  remoteVideoCall: 'Yes' | 'No';
  remoteVideoCallDescription: string;
  datesToAvoid: Collection<DateToAvoid>[];
  listCaseHearingCentre: string;
  listCaseHearingLength: string;
  listCaseHearingDate: string;
  uploadTheNoticeOfDecisionDocs: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  additionalEvidence: Collection<Document>[];
  addendumEvidence: Collection<Document>[];
  additionalEvidenceDocuments: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  addendumEvidenceDocuments: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  recordedOutOfTimeDecision: string;
  legalRepresentativeDocuments?: Collection<DocumentWithMetaData>[];
  tribunalDocuments?: Collection<DocumentWithMetaData>[];
  hearingDocuments?: Collection<DocumentWithMetaData>[];
  reheardHearingDocuments?: Collection<DocumentWithMetaData>[];
  finalDecisionAndReasonsDocuments?: Collection<DocumentWithMetaData>[];
  hearingCentre?: string;
  outOfTimeDecisionType?: string;
  outOfTimeDecisionMaker?: string;
  makeAnApplicationTypes?: any;
  makeAnApplicationDetails?: string;
  makeAnApplicationEvidence?: Collection<SupportingDocument>[];
  makeAnApplications?: Collection<Application<Collection<SupportingDocument>>>[];
  appealReviewDecisionTitle?: any;
  appealReviewOutcome?: string;
  homeOfficeAppealResponseDocument?: any;
  homeOfficeAppealResponseDescription?: string;
  homeOfficeAppealResponseEvidence?: any;
  rpDcAppealHearingOption?: string;
  decisionHearingFeeOption?: string;
  feeSupportPersisted?: string;
  paymentReference?: string;
  paymentStatus?: string;
  paymentDate?: string;
  isFeePaymentEnabled?: string;
  paAppealTypeAipPaymentOption?: string;
  feeWithHearing?: string;
  feeWithoutHearing?: string;
  feeCode?: string;
  feeDescription?: string;
  feeVersion?: string;
  feeAmountGbp?: string;
  newFeeAmount?: string;
  previousFeeAmountGbp?: string;
  pcqId?: string;
  isWitnessesAttending?: 'Yes' | 'No';
  isEvidenceFromOutsideUkInCountry?: 'Yes' | 'No';
  witnessDetails?: Collection<WitnessDetails>[];
  witness1?: WitnessDetails;
  witness2?: WitnessDetails;
  witness3?: WitnessDetails;
  witness4?: WitnessDetails;
  witness5?: WitnessDetails;
  witness6?: WitnessDetails;
  witness7?: WitnessDetails;
  witness8?: WitnessDetails;
  witness9?: WitnessDetails;
  witness10?: WitnessDetails;
  witnessListElement1?: DynamicMultiSelectList;
  witnessListElement2?: DynamicMultiSelectList;
  witnessListElement3?: DynamicMultiSelectList;
  witnessListElement4?: DynamicMultiSelectList;
  witnessListElement5?: DynamicMultiSelectList;
  witnessListElement6?: DynamicMultiSelectList;
  witnessListElement7?: DynamicMultiSelectList;
  witnessListElement8?: DynamicMultiSelectList;
  witnessListElement9?: DynamicMultiSelectList;
  witnessListElement10?: DynamicMultiSelectList;
  witness1InterpreterLanguageCategory?: string[];
  witness2InterpreterLanguageCategory?: string[];
  witness3InterpreterLanguageCategory?: string[];
  witness4InterpreterLanguageCategory?: string[];
  witness5InterpreterLanguageCategory?: string[];
  witness6InterpreterLanguageCategory?: string[];
  witness7InterpreterLanguageCategory?: string[];
  witness8InterpreterLanguageCategory?: string[];
  witness9InterpreterLanguageCategory?: string[];
  witness10InterpreterLanguageCategory?: string[];
  witness1InterpreterSpokenLanguage?: InterpreterLanguageRefData;
  witness2InterpreterSpokenLanguage?: InterpreterLanguageRefData;
  witness3InterpreterSpokenLanguage?: InterpreterLanguageRefData;
  witness4InterpreterSpokenLanguage?: InterpreterLanguageRefData;
  witness5InterpreterSpokenLanguage?: InterpreterLanguageRefData;
  witness6InterpreterSpokenLanguage?: InterpreterLanguageRefData;
  witness7InterpreterSpokenLanguage?: InterpreterLanguageRefData;
  witness8InterpreterSpokenLanguage?: InterpreterLanguageRefData;
  witness9InterpreterSpokenLanguage?: InterpreterLanguageRefData;
  witness10InterpreterSpokenLanguage?: InterpreterLanguageRefData;
  witness1InterpreterSignLanguage?: InterpreterLanguageRefData;
  witness2InterpreterSignLanguage?: InterpreterLanguageRefData;
  witness3InterpreterSignLanguage?: InterpreterLanguageRefData;
  witness4InterpreterSignLanguage?: InterpreterLanguageRefData;
  witness5InterpreterSignLanguage?: InterpreterLanguageRefData;
  witness6InterpreterSignLanguage?: InterpreterLanguageRefData;
  witness7InterpreterSignLanguage?: InterpreterLanguageRefData;
  witness8InterpreterSignLanguage?: InterpreterLanguageRefData;
  witness9InterpreterSignLanguage?: InterpreterLanguageRefData;
  witness10InterpreterSignLanguage?: InterpreterLanguageRefData;
  interpreterLanguage?: Collection<InterpreterLanguage>[];
  isDecisionAllowed?: string;
  updateTribunalDecisionList?: string;
  typesOfUpdateTribunalDecision?: DynamicList;
  updatedAppealDecision?: string;
  updateTribunalDecisionAndReasonsFinalCheck?: string;
  rule32NoticeDocument?: SupportingDocument;
  appealOutOfCountry?: string;
  hasSponsor?: string;
  sponsorGivenNames?: string;
  sponsorFamilyName?: string;
  sponsorNameForDisplay?: string;
  sponsorAddress?: CCDAddress;
  sponsorSubscriptions?: SponsorSubscriptionCollection[];
  sponsorEmail?: string;
  sponsorMobileNumber?: string;
  sponsorAuthorisation?: string;
  appellantPinInPost?: PinInPost;
  isAppellantAttendingTheHearing?: 'Yes' | 'No';
  isAppellantGivingOralEvidence?: 'Yes' | 'No';
  ftpaApplicantType?: string;
  ftpaAppellantGroundsDocuments?: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  ftpaAppellantEvidenceDocuments?: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  ftpaAppellantGrounds?: string;
  ftpaAppellantSubmissionOutOfTime?: 'Yes' | 'No';
  ftpaAppellantOutOfTimeExplanation?: string;
  ftpaAppellantOutOfTimeDocuments?: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  ftpaAppellantDocuments?: Collection<DocumentWithMetaData>[];
  ftpaAppellantApplicationDate?: string;
  ftpaRespondentEvidenceDocuments?: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  ftpaRespondentGroundsDocuments?: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  ftpaRespondentOutOfTimeExplanation?: string;
  ftpaRespondentOutOfTimeDocuments?: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  ftpaRespondentApplicationDate?: string;
  ftpaRespondentDecisionOutcomeType?: string;
  ftpaRespondentDecisionDocument?: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  ftpaRespondentDecisionDate?: string;
  ftpaRespondentRjDecisionOutcomeType?: string;
  ftpaAppellantRjDecisionOutcomeType?: string;
  ftpaAppellantDecisionOutcomeType?: string;
  ftpaAppellantDecisionDocument?: Collection<DocumentWithDescription | DocumentWithMetaData>[];
  ftpaAppellantDecisionDate?: string;
  ftpaR35AppellantDocument: SupportingDocument;
  ftpaR35RespondentDocument: SupportingDocument;
  ftpaApplicationAppellantDocument: SupportingDocument;
  ftpaApplicationRespondentDocument: SupportingDocument;
  ftpaAppellantDecisionRemadeRule32Text?: string;
  ftpaRespondentDecisionRemadeRule32Text?: string;
  utAppealReferenceNumber?: string;
  remissionOption?: string;
  asylumSupportRefNumber?: string;
  helpWithFeesOption?: string;
  helpWithFeesRefNumber?: string;
  localAuthorityLetters?: Collection<DocumentWithMetaData>[];
  correctedDecisionAndReasons: Collection<CcdDecisionAndReasons>[];

  //Late remission(refund) values:
  lateRemissionOption?: string;
  lateAsylumSupportRefNumber?: string;
  lateHelpWithFeesOption?: string;
  lateHelpWithFeesRefNumber?: string;
  lateLocalAuthorityLetters?: Collection<DocumentWithMetaData>[];

  refundRequested?: string;
  remissionDecision?: string;
  previousRemissionDetails?: RemissionDetailsCollection[];
  remissionRejectedDatePlus14days?: string;
  amountLeftToPay?: string;
  remissionDecisionReason?: string;
  isLateRemissionRequest?: string;
  feeUpdateTribunalAction?: string;
  feeUpdateReason?: string;
  manageFeeRefundedAmount?: string;
  manageFeeRequestedAmount?: string;
  paidAmount?: string;
  sourceOfRemittal?: string;
  remittalDocuments: Collection<CcdRemittalDetails>[];
  refundConfirmationApplied?: string;
  deportationOrderOptions?: string;
}

interface Application<T> {
  date: string;
  type: string;
  state: string;
  details: string;
  decision: string;
  evidence: T[];
  applicant: string;
  applicantRole: string;
  decisionDate?: string;
  decisionMaker?: string;
  decisionReason?: string;
}
interface DateToAvoid {
  dateToAvoid: string;
  dateToAvoidReason: string;
}

interface Collection<T> {
  id?: string;
  value: T;
}

interface Nationality {
  id?: string;
  value: {
    code: string;
  };
}

interface WitnessDetails {
  witnessPartyId?: string;
  witnessName?: string;
  witnessFamilyName?: string;
}

interface DynamicMultiSelectList {
  value?: Value[];
  list_items?: Value[];
}

interface InterpreterLanguage {
  language?: string;
  languageDialect?: string;
}

interface CCDAddress {
  AddressLine1: string;
  AddressLine2: string;
  PostTown: string;
  County: string;
  PostCode: string;
  Country: string;
}

interface SubscriptionCollection {
  id?: number | string;
  value: Subscription;
}

interface SponsorSubscriptionCollection {
  id?: number | string;
  value: Subscription;
}

interface SupportingEvidenceCollection {
  id?: number;
  value: DocumentWithMetaData;
}

interface TimeExtensionEvidenceCollection {
  id?: number;
  value: SupportingDocument;
}

interface RespondentEvidenceCollection {
  id?: number;
  value: RespondentEvidenceDocument;
}

interface TimeExtensionCollection {
  id?: number;
  value: CcdTimeExtension;
}

interface DirectionCollection {
  id?: number;
  value: CcdDirection;
}

interface PreviousDateCollection {
  id?: number;
  value: CcdPreviousDate;
}

interface CcdTimeExtension {
  requestDate?: string;
  reason: string;
  evidence?: TimeExtensionEvidenceCollection[];
  status: string;
  state: string;
  decision?: string;
  decisionReason?: string;
  decisionOutcomeDate?: string;
}

interface CcdDirection {
  tag: string;
  dateDue: string;
  parties: string;
  dateSent: string;
  explanation: string;
  previousDates?: PreviousDateCollection[];
  uniqueId: string;
  [key: string]: any;
}

interface CcdPreviousDate {
  dateDue: string;
  dateSent: string;
}
interface Subscription {
  subscriber: string;
  wantsEmail: 'Yes' | 'No';
  email: string;
  wantsSms: 'Yes' | 'No';
  mobileNumber: string;
}

interface CcdDecisionAndReasons {
  updatedDecisionDate: string;
  dateCoverLetterDocumentUploaded: string;
  coverLetterDocument: SupportingDocument;
  dateDocumentAndReasonsDocumentUploaded?: string;
  documentAndReasonsDocument?: SupportingDocument;
  summariseChanges?: string;
  [key: string]: any;
}

interface CcdRemittalDetails {
  decisionDocument: DocumentWithMetaData;
  otherRemittalDocs?: Collection<DocumentWithMetaData>[];
  [key: string]: any;
}

interface DynamicList {
  value?: Value;
  list_items?: Value[];
}

interface RemissionDetailsCollection {
  id?: number | string;
  value?: RemissionDetailsData;
}

interface RemissionDetailsData {
  feeAmount?: string;
  amountRemitted?: string;
  amountLeftToPay?: string;
  feeRemissionType?: string;
  remissionDecision?: string;
  asylumSupportReference?: string;
  remissionDecisionReason?: string;
  helpWithFeesReferenceNumber?: string;
  helpWithFeesOption?: string;
  localAuthorityLetters?: Collection<DocumentWithDescription | DocumentWithMetaData>[];
}

interface InterpreterLanguageRefData {
  languageRefData?: DynamicList;
  languageManualEntry?: string[];
  languageManualEntryDescription?: string;
}

interface Value {
  code?: string;
  label?: string;
}
