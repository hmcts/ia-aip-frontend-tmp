import { paths } from '../paths';
import { setupSecrets } from '../setupSecrets';

const config = setupSecrets();

export const idamConfig = {
  redirectUri: 'https://localhost:3000/redirectUrl',
  indexUrl: paths.login,
  idamApiUrl: config.get('idam.apiUrl'),
  idamLoginUrl: `${config.get('idam.webUrl')}/login`,
  idamSecret: config.get('idam.secret'),
  idamClientID: config.get('microservice'),
  openId: true
};
