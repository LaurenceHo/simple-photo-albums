import { delay, http, HttpResponse } from 'msw';

export const mockFeaturedAlbums = [
  {
    id: 'demo-album5',
    year: '2024',
    albumName: '2024 demo album5',
    description: 'Some test photos',
    albumCover: 'demo-album5/batch_2017-05-14 13.15.16.jpg',
    isPrivate: false,
    isFeatured: true,
    place: {
      formattedAddress: 'Tokyo, Japan',
      displayName: 'Tokyo',
      location: {
        latitude: 35.6764225,
        longitude: 139.650027,
      },
    },
    tags: [],
  },
  {
    id: 'demo-album-4',
    year: 'na',
    albumName: 'This is demo album 4',
    description: 'This is an album description',
    albumCover: 'demo-album-4/2024-05-02 18.28.53.jpg',
    isPrivate: false,
    isFeatured: true,
    place: {
      formattedAddress: 'Valencia, Spain',
      displayName: 'Valencia',
      location: {
        latitude: 39.4699075,
        longitude: -0.3762881,
      },
    },
    tags: [],
  },
  {
    id: 'demo-album1',
    year: 'na',
    albumName: '1 demo-album 1',
    description: 'This is demo album 1',
    albumCover: 'demo-album1/batch_flamingo-8353373.jpg',
    isPrivate: false,
    isFeatured: true,
    place: {
      formattedAddress: 'Venice, Metropolitan City of Venice, Italy',
      displayName: 'Venice',
      location: {
        latitude: 45.440379,
        longitude: 12.3159547,
      },
    },
    tags: [],
  },
  {
    id: 'demo-album2',
    year: 'na',
    albumName: 'demo-album 2',
    description: 'This is demo album 2',
    albumCover: 'demo-album2/batch_bird-8360220.jpg',
    isPrivate: false,
    isFeatured: true,
    place: {
      formattedAddress: 'Honolulu, HI, USA',
      displayName: 'Honolulu',
      location: {
        latitude: 21.3098845,
        longitude: -157.85814,
      },
    },
    tags: [],
  },
  {
    id: 'demo-album5',
    year: '2024',
    albumName: '2024 demo album5',
    description: 'Some test photos',
    albumCover: 'demo-album5/batch_2017-05-14 13.15.16.jpg',
    isPrivate: false,
    isFeatured: true,
    place: {
      formattedAddress: 'Tokyo, Japan',
      displayName: 'Tokyo',
      location: {
        latitude: 35.6764225,
        longitude: 139.650027,
      },
    },
    tags: [],
  },
  {
    id: 'demo-album-4',
    year: 'na',
    albumName: 'This is demo album 4',
    description: 'This is an album description',
    albumCover: 'demo-album-4/2024-05-02 18.28.53.jpg',
    isPrivate: false,
    isFeatured: true,
    place: {
      formattedAddress: 'Valencia, Spain',
      displayName: 'Valencia',
      location: {
        latitude: 39.4699075,
        longitude: -0.3762881,
      },
    },
    tags: [],
  },
  {
    id: 'demo-album1',
    year: 'na',
    albumName: '1 demo-album 1',
    description: 'This is demo album 1',
    albumCover: 'demo-album1/batch_flamingo-8353373.jpg',
    isPrivate: false,
    isFeatured: true,
    place: {
      formattedAddress: 'Venice, Metropolitan City of Venice, Italy',
      displayName: 'Venice',
      location: {
        latitude: 45.440379,
        longitude: 12.3159547,
      },
    },
    tags: [],
  },
  {
    id: 'demo-album2',
    year: 'na',
    albumName: 'demo-album 2',
    description: 'This is demo album 2',
    albumCover: 'demo-album2/batch_bird-8360220.jpg',
    isPrivate: false,
    isFeatured: true,
    place: {
      formattedAddress: 'Honolulu, HI, USA',
      displayName: 'Honolulu',
      location: {
        latitude: 21.3098845,
        longitude: -157.85814,
      },
    },
    tags: [],
  },
];

export const getFeaturedAlbums = http.get('/api/aggregate/featuredAlbums', async () => {
  await delay();

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
    data: mockFeaturedAlbums,
  });
});

export const getCountAlbumsByYear = http.get('/api/aggregate/countAlbumsByYear', async () => {
  await delay();

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
    data: [
      {
        year: 'na',
        count: 5,
      },
      {
        year: '2025',
        count: 1,
      },
      {
        year: '2024',
        count: 1,
      },
    ],
  });
});

export const getAlbumWithLocation = http.get('/api/aggregate/albumsWithLocation', async () => {
  await delay();

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
    data: [
      {
        id: 'demo-album5',
        year: '2024',
        albumName: '2024 demo album5',
        description: 'Some test photos',
        albumCover: 'demo-album5/batch_2017-05-14 13.15.16.jpg',
        isPrivate: false,
        isFeatured: true,
        place: {
          formattedAddress: 'Tokyo, Japan',
          displayName: 'Tokyo',
          location: {
            latitude: 35.6764225,
            longitude: 139.650027,
          },
        },
        tags: [],
      },
      {
        id: 'demo-album-4',
        year: 'na',
        albumName: 'This is demo album 4',
        description: 'This is an album description',
        albumCover: 'demo-album-4/2024-05-02 18.28.53.jpg',
        isPrivate: false,
        isFeatured: true,
        place: {
          formattedAddress: 'Valencia, Spain',
          displayName: 'Valencia',
          location: {
            latitude: 39.4699075,
            longitude: -0.3762881,
          },
        },
        tags: [],
      },
      {
        id: 'demo-album1',
        year: 'na',
        albumName: '1 demo-album 1',
        description: 'This is demo album 1',
        albumCover: 'demo-album1/batch_flamingo-8353373.jpg',
        isPrivate: false,
        isFeatured: true,
        place: {
          formattedAddress: 'Venice, Metropolitan City of Venice, Italy',
          displayName: 'Venice',
          location: {
            latitude: 45.440379,
            longitude: 12.3159547,
          },
        },
        tags: [],
      },
      {
        id: 'demo-album2',
        year: 'na',
        albumName: 'demo-album 2',
        description: 'This is demo album 2',
        albumCover: 'demo-album2/batch_bird-8360220.jpg',
        isPrivate: false,
        isFeatured: true,
        place: {
          formattedAddress: 'Honolulu, HI, USA',
          displayName: 'Honolulu',
          location: {
            latitude: 21.3098845,
            longitude: -157.85814,
          },
        },
        tags: [],
      },
      {
        id: 'demo-album3',
        year: 'na',
        albumName: 'this is demo-album-3',
        description: '',
        albumCover: 'demo-album3/batch_dog-8378909.jpg',
        isPrivate: false,
        isFeatured: false,
        place: {
          formattedAddress: 'George Town, Penang, Malaysia',
          displayName: 'George Town',
          location: {
            latitude: 5.4141307,
            longitude: 100.3287506,
          },
        },
        tags: [],
      },
    ],
  });
});
