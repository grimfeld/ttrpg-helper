/** Campaigns: one folder per Campaign in the app data folder's `campaigns/` (ADR-0005). */
import {
  createDocumentStore,
  DocumentError,
  type DocumentStoreOptions,
  type DocumentType,
} from "./documents";
import { type FileSystem, joinPath } from "./fileSystem";
import { isString, isTimestamp } from "./guards";

export const CAMPAIGN_NAME_MAX_LENGTH = 80;

export interface Campaign {
  /** The Campaign's folder name, a UUID. Not stored in `campaign.json`. */
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type NameCheck =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly reason: string };

/** A Campaign name is required, trimmed, and at most 80 characters. Duplicates are fine. */
export function checkCampaignName(input: string): NameCheck {
  const name = input.trim();
  if (name === "") return { ok: false, reason: "Give the Campaign a name." };
  if (name.length > CAMPAIGN_NAME_MAX_LENGTH) {
    return {
      ok: false,
      reason: `Use at most ${CAMPAIGN_NAME_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, name };
}

type StoredCampaign = Omit<Campaign, "id">;

/** `campaign.json`, version 1: `{ schemaVersion, name, createdAt, updatedAt }`. */
export const campaignDocument: DocumentType<StoredCampaign> = {
  name: "campaign",
  version: 1,
  migrations: {},
  parse(fields) {
    const { name, createdAt, updatedAt } = fields;
    if (!isString(name) || !checkCampaignName(name).ok) return undefined;
    if (!isTimestamp(createdAt) || !isTimestamp(updatedAt)) return undefined;
    return { name, createdAt, updatedAt };
  },
  serialize: ({ name, createdAt, updatedAt }) => ({
    name,
    createdAt,
    updatedAt,
  }),
};

export const CAMPAIGNS_FOLDER = "campaigns";

export function campaignFolder(id: string): string {
  return joinPath(CAMPAIGNS_FOLDER, id);
}

export function campaignFile(id: string): string {
  return joinPath(campaignFolder(id), "campaign.json");
}

/** One row of the Campaign list: the Campaign, or why it can't be opened. */
export type CampaignListEntry =
  | { readonly id: string; readonly status: "ok"; readonly campaign: Campaign }
  | {
      readonly id: string;
      readonly status: "unreadable";
      /** What to tell the GM, naming the file. */
      readonly problem: string;
    };

/** Campaign storage, as the GM app's screens use it. */
export interface CampaignRepository {
  /** Every Campaign folder, sorted by name; unreadable ones stay listed. */
  list(): Promise<CampaignListEntry[]>;
  /** Creates a Campaign from a name that passed `checkCampaignName`. */
  create(name: string): Promise<Campaign>;
  /** Reads a Campaign; throws a DocumentError when it can't be opened. */
  open(id: string): Promise<Campaign>;
}

export interface CampaignRepositoryOptions extends DocumentStoreOptions {
  /** A new Campaign id, a UUID. The app passes `crypto.randomUUID`. */
  readonly newId: () => string;
  readonly now?: () => Date;
}

export function createCampaignRepository(
  fileSystem: FileSystem,
  options: CampaignRepositoryOptions
): CampaignRepository {
  const store = createDocumentStore(fileSystem, options);
  const { newId } = options;
  const now = options.now ?? (() => new Date());

  async function open(id: string): Promise<Campaign> {
    const file = campaignFile(id);
    const stored = await store.read(file, campaignDocument);
    if (stored === undefined) {
      throw new DocumentError("corrupt", file, `${file} is missing.`);
    }
    return { id, ...stored };
  }

  return {
    async list() {
      const ids = await fileSystem.listDirectories(CAMPAIGNS_FOLDER);
      const entries = await Promise.all(
        ids.map(async (id): Promise<CampaignListEntry> => {
          try {
            return { id, status: "ok", campaign: await open(id) };
          } catch (error) {
            return { id, status: "unreadable", problem: describeError(error) };
          }
        })
      );
      return entries.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    },
    async create(name) {
      const checked = checkCampaignName(name);
      if (!checked.ok) throw new Error(checked.reason);
      const timestamp = now().toISOString();
      const campaign: Campaign = {
        id: newId(),
        name: checked.name,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await store.write(campaignFile(campaign.id), campaignDocument, campaign);
      return campaign;
    },
    open,
  };
}

function sortKey(entry: CampaignListEntry): string {
  return entry.status === "ok" ? entry.campaign.name : entry.id;
}

/** A message for the GM from a storage failure. */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
