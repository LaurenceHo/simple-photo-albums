import { delay, http, HttpResponse } from 'msw';

export const getAlbumTags = http.get('/api/albumTags', async () => {
  await delay();

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
    data: [
      {
        tag: 'demo',
      },
      {
        tag: 'testtag1',
      },
      {
        tag: 'testtag2',
      },
    ],
  });
});

export const createAlbumTag = http.post('/api/albumTags', async () => {
  await delay();

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
  });

  // return new HttpResponse(null, {
  //   status: 500,
  //   statusText: 'Error',
  // });
});

export const deleteAlbumTag = http.delete('/api/albumTags/**', async () => {
  await delay();

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
  });

  // return new HttpResponse(null, {
  //   status: 500,
  //   statusText: 'Error',
  // });
});
