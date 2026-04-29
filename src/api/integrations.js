import { base44 } from './base44Client';

export const Core = base44.integrations.Core;

export const InvokeLLM = (params) => base44.integrations.Core.InvokeLLM(params);

export const SendEmail = (params) => base44.integrations.Core.SendEmail(params);

export const UploadFile = (params) => base44.integrations.Core.UploadFile(params);

export const GenerateImage = async () => {
  throw new Error('GenerateImage não suportado na nova stack');
};

export const ExtractDataFromUploadedFile = async () => {
  throw new Error('ExtractDataFromUploadedFile não suportado na nova stack');
};
