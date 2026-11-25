import db from './src/config/db.js';
db.execute('SELECT id, email, role, google_id FROM users WHERE email = ?', ['bruno.delporte10@gmail.com']).then(([rows]) => {
  console.log('DB RESULT:', rows);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
