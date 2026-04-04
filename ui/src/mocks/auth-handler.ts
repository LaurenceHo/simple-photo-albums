import { delay, http, HttpResponse } from 'msw';

export const getUserPermission = http.get('/api/auth/user-info', async () => {
  await delay();
  // return new HttpResponse(null, {
  //   status: 500,
  //   statusText: 'Error',
  // });

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
    data: {
      displayName: 'TestUser124',
      role: 'admin',
      email: 'testUser@test.com',
      uid: '1234567890',
    },
  });
});

export const userLogin = http.post('/api/auth/verify-id-token', async () => {
  await delay();
  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
    data: {
      displayName: 'TestUser124',
      role: 'admin',
      email: 'testUser@test.com',
      uid: '1234567890',
    },
  });
});

export const userLogout = http.post('/api/auth/logout', async () => {
  await delay();

  return new HttpResponse(null, { status: 200 });
});
