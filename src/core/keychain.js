import { run } from './subprocess.js';

/** Fetch a generic password from the macOS Keychain. */
export function getKeychainSecret(service, account) {
  const result = run([
    'security', 'find-generic-password', '-s', service, '-a', account, '-w',
  ], { timeout: 10000 });
  if (result.returncode !== 0) {
    throw new Error(
      `Could not retrieve '${service}/${account}' from Keychain. ` +
      `Add it with: security add-generic-password -s '${service}' -a '${account}' -w <value>`,
    );
  }
  return (result.stdout || '').trim();
}
