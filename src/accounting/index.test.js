'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const { Account, formatBalance, parseAmount } = require('./index');
const appPath = path.join(__dirname, 'index.js');

function runApp(input) {
  const result = spawnSync(process.execPath, [appPath], {
    encoding: 'utf8',
    input,
    timeout: 5000,
  });

  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('ACC-001 initializes and displays a new account at 1000.00', () => {
  const account = new Account();
  assert.equal(account.getBalance(), 100000);
  assert.match(runApp('1\n4\n'), /Current balance: 001000\.00/);
});

test('ACC-002 displays the current balance without changing it', () => {
  const output = runApp('1\n4\n');
  assert.match(output, /Current balance: 001000\.00/);
});

test('ACC-003 credits a positive amount and retains the updated balance', () => {
  const output = runApp('2\n50.00\n1\n4\n');
  assert.match(output, /Amount credited\. New balance: 001050\.00/);
  assert.match(output, /Current balance: 001050\.00/);
});

test('ACC-004 credits fractional cents accurately', () => {
  const output = runApp('2\n0.01\n1\n4\n');
  assert.match(output, /Amount credited\. New balance: 001000\.01/);
  assert.match(output, /Current balance: 001000\.01/);
});

test('ACC-005 accepts a zero credit without changing the balance', () => {
  const output = runApp('2\n0.00\n1\n4\n');
  assert.match(output, /Amount credited\. New balance: 001000\.00/);
  assert.match(output, /Current balance: 001000\.00/);
});

test('ACC-006 debits an amount less than the balance', () => {
  const output = runApp('3\n25.00\n1\n4\n');
  assert.match(output, /Amount debited\. New balance: 000975\.00/);
  assert.match(output, /Current balance: 000975\.00/);
});

test('ACC-007 allows a debit equal to the balance', () => {
  const account = new Account();
  assert.equal(account.debit(100000), true);
  assert.equal(account.getBalance(), 0);
  assert.match(runApp('3\n1000.00\n1\n4\n'), /Current balance: 000000\.00/);
});

test('ACC-008 rejects a debit greater than the balance without changing it', () => {
  const account = new Account();
  assert.equal(account.debit(100001), false);
  assert.equal(account.getBalance(), 100000);

  const output = runApp('3\n1000.01\n1\n4\n');
  assert.match(output, /Insufficient funds for this debit\./);
  assert.match(output, /Current balance: 001000\.00/);
});

test('ACC-009 accepts a zero debit without changing the balance', () => {
  const account = new Account();
  assert.equal(account.debit(0), true);
  assert.equal(account.getBalance(), 100000);
  assert.match(runApp('3\n0.00\n1\n4\n'), /Amount debited\. New balance: 001000\.00/);
});

test('ACC-010 applies multiple operations to the same account in order', () => {
  const account = new Account();
  assert.equal(account.credit(5000), true);
  assert.equal(account.debit(2000), true);
  assert.equal(account.getBalance(), 103000);
  assert.match(runApp('2\n50.00\n3\n20.00\n1\n4\n'), /Current balance: 001030\.00/);
});

test('ACC-011 reports an invalid menu choice and then accepts a valid choice', () => {
  const output = runApp('5\n4\n');
  assert.match(output, /Invalid choice, please select 1-4\./);
  assert.match(output, /Exiting the program\. Goodbye!/);
});

test('ACC-012 exits and displays the goodbye message for choice 4', () => {
  const output = runApp('4\n');
  assert.match(output, /Exiting the program\. Goodbye!/);
  assert.equal(output.split('Account Management System').length - 1, 1);
});

test('ACC-013 starts a fresh process with the initial balance', () => {
  const firstRun = runApp('2\n50.00\n4\n');
  const secondRun = runApp('1\n4\n');
  assert.match(firstRun, /Amount credited\. New balance: 001050\.00/);
  assert.match(secondRun, /Current balance: 001000\.00/);
});

test('ACC-014 reads updated values after successful account writes', () => {
  const account = new Account();
  assert.equal(account.getBalance(), 100000);
  assert.equal(account.credit(5000), true);
  assert.equal(account.getBalance(), 105000);
  assert.equal(account.debit(2000), true);
  assert.equal(account.getBalance(), 103000);
});

test('ACC-015 rejects negative credit and debit input without changing the balance', () => {
  assert.equal(parseAmount('-1.00'), null);
  const output = runApp('2\n-1.00\n3\n-1.00\n1\n4\n');
  assert.equal(output.match(/Invalid amount\./g)?.length, 2);
  assert.match(output, /Current balance: 001000\.00/);
  assert.doesNotMatch(output, /Amount credited\.|Amount debited\./);
});

test('ACC-016 rejects a credit above the maximum balance without mutating state', () => {
  const account = new Account(99999999);
  assert.equal(account.credit(1), false);
  assert.equal(account.getBalance(), 99999999);

  const output = runApp('2\n998999.99\n2\n0.01\n1\n4\n');
  assert.match(output, /Amount credited\. New balance: 999999\.99/);
  assert.match(output, /Credit would exceed the maximum supported balance of 999999\.99\./);
  assert.match(output, /Current balance: 999999\.99/);
});

test('formats balances with two fractional digits and a six-digit whole part', () => {
  assert.equal(formatBalance(100000), '001000.00');
  assert.equal(formatBalance(1), '000000.01');
});

