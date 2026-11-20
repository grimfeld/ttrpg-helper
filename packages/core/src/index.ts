// Core's public surface. The apps import Core only from here (CONSTRAINTS.md, Architecture).
export { describeSession, type SessionSummary } from "./session";
export {
  type FileSystem,
  type MemoryFileSystem,
  createMemoryFileSystem,
  joinPath,
} from "./fileSystem";
export {
  type Decoded,
  type DocumentFields,
  type DocumentStore,
  type DocumentType,
  type Recovery,
  createDocumentStore,
  decodeDocument,
  DocumentError,
  encodeDocument,
} from "./documents";
export {
  type Campaign,
  type CampaignListEntry,
  type CampaignRepository,
  type CampaignRepositoryOptions,
  type NameCheck,
  CAMPAIGN_NAME_MAX_LENGTH,
  campaignDocument,
  campaignFile,
  campaignFolder,
  checkCampaignName,
  createCampaignRepository,
  describeError,
} from "./campaigns";
export {
  type ImportResult,
  type Media,
  type MediaExtension,
  type MediaIndex,
  type MediaLibrary,
  type MediaLibraryOptions,
  type PickedFile,
  createMediaLibrary,
  mediaDocument,
  mediaFile,
  mediaIndexFile,
  normaliseExtension,
  sniffImage,
} from "./media";
