const bcrypt = require('bcrypt');
const password = 'Admin@123456';
bcrypt.hash(password, 12).then(hash => {
  console.log('PASSWORD:', password);
  console.log('HASH:', hash);
});
