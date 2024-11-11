import { Logger } from '@hmcts/nodejs-logging';
import { LoggerInstance } from 'winston';
import { jwtRepack } from './jwt-repack';
// import Logger, { getLogLabel } from './logger';

// const logger: Logger = new Logger();
// const logLabel: string = getLogLabel(__filename);
const logger: LoggerInstance = Logger.getLogger('jwt-utils.ts');

export function decodeJWTToken(jwtToken: string) {
  let decoded;
  try {
    decoded = jwtRepack.decode(jwtToken);
  } catch (err) {
    logger.error(err);
    throw new Error(err);
  }
  return decoded;
}

/**
 * Checks whether a JWTToken is expired using an offset of 5 minutes,
 * this offset accounts for delays between sending/receiving requests
 * @param jwtToken the jwt token to be verified
 */
export function isJWTExpired(jwtToken: string) {
  let offset = 5 * 60; // 5 minutes
  let isExpiredToken = false;

  if (!jwtToken) {
    logger.info('S2S token is null or empty.');
    return true;
  }

  const decoded = decodeJWTToken(jwtToken);

  const currentTime = Math.round(new Date().getTime() / 1000);

  if (decoded && decoded.exp < (currentTime + offset)) {
    logger.info('S2S token has expired.');
    isExpiredToken = true;
  }
  return isExpiredToken;
}
