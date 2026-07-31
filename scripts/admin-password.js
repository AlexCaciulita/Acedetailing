#!/usr/bin/env node
/* Generates the ADMIN_PASSWORD_HASH value for the admin dashboard.
   The password is read from stdin without echoing and is never written
   anywhere — only the derived hash is printed.

   Usage:  node scripts/admin-password.js  */

import readline from 'readline';
import { hashPassword } from '../api/admin/_auth.js';

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    // Suppress echo so the password never appears on screen or in scrollback.
    const onData = (char) => {
      if (['\n', '\r', ''].includes(String(char))) return;
      readline.moveCursor(process.stdout, -1000, 0);
      readline.clearLine(process.stdout, 1);
      process.stdout.write(question);
    };
    process.stdin.on('data', onData);

    rl.question(question, (answer) => {
      process.stdin.removeListener('data', onData);
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const password = await askHidden('Parolă nouă pentru panoul de administrare: ');

if (password.length < 12) {
  console.error('\nParola trebuie să aibă cel puțin 12 caractere. Nu s-a generat nimic.');
  process.exit(1);
}

const confirm = await askHidden('Confirmă parola: ');

if (password !== confirm) {
  console.error('\nParolele nu coincid. Nu s-a generat nimic.');
  process.exit(1);
}

console.log('\nAdaugă linia de mai jos în fișierul .env (care NU se comite în git):\n');
console.log(`ADMIN_PASSWORD_HASH='${hashPassword(password)}'\n`);
console.log('Apoi repornește serverul. Panoul devine disponibil la /admin.');
