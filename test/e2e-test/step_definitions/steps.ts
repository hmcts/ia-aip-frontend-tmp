const { checkAndSend } = require('../pages/check-and-send/check-and-send');
const { typeOfAppeal } = require('../pages/type-of-appeal/type-of-appeal');
const { outOfTimeAppeal } = require('../pages/out-of-time-appeal/out-of-time');
const { signIn } = require('../pages/sign-in');
const { common } = require('../pages/common');
const { homeOfficeReferenceNumber } = require('../pages/home-office-details/home-office-reference-number');
const { homeOfficeLetterSent } = require('../pages/home-office-details/home-office-letter-sent');
const { taskList } = require('../pages/task-list');
const { namePage } = require('../pages/personal-details/personal-details-name');
const { dateOfBirth } = require('../pages/personal-details/personal-details-date-of-birth');
const { nationality } = require('../pages/personal-details/personal-details-nationality');
const { enterPostcode } = require('../pages/personal-details/personal-details-enter-postcode');
const { selectAddress } = require('../pages/personal-details/personal-details-select-address');
const { enterAddress } = require('../pages/personal-details/personal-details-enter-address');
const { contactDetails } = require('../pages/contact-details/contact-details-page');
const { reasonsForAppeal } = require('../pages/reason-for-appeal/reason-for-appeal');

const { I } = inject();

common(I);
signIn(I);

taskList(I);
homeOfficeReferenceNumber(I);
homeOfficeLetterSent(I);
namePage(I);
dateOfBirth(I);
nationality(I);
enterPostcode(I);
selectAddress(I);
enterAddress(I);
contactDetails(I);
typeOfAppeal(I);
outOfTimeAppeal(I);
checkAndSend(I);
reasonsForAppeal(I);
