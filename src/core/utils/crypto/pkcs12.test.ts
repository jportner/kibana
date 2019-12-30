/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  CA_CERT_PATH,
  ES_KEY_PATH,
  ES_CERT_PATH,
  ES_P12_PATH,
  ES_P12_PASSWORD,
  ES_EMPTYPASSWORD_P12_PATH,
  ES_NOPASSWORD_P12_PATH,
} from '@kbn/dev-utils';
import { readFileSync } from 'fs';

import { readPkcs12Keystore, Pkcs12ReadResult, readPkcs12Truststore } from './pkcs12';

const readPem = (file: string) => {
  const raw = readFileSync(file, 'utf8');
  // strip bag attributes that are included from a previous PKCS #12 export
  return raw.substr(raw.indexOf('-----BEGIN')).trim();
};

describe('#readPkcs12Keystore', () => {
  describe('Succeeds when the correct password is used', () => {
    let pkcs12ReadResult: Pkcs12ReadResult;

    it('Reads the keystore without error', () => {
      // this is expensive, just do it once
      pkcs12ReadResult = readPkcs12Keystore(ES_P12_PATH, ES_P12_PASSWORD);
    });

    it('Extracts the PEM key', () => {
      const pemKey = readPem(ES_KEY_PATH);
      expect(pkcs12ReadResult.key).toEqual(pemKey);
    });

    it('Extracts the PEM instance certificate', () => {
      const pemCert = readPem(ES_CERT_PATH);
      expect(pkcs12ReadResult.cert).toEqual(pemCert);
    });

    it('Extracts the PEM CA certificate', () => {
      const pemCA = readPem(CA_CERT_PATH);
      expect(pkcs12ReadResult.ca).toEqual([pemCA]);
    });
  });

  describe('Succeeds on a key store with an empty password', () => {
    let pkcs12ReadResult: Pkcs12ReadResult;

    it('Reads the keystore without error', () => {
      // this is expensive, just do it once
      pkcs12ReadResult = readPkcs12Keystore(ES_EMPTYPASSWORD_P12_PATH, '');
    });

    it('Extracts the PEM key', () => {
      const pemKey = readPem(ES_KEY_PATH);
      expect(pkcs12ReadResult.key).toEqual(pemKey);
    });

    it('Extracts the PEM instance certificate', () => {
      const pemCert = readPem(ES_CERT_PATH);
      expect(pkcs12ReadResult.cert).toEqual(pemCert);
    });

    it('Extracts the PEM CA certificate', () => {
      const pemCA = readPem(CA_CERT_PATH);
      expect(pkcs12ReadResult.ca).toEqual([pemCA]);
    });
  });

  describe('Succeeds on a key store with no password', () => {
    let pkcs12ReadResult: Pkcs12ReadResult;

    it('Reads the keystore without error', () => {
      // this is expensive, just do it once
      pkcs12ReadResult = readPkcs12Keystore(ES_NOPASSWORD_P12_PATH);
    });

    it('Extracts the PEM key', () => {
      const pemKey = readPem(ES_KEY_PATH);
      expect(pkcs12ReadResult.key).toEqual(pemKey);
    });

    it('Extracts the PEM instance certificate', () => {
      const pemCert = readPem(ES_CERT_PATH);
      expect(pkcs12ReadResult.cert).toEqual(pemCert);
    });

    it('Extracts the PEM CA certificate', () => {
      const pemCA = readPem(CA_CERT_PATH);
      expect(pkcs12ReadResult.ca).toEqual([pemCA]);
    });
  });

  describe('Throws when an invalid password is used', () => {
    const expectError = (password?: string) => {
      expect(() => readPkcs12Keystore(ES_P12_PATH, password)).toThrowError(
        'PKCS#12 MAC could not be verified. Invalid password?'
      );
    };

    it('Incorrect password', () => {
      expectError('incorrect');
    });

    it('Empty password', () => {
      expectError('');
    });

    it('Undefined password', () => {
      expectError();
    });
  });
});

describe('#readPkcs12Truststore', () => {
  it('reads all certificates into one CA array and discards any keys', () => {
    const ca = readPkcs12Truststore(ES_P12_PATH, ES_P12_PASSWORD);
    const pemCert = readPem(ES_CERT_PATH);
    const pemCA = readPem(CA_CERT_PATH);

    expect(ca).toEqual([pemCert, pemCA]);
  });
});
