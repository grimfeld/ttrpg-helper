import { describeSession } from "@ttrpg-helper/core";

export function App() {
  return (
    <main>
      <h1>TTRPG Helper Player</h1>
      <p>{describeSession({ playerCount: 0 })}</p>
    </main>
  );
}
