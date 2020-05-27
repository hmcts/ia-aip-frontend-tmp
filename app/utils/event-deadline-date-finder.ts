import config from 'config';
import { Request } from 'express';
import moment from 'moment';
import { dayMonthYearFormat } from './date-utils';

const daysToWaitAfterSubmission = config.get('daysToWait.afterSubmission');
const daysToWaitAfterReasonsForAppeal = config.get('daysToWait.afterReasonsForAppeal');

/**
 * Finds a targeted direction, retrieves it's due date and returns it as a string with the correct date format
 * @param directions the directions
 * @param directionTagToLookFor the direction to find
 */
function getFormattedDirectionDueDate(directions: Direction[], directionTagToLookFor: string) {
  let formattedDeadline = null;
  if (directions) {
    const direction = directions.find(d => d.tag === directionTagToLookFor);
    if (direction) {
      const dueDate = direction.dateDue;
      formattedDeadline = moment(dueDate).format(dayMonthYearFormat);
    }
  }
  return formattedDeadline;
}

/**
 * Given the current case status it retrieves deadlines based on the business logic.
 * @param currentAppealStatus the appeal status
 * @param req the request containing  all the directions in session
 */
function getDeadline(currentAppealStatus: string, history, req: Request) {

  let formattedDeadline;

  switch (currentAppealStatus) {
    case 'appealStarted': {
      formattedDeadline = null;
      break;
    }
    case 'appealSubmitted':
    case 'awaitingRespondentEvidence': {
      const triggeringDate = history['appealSubmitted'].date;
      formattedDeadline = moment(triggeringDate).add(daysToWaitAfterSubmission, 'days').format(dayMonthYearFormat);
      break;
    }
    case 'awaitingReasonsForAppeal':
    case 'awaitingReasonsForAppealPartial': {
      formattedDeadline = getFormattedDirectionDueDate(req.session.appeal.directions, 'requestReasonsForAppeal');
      break;
    }
    case 'reasonsForAppealSubmitted': {
      const triggeringDate = history['submitReasonsForAppeal'].date;
      formattedDeadline = moment(triggeringDate).add(daysToWaitAfterReasonsForAppeal, 'days').format(dayMonthYearFormat);
      break;
    }
    case 'awaitingClarifyingQuestionsAnswers': {
      formattedDeadline = getFormattedDirectionDueDate(req.session.appeal.directions, 'requestClarifyingQuestions');
      break;
    }
    default: {
      formattedDeadline = 'TBC';
      break;
    }
  }

  return formattedDeadline;
}

export {
  getDeadline
};
