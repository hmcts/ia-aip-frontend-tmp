interface SupportingDocument {
  document_url: string;
  document_filename: string;
  document_binary_url: string;
}

interface CcdCaseDetails {
  id: string;
  state: string;
  case_data: CaseData;
  created_date?: string;
  last_modified?: string;
}

interface CaseData {
  journeyType: string;
  appealType: string;
  homeOfficeReferenceNumber: string;
  appealReferenceNumber: string;
  homeOfficeDecisionDate: string;
  appellantGivenNames: string;
  appellantFamilyName: string;
  appellantDateOfBirth: string;
  appellantNationalities: Nationality[];
  appellantAddress: CCDAddress;
  appellantHasFixedAddress: 'Yes' | 'No';
  subscriptions: SubscriptionCollection[];
  submissionOutOfTime: 'Yes' | 'No';
  applicationOutOfTimeExplanation: string;
  applicationOutOfTimeDocument: SupportingDocument;
  reasonsForAppealDecision: string;
  reasonsForAppealDocuments: SupportingEvidenceCollection[];
  respondentDocuments: RespondentEvidenceCollection[];
  directions: DirectionCollection[];
}

interface Nationality {
  id?: string;
  value: {
    code: string;
  };
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
  id?: number;
  value: Subscription;
}

interface SupportingEvidenceCollection {
  id?: number;
  value: SupportingDocument;
}

interface RespondentEvidenceCollection {
  id?: number;
  value: RespondentEvidenceDocument;
}

interface DirectionValue {
  tag: string;
  dateDue: string;
  parties: string;
  dateSent: string;
  explanation: string;
  previousDates: string[];
}

interface DirectionCollection {
  id?: number;
  value: DirectionValue;
}

interface Subscription {
  subscriber: string;
  wantsEmail: 'Yes' | 'No';
  email: string;
  wantsSms: 'Yes' | 'No';
  mobileNumber: string;
}
