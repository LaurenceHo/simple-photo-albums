import type { UploadFile } from '@/schema';
import { PhotoService } from '@/services/photo-service';
import { usePhotoStore } from '@/stores';
import { ref } from 'vue';

const isUploading = ref(false);
const isCompleteUploading = ref(false);
const overwrite = ref(false);

const sanitiseFilename = (filename: string) => {
  return filename.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
};

export default function useFileUploader() {
  const { findPhotoIndex } = usePhotoStore();

  const setIsCompleteUploading = (state: boolean) => {
    isCompleteUploading.value = state;
  };

  const uploadFile = async (file: UploadFile, albumId: string) => {
    if (file.fileValidation !== 'valid') {
      file.status = false;
      return;
    }

    file.exists = findPhotoIndex(file.file.name) !== -1;
    file.status = 'loading';
    let response;
    if (file.id.includes('image') && (overwrite.value || (!overwrite.value && !file.exists))) {
      try {
        const uniqueFileName = sanitiseFilename(file.file.name);
        response = await PhotoService.uploadPhotos(file.file, albumId, uniqueFileName);
        file.status = response.status === 'Success';
      } catch (error) {
        console.error(error);
        file.status = false;
      }
    } else {
      file.status = false;
    }
    return response;
  };

  const uploadFiles = async (files: UploadFile[], albumId: string) => {
    isUploading.value = true;
    isCompleteUploading.value = false;

    return Promise.all(files.map((file: UploadFile) => uploadFile(file, albumId))).then(() => {
      isUploading.value = false;
      isCompleteUploading.value = true;
    });
  };

  const createUploader = (albumId: string) => ({
    uploadFile: (file: UploadFile) => uploadFile(file, albumId),
    uploadFiles: (files: UploadFile[]) => uploadFiles(files, albumId),
  });

  return { setIsCompleteUploading, createUploader, isUploading, isCompleteUploading, overwrite };
}
