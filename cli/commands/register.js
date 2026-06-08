/**
 * Register command for the CLI
 */

import * as readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const WATCHTOWER_API_URL = "https://watchtower-api.cse110piedpiper7.workers.dev";

/**
 * Prompts the user for their details, then creates an account and active session if registration succeeded.
 */
export default async function register() {
  const unvalidatedCredentials = await getRegisterInfo();
  if (unvalidatedCredentials === null) return;

  const credentials = validateCredentials(unvalidatedCredentials);
  if (credentials === null) {
    console.error('Invalid registration credentials');
    return;
  }

  const response = await sendRegisterRequest(credentials);

  switch (response.status) {
    case 200:
    case 201:
      console.log("Successfully registered");
      break;
    case 400:
      console.error("Failed to register. Bad Request. See `npx watchtower --help register`");
      return;
    case 409:
      console.error("Failed to register. An account with that email already exists.");
      return;
    default:
      console.error("Failed to register");
      return;
  }

  const setCookie = response.headers.get('set-cookie');
  const cookieValue = setCookie?.split(';')[0].split('=').slice(1).join('=');

  if (cookieValue) {
    const configDir = join(homedir(), '.config', 'watchtower');
    mkdirSync(configDir, { recursive: true });
    const ownerReadWriteOnlyMode = 0o600;
    writeFileSync(join(configDir, 'session'), cookieValue, { mode: ownerReadWriteOnlyMode });
  }
}

/**
 * @typedef {Object} Credentials
 * @property {string} email
 * @property {string} password
 */

/**
 * Prompts the user for their registration info. Does not validate the output.
 *
 * @returns {Promise<Credentials | null>} A promise containing the user's registration info, or null if passwords did not match
 */
async function getRegisterInfo() {
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    }
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });

  const email = await rl.question('Enter your email: ');

  process.stdout.write('Enter your password: ');
  muted = true;
  const password = await rl.question('');
  muted = false;
  process.stdout.write('\n');

  process.stdout.write('Confirm your password: ');
  muted = true;
  const confirm = await rl.question('');
  muted = false;
  process.stdout.write('\n');

  rl.close();

  if (password !== confirm) {
    console.error('Passwords do not match');
    return null;
  }

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
  const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gm
  const passwordRegex = /^[a-zA-Z0-9_-]{3,15}$/;

  if (!emailRegex.test(credentials.email)) return null;
  if (!passwordRegex.test(credentials.password)) return null;

  return credentials;
}

/**
 * Sends a registration request with the user's credentials.
 *
 * @param {Credentials} credentials The user's email and password
 *
 * @returns {Promise<Response>} A promise containing the response if the request went through, or -1 if it didn't
 */
async function sendRegisterRequest(credentials) {
  try {
    const response = await fetch(WATCHTOWER_API_URL + "/api/register", {
      method: "POST",
      headers: {
        "X-Watchtower-Auth": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    return response;
  } catch (error) {
    console.error("Request failed: ", error);
  }
  return -1;
}
