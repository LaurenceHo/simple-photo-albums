import type { UploadFile as IUploadFile } from '@/schema';
import type { FileValidationStatus } from '@/schema/upload-file';
import { PhotoService } from '@/services/photo-service';
import { usePhotoStore } from '@/stores/photo';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
export const ALLOWED_FILE_TYPE = ['image/png', 'image/jpeg', 'image/webp'];

class UploadFile implements IUploadFile {
  id: string;
  file: File;
  url: string;
  status: 'loading' | boolean | null;
  exists: boolean;
  fileValidation: FileValidationStatus;

  constructor(file: File, fileValidation: FileValidationStatus) {
    this.file = file;
    this.id = `${file.name}-${file.size}-${file.lastModified}-${file.type}`;
    this.url = URL.createObjectURL(file);
    this.status = null;
    this.exists = false;
    this.fileValidation = fileValidation;
  }
}

export const useUploadStore = defineStore('upload', () => {
  const files = ref<IUploadFile[]>([]);
  const isUploading = ref(false);
  const isCompleteUploading = ref(false);
  const overwrite = ref(false);
  const { findPhotoIndex } = usePhotoStore();

  const fileExists = (otherId: string) => files.value.some(({ id }) => id === otherId);

  const addFiles = (newFiles: File[]) => {
    const newUploadFiles = [...newFiles]
      .filter((file) => !fileExists(`${file.name}-${file.size}-${file.lastModified}-${file.type}`))
      .map((file) => {
        let validationStatus: FileValidationStatus = 'valid';

        if (!ALLOWED_FILE_TYPE.includes(file.type)) {
          validationStatus = 'invalid_format';
          return new UploadFile(file, validationStatus);
        }

        if (file.size > MAX_FILE_SIZE) {
          validationStatus = 'invalid_size';
          return new UploadFile(file, validationStatus);
        }

        return new UploadFile(file, validationStatus);
      });
    files.value = files.value.concat(newUploadFiles);
  };

  const removeFile = (file: IUploadFile) => {
    const index = files.value.indexOf(file);

    if (index > -1) {
      files.value.splice(index, 1);
    }
  };

  const clearFiles = () => {
    files.value = [];
    isCompleteUploading.value = false;
    isUploading.value = false;
    overwrite.value = false;
  };

  const setIsCompleteUploading = (state: boolean) => {
    isCompleteUploading.value = state;
  };

  const sanitiseFilename = (filename: string) => {
    return filename.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
  };

  const uploadFile = async (file: IUploadFile, albumId: string) => {
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

  const uploadFiles = async (albumId: string) => {
    isUploading.value = true;
    isCompleteUploading.value = false;

    await Promise.all(files.value.map((file: IUploadFile) => uploadFile(file, albumId)));

    isUploading.value = false;
    isCompleteUploading.value = true;
  };

  return {
    files,
    isUploading,
    isCompleteUploading,
    overwrite,
    addFiles,
    removeFile,
    clearFiles,
    setIsCompleteUploading, // Kept for compatibility if manually needed, or just let uploadFiles handle it
    uploadFiles,
  };
});
