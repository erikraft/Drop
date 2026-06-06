import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.get('/', (req, res) => {
  try {
    res.sendFile('index.html');
  } catch (e) {
    console.log('Caught error:', e.message);
    res.status(500).send(e.message);
  }
});
const server = app.listen(0, () => {
  const port = server.address().port;
  console.log('Testing port:', port);
  fetch('http://127.0.0.1:' + port + '/')
    .then(r => r.text())
    .then(t => {
      console.log('Response:', t);
      process.exit(0);
    })
    .catch(e => {
      console.error('Fetch error:', e);
      process.exit(1);
    });
});
