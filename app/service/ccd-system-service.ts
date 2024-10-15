import axios from 'axios';
import config from 'config';
import Logger, { getLogLabel } from '../utils/logger';
import S2SService from './s2s-service';
import { SystemAuthenticationService } from './system-authentication-service';

const logger: Logger = new Logger();
const logLabel: string = getLogLabel(__filename);

const ccdBaseUrl = config.get('ccd.apiUrl');
const jurisdictionId = config.get('ccd.jurisdictionId');
const caseType = config.get('ccd.caseType');

export interface PipValidation {
  accessValidated: boolean;
  caseSummary?: {
    name: string,
    referenceNumber: string
  };
}

const PIP_VALIDATION_FAILED: PipValidation = {
  accessValidated: false
};

export function validateAccessCode(caseDetails, accessCode: string): boolean {
  if (caseDetails.appellantPinInPost) {
    logger.trace(`4 - Received call to validate pin in post for case id - '${caseDetails.id}', Pin entered: '${accessCode}', Pin used?: '${caseDetails.appellantPinInPost.pinUsed}', Expiry Date?: '${caseDetails.appellantPinInPost.expiryDate}'`, logLabel);
    const expiryDate: Date = new Date(caseDetails.appellantPinInPost.expiryDate);
    if (new Date(Date.now()) <= expiryDate) {
      logger.trace(`5 - Verifying pin in post expiry date for case id -  '${caseDetails.id}', AccessCode in case data: '${caseDetails.appellantPinInPost.accessCode}'`, logLabel);
      return caseDetails.appellantPinInPost.pinUsed === 'No'
        && caseDetails.appellantPinInPost.accessCode === accessCode;
    }
  }
  return false;
}

export function getPipValidationSuccess(id: string, caseDetails: CaseData): PipValidation {
  return {
    accessValidated: true,
    caseSummary: {
      name: `${caseDetails.appellantGivenNames} ${caseDetails.appellantFamilyName}`,
      referenceNumber: id
    }
  };
}

export default class CcdSystemService {
  private readonly _authenticationService: SystemAuthenticationService;
  private readonly _s2sService: S2SService;

  constructor(authenticationService: SystemAuthenticationService, s2sService: S2SService) {
    this._authenticationService = authenticationService;
    this._s2sService = s2sService;
  }

  async pipValidation(caseId: string, accessCode: string): Promise<PipValidation> {
    const userToken = await this._authenticationService.getCaseworkSystemToken();
    const userId = await this._authenticationService.getCaseworkSystemUUID(userToken);
    const headers = await this.getHeaders(userToken);

    logger.trace(`1 - Received request to start representing for case id - '${caseId}', Pin entered: '${accessCode}'`, logLabel);
    logger.trace(`2 - axios.get URL: ${ccdBaseUrl}/caseworkers/${userId}/jurisdictions/${jurisdictionId}/case-types/${caseType}/cases/${caseId}`, logLabel);
    return axios.get(
      `${ccdBaseUrl}/caseworkers/${userId}/jurisdictions/${jurisdictionId}/case-types/${caseType}/cases/${caseId}`, {
        headers: headers
      }
    ).then(function (response) {
      if (validateAccessCode(response.data.case_data, accessCode)) {
        logger.trace(`3 - axios.get response: ${response.data.id}`, logLabel);
        return getPipValidationSuccess(response.data.id, response.data.case_data);
      }
      return PIP_VALIDATION_FAILED;
    }).catch(function (error) {
      logger.exception(error, logLabel);
      return PIP_VALIDATION_FAILED;
    });
  }

  async givenAppellantAccess(caseId: string, appellantId: string): Promise<any> {
    const userToken = await this._authenticationService.getCaseworkSystemToken();
    const userId = await this._authenticationService.getCaseworkSystemUUID(userToken);
    const headers = await this.getHeaders(userToken);

    return axios.post(
      `${ccdBaseUrl}/caseworkers/${userId}/jurisdictions/${jurisdictionId}/case-types/${caseType}/cases/${caseId}/users`, {
        id: appellantId
      },{
        headers: headers
      }
    );
  }

  private async getHeaders(userToken: string) {
    const serviceToken = await this._s2sService.getServiceToken();
    return {
      Authorization: `Bearer ${userToken}`,
      ServiceAuthorization: serviceToken,
      'content-type': 'application/json'
    };
  }
}
