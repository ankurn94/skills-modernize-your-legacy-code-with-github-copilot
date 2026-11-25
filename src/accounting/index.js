'use strict';

const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const INITIAL_BALANCE_CENTS = 100_000;
const MAX_BALANCE_CENTS = 99_999_999;

class Account {
  #balanceCents;

  constructor(balanceCents = INITIAL_BALANCE_CENTS) {
    if (!Number.isSafeInteger(balanceCents) || balanceCents < 0 || balanceCents > MAX_BALANCE_CENTS) {
      throw new RangeError('Balance must be between 0.00 and 999999.99.');
    }
    this.#balanceCents = balanceCents;
  }

  getBalance() {
    return this.#balanceCents;
  }

  credit(amountCents) {
    assertValidAmount(amountCents);
    if (this.#balanceCents + amountCents > MAX_BALANCE_CENTS) {
      return false;
    }

    this.#balanceCents += amountCents;
    return true;
  }

  debit(amountCents) {
    assertValidAmount(amountCents);
    if (this.#balanceCents < amountCents) {
      return false;
    }

    this.#balanceCents -= amountCents;
    return true;
  }
}

function assertValidAmount(amountCents) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new RangeError('Amount must be a non-negative number of cents.');
  }
}

function parseAmount(input) {
  if (typeof input !== 'string') {
    return null;
  }
  const amount = input.trim();
  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(amount)) {
    return null;
  }

  const [whole, fraction = ''] = amount.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function formatBalance(amountCents) {
  const whole = Math.floor(amountCents / 100).toString().padStart(6, '0');
  const fraction = (amountCents % 100).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

function displayMenu() {
  console.log('--------------------------------');
  console.log('Account Management System');
  console.log('1. View Balance');
  console.log('2. Credit Account');
  console.log('3. Debit Account');
  console.log('4. Exit');
  console.log('--------------------------------');
}

async function requestAmount(requestInput, description) {
  const input = await requestInput(`Enter ${description} amount: `);
  if (input === undefined) {
    return undefined;
  }
  const amountCents = parseAmount(input);
  if (amountCents === null) {
    console.log('Invalid amount. Enter a non-negative amount with up to 6 digits and 2 decimal places.');
  }

  return amountCents;
}

async function run() {
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  const account = new Account();
  const answers = terminal[Symbol.asyncIterator]();

  async function requestInput(prompt) {
    stdout.write(prompt);
    const answer = await answers.next();
    return answer.done ? undefined : answer.value;
  }

  try {
    while (true) {
      displayMenu();
      const input = await requestInput('Enter your choice (1-4): ');
      if (input === undefined) {
        console.log('Exiting the program. Goodbye!');
        return;
      }
      const choice = input.trim();

      switch (choice) {
        case '1':
          console.log(`Current balance: ${formatBalance(account.getBalance())}`);
          break;
        case '2': {
          const amountCents = await requestAmount(requestInput, 'credit');
          if (amountCents === undefined) {
            console.log('Exiting the program. Goodbye!');
            return;
          }
          if (amountCents === null) {
            break;
          }
          if (!account.credit(amountCents)) {
            console.log('Credit would exceed the maximum supported balance of 999999.99.');
            break;
          }
          console.log(`Amount credited. New balance: ${formatBalance(account.getBalance())}`);
          break;
        }
        case '3': {
          const amountCents = await requestAmount(requestInput, 'debit');
          if (amountCents === undefined) {
            console.log('Exiting the program. Goodbye!');
            return;
          }
          if (amountCents === null) {
            break;
          }
          if (!account.debit(amountCents)) {
            console.log('Insufficient funds for this debit.');
            break;
          }
          console.log(`Amount debited. New balance: ${formatBalance(account.getBalance())}`);
          break;
        }
        case '4':
          console.log('Exiting the program. Goodbye!');
          return;
        default:
          console.log('Invalid choice, please select 1-4.');
      }
    }
  } finally {
    terminal.close();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Application error:', error);
    process.exitCode = 1;
  });
}

module.exports = { Account, formatBalance, parseAmount, run };
