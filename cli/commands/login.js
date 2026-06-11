/**
 * Login command for the CLI
 */

import * as readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Prompts the user for their credentials, then creates an active user session if authentication succeeded.
 */
export default async function login() {
  const unvalidatedCredentials = await getLoginInfo();
  const credentials = validateCredentials(unvalidatedCredentials);
  if (credentials === null) {
    console.log('Invalid login credentials');
    return;
  }

  const response= await sendLoginRequest(credentials);

  switch (response.status) {
    case 200:
      console.log("Successfully logged in");
      break;
    case 400:
      console.error("Failed to login. Bad Request. See `npx watchtower --help login`");
      return;
    case 401:
      console.error("Failed to login. Invalid credentials");
      return;
    default:
      console.error("Failed to login");
      return;
  }

  const setCookie = response.headers.get('set-cookie');
  const cookieValue = setCookie?.split(';')[0].split('=').slice(1).join('=');
  
  const configDir = join(homedir(), '.config', 'watchtower');
  mkdirSync(configDir, { recursive: true });
  const ownerReadWriteOnlyMode = 0o600;
  writeFileSync(join(configDir, 'session'), cookieValue, { mode: ownerReadWriteOnlyMode });
}

/**
 * @typedef {Object} Credentials
 * @property {string} email
 * @property {string} password
 */

/**
 * Prompts the user for their login info. Does not validate the output
 *
 * @returns {Promise<Credentials>} A promise containing the user's login info
 */
async function getLoginInfo() {
  // Need to override readline's write function to allow for input hiding
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    }
  });

  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: output,
    terminal: true,
  });

  const email = await rl.question('Enter your email: ');
  process.stdout.write('Enter your password: ');
  muted = true;
  const password = await rl.question('');
  muted = false;
  process.stdout.write('\n');

  rl.close();

  return { email, password };
}

/**
 * Checks if the credentials are valid
 *
 * @param {Credentials} credentials The user's email and password
 *
 * @returns {Credentials | null} the credentials if they were valid, or null if they were not
 */
function validateCredentials(credentials) {
  // I got this from https://emailregex.com/index.html
  // eslint-disable-next-line no-control-regex
  const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gm
  const passwordRegex = /^[a-zA-Z0-9_-]{3,15}$/;

  if (!emailRegex.test(credentials.email)) return null;
  if (!passwordRegex.test(credentials.password)) return null;

  return credentials;
}

/**
 * Sends a login request with the user's credentials.
 *
 * @param {Credentials} credentials The user's email and password
 *
 * @returns {Promise<Response?>} A promise containing the response if the request went through, or null if it didn't
 */
async function sendLoginRequest(credentials) {
  const WATCHTOWER_LOGIN_URL = "https://watchtower-api.cse110piedpiper7.workers.dev/api/login";
  try {
    const response = await fetch(WATCHTOWER_LOGIN_URL, {
      method: "POST",
      headers: {
        "X-Watchtower-Auth": "true",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(credentials)
    })

      return response;
  } catch (error) {
    console.error("Request failed: ", error);
  }
  return -1;
}
