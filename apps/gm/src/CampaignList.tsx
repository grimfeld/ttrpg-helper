// Home: the Campaign list, with New Campaign.
import {
  type Campaign,
  type CampaignListEntry,
  type CampaignRepository,
  CAMPAIGN_NAME_MAX_LENGTH,
  checkCampaignName,
  describeError,
  describeSession,
} from "@ttrpg-helper/core";
import { type SyntheticEvent, useEffect, useState } from "react";
import { useNotify } from "./notices";

interface Props {
  readonly repository: CampaignRepository;
  readonly onOpen: (campaign: Campaign) => void;
}

export function CampaignList({ repository, onOpen }: Props) {
  const notify = useNotify();
  const [entries, setEntries] = useState<readonly CampaignListEntry[] | null>(
    null
  );
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let current = true;
    repository.list().then(
      (list) => {
        if (current) setEntries(list);
      },
      (error: unknown) => {
        if (!current) return;
        setEntries([]);
        notify(`Couldn't read the Campaigns: ${describeError(error)}`);
      }
    );
    return () => {
      current = false;
    };
  }, [repository, notify]);

  async function open(entry: CampaignListEntry) {
    if (entry.status === "unreadable") {
      notify(entry.problem);
      return;
    }
    try {
      onOpen(await repository.open(entry.id));
    } catch (error) {
      notify(describeError(error));
    }
  }

  return (
    <main className="home">
      <header className="app-header">
        <h1>TTRPG Helper GM</h1>
        <p>{describeSession({ playerCount: 0 })}</p>
      </header>
      <header className="home-header">
        <h2>Campaigns</h2>
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
            }}
          >
            New Campaign
          </button>
        )}
      </header>
      {creating && (
        <NewCampaignForm
          repository={repository}
          onCreated={onOpen}
          onCancel={() => {
            setCreating(false);
          }}
        />
      )}
      {entries === null ? (
        <ul
          className="campaigns"
          aria-busy="true"
          aria-label="Loading Campaigns"
        >
          {[0, 1, 2].map((row) => (
            <li key={row} className="skeleton" />
          ))}
        </ul>
      ) : entries.length === 0 ? (
        <p className="empty">No Campaigns yet</p>
      ) : (
        <ul className="campaigns" aria-label="Campaigns">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={
                  entry.status === "ok" ? "campaign" : "campaign unreadable"
                }
                title={
                  entry.status === "ok" ? entry.campaign.name : entry.problem
                }
                onClick={() => void open(entry)}
              >
                {entry.status === "ok"
                  ? entry.campaign.name
                  : `Can't open (${entry.id})`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function NewCampaignForm({
  repository,
  onCreated,
  onCancel,
}: {
  readonly repository: CampaignRepository;
  readonly onCreated: (campaign: Campaign) => void;
  readonly onCancel: () => void;
}) {
  const notify = useNotify();
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const check = checkCampaignName(name);
  const problem = touched && !check.ok ? check.reason : null;

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    setTouched(true);
    if (!check.ok) return;
    setSaving(true);
    try {
      onCreated(await repository.create(check.name));
    } catch (error) {
      // The name stays in the field, so nothing typed is lost.
      notify(`Couldn't save the Campaign: ${describeError(error)}`);
      setSaving(false);
    }
  }

  return (
    <form className="new-campaign" onSubmit={(event) => void submit(event)}>
      <label htmlFor="campaign-name">Campaign name</label>
      <input
        id="campaign-name"
        autoFocus
        value={name}
        maxLength={CAMPAIGN_NAME_MAX_LENGTH + 20}
        aria-invalid={problem !== null}
        aria-describedby={
          problem === null ? undefined : "campaign-name-problem"
        }
        onChange={(event) => {
          setName(event.target.value);
          setTouched(true);
        }}
      />
      {problem !== null && (
        <p id="campaign-name-problem" className="field-problem">
          {problem}
        </p>
      )}
      <div className="actions">
        <button type="submit" disabled={saving}>
          Create
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
