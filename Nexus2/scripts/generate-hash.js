// Gerador de hash bcrypt para senha do admin
const bcrypt = require('bcrypt');

const password = process.argv[2] || 'Admin@123456';
const saltRounds = 12;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) throw err;
  console.log(hash);
});
