import {
  getAlbumWithLocation,
  getCountAlbumsByYear,
  getFeaturedAlbums,
} from '@/mocks/aggregate-handler';
import { createAlbum, deleteAlbum, getAlbumsByYear, updateAlbum } from '@/mocks/album-handler';
import { createAlbumTag, deleteAlbumTag, getAlbumTags } from '@/mocks/album-tag-handler';
import { getUserPermission, userLogin, userLogout } from '@/mocks/auth-handler';
import { searchPlaces } from '@/mocks/location-handler';
import {
  deletePhotos,
  getPhotos,
  movePhotos,
  renamePhoto,
  uploadPhotos,
} from '@/mocks/photos-handler';
import {
  createTravelRecords,
  deleteTravelRecord,
  getTravelRecords,
  updateTravelRecords,
} from '@/mocks/travel-records-handler';
import { http, passthrough } from 'msw';

const imageCDNUrl = import.meta.env.VITE_IMAGEKIT_CDN_URL;
const staticFilesUrl = import.meta.env.VITE_STATIC_FILES_URL;

export const handlers = [
  http.get(`${imageCDNUrl}/**`, () => {
    return passthrough();
  }),
  http.get(`${staticFilesUrl}/**`, () => {
    return passthrough();
  }),
  searchPlaces,
  /** User **/
  getUserPermission,
  userLogout,
  userLogin,
  /** Album **/
  getAlbumsByYear,
  deleteAlbum,
  updateAlbum,
  createAlbum,
  /** Album Tag **/
  getAlbumTags,
  createAlbumTag,
  deleteAlbumTag,
  /** Aggregate **/
  getFeaturedAlbums,
  getCountAlbumsByYear,
  getAlbumWithLocation,
  /** Photo **/
  getPhotos,
  movePhotos,
  deletePhotos,
  uploadPhotos,
  renamePhoto,
  /** Travel Record **/
  getTravelRecords,
  deleteTravelRecord,
  updateTravelRecords,
  createTravelRecords,
];
