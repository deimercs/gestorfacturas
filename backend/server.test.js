const request = require('supertest');
const express = require('express');

describe('Server', () => {
  let app;
  let server;

  beforeAll(() => {
    app = express();
    server = app.listen(3000);
  });

  afterAll((done) => {
    server.close(done);
  });
});
