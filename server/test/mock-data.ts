import { signJwt } from '../src/utils/jwt.js';

export const mockAlbumList = [
  {
    albumCover: 'demo-album2/batch_bird-8360220.jpg',
    isPrivate: false,
    place: {
      displayName: 'Honolulu',
      formattedAddress: 'Honolulu, HI, USA',
      location: { latitude: 21.3098845, longitude: -157.85814009999999 },
    },
    albumName: 'demo-album 2',
    description: 'This is demo album 2',
    id: 'demo-album2',
    tags: ['tag1', 'tag3'],
  },
  {
    albumCover: 'demo-album1/batch_berlin-8429780.jpg',
    isPrivate: false,
    place: {
      displayName: 'Museum of New Zealand Te Papa Tongarewa',
      formattedAddress: '55 Cable Street, Te Aro, Wellington 6011, New Zealand',
      location: { latitude: -41.290456299999995, longitude: 174.7820894 },
    },
    albumName: '1 demo-album 1',
    description: 'This is demo album 1',
    id: 'demo-album1',
    tags: ['tag1'],
  },
  {
    albumCover: '',
    isPrivate: true,
    place: {
      displayName: 'Sydney',
      formattedAddress: 'Sydney NSW, Australia',
      location: { latitude: -33.868819699999996, longitude: 151.2092955 },
    },
    albumName: 'This is demo album 4',
    description: 'This is the demo album 4 description',
    id: 'demo-album-4',
    tags: ['tag2'],
  },
  {
    albumCover: 'demo-album3/batch_elks-8430545.jpg',
    isPrivate: false,
    place: {
      displayName: 'George Town',
      formattedAddress: 'George Town, Penang, Malaysia',
      location: { latitude: 5.414130699999999, longitude: 100.3287506 },
    },
    albumName: 'this is demo-album-3',
    description: 'This is demo album 3',
    id: 'demo-album3',
    tags: ['tag1'],
  },
];

export const mockPhotoList = [
  {
    url: '/demo-album1/batch_berlin-8429780.jpg',
    key: 'berlin-8429780.jpg',
    size: 180940,
    lastModified: '2023-12-29T00:18:28.000Z',
  },
  {
    url: '/demo-album1/batch_bird-8360220.jpg',
    key: 'bird-8360220.jpg',
    size: 97523,
    lastModified: '2023-12-29T00:18:29.000Z',
  },
  {
    url: '/demo-album1/batch_castle-8033915.jpg',
    key: 'castle-8033915.jpg',
    size: 75139,
    lastModified: '2023-12-29T00:18:30.000Z',
  },
];

const mockUserPermission = {
  uid: 'test-123',
  email: 'test-user@test.com',
  role: 'admin',
  displayName: 'test-user',
};

export const mockSignedCookies = async () => {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET is not set in test environment');
  const token = await signJwt(
    mockUserPermission as unknown as Record<string, unknown>,
    secret,
  );
  return token;
};
