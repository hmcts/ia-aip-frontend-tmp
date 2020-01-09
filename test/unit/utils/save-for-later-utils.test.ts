import { paths } from '../../../app/paths';
import { getNextPage, shouldValidateWhenSaveForLater } from '../../../app/utils/save-for-later-utils';
import { expect } from '../../utils/testUtils';

describe('Save for later utils', () => {
  describe('getNextPage', () => {
    it('get next page when save for later clicked', () => {
      const nextPage = getNextPage({ saveForLater: 'saveForLater' }, 'defaultPath');

      expect(nextPage).to.eq(paths.taskList);
    });

    it('get next page when save and continue clicked', () => {
      const nextPage = getNextPage({}, 'defaultPath');

      expect(nextPage).to.eq('defaultPath');
    });
  });

  describe('shouldValidateWhenSaveForLater', () => {
    it('shouldValidateWhenSaveForLater is true when save for later not clicked', function () {
      const shouldValidate = shouldValidateWhenSaveForLater({ }, 'anyField');

      expect(shouldValidate).to.be.true;
    });

    it('shouldValidateWhenSaveForLater is true when save for later clicked and some data entered', function () {
      const shouldValidate = shouldValidateWhenSaveForLater({ saveForLater: 'saveForLater', field1: 'someValue' }, 'field1', 'field2');

      expect(shouldValidate).to.be.true;
    });

    it('shouldValidateWhenSaveForLater is false when save for later clicked and no data entered', function () {
      const shouldValidate = shouldValidateWhenSaveForLater({ saveForLater: 'saveForLater' }, 'field1', 'field2');

      expect(shouldValidate).to.be.false;
    });

    it('shouldValidateWhenSaveForLater is false when save for later clicked and data entered is blank', function () {
      const shouldValidate = shouldValidateWhenSaveForLater({ saveForLater: 'saveForLater', field1: '', field2: '' }, 'field1', 'field2');

      expect(shouldValidate).to.be.false;
    });
  });
});
