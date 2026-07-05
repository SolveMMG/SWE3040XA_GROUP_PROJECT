require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`RideConnect API running on port ${PORT} [${process.env.NODE_ENV}]`);
});
