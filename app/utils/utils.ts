import { Request } from 'express';
import nl2br from 'nl2br';
import { applicationTypes } from '../data/application-types';
import { FEATURE_FLAGS } from '../data/constants';
import { paths } from '../paths';
import LaunchDarklyService from '../service/launchDarkly-service';

/**
 * Translate primitive values to Boolean value
 * @param value the primitive value to be translated into a boolean
 */
export function asBooleanValue(value: string | number | boolean | null | undefined): boolean | undefined {
  if (typeof value === 'string') {
    const lowerCasedValue: string = value.toLowerCase();
    if (lowerCasedValue === 'true' || lowerCasedValue === 'yes' || lowerCasedValue === 'on') {
      return true;
    }
    return !!+value;
  }
  return !!value;
}

export function toIsoDate(appealDate: AppealDate) {
  const month = appealDate.month.toString().padStart(2, '0');
  const day = appealDate.day.toString().padStart(2, '0');
  const date = new Date(`${appealDate.year}-${month}-${day}`);
  const isoDate = date.toISOString().split('T')[0];
  return isoDate;
}

export function nowIsoDate() {
  return new Date().toISOString().split('T')[0];
}

export function nowAppealDate(): AppealDate {
  const now = new Date();
  return {
    year: now.getFullYear().toString(10),
    month: (now.getMonth() + 1).toString(10),
    day: now.getDate().toString(10)
  } as AppealDate;
}

export function hasPendingTimeExtension(appeal: Appeal): boolean {
  return !!getAppellantApplications(appeal.makeAnApplications)
    .find(application => (applicationTypes.timeExtension.type === application.value.type) && (application.value.decision === 'Pending'));
}

export function formatTextForCYA(text: string) {
  return nl2br(text.replace(/ /g, '&nbsp;'));
}

export function getRedirectPage(editingMode, editingModeRedirect, saveForLater, defaultRedirect) {
  if (saveForLater) return `${paths.common.overview}?saved`;
  if (editingMode) return editingModeRedirect;
  return defaultRedirect;
}

export function boolToYesNo(value: boolean) {
  return value === true ? 'Yes' : 'No';
}

export function yesNoToBool(answer: string): boolean {
  return answer ? answer.toLowerCase() === 'yes' : false;
}

export function getAppellantApplications(applications: Collection<Application<Evidence>>[]): any[] {
  return (applications || []).filter(app => getApplicant(app.value) === 'Appellant');
}

export function getRespondentApplication(applications: Collection<Application<Evidence>>[]): any[] {
  return (applications || []).filter(app => getApplicant(app.value) === 'Respondent');
}

export function getApplicant(application: Application<Evidence>) {
  return ['Appellant', 'Legal representative'].includes(application.applicant) ? 'Appellant' : application.applicant;
}

export function getApplicationType(type: string): any {
  let applicationType = undefined;
  Object.keys(applicationTypes).forEach(key => {
    if (applicationTypes[key].type === type) {
      applicationType = applicationTypes[key];
    }
  });
  return applicationType;
}

export function formatCaseId(caseId: any) {
  let caseStr = new String(caseId);
  if (caseStr.length === 16) {
    caseStr = caseStr.substring(0,4) + '-' + caseStr.substring(4,8) + '-' + caseStr.substring(8,12) + '-' + caseStr.substring(12,16);
  }
  return caseStr.toString();
}

export async function isFtpaFeatureEnabled(req: Request) {
  const defaultFlag = (process.env.DEFAULT_LAUNCH_DARKLY_FLAG === 'true');
  const isFtpaFeatureEnabled = await LaunchDarklyService.getInstance().getVariation(req, FEATURE_FLAGS.FTPA, defaultFlag);
  return isFtpaFeatureEnabled;
}
