import moment from 'moment';
import { dayMonthYearFormat } from '../../../../app/utils/date-utils';

module.exports = {
  submitHearingRequirements(I) {
    Then(/^I see hearing requirement section "([^"]*)" saved$/, async (selector: string) => {
      await I.see('SAVED',`//ol/li[1]/ul/li[${selector}]/strong`);
    });

    Then('I see Are there any dates between today\'s date and 6 weeks time that you or any witnesses cannot go to the hearing?', async () => {
      await I.seeInSource(moment().add(42,'days').format(dayMonthYearFormat));
    });
  }
};
