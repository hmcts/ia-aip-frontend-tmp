import { isNull } from 'lodash';

interface ICookies {
  init: () => void;
  addCookie: (name: string, value: string) => void;
  hideCookieBanner: () => void;
  showCookieBanner: () => void;
}

export default class CookiesBanner implements ICookies {
  public cookieBanner: HTMLElement = null;
  public acceptCookiesButton: HTMLElement = null;
  public rejectCookiesButton: HTMLElement = null;
  public saveButton: HTMLInputElement = null;
  private currentDate = new Date();
  private expiryDate = new Date(this.currentDate.setMonth(this.currentDate.getMonth() + 1));
  private pastDate = new Date(this.currentDate.setMonth(this.currentDate.getMonth() - 2));

  init() {
    this.cookieBanner = document.querySelector('#cookie-banner');
    if (isNull(this.cookieBanner)) { return; }
    // tslint:disable-next-line
    if (!window.gtag) window.gtag = () => { };
    this.acceptCookiesButton = document.querySelector('#acceptCookies');
    this.rejectCookiesButton = document.querySelector('#rejectCookies');
    this.saveButton = document.querySelector('#saveCookies');

    this.addEventListeners();
    this.initAnalyticsCookie();
  }

  addEventListeners() {
    this.acceptCookiesButton.addEventListener('click', () => {
      this.addCookie('analytics_consent', 'yes');
      this.addCookie('apm_consent', 'yes');
      if (this.saveButton !== null) {
        this.setAnalyticsAndApmSelectionsForAccepted();
      }
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted',
        'apm_storage': 'granted'
      });
      this.hideCookieBanner();
      this.enableDynaCookies();
    });

    this.rejectCookiesButton.addEventListener('click', () => {
      this.addCookie('analytics_consent', 'no');
      this.addCookie('apm_consent', 'no');

      if (this.saveButton !== null) {
        this.setAnalyticsAndApmSelectionsForRejected();
      }
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied',
        'apm_storage': 'denied'
      });

      this.hideCookieBanner();
    });

    if (this.saveButton !== null) {
      this.saveButton.addEventListener('click', () => {
        let analyticsRadioButtonOff: HTMLInputElement = document.querySelector('#radio-analytics-off');
        this.addCookie('analytics_consent', analyticsRadioButtonOff.checked ? 'no' : 'yes');

        let apmRadioButtonOff: HTMLInputElement = document.querySelector('#radio-apm-off');
        this.addCookie('apm_consent', apmRadioButtonOff.checked ? 'no' : 'yes');
      });
    }
  }

  setAnalyticsAndApmSelectionsForAccepted() {
    let analyticsRadioButtonOn: HTMLInputElement = document.querySelector('#radio-analytics-on');
    analyticsRadioButtonOn.checked = true;

    let apmRadioButtonOn: HTMLInputElement = document.querySelector('#radio-apm-on');
    apmRadioButtonOn.checked = true;
  }

  setAnalyticsAndApmSelectionsForRejected() {
    let analyticsRadioButtonOff: HTMLInputElement = document.querySelector('#radio-analytics-off');
    analyticsRadioButtonOff.checked = true;

    let apmRadioButtonOff: HTMLInputElement = document.querySelector('#radio-apm-off');
    apmRadioButtonOff.checked = true;
  }

  initAnalyticsCookie() {
    const analyticsCookieExist = document.cookie.indexOf('analytics_consent') > -1;

    if (analyticsCookieExist) {
      this.hideCookieBanner();
      const analyticsConsent = this.getCookieValue('analytics_consent');
      const apmConsent = this.getCookieValue('apm_consent');

      window.gtag('consent', 'update', {
        'analytics_storage': analyticsConsent === 'yes' ? 'granted' : 'denied',
        'apm_storage': apmConsent === 'yes' ? 'granted' : 'denied'
      });

      this.setAnalyticsAndApmSelectionsFromCookies();
      if (analyticsConsent === 'yes') this.enableDynaCookies();
    } else {
      this.showCookieBanner();
    }
  }

  setAnalyticsAndApmSelectionsFromCookies() {
    const analyticsConsent = this.getCookieValue('analytics_consent');
    const apmConsent = this.getCookieValue('apm_consent');

    let analyticsRadioButtonOn: HTMLInputElement = document.querySelector(analyticsConsent === 'yes'
      ? '#radio-analytics-on' : '#radio-analytics-off');
    analyticsRadioButtonOn.checked = true;

    let apmRadioButtonOn: HTMLInputElement = document.querySelector(apmConsent === 'yes'
      ? '#radio-apm-on' : '#radio-apm-off');
    apmRadioButtonOn.checked = true;

  }

  enableDynaCookies() {
    if (window.dtrum !== undefined) {
      window.dtrum.enable();
      window.dtrum.enableSessionReplay();
    }
  }

  addCookie(name, value) {
    document.cookie = `${name}=${value}; expires=${this.expiryDate}; path=/`;
  }

  removeCookie(name) {
    const hostname = window.location.hostname;
    const dotHostname = '.' + hostname;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=${hostname};path=/`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=${dotHostname};path=/`;

    // for live
    const firstDot = hostname.indexOf('.');
    const upperDomain = hostname.substring(firstDot);
    const dotUpperDomain = '.' + upperDomain;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=${upperDomain};path=/`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=${dotUpperDomain};path=/`;

    // for sub-live
    const dots = hostname.split('.');
    const subLiveUpperDomain = dots[dots.length - 2] + '.' + dots[dots.length - 1];
    const subLiveDotUpperDomain = '.' + subLiveUpperDomain;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=${subLiveUpperDomain};path=/`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=${subLiveDotUpperDomain};path=/`;

    document.cookie = `${name}=; expires=${this.pastDate}; path=/`;
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  }

  getCookieValue(name) {
    return document.cookie.split('; ').find(row => row.startsWith(`${name}=`)).split('=')[1];
  }

  hideCookieBanner() {
    this.cookieBanner.style.display = 'none';
  }

  showCookieBanner() {
    this.cookieBanner.style.display = 'block';
  }
}
