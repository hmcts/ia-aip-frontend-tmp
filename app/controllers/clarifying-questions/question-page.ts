import { NextFunction, Request, Response, Router } from 'express';
import i18n from '../../../locale/en.json';
import { Events } from '../../data/events';
import { paths } from '../../paths';
import UpdateAppealService from '../../service/update-appeal-service';
import { getNextPage, shouldValidateWhenSaveForLater } from '../../utils/save-for-later-utils';
import { getConditionalRedirectUrl } from '../../utils/url-utils';
import { textAreaValidation } from '../../utils/validations/fields-validations';

function getClarifyingQuestionPage(req: Request, res: Response, next: NextFunction) {
  try {
    const questionOrder = parseInt(req.params.id, 10) - 1;
    res.render('clarifying-questions/question-page.njk', {
      previousPage: paths.awaitingClarifyingQuestionsAnswers.questionsList,
      question: {
        ...req.session.appeal.draftClarifyingQuestionsAnswers[questionOrder],
        orderNo: req.params.id
      }
    });
  } catch (error) {
    next(error);
  }
}

function postClarifyingQuestionPage(updateAppealService: UpdateAppealService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!shouldValidateWhenSaveForLater(req.body, 'answer','saveForLater')) {
        return getConditionalRedirectUrl(req, res, paths.common.overview + '?saved');
      }
      const questionOrder = parseInt(req.params.id, 10) - 1;
      const questions = [ ...req.session.appeal.draftClarifyingQuestionsAnswers ];
      const validationError = textAreaValidation(req.body['answer'], 'answer', i18n.validationErrors.clarifyingQuestions.emptyAnswer);
      if (validationError) {
        return res.render('clarifying-questions/question-page.njk', {
          previousPage: paths.awaitingClarifyingQuestionsAnswers.questionsList,
          question: {
            ...questions[questionOrder],
            orderNo: req.params.id
          },
          errors: validationError,
          errorList: Object.values(validationError)
        });
      }
      const updatedQuestions = questions.map((question, index) => {
        if (questionOrder !== index) return question;
        return {
          ...question,
          value: {
            ...question.value,
            answer: req.body['answer']
          }
        };
      });
      req.session.appeal.draftClarifyingQuestionsAnswers = [ ...updatedQuestions ];
      await updateAppealService.submitEvent(Events.EDIT_CLARIFYING_QUESTION_ANSWERS, req);
      return getConditionalRedirectUrl(req, res, getNextPage(req.body,paths.awaitingClarifyingQuestionsAnswers.supportingEvidenceQuestion.replace(new RegExp(':id'), req.params.id)));
    } catch (error) {
      next(error);
    }
  };
}

function setupClarifyingQuestionPageController(middleware: Middleware[], updateAppealService: UpdateAppealService): Router {
  const router = Router();
  router.get(`${paths.awaitingClarifyingQuestionsAnswers.question}`, middleware, getClarifyingQuestionPage);
  router.post(`${paths.awaitingClarifyingQuestionsAnswers.question}`, middleware, postClarifyingQuestionPage(updateAppealService));
  return router;
}

export {
  getClarifyingQuestionPage,
  postClarifyingQuestionPage,
  setupClarifyingQuestionPageController
};
